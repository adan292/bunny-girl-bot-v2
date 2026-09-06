const axios = require('axios');
const { generateWAMessageFromContent, generateWAMessage, delay } = require('@whiskeysockets/baileys');

const DEFAULT_BASE = process.env.PINTEREST_API_BASE || process.env.PINTEREST_API_URL || 'https://api.lempi.lat/tools';
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

  const authVariants = [
    { type: 'none' },
    { type: 'query', name: 'key' },
    { type: 'query', name: 'token' },
    { type: 'query', name: 'api_key' },
    { type: 'query', name: 'apikey' },
    { type: 'header', header: 'Authorization', value: (k) => `Bearer ${k}` },
    { type: 'header', header: 'x-api-key', value: (k) => k },
    { type: 'header', header: 'apikey', value: (k) => k }
  ];

  // Track if we saw any 403 responses (to provide better diagnostics / early fallback)
  let saw403 = false;

  for (const path of candidatePaths) {
    const url = `${base}${path}`;
    for (const pname of paramNames) {
      // Try variants: prefer no-auth first, then the variants
      const variantsToTry = authVariants;
      for (const variant of variantsToTry) {
        try {
          const params = { [pname]: text };
          const headers = {};

          if (variant.type === 'query' && API_KEY) {
            params[variant.name] = API_KEY;
          }

          if (variant.type === 'header' && API_KEY) {
            headers[variant.header] = typeof variant.value === 'function' ? variant.value(API_KEY) : variant.value;
          }

          // Also include a short User-Agent to avoid some basic blocks
          headers['User-Agent'] = headers['User-Agent'] || 'Mozilla/5.0 (compatible; Bot/1.0)';

          const res = await axios.get(url, { params, headers, timeout: 10000 });

          const parsed = extractArrayFromResponse(res && res.data);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          if (Array.isArray(res.data) && res.data.length > 0) return res.data;

          // If response is an object that contains images, still return it (caller will try to extract URLs)
          if (res && res.data && typeof res.data === 'object') return [res.data];
        } catch (err) {
          const resp = err && err.response;
          if (resp) {
            // Log details for debugging
            console.warn(`Request to ${url} with param ${pname} and variant ${JSON.stringify(variant)} failed:`, resp.status, resp.data && (typeof resp.data === 'string' ? resp.data.slice(0, 200) : resp.data));
            if (resp.status === 403) saw403 = true;
            // If we got 401/403 and there is no API_KEY, it's probably auth required; keep trying other variants
            // If many 403s and we have an API_KEY, continue trying other variants; if all variants fail we will fallback.
          } else {
            // Network / timeout / other
            // console.warn(`Request error to ${url}:`, err.message)
          }
          // continue trying other variants
        }
      }
      // if we observed 403 for this path/pname and we don't have an API_KEY, no point trying other param names for this path
      // (we'll proceed to other paths anyway)
    }
  }

  if (saw403) {
    // If we saw 403s, return a special marker so caller can provide a helpful message and/or fallback
    return { __403: true };
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

      // If tryFetchFromEndpoints returned the special 403 marker, inform user and fallback to alyacore
      if (items && items.__403) {
        console.warn('Received 403(s) from configurable API endpoints. Falling back to alyacore.');
        items = null;
      }

      if (!items || items.length === 0) {
        try {
          const res = await axios.get('https://api.alyacore.xyz/search/pinterest', {
            params: { query: text, key: 'Duarte-zz12' },
            timeout: 10000
          });
          items = extractArrayFromResponse(res && res.data) || res.data;
        } catch (err) {
          // If alyacore also fails, capture details
          if (err && err.response) {
            console.warn('Fallback alyacore failed:', err.response.status, err.response.data && (typeof err.response.data === 'string' ? err.response.data.slice(0, 200) : err.response.data));
          }
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
