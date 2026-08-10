import { randomBytes } from 'node:crypto';
import {
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  unlink,
  utimes,
} from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import {
  addTransactionCapability,
  BufferJSON,
  initAuthCreds,
  proto,
} from '@whiskeysockets/baileys';
import { SerialTaskQueue } from '../messaging/serial-queue.js';
import { AuthStateCorruptionError } from '../utils/errors.js';

class AuthStateLockError extends Error {
  constructor(lockPath, timeoutMs) {
    super(`Could not acquire authentication state lock ${lockPath} within ${timeoutMs} ms`);
    this.name = 'AuthStateLockError';
    this.code = 'AUTH_STATE_LOCK_TIMEOUT';
    this.lockPath = lockPath;
  }
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function syncDirectory(directory) {
  try {
    const handle = await open(directory, 'r');
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
  } catch {
    // Directory fsync is not available on every supported filesystem.
  }
}

/**
 * Acquire an advisory process lock next to the session directory. The lock is
 * held for the lifetime of the auth-state instance, preventing two Node
 * processes from mutating the same Signal key set. A heartbeat makes a live
 * process distinguishable from a crashed process; stale locks are reclaimed.
 */
async function acquireProcessLock(lockPath, {
  timeoutMs = 15000,
  staleMs = 120000,
  retryMs = 250,
} = {}) {
  const deadline = Date.now() + timeoutMs;
  await mkdir(dirname(lockPath), { recursive: true, mode: 0o700 });

  while (true) {
    try {
      const handle = await open(lockPath, 'wx', 0o600);
      try {
        await handle.writeFile(JSON.stringify({ pid: process.pid, acquiredAt: new Date().toISOString() }), 'utf8');
        await handle.sync();
      } catch (error) {
        await handle.close().catch(() => undefined);
        await unlink(lockPath).catch(() => undefined);
        throw error;
      }

      let released = false;
      const heartbeatIntervalMs = Math.min(30000, Math.max(1000, Math.floor(staleMs / 3)));
      const heartbeat = setInterval(() => {
        void utimes(lockPath, new Date(), new Date()).catch(() => undefined);
      }, heartbeatIntervalMs);
      heartbeat.unref?.();

      return {
        async release() {
          if (released) {
            return;
          }
          released = true;
          clearInterval(heartbeat);
          await handle.close().catch(() => undefined);
          await unlink(lockPath).catch((error) => {
            if (error?.code !== 'ENOENT') {
              throw error;
            }
          });
        },
      };
    } catch (error) {
      if (error?.code !== 'EEXIST') {
        throw error;
      }

      const lockInfo = await stat(lockPath).catch(() => null);
      if (lockInfo && Date.now() - lockInfo.mtimeMs > staleMs) {
        await unlink(lockPath).catch((unlinkError) => {
          if (unlinkError?.code !== 'ENOENT') {
            throw unlinkError;
          }
        });
        continue;
      }

      if (Date.now() >= deadline) {
        throw new AuthStateLockError(lockPath, timeoutMs);
      }

      await wait(Math.min(retryMs, Math.max(1, deadline - Date.now())));
    }
  }
}

async function atomicWrite(filePath, content) {
  const directory = dirname(filePath);
  const temporaryPath = join(
    directory,
    `.${basename(filePath)}.${process.pid}.${randomBytes(8).toString('hex')}.tmp`,
  );
  let handle;

  try {
    handle = await open(temporaryPath, 'wx', 0o600);
    await handle.writeFile(content, 'utf8');
    await handle.sync();
    await handle.close();
    handle = undefined;
    await rename(temporaryPath, filePath);
    await syncDirectory(directory);
  } catch (error) {
    if (handle) {
      await handle.close().catch(() => undefined);
    }
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}

async function removeFile(filePath) {
  await unlink(filePath).catch((error) => {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  });
  await syncDirectory(dirname(filePath));
}

async function readJson(filePath) {
  let content;
  try {
    content = await readFile(filePath, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }

  try {
    return JSON.parse(content, BufferJSON.reviver);
  } catch (error) {
    throw new AuthStateCorruptionError(filePath, error);
  }
}

function keyFileName(type, id) {
  const encoded = Buffer.from(`${type}:${id}`, 'utf8').toString('base64url');
  return `${encoded}.json`;
}

function serialize(value) {
  const result = JSON.stringify(value, BufferJSON.replacer);
  if (typeof result !== 'string') {
    throw new TypeError('Authentication state value cannot be serialized as JSON');
  }
  return result;
}

function resetCredentials(creds) {
  for (const key of Object.keys(creds)) {
    delete creds[key];
  }
  Object.assign(creds, initAuthCreds());
}

/**
 * Atomic auth state for one session.
 *
 * Guarantees provided by this adapter:
 * - one process owns a session directory at a time;
 * - all reads and writes are ordered by one in-process queue;
 * - every JSON file is written to a 0600 temporary file, fsynced, and replaced
 *   with rename on the same filesystem;
 * - Signal key mutations can use Baileys transaction() capability;
 * - corrupt JSON fails closed instead of silently creating a new session.
 *
 * This is a durable single-process backend. A multi-replica deployment still
 * requires a Redis/Mongo adapter with a distributed lease and the same
 * get/set/transaction contract.
 *
 * @param {{
 *   directory: string,
 *   logger: import('pino').Logger,
 *   maxCommitRetries?: number,
 *   delayBetweenTriesMs?: number,
 *   lockTimeoutMs?: number,
 *   staleLockMs?: number,
 * }} options
 */
export async function createAtomicFileAuthState({
  directory,
  logger,
  maxCommitRetries = 3,
  delayBetweenTriesMs = 100,
  lockTimeoutMs = 15000,
  staleLockMs = 120000,
}) {
  if (typeof directory !== 'string' || directory.trim() === '') {
    throw new TypeError('directory must be a non-empty path');
  }
  if (!logger || typeof logger.trace !== 'function') {
    throw new TypeError('logger must expose a trace method');
  }
  if (!Number.isSafeInteger(lockTimeoutMs) || lockTimeoutMs < 1000) {
    throw new RangeError('lockTimeoutMs must be at least 1000 milliseconds');
  }
  if (!Number.isSafeInteger(staleLockMs) || staleLockMs <= lockTimeoutMs) {
    throw new RangeError('staleLockMs must be greater than lockTimeoutMs');
  }

  await mkdir(directory, { recursive: true, mode: 0o700 });
  const lockPath = `${directory}.lock`;
  const lock = await acquireProcessLock(lockPath, { timeoutMs: lockTimeoutMs, staleMs: staleLockMs });

  try {
    const queue = new SerialTaskQueue();
    const credsPath = join(directory, 'creds.json');
    const creds = (await readJson(credsPath)) ?? initAuthCreds();
    const keyCache = new Map();
    let closed = false;

    const getKeyPath = (type, id) => join(directory, keyFileName(type, id));
    const cacheKey = (type, id) => `${type}:${id}`;

    const baseStore = {
      async get(type, ids) {
        if (closed) {
          throw new Error('Authentication state is closed');
        }

        return queue.add(async () => {
          const result = {};
          for (const id of ids) {
            const lookupKey = cacheKey(type, id);
            let value;
            if (keyCache.has(lookupKey)) {
              value = keyCache.get(lookupKey);
            } else {
              value = await readJson(getKeyPath(type, id));
              if (type === 'app-state-sync-key' && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              keyCache.set(lookupKey, value);
            }

            if (value !== null && value !== undefined) {
              result[id] = value;
            }
          }
          return result;
        });
      },

      async set(data) {
        if (closed) {
          throw new Error('Authentication state is closed');
        }

        const updates = [];
        for (const [type, values] of Object.entries(data ?? {})) {
          if (!values || typeof values !== 'object') {
            continue;
          }
          for (const [id, value] of Object.entries(values)) {
            updates.push({
              type,
              id,
              value,
              serialized: value == null ? null : serialize(value),
            });
          }
        }

        await queue.add(async () => {
          for (const update of updates) {
            const lookupKey = cacheKey(update.type, update.id);
            const filePath = getKeyPath(update.type, update.id);
            if (update.value == null) {
              await removeFile(filePath);
              keyCache.delete(lookupKey);
            } else {
              await atomicWrite(filePath, update.serialized);
              keyCache.set(lookupKey, update.value);
            }
          }
        });
      },

      async clear() {
        if (closed) {
          return;
        }

        await queue.add(async () => {
          await rm(directory, { recursive: true, force: true });
          await mkdir(directory, { recursive: true, mode: 0o700 });
          keyCache.clear();
          resetCredentials(creds);
        });
      },
    };

    const keys = addTransactionCapability(baseStore, logger, {
      maxCommitRetries,
      delayBetweenTriesMs,
    });
    const state = { creds, keys };

    return {
      state,
      async saveCreds() {
        if (closed) {
          throw new Error('Authentication state is closed');
        }
        const snapshot = serialize(creds);
        await queue.add(() => atomicWrite(credsPath, snapshot));
      },
      async clear() {
        await baseStore.clear();
      },
      async close() {
        if (closed) {
          return;
        }
        closed = true;
        try {
          await queue.onIdle();
        } finally {
          queue.close();
          await lock.release();
        }
      },
      get directory() {
        return directory;
      },
    };
  } catch (error) {
    await lock.release();
    throw error;
  }
}

/**
 * Remove only the selected session directory and its adjacent lock file.
 * Call this only after the corresponding auth-state instance is closed.
 */
export async function removeAuthSession(directory) {
  await rm(directory, { recursive: true, force: true });
  await removeFile(`${directory}.lock`);
}

/**
 * Return file names for diagnostics without reading credential contents.
 */
export async function listAuthFiles(directory) {
  return readdir(directory).catch((error) => {
    if (error?.code === 'ENOENT') {
      return [];
    }
    throw error;
  });
}
