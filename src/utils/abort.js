export function sleep(milliseconds, signal) {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) {
    return Promise.reject(new Error('milliseconds must be a non-negative finite number'));
  }

  if (signal?.aborted) {
    return Promise.reject(signal.reason ?? new DOMException('The operation was aborted', 'AbortError'));
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, milliseconds);

    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      reject(signal.reason ?? new DOMException('The operation was aborted', 'AbortError'));
    };

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export function createLinkedAbortController(...signals) {
  const controller = new AbortController();
  const listeners = [];

  const abortFrom = (signal) => {
    if (!controller.signal.aborted) {
      controller.abort(signal.reason ?? new DOMException('The operation was aborted', 'AbortError'));
    }
  };

  for (const signal of signals.filter(Boolean)) {
    if (signal.aborted) {
      abortFrom(signal);
      continue;
    }
    const listener = () => abortFrom(signal);
    signal.addEventListener('abort', listener, { once: true });
    listeners.push(() => signal.removeEventListener('abort', listener));
  }

  return {
    signal: controller.signal,
    abort(reason) {
      controller.abort(reason);
    },
    dispose() {
      for (const remove of listeners) {
        remove();
      }
    },
  };
}
