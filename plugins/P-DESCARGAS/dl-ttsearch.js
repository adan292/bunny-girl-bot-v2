import fetch from 'node-fetch'
import { tiktokSearch } from '../../lib/scrapers/tiktok.js'
import * as baileysMod from '@whiskeysockets/baileys'
import config from '../../config.js'

const pkg = baileysMod.default && Object.keys(baileysMod).length === 1 ? baileysMod.default : baileysMod
const { generateWAMessageFromContent, generateWAMessage } = pkg

const handler = async (m, { conn, text, usedPrefix, command, userDb }) => {
  let query = text ? text.trim() : ''
  if (!query && m.quoted) {
    query = (m.quoted.body || m.quoted.text || '').trim()
  }

  if (!query) return m.reply(`*⌬┤ ✙ ├⌬ USO.*\n> *${usedPrefix}${command} <término>* — Ej: *${usedPrefix}${command} gatos*`)
  if (userDb.kogen < 1) return m.reply(`*⌬┤ 💎 ├⌬ SIN ${config.PREMIUM_NAME.toUpperCase()}.*\n> No tenés suficientes ${config.PREMIUM_NAME} para usar este comando.`)

  const chatId = m.chat

  await m.reply(`*⌬┤ 🔍 ├⌬ Buscando en TikTok (6 videos)...*`)

  try {
    const videos = await tiktokSearch(query, 6)
    if (!videos?.length) return m.reply(`*⌬┤ ✙ ├⌬ SIN RESULTADOS.*\n> No se encontraron videos para *${query}*.`)

    const items = videos.slice(0, 6)

    if (items.length === 1) {
      const v = items[0]
      const buf = Buffer.from(await (await fetch(v.nowatermark || v.url)).arrayBuffer())
      const caption = `*⌬┤ 🎵 ├⌬ ${v.title?.slice(0, 80)}*\n> 👤 *${v.author}*\n> ⏱️ ${v.duration}s · 👁️ ${v.plays?.toLocaleString()} vistas`
      await conn.sendMessage(chatId, { video: buf, caption }, { quoted: m })
    } else {
      const album = generateWAMessageFromContent(chatId, {
        albumMessage: { expectedImageCount: items.length, contextInfo: { stanzaId: m.key.id, participant: m.key.participant || m.key.remoteJid, quotedMessage: m.message } }
      }, {})
      await conn.relayMessage(chatId, album.message, { messageId: album.key.id })

      await Promise.all(items.map(async (v, i) => {
        let mediaUrl = v.nowatermark || v.url
        let isImage = false
        if (Array.isArray(v.images) && v.images.length > 0) {
          mediaUrl = v.images[0]
          isImage = true
        }

        try {
          const buf = Buffer.from(await (await fetch(mediaUrl, { timeout: 60000 })).arrayBuffer())
          const caption = `*⌬┤ 🎵 ├⌬ ${v.title?.slice(0, 60)}*\n> 👤 *${v.author}* · 👁️ ${v.plays?.toLocaleString()}`

          const msg = await generateWAMessage(chatId, {
            [isImage ? 'image' : 'video']: buf,
            caption: caption
          }, { upload: conn.waUploadToServer })
          msg.message.messageContextInfo = { messageAssociation: { associationType: 1, parentMessageKey: album.key } }
          await conn.relayMessage(chatId, msg.message, { messageId: msg.key.id })
        } catch (err) { }
      }))
    }
    
    userDb.kogen -= 1
    await conn.sendMessage(chatId, { text: `${config.PREMIUM_SYMBOL} Utilizaste *1 ${config.PREMIUM_NAME}*` }, { quoted: m })

  } catch (e) {
    m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo completar la búsqueda.`)
  }
}

handler.help = [`ttsearch <término> ${config.PREMIUM_SYMBOL}`]
handler.command = ['ttsearch', 'tiktoksearch', 'tts']
handler.tags = ['descargas']

export default handler