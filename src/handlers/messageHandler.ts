import type { proto } from '@whiskeysockets/baileys';
import type { WhatsBot } from '../core/WhatsBot';
import { config } from '../config';
import { getSenderJid, formatNumber, jidNumber, isGroup } from '../utils/jid';
import { getMessageType, getTextContent } from '../utils/messageType';
import { getChatName } from '../utils/groupCache';
import { logIncoming } from '../utils/logger';
import { runCommand } from '../commands';

export async function handleMessage(bot: WhatsBot, msg: proto.IWebMessageInfo): Promise<void> {
  const key = msg.key;
  if (!bot.sock || !msg.message || !key || !key.remoteJid) return;
  if (key.remoteJid === 'status@broadcast') return;

  const chatJid = key.remoteJid;
  const senderJid = key.fromMe
    ? bot.sock.user!.id
    : isGroup(chatJid)
      ? await getSenderJid(bot.sock, key)
      : await getSenderJid(bot.sock, { ...key, participant: chatJid });

  const senderName = msg.pushName || jidNumber(senderJid);
  const type = getMessageType(msg.message);
  const text = getTextContent(msg.message);

  const isCommand = text.startsWith(config.prefix);
  const command = isCommand ? text.slice(config.prefix.length).trim().split(/\s+/)[0] : null;
  const chatName = await getChatName(bot.sock, chatJid);

  logIncoming({
    botLabel: bot.label,
    botName: bot.name,
    senderName,
    senderNumber: formatNumber(senderJid),
    chatName,
    chatId: chatJid,
    command,
    type,
  });

  if (!isCommand || !command) return;

  const args = text.slice(config.prefix.length + command.length).trim().split(/\s+/).filter(Boolean);
  const isOwner = Boolean(key.fromMe) || jidNumber(senderJid) === config.owner;

  await runCommand(command.toLowerCase(), {
    bot,
    sock: bot.sock,
    msg,
    chatJid,
    senderJid,
    args,
    isOwner,
  });
}
