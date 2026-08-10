const ZERO_WIDTH = /[\u200B-\u200D\u2060\uFEFF]/g;
const DISALLOWED_CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const JID_PATTERN = /^[^@\u0000-\u001F]{1,160}@[a-z0-9.-]{1,32}$/i;
const MAX_RAW_MULTIPLIER = 4;

function unwrapMessage(message) {
  let current = message;
  for (let depth = 0; depth < 6 && current && typeof current === 'object'; depth += 1) {
    const wrapper = current.ephemeralMessage
      ?? current.viewOnceMessage
      ?? current.viewOnceMessageV2
      ?? current.viewOnceMessageV2Extension
      ?? current.documentWithCaptionMessage;
    if (!wrapper) {
      return current;
    }
    current = wrapper.message ?? wrapper;
  }
  return current;
}

function extractText(message) {
  const value = unwrapMessage(message);
  if (!value || typeof value !== 'object') {
    return '';
  }

  const candidates = [
    value.conversation,
    value.extendedTextMessage?.text,
    value.imageMessage?.caption,
    value.videoMessage?.caption,
    value.documentMessage?.caption,
    value.documentWithCaptionMessage?.message?.documentMessage?.caption,
  ];

  return candidates.find((candidate) => typeof candidate === 'string') ?? '';
}

function sanitizeText(value, maxLength) {
  if (typeof value !== 'string') {
    return { accepted: false, reason: 'text-not-string', text: '' };
  }
  if (value.length > maxLength * MAX_RAW_MULTIPLIER) {
    return { accepted: false, reason: 'raw-text-too-large', text: '' };
  }

  const text = value
    .normalize('NFKC')
    .replace(ZERO_WIDTH, '')
    .replace(DISALLOWED_CONTROL, '')
    .trim();

  if (text.length > maxLength) {
    return { accepted: false, reason: 'text-too-large', text: '' };
  }

  return { accepted: true, reason: null, text };
}

function safeId(value) {
  return typeof value === 'string' && value.length <= 128 && !/[\u0000-\u001F]/.test(value)
    ? value
    : null;
}

/**
 * Convert a Baileys message into the small, trusted context used by plugins.
 * The raw message is retained separately by the router and is never parsed as
 * JSON or stringified in the hot path.
 */
export function normalizeIncomingMessage(raw, { maxTextLength = 4096 } = {}) {
  if (!raw || typeof raw !== 'object' || !raw.key || typeof raw.key !== 'object') {
    return { accepted: false, reason: 'missing-message-key', message: null };
  }

  const remoteJid = typeof raw.key.remoteJid === 'string' ? raw.key.remoteJid : '';
  if (!JID_PATTERN.test(remoteJid)) {
    return { accepted: false, reason: 'invalid-remote-jid', message: null };
  }

  const id = safeId(raw.key.id) ?? `unknown-${Date.now().toString(36)}`;
  const textResult = sanitizeText(extractText(raw.message), maxTextLength);
  if (!textResult.accepted) {
    return { accepted: false, reason: textResult.reason, message: null, id, remoteJid };
  }

  const participant = typeof raw.key.participant === 'string' && JID_PATTERN.test(raw.key.participant)
    ? raw.key.participant
    : null;

  return {
    accepted: true,
    reason: null,
    message: Object.freeze({
      id,
      remoteJid,
      participant,
      fromMe: raw.key.fromMe === true,
      text: textResult.text,
      timestamp: raw.messageTimestamp ?? null,
      pushName: typeof raw.pushName === 'string' ? raw.pushName.slice(0, 128) : null,
    }),
  };
}

export function isCommandText(text) {
  return typeof text === 'string' && /^[./!][^\s]{1,64}(?:\s|$)/u.test(text);
}
