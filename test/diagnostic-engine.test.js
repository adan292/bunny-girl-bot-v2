import test from 'node:test';
import assert from 'node:assert/strict';
import { DiagnosticEngine } from '../src/core/diagnostic-engine.js';
import {
  MediaProcessingError,
  PluginExecutionError,
} from '../src/utils/errors.js';
import { pairCodeForDisplay } from '../src/core/connection-supervisor.js';

function createLogger() {
  return {
    warn() {},
    error() {},
    info() {},
    fatal() {},
  };
}

test('diagnostic engine requests app-state recovery for 428', () => {
  const engine = new DiagnosticEngine({ logger: createLogger() });
  const plan = engine.diagnoseSocket({
    error: { output: { statusCode: 428 } },
    context: 'test',
  });

  assert.equal(plan.requiresAuthPurge, false);
  assert.equal(plan.requiresAppStateResync, true);
  assert.equal(plan.flushSocketPool, true);
});

test('diagnostic engine purges auth for 401', () => {
  const engine = new DiagnosticEngine({ logger: createLogger() });
  const plan = engine.diagnoseSocket({
    error: { output: { statusCode: 401 } },
  });

  assert.equal(plan.requiresAuthPurge, true);
  assert.equal(plan.triggerPairingCode, true);
  assert.equal(plan.requiresAppStateResync, false);
});

test('app-state resync is bounded and isolated', async () => {
  const engine = new DiagnosticEngine({
    logger: createLogger(),
    maxResyncAttempts: 1,
  });
  const calls = [];
  const socket = {
    async resyncAppState(collections, initialSync) {
      calls.push({ collections, initialSync });
    },
  };

  const first = await engine.resyncAppState(socket, { reason: 'test' });
  const second = await engine.resyncAppState(socket, { reason: 'test' });

  assert.equal(first.succeeded, true);
  assert.equal(second.succeeded, false);
  assert.equal(second.reason, 'resync-attempt-limit');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].initialSync, false);
});

test('diagnostic engine normalizes media and plugin failures', () => {
  const engine = new DiagnosticEngine({ logger: createLogger() });
  const mediaError = new MediaProcessingError('Invalid media stream', {
    operation: 'sticker',
  });
  const pluginError = engine.pluginFailure({
    error: new Error('plugin exploded'),
    pluginName: 'test/plugin',
    messageId: 'message-1',
    jid: '123@s.whatsapp.net',
  });

  assert.equal(engine.mediaFailure({ error: mediaError }).action, 'retry-range-download');
  assert.equal(pluginError instanceof PluginExecutionError, true);
  assert.equal(pluginError.pluginName, 'test/plugin');
});

test('pairing code display groups eight-character codes', () => {
  assert.equal(pairCodeForDisplay('12345678'), '1234-5678');
  assert.equal(pairCodeForDisplay('ABCD-EFGH'), 'ABCD-EFGH');
});
