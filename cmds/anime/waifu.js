import fetch from "node-fetch";
import db from '#db';

// nekos.life — sin API key, sin límites, devuelve JSON { url }
const ENDPOINTS = {
  waifu: 'https://nekos.life/api/v2/img/waifu',
  neko: 'https://nekos.life/api/v2/img/neko',
  // Fallbacks para NSFW (solo si el grupo tiene NSFW activado)
  // nekos.life no tiene endpoint NSFW, así que en ese caso intentamos waifu.im con UA
  nsfw_waifu: null
};

async function fetchJson(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch(url, { ...opts, signal: ctrl.signal, headers: { 'user-agent': 'Mozilla/5.0', 'accept': 'application/json', ...(opts.headers||{}) } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

export default {
  command: ['waifu', 'neko'],
  category: 'anime',
  description: 'Obtener una imagen de waifu aleatoria.',
  run: async ({ msg, sock, usedPrefix, command }) => {
    try {
      await msg.react('🕒');
      const chat = db.getChat(msg.chat);
      const isNsfw = !!chat?.nsfw;
      let endpoint;
      if (command === 'neko') endpoint = ENDPOINTS.neko;
      else if (isNsfw) endpoint = 'https://nekos.life/api/v2/img/lewd' + (command === 'neko' ? '_neko' : '');
      else endpoint = ENDPOINTS.waifu;

      let imgUrl = null;

      // Intento 1: nekos.life
      try {
        const j = await fetchJson(endpoint);
        imgUrl = j?.url;
      } catch (e) {
        console.log('[waifu] nekos.life falló:', e.message);
      }

      // Intento 2: nekos.best con UA correcto
      if (!imgUrl) {
        try {
          const j = await fetchJson(`https://nekos.best/api/v2/${command}`, {
            headers: { 'user-agent': 'BunnyGirl/1.0' }
          });
          imgUrl = j?.results?.[0]?.url;
        } catch (e) {
          console.log('[waifu] nekos.best falló:', e.message);
        }
      }

      if (!imgUrl) {
        await msg.react('✖️');
        return msg.reply('《✧》 No se pudo obtener una imagen en este momento, intenta más tarde.');
      }

      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 20000);
      let img;
      try {
        const r = await fetch(imgUrl, { signal: ctrl.signal, headers: { 'user-agent': 'Mozilla/5.0' } });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        img = Buffer.from(await r.arrayBuffer());
      } finally {
        clearTimeout(t);
      }

      await sock.sendFile(msg.chat, img, `${command}.jpg`, `✿ ¡Aquí tienes tu *${command.toUpperCase()}*!`, msg);
      await msg.react('✔️');
    } catch (e) {
      await msg.react('✖️');
      await msg.reply(`> Ocurrió un error al ejecutar *${usedPrefix + command}*.\n> [Error: *${e.message}*]`);
    }
  },
};
