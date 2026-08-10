import { QueueLimitError } from '../utils/errors.js';
import { sleep } from '../utils/abort.js';

class TokenBucket {
  constructor({ ratePerSecond, capacity = Math.max(1, Math.ceil(ratePerSecond)) }) {
    this.ratePerSecond = ratePerSecond;
    this.capacity = capacity;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  #refill(now) {
    const elapsedSeconds = Math.max(0, now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsedSeconds * this.ratePerSecond);
    this.lastRefill = now;
  }

  async take(signal) {
    while (true) {
      if (signal?.aborted) {
        throw signal.reason ?? new DOMException('The operation was aborted', 'AbortError');
      }

      const now = Date.now();
      this.#refill(now);
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }

      const waitMs = Math.max(10, Math.ceil(((1 - this.tokens) / this.ratePerSecond) * 1000));
      await sleep(waitMs, signal);
    }
  }
}

/**
 * Serialized outbound queue with global and per-chat token buckets. It limits
 * work instead of adding unbounded promises to the event loop.
 */
export class OutboundQueue {
  constructor({
    logger,
    globalPerSecond = 5,
    perChatPerSecond = 0.5,
    maxQueue = 200,
    idleBucketTtlMs = 10 * 60 * 1000,
  }) {
    if (!Number.isFinite(globalPerSecond) || globalPerSecond <= 0) {
      throw new Error('globalPerSecond must be positive');
    }
    if (!Number.isFinite(perChatPerSecond) || perChatPerSecond <= 0) {
      throw new Error('perChatPerSecond must be positive');
    }

    this.logger = logger;
    this.globalBucket = new TokenBucket({ ratePerSecond: globalPerSecond });
    this.perChatPerSecond = perChatPerSecond;
    this.maxQueue = maxQueue;
    this.pending = [];
    this.active = false;
    this.closed = false;
    this.buckets = new Map();
    this.idleBucketTtlMs = idleBucketTtlMs;
    this.cleanupTimer = setInterval(() => this.#cleanupBuckets(), Math.min(idleBucketTtlMs, 60000));
    this.cleanupTimer.unref?.();
  }

  /**
   * @template T
   * @param {{ jid: string, task: () => T | Promise<T>, signal?: AbortSignal }} item
   */
  enqueue({ jid, task, signal }) {
    if (this.closed) {
      return Promise.reject(new Error('OutboundQueue is closed'));
    }
    if (typeof jid !== 'string' || jid.length === 0 || typeof task !== 'function') {
      return Promise.reject(new TypeError('OutboundQueue requires jid and task'));
    }
    if (this.pending.length >= this.maxQueue) {
      return Promise.reject(new QueueLimitError('Outbound queue limit exceeded'));
    }

    return new Promise((resolve, reject) => {
      this.pending.push({ jid, task, signal, resolve, reject, enqueuedAt: Date.now() });
      this.#drain();
    });
  }

  async #run(item) {
    const bucket = this.#getBucket(item.jid);
    await this.globalBucket.take(item.signal);
    await bucket.take(item.signal);
    return item.task();
  }

  #getBucket(jid) {
    let entry = this.buckets.get(jid);
    if (!entry) {
      entry = {
        bucket: new TokenBucket({ ratePerSecond: this.perChatPerSecond }),
        lastUsed: Date.now(),
      };
      this.buckets.set(jid, entry);
    }
    entry.lastUsed = Date.now();
    return entry.bucket;
  }

  #drain() {
    if (this.active || this.pending.length === 0 || this.closed) {
      return;
    }

    const item = this.pending.shift();
    this.active = true;
    this.#run(item)
      .then(item.resolve, item.reject)
      .catch((error) => {
        this.logger.error({ err: error, jid: item.jid }, 'Unexpected outbound queue failure');
        item.reject(error);
      })
      .finally(() => {
        this.active = false;
        this.#drain();
      });
  }

  #cleanupBuckets() {
    const cutoff = Date.now() - this.idleBucketTtlMs;
    for (const [jid, entry] of this.buckets) {
      if (entry.lastUsed < cutoff) {
        this.buckets.delete(jid);
      }
    }
  }

  async onIdle() {
    while (this.active || this.pending.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  close(error = new Error('OutboundQueue closed')) {
    this.closed = true;
    clearInterval(this.cleanupTimer);
    while (this.pending.length > 0) {
      this.pending.shift().reject(error);
    }
  }
}
