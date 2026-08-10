import { normalizePhoneNumber } from '../utils/phone-number.js';
import { comparableJid } from '../messaging/message-router.js';

const JID_PATTERN = /^[^@\u0000-\u001F]{1,160}@[a-z0-9.-]{1,32}$/iu;

function safeJid(value) {
  return typeof value === 'string' && JID_PATTERN.test(value)
    ? value
    : null;
}

function participantJid(participant) {
  return safeJid(
    participant?.jid
    ?? participant?.id
    ?? participant?.lid
    ?? participant?.phoneNumber,
  );
}

function resolveTargets(message) {
  const targets = [
    ...(message.mentions ?? []),
    message.quoted?.participant,
    ...(message.args ?? []).filter((argument) => JID_PATTERN.test(argument)),
  ];

  for (const argument of message.args ?? []) {
    if (/^\d{8,15}$/u.test(argument)) {
      targets.push(`${normalizePhoneNumber(argument)}@s.whatsapp.net`);
    }
  }

  return [...new Set(targets.map(safeJid).filter(Boolean))];
}

function participantLabel(jid) {
  return `@${jid.split('@')[0].split(':', 1)[0]}`;
}

async function groupMetadata(socket, jid) {
  if (typeof socket.groupMetadata !== 'function') {
    throw new Error('Baileys groupMetadata is unavailable');
  }
  return socket.groupMetadata(jid);
}

async function moderateParticipants({ socket, message, reply, action }) {
  if (!message.isGroup) {
    await reply({ text: 'Este comando solo está disponible en grupos.' });
    return;
  }

  const targets = resolveTargets(message);
  if (targets.length === 0) {
    await reply({ text: `Uso: .${message.command} @usuario` });
    return;
  }

  const botJids = new Set([
    socket.user?.id,
    socket.user?.jid,
    socket.user?.lid,
  ].map(comparableJid).filter(Boolean));
  const safeTargets = targets.filter((jid) => !botJids.has(comparableJid(jid)));

  if (safeTargets.length === 0) {
    await reply({ text: 'No puedo ejecutar esa acción contra el propio bot.' });
    return;
  }

  await socket.groupParticipantsUpdate(
    message.remoteJid,
    safeTargets,
    action,
  );

  await reply({
    text: `${action === 'remove' ? '🗑️ Eliminado' : action === 'promote' ? '⬆️ Promovido' : '⬇️ Degradado'}: ${safeTargets.map(participantLabel).join(', ')}`,
    mentions: safeTargets,
  });
}

async function mentionAll({ socket, message, reply, hidden }) {
  if (!message.isGroup) {
    await reply({ text: 'Este comando solo está disponible en grupos.' });
    return;
  }

  const metadata = await groupMetadata(socket, message.remoteJid);
  const participants = (metadata?.participants ?? [])
    .map(participantJid)
    .filter(Boolean)
    .slice(0, 500);

  if (participants.length === 0) {
    await reply({ text: 'No pude obtener la lista de participantes.' });
    return;
  }

  const text = hidden
    ? (message.argumentText || '📢 Aviso para todos')
    : [
        message.argumentText || '📢 Atención grupo',
        '',
        participants.map(participantLabel).join(' '),
      ].join('\n');

  await reply({
    text: text.slice(0, 4096),
    mentions: participants,
  });
}

function enabledValue(message) {
  const value = message.args[0]?.toLowerCase();
  if (value === 'on' || value === 'sí' || value === 'si' || value === 'true') {
    return true;
  }
  if (value === 'off' || value === 'no' || value === 'false') {
    return false;
  }
  return null;
}

export default {
  name: 'group/admin',
  commands: [
    'kick',
    'promote',
    'demote',
    'tagall',
    'hidetag',
    'antilink',
    'welcome',
    'goodbye',
    'prefix',
  ],
  priority: 30,
  permissions: ['admin', 'bot-admin'],
  cooldownMs: 1000,
  async execute(context) {
    const { message, socket, reply, database } = context;

    try {
      switch (message.command) {
        case 'kick':
          await moderateParticipants({
            socket,
            message,
            reply,
            action: 'remove',
          });
          break;

        case 'promote':
          await moderateParticipants({
            socket,
            message,
            reply,
            action: 'promote',
          });
          break;

        case 'demote':
          await moderateParticipants({
            socket,
            message,
            reply,
            action: 'demote',
          });
          break;

        case 'tagall':
          await mentionAll({ socket, message, reply, hidden: false });
          break;

        case 'hidetag':
          await mentionAll({ socket, message, reply, hidden: true });
          break;

        case 'antilink': {
          const enabled = enabledValue(message);
          if (enabled === null) {
            await reply({ text: 'Uso: .antilink on|off' });
            break;
          }
          const settings = await database.updateGroupSettings(
            message.remoteJid,
            { antilinkEnabled: enabled },
          );
          await reply({ text: `Anti-link ${settings.antilinkEnabled ? 'activado' : 'desactivado'}.` });
          break;
        }

        case 'welcome':
        case 'goodbye': {
          const enabled = enabledValue(message);
          if (enabled === null) {
            await reply({ text: `Uso: .${message.command} on|off [texto]` });
            break;
          }
          const text = message.args.slice(1).join(' ').trim();
          const patch = message.command === 'welcome'
            ? { welcomeEnabled: enabled, ...(text ? { welcomeText: text } : {}) }
            : { goodbyeEnabled: enabled, ...(text ? { goodbyeText: text } : {}) };
          await database.updateGroupSettings(message.remoteJid, patch);
          await reply({ text: `${message.command === 'welcome' ? 'Bienvenidas' : 'Despedidas'} ${enabled ? 'activadas' : 'desactivadas'}.` });
          break;
        }

        case 'prefix': {
          const prefix = message.args[0];
          if (!prefix || /^\s|\s$/u.test(prefix) || prefix.length > 8) {
            await reply({ text: 'Uso: .prefix !' });
            break;
          }
          const settings = await database.updateGroupSettings(
            message.remoteJid,
            { prefix },
          );
          await reply({ text: `Prefijo del grupo actualizado a *${settings.prefix}*.` });
          break;
        }

        default:
          return { handled: false };
      }
    } catch (error) {
      context.logger?.error?.({ err: error, jid: message.remoteJid }, 'Group admin command failed');
      await reply({ text: 'No pude completar la operación de administración.' });
    }

    return { handled: true };
  },
};

export {
  resolveTargets,
  safeJid,
};
