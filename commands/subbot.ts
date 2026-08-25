import { subbotManager } from '../core/SubbotManager';
import { listSubbots } from '../db/botsRepo';
import { formatNumber } from '../utils/jid';
import type { CommandDefinition } from './types';

const serbot: CommandDefinition = {
  name: 'serbot',
  description: 'Vincula un subbot con un número',
  ownerOnly: true,
  handler: async ({ sock, chatJid, args, isOwner, msg }) => {
    if (!isOwner) return;
    const number = args[0]?.replace(/\D/g, '');
    if (!number) {
      await sock.sendMessage(chatJid, { text: 'Uso: .serbot <numero>' }, { quoted: msg });
      return;
    }

    await sock.sendMessage(chatJid, { text: `Generando código de vinculación para ${number}...` }, { quoted: msg });
    await subbotManager.create(number);
  },
};

const delbot: CommandDefinition = {
  name: 'delbot',
  description: 'Elimina un subbot vinculado',
  ownerOnly: true,
  handler: async ({ sock, chatJid, args, isOwner, msg }) => {
    if (!isOwner) return;
    const number = args[0]?.replace(/\D/g, '');
    if (!number) {
      await sock.sendMessage(chatJid, { text: 'Uso: .delbot <numero>' }, { quoted: msg });
      return;
    }
    await subbotManager.remove(number);
    await sock.sendMessage(chatJid, { text: `Subbot ${number} eliminado.` }, { quoted: msg });
  },
};

const listbots: CommandDefinition = {
  name: 'listbots',
  description: 'Lista los subbots activos',
  handler: async ({ sock, chatJid, msg }) => {
    const rows = listSubbots();
    if (!rows.length) {
      await sock.sendMessage(chatJid, { text: 'No hay subbots activos.' }, { quoted: msg });
      return;
    }
    const text = rows
      .map((r) => `${formatNumber(r.id + '@s.whatsapp.net')} — ${r.name} (${r.status})`)
      .join('\n');
    await sock.sendMessage(chatJid, { text }, { quoted: msg });
  },
};

export default [serbot, delbot, listbots];
