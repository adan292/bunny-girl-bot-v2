export class SerialTaskQueue {
  #tail = Promise.resolve();
  #closed = false;

  /**
   * Add one task. A failed task is isolated so later tasks still run.
   * @template T
   * @param {() => T | Promise<T>} task
   * @returns {Promise<T>}
   */
  add(task) {
    if (this.#closed) {
      return Promise.reject(new Error('SerialTaskQueue is closed'));
    }

    const run = this.#tail.then(task, task);
    this.#tail = run.catch(() => undefined);
    return run;
  }

  /**
   * Wait until all tasks already submitted have settled.
   * @returns {Promise<void>}
   */
  async onIdle() {
    await this.#tail;
  }

  close() {
    this.#closed = true;
  }

  get closed() {
    return this.#closed;
  }
}

export class BoundedTaskPool {
  #active = 0;
  #pending = [];
  #closed = false;

  constructor({ concurrency = 1, maxQueue = 100 } = {}) {
    if (!Number.isSafeInteger(concurrency) || concurrency < 1) {
      throw new Error('concurrency must be a positive integer');
    }
    if (!Number.isSafeInteger(maxQueue) || maxQueue < 1) {
      throw new Error('maxQueue must be a positive integer');
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
    if (this.#pending.length >= this.maxQueue) {
      return Promise.reject(new Error('BoundedTaskPool queue limit exceeded'));
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
}
