import { randomBytes, randomInt } from 'node:crypto';
import {
  mkdir,
  open,
  readFile,
  rename,
  unlink,
} from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { SerialTaskQueue } from '../messaging/serial-queue.js';
import { AuthStateCorruptionError } from '../utils/errors.js';

const DATA_VERSION = 1;
const MAX_BALANCE = 1_000_000_000;
const WORK_COOLDOWN_MS = 60 * 60 * 1000;
const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const GLOBAL_STORE_KEY = Symbol.for('bunny-girl-bot-v2.economy-stores');

const storeRegistry = globalThis[GLOBAL_STORE_KEY]
  ?? (globalThis[GLOBAL_STORE_KEY] = new Map());

function emptyData() {
  return {
    version: DATA_VERSION,
    users: {},
  };
}

function userKey(jid) {
  return Buffer.from(jid, 'utf8').toString('base64url');
}

function defaultUser(jid) {
  return {
    jid,
    balance: 0,
    lastWorkAt: 0,
    lastDailyAt: 0,
  };
}

function normalizeUser(value, jid) {
  const source = value && typeof value === 'object' ? value : {};
  const balance = Number.isSafeInteger(source.balance)
    ? Math.max(0, Math.min(MAX_BALANCE, source.balance))
    : 0;
  const lastWorkAt = Number.isSafeInteger(source.lastWorkAt)
    ? Math.max(0, source.lastWorkAt)
    : 0;
  const lastDailyAt = Number.isSafeInteger(source.lastDailyAt)
    ? Math.max(0, source.lastDailyAt)
    : 0;

  return {
    jid,
    balance,
    lastWorkAt,
    lastDailyAt,
  };
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
    // Some filesystems do not allow directory fsync.
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
    await handle?.close().catch(() => undefined);
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}

class EconomyStore {
  constructor(directory) {
    this.directory = resolve(directory);
    this.filePath = join(this.directory, 'economy.json');
    this.queue = new SerialTaskQueue();
    this.data = emptyData();
    this.ready = false;
  }

  async initialize() {
    if (this.ready) {
      return this;
    }

    await mkdir(this.directory, {
      recursive: true,
      mode: 0o700,
    });

    try {
      const content = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(content);

      if (!parsed || typeof parsed !== 'object' || parsed.version !== DATA_VERSION) {
        throw new Error('Unsupported economy data version');
      }

      const users = parsed.users && typeof parsed.users === 'object'
        ? parsed.users
        : {};

      this.data = {
        version: DATA_VERSION,
        users: Object.fromEntries(
          Object.entries(users).map(([key, value]) => {
            const jid = typeof value?.jid === 'string' ? value.jid : key;
            return [key, normalizeUser(value, jid)];
          }),
        ),
      };
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        throw new AuthStateCorruptionError(this.filePath, error);
      }
    }

    this.ready = true;
    return this;
  }

  getUser(jid) {
    const key = userKey(jid);
    const user = this.data.users[key] ?? defaultUser(jid);
    return Object.freeze({ ...normalizeUser(user, jid) });
  }

  async mutate(jid, operation) {
    if (!this.ready) {
      await this.initialize();
    }

    return this.queue.add(async () => {
      const key = userKey(jid);
      const previous = this.data.users[key]
        ? { ...this.data.users[key] }
        : null;
      const current = normalizeUser(previous, jid);

      try {
        const result = await operation(current);
        current.balance = Math.max(
          0,
          Math.min(MAX_BALANCE, Math.trunc(current.balance)),
        );
        current.lastWorkAt = Math.max(0, Math.trunc(current.lastWorkAt));
        current.lastDailyAt = Math.max(0, Math.trunc(current.lastDailyAt));
        this.data.users[key] = current;
        await this.#persist();
        return {
          result,
          user: Object.freeze({ ...current }),
        };
      } catch (error) {
        if (previous) {
          this.data.users[key] = previous;
        } else {
          delete this.data.users[key];
        }
        throw error;
      }
    });
  }

  async #persist() {
    await atomicWrite(
      this.filePath,
      JSON.stringify(this.data, null, 2),
    );
  }
}

async function getStore(config = {}) {
  const directory = resolve(
    config.economyDirectory
      ?? config.economyDir
      ?? './data/economy',
  );

  let store = storeRegistry.get(directory);
  if (!store) {
    store = new EconomyStore(directory);
    storeRegistry.set(directory, store);
  }

  return store.initialize();
}

function formatMoney(value) {
  return new Intl.NumberFormat('es-MX').format(value);
}

function remainingText(milliseconds) {
  const minutes = Math.max(1, Math.ceil(milliseconds / 60000));
  if (minutes >= 60) {
    return `${Math.ceil(minutes / 60)} h`;
  }
  return `${minutes} min`;
}

async function runBalance({ store, jid, reply }) {
  const user = store.getUser(jid);
  await reply({
    text: `💰 Tu saldo es de *${formatMoney(user.balance)}* monedas.`,
  });
}

async function runWork({ store, jid, reply }) {
  const now = Date.now();
  const outcome = await store.mutate(jid, async (user) => {
    const elapsed = now - user.lastWorkAt;
    if (elapsed < WORK_COOLDOWN_MS) {
      return {
        available: false,
        remainingMs: WORK_COOLDOWN_MS - elapsed,
      };
    }

    const reward = randomInt(100, 501);
    user.balance += reward;
    user.lastWorkAt = now;

    return {
      available: true,
      reward,
    };
  });

  if (!outcome.result.available) {
    await reply({
      text: `⏳ Ya trabajaste recientemente. Intenta de nuevo en ${remainingText(outcome.result.remainingMs)}.`,
    });
    return;
  }

  await reply({
    text: `🛠️ Trabajaste y ganaste *${formatMoney(outcome.result.reward)}* monedas.\nSaldo: *${formatMoney(outcome.user.balance)}*.`,
  });
}

async function runDaily({ store, jid, reply }) {
  const now = Date.now();
  const outcome = await store.mutate(jid, async (user) => {
    const elapsed = now - user.lastDailyAt;
    if (elapsed < DAILY_COOLDOWN_MS) {
      return {
        available: false,
        remainingMs: DAILY_COOLDOWN_MS - elapsed,
      };
    }

    const reward = randomInt(1000, 1501);
    user.balance += reward;
    user.lastDailyAt = now;

    return {
      available: true,
      reward,
    };
  });

  if (!outcome.result.available) {
    await reply({
      text: `🎁 Ya reclamaste tu recompensa diaria. Regresa en ${remainingText(outcome.result.remainingMs)}.`,
    });
    return;
  }

  await reply({
    text: `🎁 Recibiste *${formatMoney(outcome.result.reward)}* monedas diarias.\nSaldo: *${formatMoney(outcome.user.balance)}*.`,
  });
}

export default {
  name: 'economy/core',
  commands: ['bal', 'balance', 'work', 'daily'],
  priority: 40,
  permissions: ['user'],
  async execute(context) {
    const jid = context.message.senderJid ?? context.message.remoteJid;

    try {
      const store = await getStore(context.config);

      switch (context.message.command) {
        case 'bal':
        case 'balance':
          await runBalance({
            store,
            jid,
            reply: context.reply,
          });
          break;

        case 'work':
          await runWork({
            store,
            jid,
            reply: context.reply,
          });
          break;

        case 'daily':
          await runDaily({
            store,
            jid,
            reply: context.reply,
          });
          break;

        default:
          return { handled: false };
      }
    } catch (error) {
      context.logger?.error?.({
        err: error,
        jid,
      }, 'Economy command failed');

      await context.reply({
        text: 'La economía está temporalmente no disponible. Intenta de nuevo más tarde.',
      });
    }

    return { handled: true };
  },
};

export {
  EconomyStore,
  getStore,
  formatMoney,
};
