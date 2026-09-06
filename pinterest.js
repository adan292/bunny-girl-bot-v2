const axios = require('axios');
const { generateWAMessageFromContent, generateWAMessage, delay } = require('@whiskeysockets/baileys');

const DEFAULT_BASE = process.env.PINTEREST_API_BASE || 'https://api.lempi.lat/tools';
const API_KEY = process.env.PINTEREST_API_KEY || process.env.BUNNY_API_KEY || process.env.LEMPI_API_KEY || '';

async function tryFetchFromEndpoints(text) {
  const base = DEFAULT_BASE.replace(/\/+$/, '');
  const candidatePaths = [
    '/pinterest',
    '/search/pinterest',
    '/tools/pinterest',
    '/search',
    ''
  ];

  const paramNames = ['query', 'q', 'search', 'term'];

  for (const path of candidatePaths) {
    const url = `${base}${path}`;
    for (const pname of paramNames) {
      try {
        const params = { [pname]: text };
        if (API_KEY) params.key = API_KEY;
        const headers = {};
        if (API_KEY && API_KEY.length > 20) headers.Authorization = `Bearer ${API_KEY}`;

        const res = await axios.get(url, { params, headers, timeout: 10000 });
        const parsed = extractArrayFromResponse(res && res.data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        // if response itself is array
        if (Array.isArray(res.data) && res.data.length > 0) return res.data;
      } catch (err) {
        // continue
      }
    }
  }

  return null;
}

function extractArrayFromResponse(data) {
  if (!data) return null;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.items)) return data.items;
  if (data.payload && Array.isArray(data.payload)) return data.payload;
  return null;
}

function extractUrlsFromItems(items) {
  const urls = items
    .map(img => img && (img.hd || img.url || img.image || img.src || img.thumbnail || (img.images && img.images[0] && img.images[0].url) || (img.media && img.media[0] && img.media[0].url)))
    .filter(u => typeof u === 'string' && u.startsWith('http'));
  return Array.from(new Set(urls));
}

async function sendAlbumMessage(sock, jid, medias, options = {}) {
  if (!Array.isArray(medias) || medias.length < 2) throw new RangeError('Se necesitan al menos 2 imágenes para un álbum');
  const caption = options.caption || '';
  const quoted = options.quoted || null;

  const album = generateWAMessageFromContent(
    jid,
    { messageContextInfo: {}, albumMessage: { expectedImageCount: medias.length } },
    quoted ? { quoted } : {}
  );

  await sock.relayMessage(album.key.remoteJid, album.message, { messageId: album.key.id });

  for (let i = 0; i < medias.length; i++) {
    const { url } = medias[i];
    try {
      const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
      const buffer = Buffer.from(res.data);

      const img = await generateWAMessage(
        album.key.remoteJid,
        { image: buffer, ...(i === 0 ? { caption } : {}) },
        { upload: sock.waUploadToServer }
      );

      img.message.messageContextInfo = {
        messageAssociation: { associationType: 1, parentMessageKey: album.key }
      };

      await sock.relayMessage(img.key.remoteJid, img.message, { messageId: img.key.id });
      await delay(500);
    } catch (err) {
      console.warn(`Fallo al procesar imagen ${i} (${url}): ${err.message}`);
      await delay(300);
    }
  }

  return album;
}

module.exports = {
  name: ['pinterest', 'pin'],
  description: 'Busca imágenes en Pinterest usando API configurable (por defecto api.lempi.lat)',
  category: 'dl',
  ownerOnly: false,

  async run({ sock, from, msg, text, usedPrefix, react, reply }) {
    try {
      if (react) await react('⏳');

      if (!text || !text.trim()) {
        if (react) await react('❌');
        return await reply({
          text:
            `✨ ═══ 🫧 *PINTEREST* 🫧 ═══ ✨\n\n` +
            `❌ Debes escribir qué buscar.\n\n` +
            `💡 *Uso:*\n` +
            `  ✦ ${usedPrefix}pinterest goku\n` +
            `  ✦ ${usedPrefix}pin anime wallpaper\n\n` +
            `⚔️ _Yuta Okotsu MD | DuarteXV_`
        });
      }

      await reply({
        text:
          `✨ ═══ 🫧 *PINTEREST* 🫧 ═══ ✨\n\n` +
          `🔍 _Buscando imágenes de_ *${text}*...\n` +
          `⏳ _Espera un momento..._`
      });

      let items = await tryFetchFromEndpoints(text);

      if (!items || items.length === 0) {
        try {
          const res = await axios.get('https://api.alyacore.xyz/search/pinterest', {
            params: { query: text, key: 'Duarte-zz12' },
            timeout: 10000
          });
          items = extractArrayFromResponse(res && res.data) || res.data;
        } catch (err) {
          // ignore
        }
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        if (react) await react('❌');
        return await reply({
          text:
            `✨ ═══ 🫧 *PINTEREST* 🫧 ═══ ✨\n\n` +
            `❌ No se encontraron imágenes para *${text}*.\n\n` +
            `⚔️ _Yuta Okotsu MD | DuarteXV_`
        });
      }

      const urls = extractUrlsFromItems(items).slice(0, 10);

      if (urls.length < 2) {
        if (react) await react('❌');
        return await reply({
          text:
            `✨ ═══ 🫧 *PINTEREST* 🫧 ═══ ✨\n\n` +
            `❌ No se encontraron suficientes imágenes válidas para *${text}*.\n\n` +
            `⚔️ _Yuta Okotsu MD | DuarteXV_`
        });
      }

      const medias = urls.map(u => ({ url: u }));

      const caption =
        `✨ ═══ 🫧 *PINTEREST* 🫧 ═══ ✨\n\n` +
        `🔎 *Búsqueda:* ${text}\n` +
        `🖼️ *Imágenes:* ${medias.length}\n\n` +
        `⚔️ _Yuta Okotsu MD | DuarteXV_`;

      await sendAlbumMessage(sock, from, medias, { caption, quoted: msg });

      if (react) await react('✅');
    } catch (error) {
      if (react) await react('❌');
      await reply({
        text:
          `✨ ═══ 🫧 *PINTEREST* 🫧 ═══ ✨\n\n` +
          `❌ *Error:* ${error.message}\n\n` +
          `⚔️ _Yuta Okotsu MD | DuarteXV_`
      });
      console.error('Error en pinterest:', error);
    }
  }
};
