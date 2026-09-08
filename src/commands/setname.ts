import { setBotName } from '../db/botsRepo';
import type { CommandHandler } from './types';

export const setname: CommandHandler = async ({ bot, sock, chatJid, args, isOwner, msg }) => {
  if (!isOwner) {
    await sock.sendMessage(chatJid, { text: 'Solo el owner puede usar este comando.' }, { quoted: msg });
    return;
  }

  const name = args.join(' ').trim();
  if (!name) {
    await sock.sendMessage(chatJid, { text: `Uso: .setname <nombre>` }, { quoted: msg });
    return;
  }

  setBotName(bot.id, name);
  await sock.sendMessage(chatJid, { text: `Nombre actualizado a: ${name}` }, { quoted: msg });
};
