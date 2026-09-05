import FormData from 'form-data';
import fetch from 'node-fetch';
import db from '#db';

const sleep = ms => new Promise(r => setTimeout(r, ms));

function generateUniqueFilename(mime) {
  const ext = (mime || 'image/jpeg').split('/')[1]?.split(';')[0] || 'jpg';
  return `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
}

/**
 * Sube un buffer a litterbox.catbox.moe (servicio temporal sin API key).
 * Acepta cualquier tipo de archivo (imagen, video, audio, sticker).
 * Devuelve una URL directa.
 *
 * @param {Buffer} buffer
 * @param {string} mime
 * @param {'1h'|'12h'|'24h'|'72h'} time
 * @returns {Promise<string>}
 */
async function uploadLitterbox(buffer, mime, time = '24h') {
  const form = new FormData();
  form.append('reqtype', 'fileupload');
  form.append('time', time);
  form.append('fileToUpload', buffer, {
    filename: generateUniqueFilename(mime),
    contentType: mime
  });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45000);
  let res, text;
  try {
    res = await fetch('https://litterbox.catbox.moe/resources/internals/api.php', {
      method: 'POST',
      body: form.getBuffer(),
      headers: form.getHeaders(),
      signal: ctrl.signal
    });
    text = (await res.text()).trim();
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok || !text.startsWith('https://')) {
    throw new Error('Litterbox falló: HTTP ' + res.status + ' - ' + text.slice(0, 120));
  }
  return text;
}

/**
 * Intenta subir con varios tiempos de expiración para mayor robustez.
 */
async function uploadConReintentos(buffer, mime) {
  const tiempos = ['24h', '72h', '1h'];
  let ultimoErr;
  for (const t of tiempos) {
    for (let i = 1; i <= 2; i++) {
      try {
        const url = await uploadLitterbox(buffer, mime, t);
        return { url, tiempo: t };
      } catch (e) {
        ultimoErr = e;
        console.log(`[tourl] ⚠️ litterbox (${t}) intento ${i} falló: ${e.message}`);
        await sleep(1000 * i);
      }
    }
  }
  throw ultimoErr || new Error('No se pudo subir el archivo');
}

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default {
  command: ['tourl'],
  category: 'utils',
  description: 'Convertir una imagen/video/sticker respondido en un enlace.',
  run: async ({ msg, sock, args, usedPrefix, command }) => {
    const q = msg.quoted || msg;
    const mime = (q.msg || q).mimetype || '';
    if (!mime) {
      return sock.reply(msg.chat,
        `《✧》 Responde a una imagen, video, audio o sticker con *${usedPrefix + command}* para subirlo y obtener un enlace.\n\n> El archivo se sube a litterbox.catbox.moe (enlace temporal 24h, sin API key).`,
        msg);
    }
    try {
      await msg.react('🕒');
      const media = await q.download();
      if (!media) {
        await msg.react('✖️');
        return sock.reply(msg.chat, 'ꕥ No se pudo descargar el archivo.', msg);
      }

      const { url, tiempo } = await uploadConReintentos(media, mime);
      const user = db.getUser(msg.sender);

      await sock.reply(msg.chat,
        `𖹭 ❀ *Upload To URL*\n\n` +
        `ׅ  ׄ  ✿   ׅ り *Enlace ›* ${url}\n` +
        `ׅ  ׄ  ✿   ׅ り *Expira ›* ${tiempo}\n` +
        `ׅ  ׄ  ✿   ׅ り *Peso ›* ${formatBytes(media.length)}\n` +
        `ׅ  ׄ  ✿   ׅ り *Tipo ›* ${(mime.split("/")[1] || "desconocido").toUpperCase()}\n` +
        `ׅ  ׄ  ✿   ׅ り *Solicitado por ›* ${user?.name || msg.pushName || 'Usuario'}`,
        msg);
      await msg.react('✔️');
    } catch (e) {
      console.error('[tourl] error:', e);
      await msg.react('✖️');
      await sock.reply(msg.chat, `> Error al subir el archivo: ${e?.message || 'error desconocido'}\n> Intenta de nuevo en unos segundos.`, msg);
    }
  }
};
