import { createLinkedAbortController } from '../utils/abort.js';
import { QueueLimitError } from '../utils/errors.js';
import { SerialTaskQueue } from './serial-queue.js';

class TokenBucket {
  constructor({
    ratePerSecond,
    capacity = Math.max(1, Math.ceil(ratePerSecond)),
  }) {
    if (!Number.isFinite(ratePerSecond) || ratePerSecond <= 0) {
      throw new RangeError('ratePerSecond must be positive');
    }
    if (!Number.isSafeInteger(capacity) || capacity < 1) {
      throw new RangeError('capacity must be a positive integer');
    }

    this.ratePerSecond = ratePerSecond;
    this.capacity = capacity;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  #refill(now) {
    const elapsedSeconds = Math.max(0, now - this.lastRefill) / 1000;
    this.tokens = Math.min(
      this.capacity,
      this.tokens + elapsedSeconds * this.ratePerSecond,
    );
    this.lastRefill = now;
  }

  async take(signal) {
    while (true) {
      if (signal?.aborted) {
        throw signal.reason ?? new DOMException(
          'The operation was aborted',
          'AbortError',
        );
      }

      const now = Date.now();
      this.#refill(now);

      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }

      const waitMs = Math.max(
        10,
        Math.ceil(((1 - this.tokens) / this.ratePerSecond) * 1000),
      );

      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          signal?.removeEventListener('abort', onAbort);
          resolve();
        }, waitMs);

        const onAbort = () => {
          clearTimeout(timer);
          signal?.removeEventListener('abort', onAbort);
          reject(signal.reason ?? new DOMException(
            'The operation was aborted',
            'AbortError',
          ));
        };

        signal?.addEventListener('abort', onAbort, { once: true });
      });
    }
  }
}

/**
 * Sequential outbound queue with global and per-chat token buckets.
 *
 * The queue is a resource-protection boundary. It is not intended to bypass
 * platform anti-abuse controls or to automate unsolicited bulk messaging.
 */
export class OutboundQueue {
  constructor({
    logger,
    globalPerSecond = 5,
    perChatPerSecond = 0.5,
    maxQueue = 200,
    idleBucketTtlMs = 10 * 60 * 1000,
  } = {}) {
    if (!Number.isFinite(globalPerSecond) || globalPerSecond <= 0) {
      throw new RangeError('globalPerSecond must be positive');
    }
    if (!Number.isFinite(perChatPerSecond) || perChatPerSecond <= 0) {
      throw new RangeError('perChatPerSecond must be positive');
    }
    if (!Number.isSafeInteger(maxQueue) || maxQueue < 1) {
      throw new RangeError('maxQueue must be a positive integer');
    }
    if (!Number.isSafeInteger(idleBucketTtlMs) || idleBucketTtlMs < 1000) {
      throw new RangeError('idleBucketTtlMs must be at least 1000 milliseconds');
    }

    this.logger = logger ?? {
      error() {},
      warn() {},
    };
    this.globalBucket = new TokenBucket({
      ratePerSecond: globalPerSecond,
    });
    this.perChatPerSecond = perChatPerSecond;
    this.maxQueue = maxQueue;
    this.idleBucketTtlMs = idleBucketTtlMs;
    this.queue = new SerialTaskQueue();
    this.pendingCount = 0;
    this.closed = false;
    this.buckets = new Map();
    this.shutdownController = new AbortController();

    this.cleanupTimer = setInterval(
      () => this.#cleanupBuckets(),
      Math.min(idleBucketTtlMs, 60000),
    );
    this.cleanupTimer.unref?.();
  }

  /**
   * Enqueue one outbound operation. Only the task result is exposed; the
   * caller remains responsible for handling WhatsApp API errors.
   *
   * @template T
   * @param {{
   *   jid: string,
   *   task: () => T | Promise<T>,
   *   signal?: AbortSignal,
   * }} item
   * @returns {Promise<T>}
   */
  enqueue({ jid, task, signal } = {}) {
    if (this.closed) {
      return Promise.reject(new Error('OutboundQueue is closed'));
    }
    if (typeof jid !== 'string' || jid.length === 0) {
      return Promise.reject(new TypeError('OutboundQueue jid must be a non-empty string'));
    }
    if (typeof task !== 'function') {
      return Promise.reject(new TypeError('OutboundQueue task must be a function'));
    }
    if (this.pendingCount >= this.maxQueue) {
      return Promise.reject(new QueueLimitError(
        'Outbound queue limit exceeded',
        { maxQueue: this.maxQueue, jid },
      ));
    }

    this.pendingCount += 1;

    return this.queue.add(() => this.#run({ jid, task, signal })).finally(() => {
      this.pendingCount -= 1;
    });
  }

  send(item) {
    return this.enqueue(item);
  }

  async #run({ jid, task, signal }) {
    if (this.closed) {
      throw new Error('OutboundQueue is closed');
    }

    const linked = createLinkedAbortController(
      signal,
      this.shutdownController.signal,
    );

    try {
      const bucket = this.#getBucket(jid);
      await this.globalBucket.take(linked.signal);
      await bucket.take(linked.signal);

      if (linked.signal.aborted) {
        throw linked.signal.reason ?? new DOMException(
          'The operation was aborted',
          'AbortError',
        );
      }

      return await task();
    } finally {
      linked.dispose();
    }
  }

  #getBucket(jid) {
    let entry = this.buckets.get(jid);

    if (!entry) {
      entry = {
        bucket: new TokenBucket({
          ratePerSecond: this.perChatPerSecond,
        }),
        lastUsed: Date.now(),
      };
      this.buckets.set(jid, entry);
    }

    entry.lastUsed = Date.now();
    return entry.bucket;
  }

  #cleanupBuckets() {
    const cutoff = Date.now() - this.idleBucketTtlMs;

    for (const [jid, entry] of this.buckets) {
      if (entry.lastUsed < cutoff) {
        this.buckets.delete(jid);
      }
    }
  }

  async onIdle(timeoutMs = 5000) {
    const idle = await this.queue.onIdle(timeoutMs);

    if (!idle) {
      this.logger.warn({
        pending: this.pendingCount,
        buckets: this.buckets.size,
      }, 'Outbound queue did not drain before shutdown deadline');
    }

    return idle;
  }

  close(error = new Error('OutboundQueue closed')) {
    if (this.closed) {
      return;
    }

    this.closed = true;
    clearInterval(this.cleanupTimer);
    this.shutdownController.abort(error);
    this.queue.close();
  }

  get size() {
    return this.pendingCount;
  }

  get bucketCount() {
    return this.buckets.size;
  }
}

export { TokenBucket };
