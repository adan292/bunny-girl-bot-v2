import test from 'node:test';
import assert from 'node:assert/strict';
import { DisconnectReason } from '@whiskeysockets/baileys';
import {
  classifyDisconnect,
  computeReconnectDelay,
  deterministicJitter,
} from '../src/core/reconnect-policy.js';

test('classifies logout as a purge followed by pairing', () => {
  const result = classifyDisconnect({
    output: { statusCode: DisconnectReason.loggedOut },
  });

  assert.equal(result.action, 'purge-session');
  assert.equal(result.statusCode, 401);
  assert.equal(result.reason, 'logged-out');
  assert.equal(result.purgeAuth, true);
  assert.equal(result.triggerPairingCode, true);
  assert.equal(result.shouldReconnect, true);
});

test('classifies 408 as a reconnect preserving auth', () => {
  const result = classifyDisconnect({
    output: { statusCode: 408 },
  });

  assert.equal(result.action, 'reconnect');
  assert.equal(result.preserveAuth, true);
  assert.equal(result.flushSocketPool, true);
  assert.equal(result.resyncAppState, false);
});

test('classifies 428 and 515 as reconnect plus app-state recovery', () => {
  const precondition = classifyDisconnect({ output: { statusCode: 428 } });
  const restart = classifyDisconnect({ output: { statusCode: 515 } });

  assert.equal(precondition.resyncAppState, true);
  assert.equal(precondition.reinitializeNoiseHandshake, true);
  assert.equal(restart.resyncAppState, true);
  assert.equal(restart.reinitializeNoiseHandshake, true);
});

test('backoff grows and stays bounded', () => {
  const first = computeReconnectDelay(1, {
    baseMs: 1000,
    maxMs: 5000,
    jitterRatio: 0,
  });
  const second = computeReconnectDelay(2, {
    baseMs: 1000,
    maxMs: 5000,
    jitterRatio: 0,
  });
  const capped = computeReconnectDelay(10, {
    baseMs: 1000,
    maxMs: 5000,
    jitterRatio: 1,
    random: () => 1,
  });

  assert.equal(first, 1000);
  assert.equal(second, 2000);
  assert.equal(capped, 5000);
});

test('default jitter is deterministic for the same seed and attempt', () => {
  assert.equal(deterministicJitter('session-a', 4), deterministicJitter('session-a', 4));
  assert.notEqual(deterministicJitter('session-a', 4), deterministicJitter('session-b', 4));

  const first = computeReconnectDelay(4, { seed: 'session-a' });
  const second = computeReconnectDelay(4, { seed: 'session-a' });
  assert.equal(first, second);
});
