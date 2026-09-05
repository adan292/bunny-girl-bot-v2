import axios from 'axios';
import db from '#db';

export default {
  command: ['imagen', 'img', 'image'],
  category: 'downloads',
  description: 'Buscar y descargar imágenes de Google.',
  run: async ({ msg, sock, args, usedPrefix, command }) => {
    const text = args.join(' ');
    if (!text) {
      return sock.reply(msg.chat, `《✧》 Por favor, Ingrese un término de búsqueda.`, msg);
    }

    const bannedWords = ['+18', '18+', 'contenido adulto', 'contenido explícito', 'contenido sexual', 'actriz porno', 'actor porno', 'estrella porno', 'pornstar', 'video xxx', 'xxx', 'x x x', 'pornhub', 'sex', 'nudes', 'nudity'];
    const lowerText = text.toLowerCase();
    const chat = db.getChat(msg.chat);
    const nsfwEnabled = chat && chat.nsfw === 1;
    if (!nsfwEnabled && bannedWords.some(word => lowerText.includes(word))) {
      return sock.reply(msg.chat, '《✧》 Este comando no *permite* búsquedas de contenido *+18* o *NSFW*', msg);
    }

    try {
      const results = await getImageSearchResults(text);
      if (!results || results.length === 0) {
        return sock.reply(msg.chat, `《✧》 No se encontraron imágenes para "${text}".`, msg);
      }

      const validResults = await filterValidImages(results.slice(0, 15));
      if (validResults.length < 1) {
        return sock.reply(msg.chat, `《✧》 No se encontraron imágenes válidas para "${text}".`, msg);
      }

      // Download up to 10 images as buffers so WA upload works reliably
      const toDownload = validResults.slice(0, 10);
      const downloaded = await Promise.allSettled(toDownload.map(r => downloadImage(r.url)));
      const medias = [];
      for (let i = 0; i < downloaded.length; i++) {
        const d = downloaded[i];
        if (d.status === 'fulfilled' && d.value) {
          const r = toDownload[i];
          const captionParts = [];
          if (r.title) captionParts.push(`𖣣ֶㅤ֯⌗ ☆  ⬭ *Título* › ${r.title}`);
          if (r.domain) captionParts.push(`𖣣ֶㅤ֯⌗ ☆  ⬭ *Fuente* › ${r.domain}`);
          if (r.resolution) captionParts.push(`𖣣ֶㅤ֯⌗ ☆  ⬭ *Resolución* › ${r.resolution}`);
          captionParts.push(`𖣣ֶㅤ֯⌗ ☆  ⬭ *Búsqueda* › ${text}`);
          const caption = captionParts.join('\n');
          medias.push({ type: 'image', data: d.value, caption });
        }
      }

      if (medias.length === 0) {
        return sock.reply(msg.chat, `《✧》 No se pudieron descargar las imágenes para "${text}".`, msg);
      }

      // If only 1 image available, send as single image message; otherwise send album
      if (medias.length === 1) {
        await sock.sendMessage(msg.chat, { image: medias[0].data, caption: medias[0].caption }, { quoted: msg });
      } else {
        await sock.sendAlbumMessage(msg.chat, medias, { quoted: msg });
      }
    } catch (e) {
      console.error('imagen command error:', e);
      await sock.reply(msg.chat, `> Ocurrió un error al ejecutar el comando *${usedPrefix + command}*.
> [Error: *${e.message}*]`, msg);
    }
  }
};

async function downloadImage(url) {
  try {
    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
      }
    });
    const contentType = (res.headers['content-type'] || '').split(';')[0];
    if (!contentType.startsWith('image/')) return null;
    const buffer = Buffer.from(res.data);
    return buffer;
  } catch (e) {
    return null;
  }
}

async function isImageAccessible(url) {
  try {
    const response = await axios.head(url, { timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36' }, maxRedirects: 3, validateStatus: (status) => status < 400 });
    return (response.headers['content-type'] || '').startsWith('image/');
  } catch {
    try {
      await axios.get(url, { timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36', 'Range': 'bytes=0-1023' }, maxRedirects: 3, responseType: 'arraybuffer', validateStatus: (status) => status < 400 || status === 206 });
      return true;
    } catch {
      return false;
    }
  }
}

async function filterValidImages(results) {
  const checks = await Promise.allSettled(
    results.map(async (r) => {
      const ok = await isImageAccessible(r.url);
      return ok ? r : null;
    })
  );
  return checks.filter(c => c.status === 'fulfilled' && c.value !== null).map(c => c.value);
}

async function getImageSearchResults(query) {
  const apis = [
    { endpoint: `${global.APIs?.delirius?.url || ''}/search/gimage?query=${encodeURIComponent(query)}`, extractor: (res) => {
        if (!res.status || !Array.isArray(res.data)) return [];
        return res.data.map(item => ({ url: item.url, title: item.origin?.title || null, domain: item.origin?.website?.domain || null, resolution: item.width && item.height ? `${item.width}x${item.height}` : null }));
      }
    },
    { endpoint: `${global.APIs?.Ginko?.url || ''}/search/image?q=${encodeURIComponent(query)}&api_key=${global.APIs?.Ginko?.key || ''}`, extractor: (res) => {
        if (!res.status || !Array.isArray(res.result)) return [];
        return res.result.map(item => ({ url: item.image, title: item.title || null, domain: item.url ? new URL(item.url).hostname : null, resolution: null }));
      }
    }
  ];
  for (const { endpoint, extractor } of apis) {
    if (!endpoint) continue;
    try {
      const { data } = await axios.get(endpoint);
      const results = extractor(data);
      if (results && results.length > 0) return results;
    } catch (err) {
      // continue to next API
      continue;
    }
  }
  return [];
}
