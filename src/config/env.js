import 'dotenv/config';
import { resolve } from 'node:path';
import { normalizePhoneNumber } from '../utils/phone-number.js';

function readString(env, key, fallback = '') {
  const value = env[key];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function readInteger(env, key, fallback, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}) {
  const raw = env[key];
  if (raw === undefined || raw === '') {
    return fallback;
  }

  const value = Number.parseInt(String(raw), 10);
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${key} must be an integer between ${min} and ${max}`);
  }

  return value;
}

function readFloat(env, key, fallback, { min = Number.MIN_VALUE, max = Number.MAX_VALUE } = {}) {
  const raw = env[key];
  if (raw === undefined || raw === '') {
    return fallback;
  }

  const value = Number.parseFloat(String(raw));
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${key} must be a number between ${min} and ${max}`);
  }

  return value;
}

function readBoolean(env, key, fallback) {
  const raw = env[key];
  if (raw === undefined || raw === '') {
    return fallback;
  }

  const value = String(raw).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(value)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(value)) {
    return false;
  }

  throw new Error(`${key} must be a boolean`);
}

function readPhone(env) {
  const raw = readString(env, 'PAIRING_PHONE');
  return raw ? normalizePhoneNumber(raw) : null;
}

/**
 * Build and validate immutable runtime configuration.
 * @param {NodeJS.ProcessEnv} env
 */
export function loadConfig(env = process.env) {
  const nodeEnv = readString(env, 'NODE_ENV', 'development');
  const port = readInteger(env, 'PORT', 3000, { min: 1, max: 65535 });
  const reconnectBaseMs = readInteger(env, 'RECONNECT_BASE_MS', 1000, { min: 100, max: 300000 });
  const reconnectMaxMs = readInteger(env, 'RECONNECT_MAX_MS', 60000, { min: reconnectBaseMs, max: 3600000 });
  const reconnectJitterRatio = readFloat(env, 'RECONNECT_JITTER_RATIO', 0.25, { min: 0, max: 1 });

  const root = process.cwd();
  const config = {
    nodeEnv,
    host: readString(env, 'HOST', '0.0.0.0'),
    port,
    logLevel: readString(env, 'LOG_LEVEL', 'info'),
    prettyLogs: readBoolean(env, 'PRETTY_LOGS', nodeEnv !== 'production'),
    pairingPhone: readPhone(env),
    authDirectory: resolve(root, readString(env, 'AUTH_DIR', './data/auth')),
    sessionId: readString(env, 'SESSION_ID', 'primary'),
    pluginsDirectory: resolve(root, readString(env, 'PLUGINS_DIR', './src/plugins')),
    pluginWatch: readBoolean(env, 'PLUGIN_WATCH', true),
    maxTextLength: readInteger(env, 'MAX_TEXT_LENGTH', 4096, { min: 128, max: 65536 }),
    maxInboundBatch: readInteger(env, 'MAX_INBOUND_BATCH', 50, { min: 1, max: 500 }),
    maxPluginQueue: readInteger(env, 'MAX_PLUGIN_QUEUE', 100, { min: 1, max: 10000 }),
    maxPluginConcurrency: readInteger(env, 'MAX_PLUGIN_CONCURRENCY', 8, { min: 1, max: 128 }),
    outboundGlobalPerSecond: readFloat(env, 'OUTBOUND_GLOBAL_PER_SECOND', 5, { min: 0.1, max: 1000 }),
    outboundPerChatPerSecond: readFloat(env, 'OUTBOUND_PER_CHAT_PER_SECOND', 0.5, { min: 0.01, max: 100 }),
    outboundQueueLimit: readInteger(env, 'OUTBOUND_QUEUE_LIMIT', 200, { min: 1, max: 10000 }),
    reconnectBaseMs,
    reconnectMaxMs,
    reconnectJitterRatio,
    ffmpegTimeoutMs: readInteger(env, 'FFMPEG_TIMEOUT_MS', 30000, { min: 1000, max: 600000 }),
    maxStickerBytes: readInteger(env, 'MAX_STICKER_BYTES', 1048576, { min: 65536, max: 20 * 1024 * 1024 }),
    ffmpegPath: readString(env, 'FFMPEG_PATH') || null,
  };

  if (!/^[a-zA-Z0-9._-]{1,64}$/.test(config.sessionId)) {
    throw new Error('SESSION_ID may contain only letters, numbers, dot, underscore and hyphen');
  }

  if (config.reconnectMaxMs < config.reconnectBaseMs) {
    throw new Error('RECONNECT_MAX_MS must be greater than or equal to RECONNECT_BASE_MS');
  }

  return Object.freeze(config);
}
