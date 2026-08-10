import { randomBytes } from 'node:crypto';
import { mkdir, open, readFile, readdir, rename, rm, unlink } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import {
  addTransactionCapability,
  BufferJSON,
  initAuthCreds,
  makeCacheableSignalKeyStore,
  proto,
} from '@whiskeysockets/baileys';
import { SerialTaskQueue } from '../core/serial-queue.js';
import { AuthStateCorruptionError } from '../utils/errors.js';

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
  return JSON.stringify(value, BufferJSON.replacer);
}

/**
 * Atomic, serialized auth state for one process. Each creds/key file is
 * replaced atomically and all writes are ordered through one queue. The
 * transaction wrapper batches Signal key mutations before handing them to
 * this persistence boundary.
 *
 * @param {{ directory: string, logger: import('pino').Logger, maxCommitRetries?: number, delayBetweenTriesMs?: number }} options
 */
export async function createAtomicFileAuthState({
  directory,
  logger,
  maxCommitRetries = 3,
  delayBetweenTriesMs = 100,
}) {
  await mkdir(directory, { recursive: true, mode: 0o700 });

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
          updates.push({ type, id, value, serialized: value == null ? null : serialize(value) });
        }
      }

      await queue.add(async () => {
        for (const update of updates) {
          const lookupKey = cacheKey(update.type, update.id);
          const filePath = getKeyPath(update.type, update.id);
          if (update.value == null) {
            keyCache.delete(lookupKey);
            await removeFile(filePath);
          } else {
            keyCache.set(lookupKey, update.value);
            await atomicWrite(filePath, update.serialized);
          }
        }
      });
    },

    async clear() {
      await queue.add(async () => {
        await rm(directory, { recursive: true, force: true });
        await mkdir(directory, { recursive: true, mode: 0o700 });
        keyCache.clear();
      });
    },
  };

  // Caching reduces repeated disk reads. The transaction wrapper remains the
  // outer layer so Baileys can use transaction() and commit through the queue.
  const cachedStore = makeCacheableSignalKeyStore(baseStore, logger);
  const keys = addTransactionCapability(cachedStore, logger, {
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
      if (closed) {
        return;
      }
      await cachedStore.clear();
      await removeFile(credsPath);
      for (const key of Object.keys(creds)) {
        delete creds[key];
      }
      Object.assign(creds, initAuthCreds());
    },
    async close() {
      closed = true;
      await queue.onIdle();
      queue.close();
    },
    get directory() {
      return directory;
    },
  };
}

/**
 * Remove only the selected session directory. It is intentionally explicit so
 * a logout cannot accidentally delete sibling sessions.
 */
export async function removeAuthSession(directory) {
  await rm(directory, { recursive: true, force: true });
}

/**
 * Return the files in a session directory for diagnostics without reading
 * credential contents.
 */
export async function listAuthFiles(directory) {
  return readdir(directory).catch((error) => {
    if (error?.code === 'ENOENT') {
      return [];
    }
    throw error;
  });
}
