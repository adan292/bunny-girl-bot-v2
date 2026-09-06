import fetch from 'node-fetch';
import db from '#db';
import defaultAvatar from '../../lib/default-avatar.js';

export default {
  command: ['applemusic', 'amdl'],
  category: 'downloads',
  description: 'Descargar canción desde Apple Music usando la API de lempi.lat',
  run: async ({ msg, sock, args, usedPrefix, command, text }) => {
    const url = (args && args[0]) || text || '';
    if (!url || !/^https?:\/\//.test(url)) {
      return msg.reply(`《✧》 Uso: ${usedPrefix}${command} <url de Apple Music>\n> Ejemplo: ${usedPrefix}${command} https://music.apple.com/es/song/billie-jean/269573364`, msg);
    }

    await msg.react('🕒');
    try {
      const idBot = sock.user.id.split(':')[0] + '@s.whatsapp.net';
      const settings = db.getSettings(idBot) || {};
      const apikey = encodeURIComponent(settings.apiKeyForLempi || 'Bunny-girl-bot');
      const apiUrl = `https://api.lempi.lat/dl/applemusic?url=${encodeURIComponent(url)}&apikey=${apikey}`;

      const res = await fetch(apiUrl, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      const txt = await res.text();
      let data;
      try { data = JSON.parse(txt); } catch (e) { data = null; }

      if (!res.ok) {
        await msg.react('✖️');
        return msg.reply(`《✧》 Error al contactar la API (HTTP ${res.status}).`);
      }

      if (!data) {
        await msg.react('❌');
        return msg.reply('《✧》 La API devolvió una respuesta inválida.');
      }

      // Buscar URL de descarga en varias rutas comunes
      let downloadUrl = null;
      let title = null;
      let mime = null;

      // Estructuras comunes: data.result.url | data.url | data.data.url | data.result[0].url
      if (data?.result && typeof data.result === 'string' && /^https?:\/\//.test(data.result)) downloadUrl = data.result;
      if (!downloadUrl && data?.url && typeof data.url === 'string' && /^https?:\/\//.test(data.url)) downloadUrl = data.url;
      if (!downloadUrl && Array.isArray(data?.result) && data.result.length) {
        const cand = data.result.find(r => r?.url) || data.result[0];
        downloadUrl = cand?.url || null;
      }
      if (!downloadUrl && data?.data && typeof data.data === 'object') {
        if (Array.isArray(data.data)) {
          const cand = data.data.find(d => d?.url) || data.data[0];
          downloadUrl = cand?.url || null;
        } else {
          downloadUrl = data.data.url || data.data.link || null;
        }
      }

      // Metadatos opcionales
      title = data?.title || data?.result?.title || data?.data?.title || null;
      mime = data?.mimetype || data?.mime || null;

      if (!downloadUrl) {
        // Si la API devolvió base64 directo
        const base64Field = Object.keys(data).find(k => typeof data[k] === 'string' && data[k].startsWith('data:audio'));
        if (base64Field) {
          const base64 = data[base64Field].split(',')[1];
          const buffer = Buffer.from(base64, 'base64');
          await sock.sendMessage(msg.chat, { audio: buffer, mimetype: 'audio/mpeg', fileName: title ? `${title}.mp3` : 'audio.mp3' }, { quoted: msg }).catch(async () => {
            await sock.sendMessage(msg.chat, { document: buffer, fileName: title ? `${title}.mp3` : 'audio.mp3' }, { quoted: msg });
          });
          await msg.react('✔️');
          return;
        }

        await msg.react('✖️');
        return msg.reply('《✧》 No se encontró una URL de descarga en la respuesta de la API.');
      }

      // Intentar obtener el tamaño/headers para elegir cómo enviarlo
      let head = null;
      try {
        head = await fetch(downloadUrl, { method: 'HEAD' });
      } catch (e) { head = null; }

      const contentType = (head?.headers?.get('content-type') || mime || '').split(';')[0] || '';

      // Si es audio, enviar como audio; sino enviar como documento
      try {
        if (/audio\//.test(contentType) || /\.m4a$|\.mp3$|\.aac$/i.test(downloadUrl)) {
          // Enviar como documento con mimetype para mayor compatibilidad
          const fileName = title ? `${title}.${contentType.split('/')[1] || 'mp3'}` : 'applemusic.mp3';
          await sock.sendMessage(msg.chat, { document: { url: downloadUrl }, mimetype: contentType || 'audio/mpeg', fileName, caption: title || '' }, { quoted: msg });
        } else {
          const fileName = title ? `${title}.mp3` : 'applemusic.mp3';
          await sock.sendMessage(msg.chat, { document: { url: downloadUrl }, fileName, caption: title || '' }, { quoted: msg });
        }
        await msg.react('✔️');
      } catch (e) {
        // Fallback: descargar buffer y enviar
        try {
          const dl = await fetch(downloadUrl);
          const buffer = Buffer.from(await dl.arrayBuffer());
          const fileName = title ? `${title}.mp3` : 'applemusic.mp3';
          await sock.sendMessage(msg.chat, { document: buffer, fileName, mimetype: contentType || 'audio/mpeg' }, { quoted: msg });
          await msg.react('✔️');
        } catch (err) {
          await msg.react('✖️');
          return msg.reply(`《✧》 No pude descargar o enviar el archivo: ${err.message}`);
        }
      }

    } catch (err) {
      await msg.react('✖️');
      console.log('applemusic error:', err);
      return msg.reply(`《✧》 Ocurrió un error al procesar la petición: ${err.message}`);
    }
  },
};
