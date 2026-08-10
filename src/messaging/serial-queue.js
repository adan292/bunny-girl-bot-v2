import { QueueLimitError } from '../utils/errors.js';

export class SerialTaskQueue {
  #tail = Promise.resolve();
  #closed = false;
  #pending = 0;

  /**
   * Enqueue one task. Tasks execute in submission order, and a rejected task
   * cannot poison tasks submitted after it.
   *
   * @template T
   * @param {() => T | Promise<T>} task
   * @returns {Promise<T>}
   */
  add(task) {
    if (this.#closed) {
      return Promise.reject(new Error('SerialTaskQueue is closed'));
    }

    if (typeof task !== 'function') {
      return Promise.reject(new TypeError('SerialTaskQueue task must be a function'));
    }

    this.#pending += 1;

    const run = this.#tail.then(
      () => task(),
      () => task(),
    );

    this.#tail = run.then(
      () => {
        this.#pending -= 1;
      },
      () => {
        this.#pending -= 1;
      },
    );

    return run;
  }

  /**
   * Wait until the queue is idle. Returns false when the optional deadline is
   * exceeded; it never leaves an unhandled rejection behind.
   *
   * @param {number} timeoutMs
   * @returns {Promise<boolean>}
   */
  async onIdle(timeoutMs = Number.POSITIVE_INFINITY) {
    if (!Number.isFinite(timeoutMs) && timeoutMs !== Number.POSITIVE_INFINITY) {
      throw new RangeError('timeoutMs must be finite or Infinity');
    }
    if (timeoutMs < 0) {
      throw new RangeError('timeoutMs cannot be negative');
    }
    if (this.#pending === 0) {
      return true;
    }
    if (timeoutMs === Number.POSITIVE_INFINITY) {
      await this.#tail;
      return true;
    }

    let timer;
    const timeout = new Promise((resolve) => {
      timer = setTimeout(() => resolve(false), timeoutMs);
      timer.unref?.();
    });
    const idle = this.#tail.then(() => true);
    const result = await Promise.race([idle, timeout]);
    clearTimeout(timer);
    return result;
  }

  close() {
    this.#closed = true;
  }

  get closed() {
    return this.#closed;
  }

  get pending() {
    return this.#pending;
  }
}

export class BoundedTaskPool {
  #active = 0;
  #pending = [];
  #closed = false;

  constructor({ concurrency = 1, maxQueue = 100 } = {}) {
    if (!Number.isSafeInteger(concurrency) || concurrency < 1) {
      throw new RangeError('concurrency must be a positive integer');
    }
    if (!Number.isSafeInteger(maxQueue) || maxQueue < 1) {
      throw new RangeError('maxQueue must be a positive integer');
    }

    this.concurrency = concurrency;
    this.maxQueue = maxQueue;
  }

  /**
   * @template T
   * @param {() => T | Promise<T>} task
   * @returns {Promise<T>}
   */
  run(task) {
    if (this.#closed) {
      return Promise.reject(new Error('BoundedTaskPool is closed'));
    }

    if (typeof task !== 'function') {
      return Promise.reject(new TypeError('BoundedTaskPool task must be a function'));
    }

    if (this.#pending.length >= this.maxQueue) {
      return Promise.reject(new QueueLimitError(
        'BoundedTaskPool queue limit exceeded',
        { maxQueue: this.maxQueue },
      ));
    }

    return new Promise((resolve, reject) => {
      this.#pending.push({ task, resolve, reject });
      this.#drain();
    });
  }

  #drain() {
    while (this.#active < this.concurrency && this.#pending.length > 0) {
      const item = this.#pending.shift();
      this.#active += 1;

      Promise.resolve()
        .then(item.task)
        .then(item.resolve, item.reject)
        .finally(() => {
          this.#active -= 1;
          this.#drain();
        });
    }
  }

  async onIdle(timeoutMs = Number.POSITIVE_INFINITY) {
    if (!Number.isFinite(timeoutMs) && timeoutMs !== Number.POSITIVE_INFINITY) {
      throw new RangeError('timeoutMs must be finite or Infinity');
    }
    if (timeoutMs < 0) {
      throw new RangeError('timeoutMs cannot be negative');
    }

    const deadline = timeoutMs === Number.POSITIVE_INFINITY
      ? Number.POSITIVE_INFINITY
      : Date.now() + timeoutMs;

    while (this.#active > 0 || this.#pending.length > 0) {
      if (Date.now() >= deadline) {
        return false;
      }
      await new Promise((resolve) => setTimeout(
        resolve,
        Math.min(25, Math.max(1, deadline - Date.now())),
      ));
    }

    return true;
  }

  close(error = new Error('BoundedTaskPool closed')) {
    this.#closed = true;
    while (this.#pending.length > 0) {
      this.#pending.shift().reject(error);
    }
  }

  get pending() {
    return this.#pending.length;
  }

  get active() {
    return this.#active;
  }

  get closed() {
    return this.#closed;
  }
}
