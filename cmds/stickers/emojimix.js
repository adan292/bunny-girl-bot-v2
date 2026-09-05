import fetch from 'node-fetch';
import fs from 'fs';
import db from '#db';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchBuffer(url, intentos = 3) {
  let ultimoErr;
  for (let i = 1; i <= intentos; i++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);
      let res;
      try {
        res = await fetch(url, { signal: ctrl.signal, headers: { 'user-agent': 'Mozilla/5.0' } });
      } finally {
        clearTimeout(t);
      }
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      ultimoErr = e;
      if (i < intentos) await sleep(1000 * i);
    }
  }
  throw ultimoErr;
}

async function fetchEmojiMix(emoji1, emoji2) {
  // Emojik v2: https://emojik.vercel.app/s/<e1>_<e2>?size=128 — devuelve PNG directo
  const url = `https://emojik.vercel.app/s/${encodeURIComponent(emoji1)}_${encodeURIComponent(emoji2)}?size=128`;
  return await fetchBuffer(url);
}

export default {
  command: ['emojimix'],
  category: 'stickers',
  description: 'Mezclar dos emojis en un sticker.',
  run: async ({ msg, sock, args, usedPrefix, command, text }) => {
    try {
      if (!args[0]) {
        return msg.reply(`《✧》 Ingresa 2 emojis para combinar.\n> Ejemplo: *${usedPrefix + command}* 👻+👀`);
      }
      let [emoji1, emoji2] = text.split('+').map(s => s?.trim());
      if (!emoji1 || !emoji2) {
        return msg.reply(`《✧》 Formato incorrecto. Usa dos emojis separados por *+*.\n> Ejemplo: *${usedPrefix + command}* 👻+👀`);
      }
      await msg.react('🕒');
      let user = db.getUser(msg.sender);
      const name = user.name || msg.sender.split('@')[0];
      const meta1 = user.metadatos ? String(user.metadatos).trim() : '';
      const meta2 = user.metadatos2 ? String(user.metadatos2).trim() : '';
      let texto1 = meta1 ? meta1 : 'ԍɪռҡօ 🍁 ʙօȶ';
      let texto2 = meta1 ? (meta2 ? meta2 : '') : `@${name}`;

      const buf = await fetchEmojiMix(emoji1, emoji2);
      if (!buf || buf.length < 500) throw new Error('No se pudo generar la mezcla.');

      const tmpFile = `./tmp/emojimix-${Date.now()}.png`;
      fs.mkdirSync('./tmp', { recursive: true });
      fs.writeFileSync(tmpFile, buf);
      await sock.sendImageAsSticker(msg.chat, tmpFile, msg, { packname: texto1, author: texto2 });
      fs.unlinkSync(tmpFile);
      await msg.react('✔️');
    } catch (e) {
      await msg.react('✖️');
      return msg.reply(`《✧》 No se pudo combinar esos emojis (algunas combinaciones no existen).\n> ${e.message}`);
    }
  },
};
