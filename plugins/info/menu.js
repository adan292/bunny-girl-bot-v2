import axios from "axios";
import { prepareWAMessageMedia, generateWAMessageFromContent } from "@whiskeysockets/baileys";
import { getPlugins } from "../../core/pluginLoader.js";
import { db } from "../../database/db.js";
import config from "../../config.js";

const CACHE_TTL = 3600000;
const bufferCache = new Map(); // url -> { buffer, time }
const mediaCache = new Map();  // url -> { imgBanner, thumb, time }

async function getBuffer(url) {
  try {
    const res = await axios({ method: "get", url, responseType: "arraybuffer", timeout: 15000 });
    return Buffer.from(res.data);
  } catch (e) {
    throw new Error(`Error descargando imagen: ${e.message}`);
  }
}

async function getBannerBuffer(url) {
  const hit = bufferCache.get(url);
  if (hit && Date.now() - hit.time < CACHE_TTL) return hit.buffer;
  const buffer = await getBuffer(url);
  bufferCache.set(url, { buffer, time: Date.now() });
  return buffer;
}

// Genera miniatura JPEG + medidas (requiere `sharp`; si no está instalado devuelve null)
async function makeThumb(buffer) {
  try {
    const sharp = (await import("sharp")).default;
    const meta = await sharp(buffer).metadata();
    const jpegThumbnail = await sharp(buffer)
      .resize({ width: 300 })
      .jpeg({ quality: 60 })
      .toBuffer();
    return { jpegThumbnail, width: meta.width, height: meta.height };
  } catch {
    return null;
  }
}

const getTs = (ts) => {
  if (ts && typeof ts === "object") {
    return typeof ts.toNumber === "function" ? ts.toNumber() : Number(ts.low);
  }
  return Number(ts);
};

const catNombres = {
  "info": "𝑰𝑵𝑭𝑶",
  "misc": "𝑴𝑰𝑺𝑪",
  "dl": "𝐃𝐋",
  "grupos": "𝑮𝑹𝑼𝑷𝑶𝑺",
  "owner": "𝑶𝑾𝑵𝑬𝑹",
  "utils": "𝑼𝑻𝑰𝑳𝑺",
  "stickers": "𝑺𝑻𝑰𝑪𝑲𝑬𝑹𝑺",
  "sockets": "𝑺𝑶𝑪𝑲𝑬𝑻𝑺",
  "ia": "𝑰𝑨",
  "economy": "𝑬𝑪𝑶𝑵𝑶𝑴𝒀",
};

export default {
  name: ["menu", "help", "ayuda"],
  description: "Muestra el menú del sistema.",
  category: "info",
  ownerOnly: false,

  async run({ sock, from, sender, senderNum, isGroup, groupName, usedPrefix, msg }) {
    try {
      const currentBotNum = sock.user?.id ? sock.user.id.split("@")[0].split(":")[0].replace(/\D/g, "") : "";
      const currentBotJid = currentBotNum ? `${currentBotNum}@s.whatsapp.net` : "";

      const botData = db.getBot(currentBotJid) || db.getBot("main");

      const esLabelAutomatico =
        botData?.label?.startsWith("SUB_") || botData?.label === "Subbot" || botData?.label === "MAIN";
      const nombreBot = (esLabelAutomatico || !botData?.label ? config.botName : botData.label)
        .replace(/@\d+/g, "")
        .trim();
      const urlFoto = botData?.banner || "https://cdn.dix.lat/me/hyft_20261011-r2x1-yixw-556f.jpg";

      const esVerdaderoMain = botData?.isMain === true || botData?.isMain === 1;
      const tipoBot = esVerdaderoMain ? "Bot Principal" : "Subbot";

      const linkMatch = "https://github.com/adan292/bunny-girl-bot-v2";

      const esOwnerOCoOwner =
        config.ownerNumber?.includes(senderNum) || config.coOwners?.includes(senderNum);

      const plugins = getPlugins();
      const categories = {};
      const seen = new Set();

      for (const [, plugin] of plugins) {
        if (seen.has(plugin)) continue;
        seen.add(plugin);

        const cat = plugin.category || "misc";
        if (cat === "owner" && !esOwnerOCoOwner) continue;

        if (!categories[cat]) categories[cat] = new Set();
        const names = Array.isArray(plugin.name) ? plugin.name : [plugin.name];

        if (plugin.showAllNames) {
          for (const n of names) categories[cat].add(n);
        } else {
          categories[cat].add(names[0]);
        }
      }

      let textoMenu = `𝐇𝐨𝐥𝐚!  𝐒𝐨𝐲 🐇 \`𓏲⌗.˚∘ ${nombreBot} ₊˚.్⸙\` 🐇\n\n`;
      textoMenu += `┏━━━━━━━━━━━━━━━━━━\n\n`;
      textoMenu += `│ ᰔᩚ ᴛɪᴘᴏ:: ${tipoBot}\n`;
      textoMenu += `│ ᰔᩚ sɪsᴛᴇᴍᴀ/ᴏᴘʀ:: Android\n`;
      textoMenu += `│ ᰔᩚ ᴜsᴇʀ:: @${senderNum}\n`;
      textoMenu += `│ ᰔᩚ  ᴄʟɪᴇɴᴛᴇ:: ${nombreBot}\n\n`;
      textoMenu += `┗━━━━━━━━━━━━━━━━━━\n\n\n`;

      for (const [cat, cmds] of Object.entries(categories)) {
        const catLimpia = cat.toLowerCase().trim();
        const nombreFormateado = catNombres[catLimpia] || catLimpia.toUpperCase();

        textoMenu += `> ☁️ᩙ̷᷼𖥓┈̶⵿๋    ᩡ"⎯ 𝑺𝑬𝑪𝑻𝑶𝑹 | *${nombreFormateado}*\n\n`;

        for (const cmd of cmds) {
          textoMenu += `> 𑁯᜔ְ۟⣾͡◌⃘ִׄ⃕᷼🫧⃛⁜̸̷݊┅᳞ ${usedPrefix}${cmd}\n`;
        }

        textoMenu += `\n`;
      }

      textoMenu += `╭━─━─━─━─━─━─━─━╮\n`;
      textoMenu += `powᧉꭇᧉd ɓy αԃάɳ│\n`;
      textoMenu += `🔗 ${linkMatch}\n`;
      textoMenu += `╰━─━─━─━─━─━─━─━╯`;

      // ---- Banner ----
      let bufferBanner = null;
      try {
        bufferBanner = await getBannerBuffer(urlFoto);
      } catch (err) {
        console.warn("[menu] no se pudo descargar banner:", err?.message || err);
      }

      let imgBanner = null;
      let thumb = null;

      const cached = mediaCache.get(urlFoto);
      if (cached && Date.now() - cached.time < CACHE_TTL) {
        imgBanner = cached.imgBanner;
        thumb = cached.thumb;
      } else if (bufferBanner) {
        try {
          const mediaBanner = await prepareWAMessageMedia(
            { image: bufferBanner },
            { upload: sock.waUploadToServer, mediaTypeOverride: "thumbnail-link" }
          );
          imgBanner = mediaBanner.imageMessage;
          thumb = await makeThumb(bufferBanner);
          mediaCache.set(urlFoto, { imgBanner, thumb, time: Date.now() });
        } catch (e) {
          console.warn("[menu] prepareWAMessageMedia falló:", e?.message || e);
        }
      }

      const enviarFallback = async () => {
        try {
          if (bufferBanner) {
            await sock.sendMessage(from, { image: bufferBanner, caption: textoMenu, mentions: [sender] }, { quoted: msg });
          } else {
            await sock.sendMessage(from, { text: textoMenu, mentions: [sender] }, { quoted: msg });
          }
        } catch (e) {
          console.error("[menu] fallo al enviar fallback:", e?.message || e);
        }
      };

      if (!imgBanner) {
        await enviarFallback();
        return;
      }

      const jpegThumbnail = thumb?.jpegThumbnail || imgBanner.jpegThumbnail;

      const extended = {
        text: textoMenu,
        matchedText: linkMatch,
        canonicalUrl: linkMatch,
        description: `Powered by Adan | ${nombreBot}`,
        title: nombreBot.toUpperCase(),
        previewType: 0,
        ...(jpegThumbnail ? { jpegThumbnail } : {}),
        ...(imgBanner.directPath ? { thumbnailDirectPath: imgBanner.directPath } : {}),
        ...(imgBanner.fileSha256 ? { thumbnailSha256: imgBanner.fileSha256 } : {}),
        ...(imgBanner.fileEncSha256 ? { thumbnailEncSha256: imgBanner.fileEncSha256 } : {}),
        ...(imgBanner.mediaKey ? { mediaKey: imgBanner.mediaKey } : {}),
        ...(imgBanner.mediaKeyTimestamp ? { mediaKeyTimestamp: getTs(imgBanner.mediaKeyTimestamp) } : {}),
        thumbnailHeight: thumb?.height || imgBanner.height || 1080,
        thumbnailWidth: thumb?.width || imgBanner.width || 1920,
        contextInfo: {
          mentionedJid: [sender],
          isForwarded: true,
          forwardingScore: 1,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363421987469973@newsletter",
            newsletterName: "⏤͟͟͞͞★꙲⃝͟𝐌𝐀𝐈 𝐒𝐀𝐊𝐔𝐑𝐀𝐉𝐈𝐌𝐀 │ 𝐂𝐇𝐀𝐍𝐍𝐄𝐋 ◌Ⳋ𝅄",
            serverMessageId: -1
          }
        }
      };

      try {
        const waMsg = generateWAMessageFromContent(
          from,
          { extendedTextMessage: extended },
          { userJid: sock.user?.id, quoted: msg }
        );
        await sock.relayMessage(from, waMsg.message, { messageId: waMsg.key.id });
      } catch (e) {
        console.error("[menu] fallo al enviar mensaje con preview:", e?.message || e);
        await enviarFallback();
      }
    } catch (error) {
      console.error("Error crítico en el comando menu:", error);
    }
  }
};