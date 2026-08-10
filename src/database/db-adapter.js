import Database from 'better-sqlite3';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { SerialTaskQueue } from '../messaging/serial-queue.js';

const MAX_BALANCE = 1_000_000_000;
const MAX_LEVEL = 100000;
const GLOBAL_DATABASE_KEY = Symbol.for('bunny-girl-bot-v2.database-adapters');
const sharedDatabaseRegistry = globalThis[GLOBAL_DATABASE_KEY]
  ?? (globalThis[GLOBAL_DATABASE_KEY] = new Map());

const GROUP_SETTINGS_DEFAULTS = Object.freeze({
  prefix: '.',
  antilinkEnabled: false,
  welcomeEnabled: false,
  goodbyeEnabled: false,
  welcomeText: null,
  goodbyeText: null,
});

function assertJid(jid, label = 'jid') {
  if (typeof jid !== 'string' || jid.trim() === '' || jid.length > 256) {
    throw new TypeError(`${label} must be a non-empty string with max length 256`);
  }
  return jid.trim();
}

function assertCommand(command) {
  if (typeof command !== 'string' || !/^[a-z\d_:-]{1,64}$/iu.test(command)) {
    throw new TypeError('command must contain 1 to 64 letters, numbers, underscores, colons or hyphens');
  }
  return command.toLowerCase();
}

function userFromRow(row) {
  if (!row) {
    return null;
  }

  return Object.freeze({
    jid: row.jid,
    balance: row.balance,
    level: row.level,
    experience: row.experience,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function groupFromRow(row) {
  if (!row) {
    return Object.freeze({ ...GROUP_SETTINGS_DEFAULTS });
  }

  return Object.freeze({
    jid: row.jid,
    prefix: row.prefix,
    antilinkEnabled: row.antilink_enabled === 1,
    welcomeEnabled: row.welcome_enabled === 1,
    goodbyeEnabled: row.goodbye_enabled === 1,
    welcomeText: row.welcome_text,
    goodbyeText: row.goodbye_text,
    updatedAt: row.updated_at,
  });
}

function normalizeInteger(value, fallback, min = 0, max = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, value));
}

/**
 * SQLite persistence adapter. better-sqlite3 operations are synchronous, so
 * writes are serialized through a queue and each mutation uses a SQLite
 * transaction. WAL and busy_timeout protect the database from short-lived
 * concurrent access across bot workers.
 */
export class DatabaseAdapter {
  constructor({
    filename,
    logger,
    busyTimeoutMs = 5000,
  } = {}) {
    if (typeof filename !== 'string' || filename.trim() === '') {
      throw new TypeError('Database filename must be a non-empty string');
    }
    if (!Number.isSafeInteger(busyTimeoutMs) || busyTimeoutMs < 0) {
      throw new RangeError('busyTimeoutMs must be a non-negative integer');
    }

    this.filename = filename === ':memory:' ? filename : resolve(filename);
    this.logger = logger ?? { info() {}, warn() {}, error() {} };
    this.busyTimeoutMs = busyTimeoutMs;
    this.writeQueue = new SerialTaskQueue();
    this.closed = false;
    this.db = null;
    this.statements = null;
  }

  async initialize() {
    if (this.closed) {
      throw new Error('DatabaseAdapter is closed');
    }
    if (this.db) {
      return this;
    }

    if (this.filename !== ':memory:') {
      await mkdir(dirname(this.filename), {
        recursive: true,
        mode: 0o700,
      });
    }

    this.db = new Database(this.filename);
    this.db.pragma('foreign_keys = ON');
    this.db.pragma(`busy_timeout = ${this.busyTimeoutMs}`);
    if (this.filename !== ':memory:') {
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = FULL');
    }

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        jid TEXT PRIMARY KEY NOT NULL,
        balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0 AND balance <= ${MAX_BALANCE}),
        level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= ${MAX_LEVEL}),
        experience INTEGER NOT NULL DEFAULT 0 CHECK (experience >= 0),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS group_settings (
        jid TEXT PRIMARY KEY NOT NULL,
        prefix TEXT NOT NULL DEFAULT '.',
        antilink_enabled INTEGER NOT NULL DEFAULT 0 CHECK (antilink_enabled IN (0, 1)),
        welcome_enabled INTEGER NOT NULL DEFAULT 0 CHECK (welcome_enabled IN (0, 1)),
        goodbye_enabled INTEGER NOT NULL DEFAULT 0 CHECK (goodbye_enabled IN (0, 1)),
        welcome_text TEXT,
        goodbye_text TEXT,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cooldowns (
        jid TEXT NOT NULL,
        command TEXT NOT NULL,
        available_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (jid, command)
      );

      CREATE INDEX IF NOT EXISTS idx_cooldowns_available_at
        ON cooldowns (available_at);
    `);

    this.statements = {
      user: this.db.prepare('SELECT * FROM users WHERE jid = ?'),
      insertUser: this.db.prepare(`
        INSERT INTO users (jid, balance, level, experience, created_at, updated_at)
        VALUES (?, 0, 1, 0, ?, ?)
        ON CONFLICT (jid) DO NOTHING
      `),
      updateUserBalance: this.db.prepare(`
        UPDATE users
        SET balance = MIN(${MAX_BALANCE}, MAX(0, balance + ?)), updated_at = ?
        WHERE jid = ?
      `),
      updateUserProgress: this.db.prepare(`
        UPDATE users
        SET experience = ?, level = ?, updated_at = ?
        WHERE jid = ?
      `),
      group: this.db.prepare('SELECT * FROM group_settings WHERE jid = ?'),
      insertGroup: this.db.prepare(`
        INSERT INTO group_settings (
          jid, prefix, antilink_enabled, welcome_enabled,
          goodbye_enabled, welcome_text, goodbye_text, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (jid) DO NOTHING
      `),
      cooldown: this.db.prepare(
        'SELECT available_at FROM cooldowns WHERE jid = ? AND command = ?',
      ),
      setCooldown: this.db.prepare(`
        INSERT INTO cooldowns (jid, command, available_at, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT (jid, command) DO UPDATE SET
          available_at = excluded.available_at,
          updated_at = excluded.updated_at
      `),
      updateGroup: this.db.prepare(`
        UPDATE group_settings
        SET prefix = ?, antilink_enabled = ?, welcome_enabled = ?,
            goodbye_enabled = ?, welcome_text = ?, goodbye_text = ?, updated_at = ?
        WHERE jid = ?
      `),
    };

    return this;
  }

  #assertReady() {
    if (this.closed || !this.db || !this.statements) {
      throw new Error('DatabaseAdapter is not initialized or is closed');
    }
  }

  #ensureUser(jid, now) {
    this.statements.insertUser.run(jid, now, now);
  }

  #ensureGroup(jid, now) {
    this.statements.insertGroup.run(
      jid,
      GROUP_SETTINGS_DEFAULTS.prefix,
      0,
      0,
      0,
      null,
      null,
      now,
    );
  }

  async getUser(jid) {
    this.#assertReady();
    const row = this.statements.user.get(assertJid(jid));
    return userFromRow(row);
  }

  async addBalance(jid, amount) {
    this.#assertReady();
    const safeJid = assertJid(jid);
    if (!Number.isSafeInteger(amount)) {
      throw new TypeError('amount must be a safe integer');
    }

    return this.writeQueue.add(() => {
      const transaction = this.db.transaction(() => {
        const now = Date.now();
        this.#ensureUser(safeJid, now);
        this.statements.updateUserBalance.run(amount, now, safeJid);
        return userFromRow(this.statements.user.get(safeJid));
      });

      return transaction();
    });
  }

  async addExperience(jid, amount) {
    this.#assertReady();
    const safeJid = assertJid(jid);
    if (!Number.isSafeInteger(amount) || amount < 0) {
      throw new TypeError('experience amount must be a non-negative safe integer');
    }

    return this.writeQueue.add(() => {
      const transaction = this.db.transaction(() => {
        const now = Date.now();
        this.#ensureUser(safeJid, now);
        const current = this.statements.user.get(safeJid);
        const experience = Math.min(Number.MAX_SAFE_INTEGER, current.experience + amount);
        const level = Math.max(1, Math.min(MAX_LEVEL, Math.floor(Math.sqrt(experience / 100)) + 1));
        this.statements.updateUserProgress.run(experience, level, now, safeJid);
        return userFromRow(this.statements.user.get(safeJid));
      });

      return transaction();
    });
  }

  async claimCooldown(jid, command, cooldownMs, now = Date.now()) {
    this.#assertReady();
    const safeJid = assertJid(jid);
    const safeCommand = assertCommand(command);
    if (!Number.isSafeInteger(cooldownMs) || cooldownMs < 0) {
      throw new RangeError('cooldownMs must be a non-negative integer');
    }
    if (!Number.isSafeInteger(now) || now < 0) {
      throw new RangeError('now must be a non-negative safe integer');
    }

    return this.writeQueue.add(() => {
      const transaction = this.db.transaction(() => {
        const existing = this.statements.cooldown.get(safeJid, safeCommand);
        if (existing && existing.available_at > now) {
          return {
            allowed: false,
            availableAt: existing.available_at,
            remainingMs: existing.available_at - now,
          };
        }

        const availableAt = now + cooldownMs;
        this.statements.setCooldown.run(
          safeJid,
          safeCommand,
          availableAt,
          now,
        );

        return {
          allowed: true,
          availableAt,
          remainingMs: 0,
        };
      });

      return transaction();
    });
  }

  async claimCooldownAndApply(
    jid,
    command,
    cooldownMs,
    { balanceDelta = 0, experienceDelta = 0, now = Date.now() } = {},
  ) {
    this.#assertReady();
    const safeJid = assertJid(jid);
    const safeCommand = assertCommand(command);

    if (!Number.isSafeInteger(cooldownMs) || cooldownMs < 0) {
      throw new RangeError('cooldownMs must be a non-negative integer');
    }
    if (!Number.isSafeInteger(balanceDelta)) {
      throw new TypeError('balanceDelta must be a safe integer');
    }
    if (!Number.isSafeInteger(experienceDelta) || experienceDelta < 0) {
      throw new TypeError('experienceDelta must be a non-negative safe integer');
    }
    if (!Number.isSafeInteger(now) || now < 0) {
      throw new RangeError('now must be a non-negative safe integer');
    }

    return this.writeQueue.add(() => {
      const transaction = this.db.transaction(() => {
        const existingCooldown = this.statements.cooldown.get(safeJid, safeCommand);
        if (existingCooldown && existingCooldown.available_at > now) {
          return {
            allowed: false,
            availableAt: existingCooldown.available_at,
            remainingMs: existingCooldown.available_at - now,
            user: userFromRow(this.statements.user.get(safeJid)),
          };
        }

        this.#ensureUser(safeJid, now);
        const current = this.statements.user.get(safeJid);
        const experience = Math.min(
          Number.MAX_SAFE_INTEGER,
          current.experience + experienceDelta,
        );
        const level = Math.max(
          1,
          Math.min(MAX_LEVEL, Math.floor(Math.sqrt(experience / 100)) + 1),
        );
        const availableAt = now + cooldownMs;

        this.statements.setCooldown.run(
          safeJid,
          safeCommand,
          availableAt,
          now,
        );
        this.statements.updateUserBalance.run(balanceDelta, now, safeJid);
        this.statements.updateUserProgress.run(experience, level, now, safeJid);

        return {
          allowed: true,
          availableAt,
          remainingMs: 0,
          user: userFromRow(this.statements.user.get(safeJid)),
        };
      });

      return transaction();
    });
  }

  async getGroupSettings(jid) {
    this.#assertReady();
    const row = this.statements.group.get(assertJid(jid));
    return groupFromRow(row);
  }

  async updateGroupSettings(jid, patch = {}) {
    this.#assertReady();
    const safeJid = assertJid(jid);
    if (!patch || typeof patch !== 'object') {
      throw new TypeError('group settings patch must be an object');
    }

    return this.writeQueue.add(() => {
      const transaction = this.db.transaction(() => {
        const now = Date.now();
        this.#ensureGroup(safeJid, now);
        const current = groupFromRow(this.statements.group.get(safeJid));
        const prefix = patch.prefix === undefined
          ? current.prefix
          : String(patch.prefix).slice(0, 8);
        if (!prefix || !/^\S{1,8}$/u.test(prefix)) {
          throw new Error('group prefix must contain 1 to 8 non-whitespace characters');
        }

        const values = {
          prefix,
          antilinkEnabled: patch.antilinkEnabled === undefined
            ? current.antilinkEnabled
            : Boolean(patch.antilinkEnabled),
          welcomeEnabled: patch.welcomeEnabled === undefined
            ? current.welcomeEnabled
            : Boolean(patch.welcomeEnabled),
          goodbyeEnabled: patch.goodbyeEnabled === undefined
            ? current.goodbyeEnabled
            : Boolean(patch.goodbyeEnabled),
          welcomeText: patch.welcomeText === undefined
            ? current.welcomeText
            : patch.welcomeText === null ? null : String(patch.welcomeText).slice(0, 1024),
          goodbyeText: patch.goodbyeText === undefined
            ? current.goodbyeText
            : patch.goodbyeText === null ? null : String(patch.goodbyeText).slice(0, 1024),
        };

        this.statements.updateGroup.run(
          values.prefix,
          values.antilinkEnabled ? 1 : 0,
          values.welcomeEnabled ? 1 : 0,
          values.goodbyeEnabled ? 1 : 0,
          values.welcomeText,
          values.goodbyeText,
          now,
          safeJid,
        );

        return groupFromRow(this.statements.group.get(safeJid));
      });

      return transaction();
    });
  }

  async close() {
    if (this.closed) {
      return;
    }

    await this.writeQueue.onIdle(5000);
    this.writeQueue.close();
    this.db?.close();
    this.db = null;
    this.statements = null;
    this.closed = true;
  }
}

export async function getSharedDatabase({ filename, logger, busyTimeoutMs } = {}) {
  if (typeof filename !== 'string' || filename.trim() === '') {
    throw new TypeError('filename must be a non-empty string');
  }

  const key = filename === ':memory:' ? filename : resolve(filename);
  let database = sharedDatabaseRegistry.get(key);

  if (database?.closed) {
    sharedDatabaseRegistry.delete(key);
    database = null;
  }

  if (!database) {
    database = new DatabaseAdapter({
      filename: key,
      logger,
      busyTimeoutMs,
    });
    sharedDatabaseRegistry.set(key, database);
  }

  await database.initialize();
  return database;
}

export {
  GROUP_SETTINGS_DEFAULTS,
  MAX_BALANCE,
  MAX_LEVEL,
  normalizeInteger,
};
