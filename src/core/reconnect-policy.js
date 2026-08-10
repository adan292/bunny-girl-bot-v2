import { Boom } from '@hapi/boom';
import { DisconnectReason } from '@whiskeysockets/baileys';

export const DISCONNECT_STATUS = Object.freeze({
  loggedOut: 401,
  connectionLost: 408,
  connectionClosed: 428,
  connectionReplaced: 440,
  badSession: 500,
  restartRequired: 515,
  multideviceMismatch: 411,
  forbidden: 403,
  unavailableService: 503,
});

const REASON_NAMES = new Map([
  [DISCONNECT_STATUS.loggedOut, 'logged-out'],
  [DISCONNECT_STATUS.connectionLost, 'connection-lost-or-timeout'],
  [DISCONNECT_STATUS.connectionClosed, 'connection-closed'],
  [DISCONNECT_STATUS.connectionReplaced, 'connection-replaced'],
  [DISCONNECT_STATUS.badSession, 'bad-session'],
  [DISCONNECT_STATUS.restartRequired, 'restart-required'],
  [DISCONNECT_STATUS.multideviceMismatch, 'multidevice-mismatch'],
  [DISCONNECT_STATUS.forbidden, 'forbidden'],
  [DISCONNECT_STATUS.unavailableService, 'unavailable-service'],
]);

const BAILEYS_REASON_CODES = new Set([
  DisconnectReason.loggedOut,
  DisconnectReason.connectionLost,
  DisconnectReason.connectionClosed,
  DisconnectReason.connectionReplaced,
  DisconnectReason.badSession,
  DisconnectReason.restartRequired,
  DisconnectReason.multideviceMismatch,
  DisconnectReason.forbidden,
  DisconnectReason.unavailableService,
]);

/**
 * Extract a status code from Boom, native Error-like objects and plain values.
 * @param {unknown} error
 * @returns {number | undefined}
 */
export function getStatusCode(error) {
  if (typeof error === 'number' && Number.isInteger(error)) {
    return error;
  }

  if (!error || typeof error !== 'object') {
    return undefined;
  }

  if (error instanceof Boom) {
    return error.output?.statusCode;
  }

  const candidate = error;
  const values = [
    candidate.output?.statusCode,
    candidate.statusCode,
    candidate.data?.statusCode,
    candidate.status,
    candidate.code,
  ];

  for (const value of values) {
    const numeric = typeof value === 'number' ? value : Number(value);
    if (Number.isInteger(numeric) && numeric >= 100 && numeric <= 599) {
      return numeric;
    }
  }

  return undefined;
}

function decision(statusCode) {
  switch (statusCode) {
    case DISCONNECT_STATUS.loggedOut:
      return {
        action: 'purge-session',
        shouldReconnect: true,
        purgeAuth: true,
        preserveAuth: false,
        flushSocketPool: true,
        reinitializeNoiseHandshake: true,
        resyncAppState: false,
        triggerPairingCode: true,
      };

    case DISCONNECT_STATUS.connectionLost:
      return {
        action: 'reconnect',
        shouldReconnect: true,
        purgeAuth: false,
        preserveAuth: true,
        flushSocketPool: true,
        reinitializeNoiseHandshake: true,
        resyncAppState: false,
        triggerPairingCode: false,
      };

    case DISCONNECT_STATUS.connectionClosed:
      return {
        action: 'reconnect',
        shouldReconnect: true,
        purgeAuth: false,
        preserveAuth: true,
        flushSocketPool: true,
        reinitializeNoiseHandshake: true,
        resyncAppState: true,
        triggerPairingCode: false,
      };

    case DISCONNECT_STATUS.restartRequired:
      return {
        action: 'reconnect',
        shouldReconnect: true,
        purgeAuth: false,
        preserveAuth: true,
        flushSocketPool: true,
        reinitializeNoiseHandshake: true,
        resyncAppState: true,
        triggerPairingCode: false,
      };

    case DISCONNECT_STATUS.connectionReplaced:
    case DISCONNECT_STATUS.forbidden:
      return {
        action: 'stop',
        shouldReconnect: false,
        purgeAuth: false,
        preserveAuth: true,
        flushSocketPool: true,
        reinitializeNoiseHandshake: false,
        resyncAppState: false,
        triggerPairingCode: false,
      };

    case DISCONNECT_STATUS.badSession:
    case DISCONNECT_STATUS.multideviceMismatch:
    case DISCONNECT_STATUS.unavailableService:
      return {
        action: 'reconnect',
        shouldReconnect: true,
        purgeAuth: false,
        preserveAuth: true,
        flushSocketPool: true,
        reinitializeNoiseHandshake: true,
        resyncAppState: statusCode === DISCONNECT_STATUS.multideviceMismatch,
        triggerPairingCode: false,
      };

    default:
      return {
        action: 'reconnect',
        shouldReconnect: true,
        purgeAuth: false,
        preserveAuth: true,
        flushSocketPool: true,
        reinitializeNoiseHandshake: true,
        resyncAppState: false,
        triggerPairingCode: false,
      };
  }
}

/**
 * Classify a Baileys socket closure into an explicit recovery decision.
 * @param {unknown} error
 */
export function classifyDisconnect(error) {
  const statusCode = getStatusCode(error);
  const classification = decision(statusCode);

  return Object.freeze({
    ...classification,
    statusCode,
    reason: reasonName(statusCode),
    knownStatus: statusCode !== undefined && BAILEYS_REASON_CODES.has(statusCode),
  });
}

function fnv1a(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Deterministic pseudo-random unit interval value. The same seed and attempt
 * always produce the same jitter, which makes reconnect behavior reproducible.
 */
export function deterministicJitter(seed, attempt) {
  const source = `${String(seed)}:${attempt}`;
  let value = fnv1a(source);
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return (value >>> 0) / 0xFFFFFFFF;
}

/**
 * Compute bounded exponential backoff with deterministic positive jitter.
 *
 * `random` is retained only as a deterministic test hook for compatibility
 * with the original tests. Production callers should use `seed` and omit it.
 *
 * @param {number} attempt 1-based reconnect attempt
 * @param {{
 *   baseMs?: number,
 *   maxMs?: number,
 *   jitterRatio?: number,
 *   seed?: string,
 *   random?: () => number,
 * }} options
 */
export function computeReconnectDelay(attempt, {
  baseMs = 1000,
  maxMs = 60000,
  jitterRatio = 0.25,
  seed = 'bunny-girl-bot-v2',
  random,
} = {}) {
  if (!Number.isSafeInteger(attempt) || attempt < 1) {
    throw new Error('attempt must be a positive integer');
  }

  if (!Number.isFinite(baseMs) || baseMs <= 0) {
    throw new Error('baseMs must be a positive finite number');
  }

  if (!Number.isFinite(maxMs) || maxMs < baseMs) {
    throw new Error('maxMs must be greater than or equal to baseMs');
  }

  if (!Number.isFinite(jitterRatio) || jitterRatio < 0 || jitterRatio > 1) {
    throw new Error('jitterRatio must be between 0 and 1');
  }

  const exponent = Math.min(
    maxMs,
    baseMs * (2 ** Math.min(attempt - 1, 30)),
  );

  const jitterUnit = typeof random === 'function'
    ? Math.min(1, Math.max(0, Number(random())))
    : deterministicJitter(seed, attempt);

  const jitter = exponent * jitterRatio * jitterUnit;
  return Math.min(maxMs, Math.floor(exponent + jitter));
}

export function reasonName(statusCode) {
  return REASON_NAMES.get(statusCode) ?? 'unknown';
}
