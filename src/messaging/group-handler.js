import { normalizeIncomingMessage } from './message-normalizer.js';

const LINK_PATTERN = /(?:https?:\/\/|www\.|(?:[a-z0-9-]+\.)+(?:com|net|org|io|co|me|ly|gg|tv|xyz|app)\b)/iu;
const JID_PATTERN = /^[^@\u0000-\u001F]{1,160}@[a-z0-9.-]{1,32}$/iu;

function safeJid(value) {
  return typeof value === 'string' && JID_PATTERN.test(value)
    ? value
    : null;
}

function comparableJid(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.toLowerCase();
  const separator = trimmed.indexOf('@');
  if (separator <= 0) {
    return null;
  }

  return `${trimmed.slice(0, separator).split(':', 1)[0]}@${trimmed.slice(separator + 1)}`;
}

function isAdmin(participant) {
  return participant?.admin === 'admin'
    || participant?.admin === 'superadmin'
    || participant?.role === 'admin'
    || participant?.role === 'superadmin';
}

function participantId(participant) {
  return comparableJid(
    participant?.jid
    ?? participant?.id
    ?? participant?.lid
    ?? participant?.phoneNumber,
  );
}

function renderTemplate(template, { user, group }) {
  return String(template)
    .replace(/\{\{user\}\}/gu, `@${user.split('@')[0]}`)
    .replace(/\{\{group\}\}/gu, group)
    .slice(0, 2048);
}

/**
 * Group event listener and anti-link enforcement layer. It attaches to each
 * disposable Baileys socket and returns a disposer for socket replacement.
 */
export class GroupHandler {
  constructor({ database, outboundQueue, logger, config = {} } = {}) {
    if (!database || !outboundQueue || !logger) {
      throw new TypeError('GroupHandler requires database, outboundQueue and logger');
    }

    this.database = database;
    this.outboundQueue = outboundQueue;
    this.logger = logger;
    this.config = config;
    this.bindings = new Map();
    this.metadataCache = new Map();
    this.metadataTtlMs = config.groupMetadataTtlMs ?? 30000;
  }

  attach(socket) {
    if (!socket?.ev || this.bindings.has(socket)) {
      return this.bindings.get(socket) ?? (() => {});
    }

    const participantListener = (event) => {
      void this.handleParticipantsUpdate(socket, event).catch((error) => {
        this.logger.error({ err: error }, 'Group participant handler failed');
      });
    };
    const messageListener = (event) => {
      void this.handleAntiLink(socket, event).catch((error) => {
        this.logger.error({ err: error }, 'Anti-link handler failed');
      });
    };

    socket.ev.on('group-participants.update', participantListener);
    socket.ev.on('messages.upsert', messageListener);

    const dispose = () => {
      socket.ev.off?.('group-participants.update', participantListener);
      socket.ev.off?.('messages.upsert', messageListener);
      socket.ev.removeListener?.('group-participants.update', participantListener);
      socket.ev.removeListener?.('messages.upsert', messageListener);
      this.bindings.delete(socket);
    };

    this.bindings.set(socket, dispose);
    return dispose;
  }

  async handleParticipantsUpdate(socket, event) {
    const groupJid = safeJid(event?.id);
    const participants = Array.isArray(event?.participants)
      ? event.participants.map((jid) => safeJid(jid)).filter(Boolean).slice(0, 100)
      : [];

    if (!groupJid || !groupJid.endsWith('@g.us') || participants.length === 0) {
      return;
    }

    const settings = await this.database.getGroupSettings(groupJid);
    const isWelcome = event.action === 'add' && settings.welcomeEnabled;
    const isGoodbye = event.action === 'remove' && settings.goodbyeEnabled;

    if (!isWelcome && !isGoodbye) {
      return;
    }

    const template = isWelcome
      ? settings.welcomeText ?? '👋 Bienvenido/a {{user}} a *{{group}}*.'
      : settings.goodbyeText ?? '👋 {{user}} ha salido de *{{group}}*.';
    const groupName = await this.#groupName(socket, groupJid);
    const text = participants
      .map((participant) => renderTemplate(template, {
        user: participant,
        group: groupName,
      }))
      .join('\n');

    await this.#send(socket, groupJid, {
      text,
      mentions: participants,
    });
  }

  async handleAntiLink(socket, event) {
    if (!Array.isArray(event?.messages)) {
      return;
    }

    for (const raw of event.messages.slice(0, 50)) {
      if (raw?.key?.fromMe) {
        continue;
      }

      const groupJid = raw?.key?.remoteJid;
      if (typeof groupJid !== 'string' || !groupJid.endsWith('@g.us')) {
        continue;
      }

      const normalized = normalizeIncomingMessage(raw, {
        maxTextLength: this.config.maxTextLength ?? 4096,
      });
      if (!normalized.accepted || !normalized.message.text || !LINK_PATTERN.test(normalized.message.text)) {
        continue;
      }

      const settings = await this.database.getGroupSettings(groupJid);
      if (!settings.antilinkEnabled) {
        continue;
      }

      const metadata = await this.#metadata(socket, groupJid);
      const sender = comparableJid(normalized.message.senderJid);
      const senderParticipant = metadata?.participants?.find(
        (participant) => participantId(participant) === sender,
      );
      const botCandidates = [socket.user?.id, socket.user?.jid, socket.user?.lid]
        .map((jid) => comparableJid(jid))
        .filter(Boolean);
      const botParticipant = metadata?.participants?.find(
        (participant) => botCandidates.includes(participantId(participant)),
      );

      if (isAdmin(senderParticipant) || !isAdmin(botParticipant)) {
        continue;
      }

      await this.#send(socket, groupJid, { delete: raw.key });

      if (this.config.antilinkRemoveUser === true && sender) {
        try {
          await socket.groupParticipantsUpdate(groupJid, [sender], 'remove');
        } catch (error) {
          this.logger.warn({ err: error, jid: groupJid }, 'Anti-link participant removal failed');
        }
      }
    }
  }

  async #metadata(socket, groupJid) {
    const cached = this.metadataCache.get(groupJid);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    if (typeof socket.groupMetadata !== 'function') {
      return null;
    }

    const value = await socket.groupMetadata(groupJid);
    this.metadataCache.set(groupJid, {
      value,
      expiresAt: Date.now() + this.metadataTtlMs,
    });
    return value;
  }

  async #groupName(socket, groupJid) {
    try {
      const metadata = await this.#metadata(socket, groupJid);
      return String(metadata?.subject ?? 'este grupo').slice(0, 128);
    } catch {
      return 'este grupo';
    }
  }

  #send(socket, jid, payload) {
    return this.outboundQueue.enqueue({
      jid,
      task: () => socket.sendMessage(jid, payload),
    });
  }

  close() {
    for (const dispose of this.bindings.values()) {
      dispose();
    }
    this.bindings.clear();
    this.metadataCache.clear();
  }
}

export {
  LINK_PATTERN,
  comparableJid,
  isAdmin,
};
