import { Worker } from 'node:worker_threads';
import { pathToFileURL } from 'node:url';
import { BoundedTaskPool } from './serial-queue.js';
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

/**
 * Run pure, CPU-heavy operations outside the main event loop. Socket objects,
 * functions and open streams must never be passed as worker input; use this
 * boundary for bounded structured-clone data only.
 */
export class WorkerTaskRunner {
  constructor({ logger, maxConcurrent = 2, maxQueue = 50 } = {}) {
    this.logger = logger ?? { error() {}, warn() {} };
    this.pool = new BoundedTaskPool({ concurrency: maxConcurrent, maxQueue });
    this.workers = new Set();
    this.closed = false;
  }

  run({ moduleUrl, exportName = 'default', input, timeoutMs = 30000, signal } = {}) {
    if (this.closed) {
      return Promise.reject(new Error('WorkerTaskRunner is closed'));
    }
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 100) {
      return Promise.reject(new Error('timeoutMs must be at least 100 milliseconds'));
    }

    let normalizedUrl;
    try {
      normalizedUrl = normalizeModuleUrl(moduleUrl);
    } catch (error) {
      return Promise.reject(error);
    }

    return this.pool.run(() => this.#runOne({ normalizedUrl, exportName, input, timeoutMs, signal }));
  }

  async #runOne({ normalizedUrl, exportName, input, timeoutMs, signal }) {
    if (signal?.aborted) {
      throw signal.reason ?? new DOMException('The operation was aborted', 'AbortError');
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
      const timeout = setTimeout(() => {
        finish(reject, Object.assign(new Error(`Worker task timed out after ${timeoutMs} ms`), { code: 'WORKER_TIMEOUT' }));
        void worker.terminate();
      }, timeoutMs);
      timeout.unref?.();

      const abortListener = () => {
        finish(reject, signal.reason ?? new DOMException('The operation was aborted', 'AbortError'));
        void worker.terminate();
      };
      signal?.addEventListener('abort', abortListener, { once: true });

      const cleanup = () => {
        clearTimeout(timeout);
        signal?.removeEventListener('abort', abortListener);
        this.workers.delete(worker);
      };

      const finish = (handler, value) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        handler(value);
      };

      worker.once('message', (message) => {
        if (message?.ok) {
          finish(resolve, message.result);
        } else {
          finish(reject, reviveError(message?.error));
        }
      });
      worker.once('error', (error) => finish(reject, error));
      worker.once('exit', (code) => {
        if (code !== 0 && !settled) {
          finish(reject, new Error(`Worker exited with code ${code}`));
        }
      });
    });
  }

  async close() {
    this.closed = true;
    this.pool.close(new QueueLimitError('WorkerTaskRunner closed'));
    await Promise.allSettled([...this.workers].map((worker) => worker.terminate()));
    this.workers.clear();
  }
}
