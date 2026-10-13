import axios from "axios";
import { prepareWAMessageMedia, generateWAMessageFromContent } from "@whiskeysockets/baileys";
import { getPlugins } from "../../core/pluginLoader.js";
import { db } from "../../database/db.js";
import config from "../../config.js";

let bannerCache = null
let bannerCacheTime = 0
let mediaCache = null
let mediaCacheTime = 0
let lastUsedUrl = null

async function getBuffer(url) {
  try {
    const res = await axios({ method: "get", url, responseType: "arraybuffer" });
    return Buffer.from(res.data);
  } catch (e) {
    throw new Error(`Error descargando imagen: ${e.message}`);
  }
}

async function getBannerBuffer(url) {
  if (bannerCache && lastUsedUrl === url && Date.now() - bannerCacheTime < 3600000) return bannerCache
  bannerCache = await getBuffer(url)
  bannerCacheTime = Date.now()
  lastUsedUrl = url
  return bannerCache
}

const catNombres = {
  "info": "𝑰𝑵𝑭𝑶",
  "misc": "𝑴𝑰𝑺𝑪",
  "dl": "𝐃𝐋",
  "grupos": "𝑮𝑹𝑼𝑷𝑶𝑺",
  "owner": "𝑶W𝑵𝑬𝑹",
  "utils": "𝑼𝑻𝑰𝑳𝑺",
  "stickers": "𝑺𝑻𝑰𝑪𝑲𝑬𝑹𝑺",
  "sockets": "𝑺𝑶𝑪𝑲𝑬𝑻𝑺",
  "ia": "𝑰𝑨",
  "economy": "𝑬𝑪𝑶𝑵𝑶𝑴𝒀",
}

export default {
  name: ["menu", "help", "ayuda"],
  description: "Muestra el menú del sistema.",
  category: "info",
  ownerOnly: false,

  async run({ sock, from, sender, senderNum, isGroup, groupName, usedPrefix, msg }) {
    try {
      const lugar = isGroup ? groupName : "Chat Privado";

      const currentBotNum = sock.user?.id ? sock.user.id.split('@')[0].split(':')[0].replace(/\D/g, '') : '';
      const currentBotJid = currentBotNum ? `${currentBotNum}@s.whatsapp.net` : '';

      let botData = db.getBot(currentBotJid) || db.getBot('main');

      const esLabelAutomatico = botData?.label?.startsWith('SUB_') || botData?.label === 'Subbot' || botData?.label === 'MAIN'
      const nombreBot = (esLabelAutomatico || !botData?.label ? config.botName : botData.label).replace(/@\d+/g, '').trim();
      const urlFoto = botData?.banner || "https://cdn.dix.lat/me/hyft_20261011-r2x1-yixw-556f.jpg";

      const esVerdaderoMain = botData?.isMain === true || botData?.isMain === 1;
      const tipoBot = esVerdaderoMain ? "Bot Principal" : "Subbot";

      const linkMatch = "https://github.com/adan292/ʙᴄɴɴʏ-ɢɪʀʟ-ʙᴏᴛ-ᴠ2";

      const esOwnerOCoOwner = config.ownerNumber?.includes(senderNum) || config.coOwners?.includes(senderNum)

      const plugins = getPlugins()
      const categories = {}

      const seen = new Set()
      for (const [, plugin] of plugins) {
        if (seen.has(plugin)) continue
        seen.add(plugin)

        const cat = plugin.category || "misc"
        if (cat === "owner" && !esOwnerOCoOwner) continue

        if (!categories[cat]) categories[cat] = new Set()
        const names = Array.isArray(plugin.name) ? plugin.name : [plugin.name]

        if (plugin.showAllNames) {
          for (const n of names) categories[cat].add(n)
        } else {
          categories[cat].add(names[0])
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
        const categoriaLimped = cat.toLowerCase().trim();
        const nombreFormateado = catNombres[categoriaLimped] || categoriaLimped.toUpperCase();

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

      // prepare banner safely
      let imgBanner = null
      let bufferBanner = null

      try {
        bufferBanner = await getBannerBuffer(urlFoto)
      } catch (err) {
        console.warn('[menu] no se pudo descargar banner:', err?.message || err)
        bufferBanner = null
      }

      if (mediaCache && lastUsedUrl === urlFoto && Date.now() - mediaCacheTime < 3600000) {
        imgBanner = mediaCache
      } else if (bufferBanner) {
        try {
          const mediaBanner = await prepareWAMessageMedia(
            { image: bufferBanner },
            { upload: sock.waUploadToServer, mediaTypeOverride: "thumbnail-link" }
          )
          imgBanner = mediaBanner.imageMessage
          mediaCache = imgBanner
          mediaCacheTime = Date.now()
        } catch (e) {
          console.warn('[menu] prepareWAMessageMedia falló:', e?.message || e)
          imgBanner = null
        }
      }

      // If we couldn't build the rich preview, fallback to sending the image with caption or plain text
      if (!imgBanner) {
        try {
          if (bufferBanner) {
            await sock.sendMessage(from, { image: bufferBanner, caption: textoMenu, mentions: [sender] })
          } else {
            await sock.sendMessage(from, { text: textoMenu, mentions: [sender] })
          }
        } catch (e) {
          console.error('[menu] fallo al enviar fallback:', e?.message || e)
        }
        return
      }

      const getTs = (ts) => typeof ts === "object" ? Number(ts.low || ts) : Number(ts);

      const extended = {
        endCardTiles: [],
        text: textoMenu,
        matchedText: linkMatch,
        canonicalUrl: linkMatch,
        description: `Powered by Adan | ${nombreBot}`,
        title: nombreBot.toUpperCase(),
        previewType: 0,
        // add thumbnail fields only if present
        ...(imgBanner.jpegThumbnail ? { jpegThumbnail: imgBanner.jpegThumbnail } : {}),
        ...(imgBanner.directPath ? { thumbnailDirectPath: imgBanner.directPath } : {}),
        ...(imgBanner.fileSha256 ? { thumbnailSha256: imgBanner.fileSha256 } : {}),
        ...(imgBanner.fileEncSha256 ? { thumbnailEncSha256: imgBanner.fileEncSha256 } : {}),
        ...(imgBanner.mediaKey ? { mediaKey: imgBanner.mediaKey } : {}),
        ...(imgBanner.mediaKeyTimestamp ? { mediaKeyTimestamp: getTs(imgBanner.mediaKeyTimestamp) } : {}),
        thumbnailHeight: imgBanner.height || 1080,
        thumbnailWidth: imgBanner.width || 1920,
        inviteLinkGroupTypeV2: 0,
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
      }

      const content = { extendedTextMessage: extended }

      try {
        const waMsg = generateWAMessageFromContent(from, content, { userJid: sock.user?.id, quoted: msg })
        await sock.relayMessage(from, waMsg.message, { messageId: waMsg.key.id })
      } catch (e) {
        console.error('[menu] fallo al enviar mensaje con preview:', e?.message || e)
        // last resort fallback
        try {
          if (bufferBanner) await sock.sendMessage(from, { image: bufferBanner, caption: textoMenu, mentions: [sender] })
          else await sock.sendMessage(from, { text: textoMenu, mentions: [sender] })
        } catch (err) { console.error('[menu] fallback final falló:', err?.message || err) }
      }

    } catch (error) {
      console.error("Error crítico en el comando menu:", error);
    }
  }
};
