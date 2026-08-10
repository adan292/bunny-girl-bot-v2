import { Worker } from 'node:worker_threads';
import { pathToFileURL } from 'node:url';
import { BoundedTaskPool } from '../messaging/serial-queue.js';
import { QueueLimitError } from '../utils/errors.js';

const WORKER_ENTRY = new URL('./worker-entry.js', import.meta.url);

function reviveError(payload) {
  const error = new Error(payload?.message ?? 'Worker task failed');
  error.name = payload?.name ?? 'WorkerTaskError';
  error.stack = payload?.stack ?? error.stack;

  if (payload?.code) {
    error.code = payload.code;
  }

  return error;
}

function normalizeModuleUrl(moduleUrl) {
  if (moduleUrl instanceof URL) {
    return moduleUrl.href;
  }

  if (typeof moduleUrl !== 'string' || moduleUrl.trim() === '') {
    throw new TypeError('moduleUrl must be a non-empty path or URL');
  }

  if (/^[a-z][a-z\d+.-]*:/iu.test(moduleUrl)) {
    return moduleUrl;
  }

  return pathToFileURL(moduleUrl).href;
}

function workerError(message, code) {
  return Object.assign(new Error(message), { code });
}

/**
 * Run pure CPU-heavy operations outside the main event loop. Socket objects,
 * functions and open streams must never cross this boundary.
 */
export class WorkerTaskRunner {
  constructor({ logger, maxConcurrent = 2, maxQueue = 50 } = {}) {
    this.logger = logger ?? {
      error() {},
      warn() {},
    };
    this.pool = new BoundedTaskPool({
      concurrency: maxConcurrent,
      maxQueue,
    });
    this.workers = new Set();
    this.closed = false;
  }

  run({
    moduleUrl,
    exportName = 'default',
    input,
    timeoutMs = 30000,
    signal,
  } = {}) {
    if (this.closed) {
      return Promise.reject(new Error('WorkerTaskRunner is closed'));
    }

    if (typeof exportName !== 'string' || exportName.trim() === '') {
      return Promise.reject(new TypeError('exportName must be a non-empty string'));
    }

    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 100) {
      return Promise.reject(new RangeError(
        'timeoutMs must be at least 100 milliseconds',
      ));
    }

    let normalizedUrl;
    try {
      normalizedUrl = normalizeModuleUrl(moduleUrl);
    } catch (error) {
      return Promise.reject(error);
    }

    return this.pool.run(() => this.#runOne({
      normalizedUrl,
      exportName,
      input,
      timeoutMs,
      signal,
    }));
  }

  async #runOne({ normalizedUrl, exportName, input, timeoutMs, signal }) {
    if (signal?.aborted) {
      throw signal.reason ?? new DOMException(
        'The operation was aborted',
        'AbortError',
      );
    }

    const worker = new Worker(WORKER_ENTRY, {
      workerData: {
        moduleUrl: normalizedUrl,
        exportName,
        input,
      },
    });

    this.workers.add(worker);

    return new Promise((resolve, reject) => {
      let settled = false;
      let timeout;
      let abortListener;

      const cleanup = () => {
        clearTimeout(timeout);
        signal?.removeEventListener('abort', abortListener);
        this.workers.delete(worker);
      };

      const terminate = () => {
        void worker.terminate().catch((error) => {
          this.logger.warn({ err: error }, 'Worker termination returned an error');
        });
      };

      const finish = (handler, value) => {
        if (settled) {
          return;
        }

        settled = true;
        cleanup();
        handler(value);
        terminate();
      };

      timeout = setTimeout(() => {
        finish(
          reject,
          workerError(
            `Worker task timed out after ${timeoutMs} ms`,
            'WORKER_TIMEOUT',
          ),
        );
      }, timeoutMs);
      timeout.unref?.();

      abortListener = () => {
        finish(
          reject,
          signal.reason ?? new DOMException(
            'The operation was aborted',
            'AbortError',
          ),
        );
      };
      signal?.addEventListener('abort', abortListener, { once: true });

      worker.once('message', (message) => {
        if (message?.ok === true) {
          finish(resolve, message.result);
        } else {
          finish(reject, reviveError(message?.error));
        }
      });

      worker.once('error', (error) => {
        finish(reject, error);
      });

      worker.once('exit', (code) => {
        if (!settled) {
          finish(
            reject,
            workerError(
              code === 0
                ? 'Worker exited before returning a result'
                : `Worker exited with code ${code}`,
              'WORKER_EXITED_EARLY',
            ),
          );
        }
      });
    });
  }

  async close() {
    if (this.closed) {
      return;
    }

    this.closed = true;
    this.pool.close(new QueueLimitError('WorkerTaskRunner closed'));

    await Promise.allSettled(
      [...this.workers].map((worker) => worker.terminate()),
    );

    this.workers.clear();
  }

  get activeWorkers() {
    return this.workers.size;
  }
}
