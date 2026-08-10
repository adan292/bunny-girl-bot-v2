import {
  generateWAMessageFromContent,
  proto,
} from '@whiskeysockets/baileys';

const MAX_SECTIONS = 20;
const MAX_ROWS_PER_SECTION = 50;
const MAX_OPTIONS = 12;

function text(value, fallback = '', maxLength = 256) {
  return String(value ?? fallback)
    .replace(/[\u0000-\u001F\u007F]/gu, '')
    .slice(0, maxLength);
}

function normalizeSections(sections = []) {
  if (!Array.isArray(sections)) {
    throw new TypeError('sections must be an array');
  }

  return sections.slice(0, MAX_SECTIONS).map((section) => ({
    title: text(section?.title, 'Opciones', 128),
    rows: (Array.isArray(section?.rows) ? section.rows : [])
      .slice(0, MAX_ROWS_PER_SECTION)
      .map((row) => ({
        header: text(row?.header, '', 128),
        title: text(row?.title, 'Opción', 128),
        description: text(row?.description, '', 256),
        id: text(row?.id ?? row?.rowId, '', 128),
      }))
      .filter((row) => row.id),
  })).filter((section) => section.rows.length > 0);
}

/**
 * Build the protobuf InteractiveMessage used by Baileys native flow lists.
 */
export function buildInteractiveListMessage({
  body,
  footer,
  header,
  buttonText = 'Seleccionar',
  sections,
} = {}) {
  const normalizedSections = normalizeSections(sections);
  if (normalizedSections.length === 0) {
    throw new Error('interactive list requires at least one row');
  }

  const buttonParamsJson = JSON.stringify({
    title: text(buttonText, 'Seleccionar', 128),
    sections: normalizedSections,
  });

  return proto.Message.InteractiveMessage.create({
    body: proto.Message.InteractiveMessage.Body.create({
      text: text(body, '', 4096),
    }),
    footer: proto.Message.InteractiveMessage.Footer.create({
      text: text(footer, '', 1024),
    }),
    header: proto.Message.InteractiveMessage.Header.create({
      title: text(header?.title, '', 128),
      subtitle: text(header?.subtitle, '', 128),
      hasMediaAttachment: false,
    }),
    nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
      buttons: [
        proto.Message.InteractiveMessage.NativeFlowMessage.NativeFlowButton.create({
          name: 'single_select',
          buttonParamsJson,
        }),
      ],
      messageVersion: 1,
    }),
  });
}

/**
 * Wrap an InteractiveMessage in a view-once WebMessageInfo-compatible content.
 */
export function buildInteractiveListContent(options = {}) {
  return {
    viewOnceMessage: {
      message: {
        messageContextInfo: {
          deviceListMetadata: {},
          deviceListMetadataVersion: 2,
        },
        interactiveMessage: buildInteractiveListMessage(options),
      },
    },
  };
}

/**
 * Fallback payload for clients where native-flow relay is unavailable.
 */
export function buildLegacyListPayload({
  body,
  footer,
  header,
  buttonText = 'Seleccionar',
  sections,
} = {}) {
  return {
    text: text(body, '', 4096),
    footer: text(footer, '', 1024),
    title: text(header?.title, '', 128),
    buttonText: text(buttonText, 'Seleccionar', 128),
    sections: normalizeSections(sections).map((section) => ({
      title: section.title,
      rows: section.rows.map((row) => ({
        title: row.title,
        description: row.description,
        rowId: row.id,
      })),
    })),
  };
}

/**
 * Send a native-flow list through relayMessage. The caller should wrap this in
 * the outbound queue so interactive payloads obey the same rate limits.
 */
export async function sendInteractiveList(
  socket,
  jid,
  options,
  sendOptions = {},
) {
  if (!socket || typeof socket.relayMessage !== 'function') {
    throw new TypeError('socket.relayMessage is required for native interactive lists');
  }

  const generated = generateWAMessageFromContent(
    jid,
    buildInteractiveListContent(options),
    {
      userJid: socket.user?.id,
      ...sendOptions,
    },
  );

  await socket.relayMessage(jid, generated.message, {
    messageId: generated.key.id,
  });

  return generated;
}

export function buildPollPayload({
  name,
  values,
  selectableCount = 1,
  toAnnouncementGroup = false,
} = {}) {
  const options = Array.isArray(values)
    ? values.map((value) => text(value, '', 128)).filter(Boolean).slice(0, MAX_OPTIONS)
    : [];

  if (options.length < 2) {
    throw new Error('poll requires at least two options');
  }

  return {
    poll: {
      name: text(name, 'Selecciona una opción', 256),
      values: options,
      selectableCount: Math.max(1, Math.min(options.length, selectableCount)),
      toAnnouncementGroup: Boolean(toAnnouncementGroup),
    },
  };
}

/**
 * Build a poll whose visible option values are command strings. Poll votes are
 * encrypted by WhatsApp; the returned commandMap is kept by the caller if it
 * wants to resolve decrypted poll results into commands.
 */
export function buildCommandPoll({ title, commands } = {}) {
  if (!Array.isArray(commands)) {
    throw new TypeError('commands must be an array');
  }

  const commandMap = new Map();
  const values = commands.slice(0, MAX_OPTIONS).map((entry) => {
    const command = text(entry?.command, '', 128);
    const label = text(entry?.label, command, 128);
    if (!command) {
      return null;
    }
    commandMap.set(label, command);
    return label;
  }).filter(Boolean);

  return {
    payload: buildPollPayload({
      name: title,
      values,
      selectableCount: 1,
    }),
    commandMap,
  };
}

export {
  MAX_OPTIONS,
  MAX_ROWS_PER_SECTION,
  MAX_SECTIONS,
  normalizeSections,
};
