import { parentPort, workerData } from 'node:worker_threads';

function serializeError(error) {
  return {
    name: error instanceof Error ? error.name : 'Error',
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    code: error instanceof Error ? error.code : undefined,
  };
}

if (!parentPort) {
  throw new Error('worker-entry requires a parent port');
}

try {
  const loaded = await import(workerData.moduleUrl);
  const operation = loaded[workerData.exportName] ?? loaded.default;
  if (typeof operation !== 'function') {
    throw new TypeError(`Worker module does not export function ${workerData.exportName}`);
  }
  const result = await operation(workerData.input);
  parentPort.postMessage({ ok: true, result });
} catch (error) {
  parentPort.postMessage({ ok: false, error: serializeError(error) });
}
