const axios = require('axios');
const { generateWAMessageFromContent, generateWAMessage, delay } = require('@whiskeysockets/baileys');

async function sendAlbumMessage(sock, jid, medias, options = {}) {
  if (!Array.isArray(medias) || medias.length < 2) throw new RangeError("Se necesitan al menos 2 imágenes para un álbum");
  const caption = options.caption || "";
  const quoted = options.quoted || null;

  // Crea el mensaje raíz del álbum
  const album = generateWAMessageFromContent(
    jid,
    { messageContextInfo: {}, albumMessage: { expectedImageCount: medias.length } },
    quoted ? { quoted } : {}
  );

  await sock.relayMessage(album.key.remoteJid, album.message, { messageId: album.key.id });

  // Envía cada imagen (primero descargamos y enviamos buffer para mayor compatibilidad)
  for (let i = 0; i < medias.length; i++) {
    const { url } = medias[i];
    try {
      const res = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
      const buffer = Buffer.from(res.data);

      const img = await generateWAMessage(
        album.key.remoteJid,
        { image: buffer, ...(i === 0 ? { caption } : {}) },
        { upload: sock.waUploadToServer }
      );

      // Asocia la imagen con el álbum
      img.message.messageContextInfo = {
        messageAssociation: { associationType: 1, parentMessageKey: album.key }
      };

      await sock.relayMessage(img.key.remoteJid, img.message, { messageId: img.key.id });
      await delay(500);
    } catch (err) {
      // Si falla una imagen, solo la saltamos (no abortamos todo el álbum)
      console.warn(`Fallo al procesar imagen ${i} (${url}):`, err.message);
      await delay(300);
    }
  }

  return album;
}

module.exports = {
  name: ["pinterest", "pin"],
  description: "Busca imágenes en Pinterest",
  category: "dl",
  ownerOnly: false,

  async run({ sock, from, msg, text, usedPrefix, react, reply }) {
    try {
      if (react) await react("⏳");

      if (!text || !text.trim()) {
        if (react) await react("❌");
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

      const res = await axios.get(`https://api.alyacore.xyz/search/pinterest`, {
        params: { query: text, key: "Duarte-zz12" },
        timeout: 10000
      });

      const data = res.data;

      if (!data || !data.status || !Array.isArray(data.data) || data.data.length === 0) {
        if (react) await react("❌");
        return await reply({
          text:
            `✨ ═══ 🫧 *PINTEREST* 🫧 ═══ ✨\n\n` +
            `❌ No se encontraron imágenes para *${text}*.\n\n` +
            `⚔️ _Yuta Okotsu MD | DuarteXV_`
        });
      }

      // Limitar a 10 resultados y preparar lista de URLs (con fallbacks)
      const candidates = data.data.slice(0, 20);
      const urls = candidates
        .map(img => img.hd || img.url || img.thumbnail || (img.images && img.images[0] && img.images[0].url))
        .filter(u => typeof u === "string" && u.startsWith("http"));

      // Intentamos usar hasta 10 pero necesitamos al menos 2 válidas
      const uniqueUrls = Array.from(new Set(urls)).slice(0, 10);

      if (uniqueUrls.length < 2) {
        if (react) await react("❌");
        return await reply({
          text:
            `✨ ═══ 🫧 *PINTEREST* 🫧 ═══ ✨\n\n` +
            `❌ No se encontraron suficientes imágenes válidas para *${text}*.\n\n` +
            `⚔️ _Yuta Okotsu MD | DuarteXV_`
        });
      }

      const medias = uniqueUrls.map(u => ({ url: u }));

      const caption =
        `✨ ═══ 🫧 *PINTEREST* 🫧 ═══ ✨\n\n` +
        `🔎 *Búsqueda:* ${text}\n` +
        `🖼️ *Imágenes:* ${medias.length}\n\n` +
        `⚔️ _Yuta Okotsu MD | DuarteXV_`;

      // Enviar álbum (la función descarga los buffers internamente)
      await sendAlbumMessage(sock, from, medias, { caption, quoted: msg });

      if (react) await react("✅");
    } catch (error) {
      if (react) await react("❌");
      await reply({
        text:
          `✨ ═══ 🫧 *PINTEREST* 🫧 ═══ ✨\n\n` +
          `❌ *Error:* ${error.message}\n\n` +
          `⚔️ _Yuta Okotsu MD | DuarteXV_`
      });
      console.error("Error en pinterest:", error);
    }
  }
};
