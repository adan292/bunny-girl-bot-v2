import { BoundedTaskPool } from './serial-queue.js';
import { normalizeIncomingMessage } from './message-normalizer.js';

function comparableJid(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim().toLowerCase();
  const separator = trimmed.indexOf('@');
  if (separator <= 0) {
    return null;
  }

  const user = trimmed.slice(0, separator).split(':', 1)[0];
  const server = trimmed.slice(separator + 1);

  return user && server ? `${user}@${server}` : null;
}

function participantJid(participant) {
  if (!participant || typeof participant !== 'object') {
    return null;
  }

  return comparableJid(
    participant.jid
    ?? participant.id
    ?? participant.lid
    ?? participant.phoneNumber,
  );
}

function isAdminParticipant(participant) {
  return participant?.admin === 'admin'
    || participant?.admin === 'superadmin'
    || participant?.role === 'admin'
    || participant?.role === 'superadmin';
}

async function withTimeout(promise, timeoutMs, label) {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 100) {
    return promise;
  }

  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(Object.assign(
        new Error(`${label} timed out after ${timeoutMs} ms`),
        { code: 'PERMISSION_LOOKUP_TIMEOUT' },
      ));
    }, timeoutMs);
    timer.unref?.();
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

function ownerJidSet(ownerJids) {
  return new Set((Array.isArray(ownerJids) ? ownerJids : [])
    .map((jid) => comparableJid(jid))
    .filter(Boolean));
}

/**
 * Inbound command router. Normalization happens before permissions or plugin
 * execution, so every plugin receives the same bounded message contract.
 */
export class MessageRouter {
  constructor({
    config = {},
    pluginManager,
    outboundQueue,
    diagnostics,
    logger,
    ownerJids = config.ownerJids ?? [],
    permissionTimeoutMs = config.permissionTimeoutMs ?? 5000,
    maxTextLength = config.maxTextLength ?? 4096,
    maxBatch = config.maxInboundBatch ?? 50,
    concurrency = config.maxPluginConcurrency ?? 8,
    maxQueue = config.maxPluginQueue ?? 100,
    prefixes = config.commandPrefixes ?? ['.', '/', '!'],
  }) {
    if (!pluginManager || !outboundQueue || !diagnostics || !logger) {
      throw new TypeError(
        'MessageRouter requires pluginManager, outboundQueue, diagnostics and logger',
      );
    }

    this.config = config;
    this.pluginManager = pluginManager;
    this.outboundQueue = outboundQueue;
    this.diagnostics = diagnostics;
    this.logger = logger;
    this.ownerJids = ownerJidSet(ownerJids);
    this.permissionTimeoutMs = permissionTimeoutMs;
    this.maxTextLength = maxTextLength;
    this.maxBatch = maxBatch;
    this.prefixes = prefixes;
    this.pool = new BoundedTaskPool({ concurrency, maxQueue });
    this.groupMetadataCache = new Map();
    this.groupMetadataTtlMs = config.groupMetadataTtlMs ?? 30000;
  }

  handleEvent({ socket, event, signal }) {
    if (!event || !Array.isArray(event.messages)) {
      return Promise.resolve();
    }

    const messages = event.messages.slice(0, this.maxBatch);

    if (event.messages.length > messages.length) {
      this.logger.warn({
        received: event.messages.length,
        accepted: messages.length,
      }, 'Inbound batch truncated');
    }

    const tasks = messages.map((raw) => this.pool.run(
      () => this.#handleOne({ socket, raw, signal }),
    ));

    return Promise.allSettled(tasks).then((results) => {
      for (const result of results) {
        if (result.status === 'rejected') {
          this.logger.error({
            err: result.reason,
          }, 'Inbound message task failed outside plugin boundary');
        }
      }
    });
  }

  async #handleOne({ socket, raw, signal }) {
    const normalized = normalizeIncomingMessage(raw, {
      maxTextLength: this.maxTextLength,
      prefixes: this.prefixes,
    });

    if (!normalized.accepted) {
      this.diagnostics.malformedMessage({
        reason: normalized.reason,
        messageId: normalized.id,
        jid: normalized.remoteJid,
      });
      return;
    }

    const message = normalized.message;

    if (message.fromMe || !message.text) {
      return;
    }

    const permissions = await this.#resolvePermissions(socket, message);

    const context = {
      socket,
      raw,
      message,
      permissions,
      config: this.config,
      logger: this.logger,
      signal,
      reply: (payload, options = {}) => this.#send(
        socket,
        message.remoteJid,
        payload,
        signal,
        options.quoted === false ? undefined : { quoted: raw },
      ),
      send: (jid, payload, options) => this.#send(
        socket,
        jid,
        payload,
        signal,
        options,
      ),
    };

    await this.pluginManager.dispatch(context, this.diagnostics);
  }

  #send(socket, jid, payload, signal, options) {
    return this.outboundQueue.enqueue({
      jid,
      signal,
      task: () => socket.sendMessage(jid, payload, options),
    });
  }

  async #resolvePermissions(socket, message) {
    const sender = comparableJid(message.senderJid);
    const owner = Boolean(sender && this.ownerJids.has(sender));
    const base = {
      user: true,
      owner,
      admin: false,
      botAdmin: false,
      isGroup: message.isGroup,
      senderJid: message.senderJid,
    };

    if (!message.isGroup || typeof socket?.groupMetadata !== 'function') {
      return Object.freeze(base);
    }

    let metadata;
    try {
      metadata = await this.#groupMetadata(socket, message.remoteJid);
    } catch (error) {
      this.logger.warn({
        err: error,
        jid: message.remoteJid,
      }, 'Group permission lookup failed; applying least privilege');
      return Object.freeze(base);
    }

    const participants = Array.isArray(metadata?.participants)
      ? metadata.participants
      : [];
    const senderParticipant = sender
      ? participants.find((participant) => participantJid(participant) === sender)
      : undefined;

    const botCandidates = [
      socket.user?.id,
      socket.user?.jid,
      socket.user?.lid,
    ]
      .map((jid) => comparableJid(jid))
      .filter(Boolean);

    const botParticipant = participants.find((participant) => (
      botCandidates.includes(participantJid(participant))
    ));

    return Object.freeze({
      ...base,
      admin: Boolean(senderParticipant && isAdminParticipant(senderParticipant)),
      botAdmin: Boolean(botParticipant && isAdminParticipant(botParticipant)),
    });
  }

  async #groupMetadata(socket, jid) {
    const cached = this.groupMetadataCache.get(jid);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const value = await withTimeout(
      socket.groupMetadata(jid),
      this.permissionTimeoutMs,
      'group metadata lookup',
    );

    this.groupMetadataCache.set(jid, {
      value,
      expiresAt: Date.now() + this.groupMetadataTtlMs,
    });

    if (this.groupMetadataCache.size > 1000) {
      this.#cleanupMetadataCache();
    }

    return value;
  }

  #cleanupMetadataCache() {
    const now = Date.now();
    for (const [jid, entry] of this.groupMetadataCache) {
      if (entry.expiresAt <= now) {
        this.groupMetadataCache.delete(jid);
      }
    }
  }

  close() {
    this.pool.close();
    this.groupMetadataCache.clear();
  }
}

export {
  comparableJid,
  isAdminParticipant,
};
