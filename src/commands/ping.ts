import type { CommandHandler } from './types';

export const ping: CommandHandler = async ({ sock, chatJid, msg }) => {
  const start = Date.now();
  await sock.sendMessage(chatJid, { text: `Pong: ${Date.now() - start}ms` }, { quoted: msg });
};
