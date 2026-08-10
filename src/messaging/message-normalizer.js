const ZERO_WIDTH = /[\u200B-\u200D\u2060\uFEFF]/g;
const DISALLOWED_CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const JID_PATTERN = /^[^@\u0000-\u001F]{1,160}@[a-z0-9.-]{1,32}$/iu;
const COMMAND_PATTERN = /^[\p{L}\p{N}_:-]{1,64}$/u;
const MAX_RAW_MULTIPLIER = 4;
const DEFAULT_PREFIXES = Object.freeze(['.', '/', '!']);
const INTERACTIVE_JSON_LIMIT = 8192;

function safeId(value) {
  return typeof value === 'string'
    && value.length <= 128
    && !/[\u0000-\u001F]/u.test(value)
    ? value
    : null;
}

function safeJid(value) {
  return typeof value === 'string' && JID_PATTERN.test(value)
    ? value
    : null;
}

function sanitizeScalar(value, maxLength = 256) {
  if (typeof value !== 'string') {
    return null;
  }

  return value
    .normalize('NFKC')
    .replace(ZERO_WIDTH, '')
    .replace(DISALLOWED_CONTROL, '')
    .slice(0, maxLength)
    .trim();
}

export function unwrapMessage(message) {
  let current = message;

  for (
    let depth = 0;
    depth < 8 && current && typeof current === 'object';
    depth += 1
  ) {
    const wrapper = current.ephemeralMessage
      ?? current.viewOnceMessage
      ?? current.viewOnceMessageV2
      ?? current.viewOnceMessageV2Extension
      ?? current.documentWithCaptionMessage
      ?? current.editedMessage
      ?? current.associatedChildMessage;

    if (!wrapper) {
      return current;
    }

    current = wrapper.message ?? wrapper;
  }

  return current;
}

function contextInfoFor(message) {
  const value = unwrapMessage(message);
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidates = [
    value.extendedTextMessage?.contextInfo,
    value.imageMessage?.contextInfo,
    value.videoMessage?.contextInfo,
    value.audioMessage?.contextInfo,
    value.documentMessage?.contextInfo,
    value.buttonsResponseMessage?.contextInfo,
    value.listResponseMessage?.contextInfo,
    value.templateButtonReplyMessage?.contextInfo,
    value.interactiveResponseMessage?.contextInfo,
    value.messageContextInfo,
    value.contextInfo,
  ];

  return candidates.find((candidate) => (
    candidate && typeof candidate === 'object'
  )) ?? null;
}

function parseBoundedJson(value) {
  if (typeof value !== 'string' || value.length > INTERACTIVE_JSON_LIMIT) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function interactiveResult(type, id, title, extra = {}) {
  const safeInteractionId = sanitizeScalar(id, 256);
  if (!safeInteractionId) {
    return null;
  }

  return Object.freeze({
    type,
    id: safeInteractionId,
    title: sanitizeScalar(title, 256),
    ...extra,
  });
}

export function extractInteractive(message) {
  const value = unwrapMessage(message);
  if (!value || typeof value !== 'object') {
    return null;
  }

  const button = value.buttonsResponseMessage;
  if (button) {
    return interactiveResult(
      'button',
      button.selectedButtonId,
      button.selectedDisplayText,
    );
  }

  const list = value.listResponseMessage;
  if (list) {
    return interactiveResult(
      'list',
      list.singleSelectReply?.selectedRowId,
      list.title ?? list.description,
    );
  }

  const template = value.templateButtonReplyMessage;
  if (template) {
    return interactiveResult(
      'template-button',
      template.selectedId,
      template.selectedDisplayText,
    );
  }

  const interactive = value.interactiveResponseMessage;
  const nativeFlow = interactive?.nativeFlowResponseMessage;
  if (nativeFlow) {
    const params = parseBoundedJson(nativeFlow.paramsJson);
    const id = params?.id
      ?? params?.button_id
      ?? params?.buttonId
      ?? params?.selectedId
      ?? params?.rowId
      ?? params?.command;

    return interactiveResult(
      'native-flow',
      id,
      params?.title ?? params?.displayText,
      { params },
    );
  }

  return null;
}

export function extractText(message) {
  const value = unwrapMessage(message);
  if (!value || typeof value !== 'object') {
    return {
      text: '',
      source: 'empty',
    };
  }

  const candidates = [
    ['conversation', value.conversation],
    ['extended-text', value.extendedTextMessage?.text],
    ['image-caption', value.imageMessage?.caption],
    ['video-caption', value.videoMessage?.caption],
    ['document-caption', value.documentMessage?.caption],
    [
      'document-caption',
      value.documentWithCaptionMessage?.message?.documentMessage?.caption,
    ],
  ];

  const candidate = candidates.find(([, text]) => typeof text === 'string');
  if (candidate) {
    return {
      text: candidate[1],
      source: candidate[0],
    };
  }

  const interactive = extractInteractive(value);
  if (interactive?.id) {
    return {
      text: interactive.id,
      source: 'interactive',
    };
  }

  return {
    text: '',
    source: 'empty',
  };
}

function sanitizeText(value, maxLength) {
  if (typeof value !== 'string') {
    return {
      accepted: false,
      reason: 'text-not-string',
      text: '',
    };
  }

  if (value.length > maxLength * MAX_RAW_MULTIPLIER) {
    return {
      accepted: false,
      reason: 'raw-text-too-large',
      text: '',
    };
  }

  const text = value
    .normalize('NFKC')
    .replace(ZERO_WIDTH, '')
    .replace(DISALLOWED_CONTROL, '')
    .trim();

  if (text.length > maxLength) {
    return {
      accepted: false,
      reason: 'text-too-large',
      text: '',
    };
  }

  return {
    accepted: true,
    reason: null,
    text,
  };
}

function tokenizeArguments(value, {
  maxArgs = 64,
  maxArgLength = 512,
} = {}) {
  const args = [];
  let current = '';
  let quote = null;
  let escaped = false;

  const push = () => {
    if (current.length > 0) {
      args.push(current.slice(0, maxArgLength));
      current = '';
    }
  };

  for (const character of value) {
    if (escaped) {
      current += character;
      escaped = false;
      continue;
    }

    if (character === '\\') {
      escaped = true;
      continue;
    }

    if (quote) {
      if (character === quote) {
        quote = null;
      } else {
        current += character;
      }
      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
    } else if (/\s/u.test(character)) {
      push();
    } else {
      current += character;
    }

    if (args.length >= maxArgs) {
      break;
    }
  }

  if (escaped) {
    current += '\\';
  }

  if (args.length < maxArgs) {
    push();
  }

  return args.slice(0, maxArgs);
}

export function parseCommand(text, {
  prefixes = DEFAULT_PREFIXES,
  maxArgs = 64,
  maxArgLength = 512,
} = {}) {
  const allowedPrefixes = new Set(
    prefixes.filter((prefix) => typeof prefix === 'string' && prefix.length === 1),
  );

  if (!text || allowedPrefixes.size === 0 || !allowedPrefixes.has(text[0])) {
    return {
      prefix: null,
      command: null,
      args: [],
      argumentText: '',
      isCommand: false,
    };
  }

  const separator = text.search(/\s/u);
  const commandEnd = separator === -1 ? text.length : separator;
  const rawCommand = text.slice(1, commandEnd).toLocaleLowerCase('en-US');

  if (!COMMAND_PATTERN.test(rawCommand)) {
    return {
      prefix: text[0],
      command: null,
      args: [],
      argumentText: '',
      isCommand: false,
    };
  }

  const argumentText = separator === -1
    ? ''
    : text.slice(separator).trim();

  return {
    prefix: text[0],
    command: rawCommand,
    args: tokenizeArguments(argumentText, { maxArgs, maxArgLength }),
    argumentText,
    isCommand: true,
  };
}

function extractMentions(info) {
  if (!Array.isArray(info?.mentionedJid)) {
    return [];
  }

  return [...new Set(info.mentionedJid
    .map((jid) => safeJid(jid))
    .filter(Boolean))];
}

function normalizeQuotedMessage(info, remoteJid) {
  if (!info?.quotedMessage || typeof info.quotedMessage !== 'object') {
    return null;
  }

  const quotedText = sanitizeText(
    extractText(info.quotedMessage).text,
    4096,
  );

  return Object.freeze({
    id: safeId(info.stanzaId),
    participant: safeJid(info.participant),
    remoteJid: safeJid(info.remoteJid) ?? remoteJid,
    fromMe: info.fromMe === true,
    text: quotedText.accepted ? quotedText.text : '',
  });
}

function contentType(message) {
  const value = unwrapMessage(message);
  if (!value || typeof value !== 'object') {
    return 'unknown';
  }

  const knownTypes = [
    'conversation',
    'extendedTextMessage',
    'imageMessage',
    'videoMessage',
    'audioMessage',
    'documentMessage',
    'stickerMessage',
    'buttonsResponseMessage',
    'listResponseMessage',
    'templateButtonReplyMessage',
    'interactiveResponseMessage',
    'contactMessage',
    'contactsArrayMessage',
    'locationMessage',
    'liveLocationMessage',
    'reactionMessage',
  ];

  return knownTypes.find((type) => value[type] !== undefined) ?? 'unknown';
}

/**
 * Convert a Baileys message into a bounded, trusted plugin context.
 */
export function normalizeIncomingMessage(raw, {
  maxTextLength = 4096,
  prefixes = DEFAULT_PREFIXES,
  maxArgs = 64,
  maxArgLength = 512,
} = {}) {
  if (
    !raw
    || typeof raw !== 'object'
    || !raw.key
    || typeof raw.key !== 'object'
  ) {
    return {
      accepted: false,
      reason: 'missing-message-key',
      message: null,
    };
  }

  const remoteJid = safeJid(raw.key.remoteJid);
  if (!remoteJid) {
    return {
      accepted: false,
      reason: 'invalid-remote-jid',
      message: null,
    };
  }

  const id = safeId(raw.key.id) ?? `unknown-${Date.now().toString(36)}`;
  const extracted = extractText(raw.message);
  const textResult = sanitizeText(extracted.text, maxTextLength);

  if (!textResult.accepted) {
    return {
      accepted: false,
      reason: textResult.reason,
      message: null,
      id,
      remoteJid,
    };
  }

  const info = contextInfoFor(raw.message);
  const interactive = extractInteractive(raw.message);
  const commandData = parseCommand(textResult.text, {
    prefixes,
    maxArgs,
    maxArgLength,
  });
  const senderJid = safeJid(raw.key.participant) ?? remoteJid;
  const participant = safeJid(raw.key.participant);

  return {
    accepted: true,
    reason: null,
    message: Object.freeze({
      id,
      remoteJid,
      senderJid,
      participant,
      isGroup: remoteJid.endsWith('@g.us'),
      fromMe: raw.key.fromMe === true,
      text: textResult.text,
      textSource: extracted.source,
      contentType: contentType(raw.message),
      prefix: commandData.prefix,
      command: commandData.command,
      args: Object.freeze([...commandData.args]),
      argumentText: commandData.argumentText,
      isCommand: commandData.isCommand,
      mentions: Object.freeze(extractMentions(info)),
      quoted: normalizeQuotedMessage(info, remoteJid),
      interactive,
      timestamp: raw.messageTimestamp ?? null,
      pushName: sanitizeScalar(raw.pushName, 128),
    }),
  };
}

export function isCommandText(text, options = {}) {
  return parseCommand(text, options).isCommand;
}

export {
  DEFAULT_PREFIXES,
  JID_PATTERN,
  sanitizeText,
  tokenizeArguments,
};
