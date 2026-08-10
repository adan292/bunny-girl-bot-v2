import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyDisconnect, computeReconnectDelay } from '../src/core/reconnect-policy.js';
import { DisconnectReason } from '@whiskeysockets/baileys';

test('classifies logout as a session purge', () => {
  assert.deepEqual(classifyDisconnect({ output: { statusCode: DisconnectReason.loggedOut } }), {
    action: 'purge-session',
    statusCode: 401,
    reason: 'logged-out',
  });
});

test('classifies restart-required as reconnect', () => {
  const result = classifyDisconnect({ output: { statusCode: DisconnectReason.restartRequired } });
  assert.equal(result.action, 'reconnect');
  assert.equal(result.reason, 'restart-required');
});

test('backoff grows and stays bounded', () => {
  const first = computeReconnectDelay(1, { baseMs: 1000, maxMs: 5000, jitterRatio: 0, random: () => 0 });
  const second = computeReconnectDelay(2, { baseMs: 1000, maxMs: 5000, jitterRatio: 0, random: () => 0 });
  const capped = computeReconnectDelay(10, { baseMs: 1000, maxMs: 5000, jitterRatio: 1, random: () => 1 });
  assert.equal(first, 1000);
  assert.equal(second, 2000);
  assert.equal(capped, 5000);
});
