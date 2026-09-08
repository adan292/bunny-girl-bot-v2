import { subbotManager } from '../core/SubbotManager';
import { listSubbots } from '../db/botsRepo';
import { formatNumber } from '../utils/jid';
import type { CommandHandler } from './types';

export const serbot: CommandHandler = async ({ sock, chatJid, args, isOwner, msg }) => {
  if (!isOwner) return;
  const number = args[0]?.replace(/\D/g, '');
  if (!number) {
    await sock.sendMessage(chatJid, { text: 'Uso: .serbot <numero>' }, { quoted: msg });
    return;
  }

  await sock.sendMessage(chatJid, { text: `Generando código de vinculación para ${number}...` }, { quoted: msg });
  await subbotManager.create(number);
};

export const delbot: CommandHandler = async ({ sock, chatJid, args, isOwner, msg }) => {
  if (!isOwner) return;
  const number = args[0]?.replace(/\D/g, '');
  if (!number) {
    await sock.sendMessage(chatJid, { text: 'Uso: .delbot <numero>' }, { quoted: msg });
    return;
  }
  await subbotManager.remove(number);
  await sock.sendMessage(chatJid, { text: `Subbot ${number} eliminado.` }, { quoted: msg });
};

export const listbots: CommandHandler = async ({ sock, chatJid, msg }) => {
  const rows = listSubbots();
  if (!rows.length) {
    await sock.sendMessage(chatJid, { text: 'No hay subbots activos.' }, { quoted: msg });
    return;
  }
  const text = rows
    .map((r) => `${formatNumber(r.id + '@s.whatsapp.net')} — ${r.name} (${r.status})`)
    .join('\n');
  await sock.sendMessage(chatJid, { text }, { quoted: msg });
};
