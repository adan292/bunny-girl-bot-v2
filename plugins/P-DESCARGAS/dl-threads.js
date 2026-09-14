import fetch from 'node-fetch'
import * as baileysMod from '@whiskeysockets/baileys'
import config from '../../config.js'

const pkg = baileysMod.default && Object.keys(baileysMod).length === 1
  ? baileysMod.default
  : baileysMod

const { generateWAMessageFromContent, generateWAMessage } = pkg

const handler = async (m, { conn, text, usedPrefix, command, userDb }) => {
  let url = text ? text.trim() : ''
  if (!url && m.quoted) {
    const quotedText = m.quoted.body || m.quoted.text || ''
    const match = quotedText.match(/https?:\/\/[^\s]+/i)
    if (match) url = match[0]
  }

  if (!url) return m.reply(`*⌬┤ ❗ ├⌬ LINK REQUERIDO.*\n> Ej: *${usedPrefix}${command} https://www.threads.net/...*`)
  if (!url.includes('threads.net') && !url.includes('threads.com')) {
    return m.reply(`*⌬┤ ❗ ├⌬ LINK INVÁLIDO.*\n> Asegurate de que sea de Threads.`)
  }
  if (userDb.kogen < 1) {
    return m.reply(`*⌬┤ 💎 ├⌬ SIN ${config.PREMIUM_NAME.toUpperCase()}.*\n> No tenés suficientes ${config.PREMIUM_NAME} para usar este comando.`)
  }

  const chatId = m.chat
  await m.reply(`*⌬┤ ⏳ ├⌬ Descargando post de Threads...*`)

  try {
    const primaryUrl = `https://luxinfinity.vercel.app/api/threads?url=${encodeURIComponent(url)}`
    const fallbackUrl = `https://api.delirius.store/download/threads?url=${encodeURIComponent(url)}`

    let media = []

    const tryPrimary = async () => {
      const res = await fetch(primaryUrl)
      const result = await res.json()
      if (result.data?.items?.length) return result.data.items
      if (result.data?.url) return [{ type: result.data.type || 'image', url: result.data.url }]
      return []
    }

    const tryFallback = async () => {
      const res = await fetch(fallbackUrl)
      const result = await res.json()
      if (!result.status) return []
      if (result.data?.media?.length) return result.data.media
      if (result.data?.url) return [{ type: result.data.type || 'image', url: result.data.url }]
      return []
    }

    try {
      media = await tryPrimary()
    } catch {}

    if (!media.length) {
      try {
        media = await tryFallback()
      } catch {}
    }

    if (!media.length) {
      return m.reply(`*⌬┤ ❗ ├⌬ Sin resultados.*\n> Verificá que el post sea público.`)
    }

    if (media.length === 1) {
      const item = media[0]
      const buffer = Buffer.from(await (await fetch(item.url)).arrayBuffer())

      const caption = item.type === 'video'
        ? `*⌬┤ 🧵 ├⌬ THREADS*\n> 🎬 Video`
        : `*⌬┤ 🧵 ├⌬ THREADS*\n> 🖼️ Imagen`

      await conn.sendMessage(chatId, {
        [item.type]: buffer,
        mimetype: item.type === 'video' ? 'video/mp4' : undefined,
        caption
      }, { quoted: m })

    } else {
      const album = generateWAMessageFromContent(chatId, {
        albumMessage: {
          expectedImageCount: media.length,
          contextInfo: {
            stanzaId: m.key.id,
            participant: m.key.participant || m.key.remoteJid,
            quotedMessage: m.message
          }
        }
      }, {})

      await conn.relayMessage(chatId, album.message, { messageId: album.key.id })

      await Promise.all(media.map(async (item, i) => {
        try {
          const buffer = Buffer.from(await (await fetch(item.url)).arrayBuffer())

          const msg = await generateWAMessage(chatId, {
            [item.type]: buffer,
            mimetype: item.type === 'video' ? 'video/mp4' : undefined,
            caption: i === 0 ? `*⌬┤ 🧵 ├⌬ THREADS CARRUSEL*` : ''
          }, { upload: conn.waUploadToServer })

          msg.message.messageContextInfo = {
            messageAssociation: { associationType: 1, parentMessageKey: album.key }
          }

          await conn.relayMessage(chatId, msg.message, { messageId: msg.key.id })

        } catch {}
      }))
    }

    userDb.kogen -= 1
    await conn.sendMessage(chatId, { text: `${config.PREMIUM_SYMBOL} Utilizaste *1 ${config.PREMIUM_NAME}*` }, { quoted: m })

  } catch (e) {
    console.log(e)
    m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo completar. Intentá de nuevo.`)
  }
}

handler.help = [`threads <link> ${config.PREMIUM_SYMBOL}`]
handler.command = ['threads', 'th', 'threadspost', 'threadsvid']
handler.tags = ['descargas']

export default handler