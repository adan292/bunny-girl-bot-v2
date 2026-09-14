import fetch from 'node-fetch'
import * as baileysMod from '@whiskeysockets/baileys'
import { snaptikDownload } from '../../lib/scrapers/_ox.js'
import config from '../../config.js'

const pkg = baileysMod.default && Object.keys(baileysMod).length === 1 ? baileysMod.default : baileysMod
const { generateWAMessageFromContent, generateWAMessage } = pkg

const handler = async (m, { conn, text, usedPrefix, command, userDb }) => {
  let url = text ? text.trim() : ''
  if (!url && m.quoted) {
    const quotedText = m.quoted.body || m.quoted.text || ''
    const match = quotedText.match(/https?:\/\/[^\s]+/i)
    if (match) url = match[0]
  }

  if (!url) return m.reply(`*⌬┤ ✙ ├⌬ ENLACE REQUERIDO.*\n> Enviá o respondé a un mensaje con un enlace válido de TikTok.`)
  if (!/tiktok\.com|vt\.tiktok\.com/i.test(url)) return m.reply(`*⌬┤ ✙ ├⌬ ENLACE INVÁLIDO.*\n> Asegurate de que sea de TikTok.`)
  if (userDb.kogen < 1)                            return m.reply(`*⌬┤ 💎 ├⌬ SIN ${config.PREMIUM_NAME.toUpperCase()}.*\n> No tenés suficientes ${config.PREMIUM_NAME} para usar este comando.`)

  const chatId = m.chat
  await m.reply(`*⌬┤ 📥 ├⌬ Descargando de TikTok...*`)

  try {
    const data = await snaptikDownload(url)

    if (data.type === 'images' && data.images?.length) {
      const caption = `*⌬┤ 🖼️ ├⌬ TIKTOK · ${data.images.length} IMÁGENES*\n> 📝 ${data.title || 'Sin título'}`

      const album = generateWAMessageFromContent(chatId, {
        albumMessage: {
          expectedImageCount: data.images.length,
          contextInfo: { stanzaId: m.key.id, participant: m.key.participant || m.key.remoteJid, quotedMessage: m.message }
        }
      }, {})
      await conn.relayMessage(chatId, album.message, { messageId: album.key.id })

      await Promise.all(data.images.map(async (imgUrl, i) => {
        try {
          const imgBuf = Buffer.from(await (await fetch(imgUrl, { timeout: 60000 })).arrayBuffer())
          const msg = await generateWAMessage(chatId, {
            image: imgBuf,
            caption: i === 0 ? caption : ''
          }, { upload: conn.waUploadToServer })
          msg.message.messageContextInfo = { messageAssociation: { associationType: 1, parentMessageKey: album.key } }
          await conn.relayMessage(chatId, msg.message, { messageId: msg.key.id })
        } catch {}
      }))

    } else if (data.type === 'video') {
      const videoUrl = data.download?.hd || data.download?.sd
      if (!videoUrl) return m.reply(`*⌬┤ ✙ ├⌬ SIN VIDEO.*\n> No se encontró video en ese enlace.`)

      const captionVid = `*⌬┤ 🎵 ├⌬ TIKTOK*\n> 📝 ${data.title || 'Sin título'}`
      const buf = Buffer.from(await (await fetch(videoUrl, { timeout: 60000 })).arrayBuffer())
      await conn.sendMessage(chatId, { video: buf, mimetype: 'video/mp4', caption: captionVid }, { quoted: m })

    } else {
      return m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo obtener contenido de ese enlace.`)
    }

    userDb.kogen -= 1
    await conn.sendMessage(chatId, { text: `${config.PREMIUM_SYMBOL} Utilizaste *1 ${config.PREMIUM_NAME}*` }, { quoted: m })

  } catch (e) {
    console.error(e)
    m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> ${e.message || 'Ocurrió un error inesperado. Intentá de nuevo.'}`)
  }
}

handler.help    = [`ttkdl <link> ${config.PREMIUM_SYMBOL}`]
handler.command = ['ttkdl', 'tiktok', 'tt', 'tiktokdl', 'ttk']
handler.tags    = ['descargas']

export default handler