import { Boom } from '@hapi/boom';
import { DisconnectReason } from '@whiskeysockets/baileys';

const REASON_NAMES = new Map([
  [DisconnectReason.connectionClosed, 'connection-closed'],
  [DisconnectReason.connectionLost, 'connection-lost'],
  [DisconnectReason.connectionReplaced, 'connection-replaced'],
  [DisconnectReason.loggedOut, 'logged-out'],
  [DisconnectReason.badSession, 'bad-session'],
  [DisconnectReason.restartRequired, 'restart-required'],
  [DisconnectReason.multideviceMismatch, 'multidevice-mismatch'],
  [DisconnectReason.forbidden, 'forbidden'],
  [DisconnectReason.unavailableService, 'unavailable-service'],
]);

/** @param {unknown} error */
export function getStatusCode(error) {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  if (error instanceof Boom) {
    return error.output?.statusCode;
  }

  const value = error;
  return value.output?.statusCode ?? value.statusCode ?? value.data?.statusCode;
}

/**
 * Classify a socket closure without conflating a logged-out session with a
 * transient network failure.
 * @param {unknown} error
 */
export function classifyDisconnect(error) {
  const statusCode = getStatusCode(error);
  const reason = REASON_NAMES.get(statusCode) ?? 'unknown';

  if (statusCode === DisconnectReason.loggedOut) {
    return { action: 'purge-session', statusCode, reason };
  }

  if (statusCode === DisconnectReason.connectionReplaced || statusCode === DisconnectReason.forbidden) {
    return { action: 'stop', statusCode, reason };
  }

  if ([
    DisconnectReason.connectionClosed,
    DisconnectReason.connectionLost,
    DisconnectReason.badSession,
    DisconnectReason.restartRequired,
    DisconnectReason.multideviceMismatch,
    DisconnectReason.unavailableService,
  ].includes(statusCode)) {
    return { action: 'reconnect', statusCode, reason };
  }

  return { action: 'reconnect', statusCode, reason };
}

/**
 * Exponential backoff with bounded positive jitter. The random source is
 * injectable so the policy can be tested deterministically.
 * @param {number} attempt 1-based attempt number
 * @param {{baseMs?: number, maxMs?: number, jitterRatio?: number, random?: () => number}} options
 */
export function computeReconnectDelay(attempt, {
  baseMs = 1000,
  maxMs = 60000,
  jitterRatio = 0.25,
  random = Math.random,
} = {}) {
  if (!Number.isSafeInteger(attempt) || attempt < 1) {
    throw new Error('attempt must be a positive integer');
  }
  if (!Number.isFinite(baseMs) || baseMs <= 0 || !Number.isFinite(maxMs) || maxMs < baseMs) {
    throw new Error('invalid reconnect bounds');
  }
  if (!Number.isFinite(jitterRatio) || jitterRatio < 0 || jitterRatio > 1) {
    throw new Error('jitterRatio must be between 0 and 1');
  }

  const exponent = Math.min(maxMs, baseMs * (2 ** Math.min(attempt - 1, 30)));
  const randomValue = Math.min(1, Math.max(0, Number(random())));
  const jitter = exponent * jitterRatio * randomValue;
  return Math.min(maxMs, Math.floor(exponent + jitter));
}

export function reasonName(statusCode) {
  return REASON_NAMES.get(statusCode) ?? 'unknown';
}
