import fetch from 'node-fetch'
import * as baileysMod from '@whiskeysockets/baileys'
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

  if (!url) return m.reply(`*⌬┤ ❗ ├⌬ LINK REQUERIDO.*\n> Ej: *${usedPrefix}${command} https://x.com/...*`)
  if (!url.includes('twitter.com') && !url.includes('x.com')) {
    return m.reply(`*⌬┤ ❗ ├⌬ LINK INVÁLIDO.*\n> Asegurate de que sea de X (Twitter).`)
  }
  if (userDb.kogen < 1) return m.reply(`*⌬┤ 💎 ├⌬ SIN ${config.PREMIUM_NAME.toUpperCase()}.*\n> No tenés suficientes ${config.PREMIUM_NAME} para usar este comando.`)

  const chatId = m.chat
  await m.reply(`*⌬┤ ⏳ ├⌬ Descargando tweet...*`)

  try {
    let media = []

    try {
      const res = await fetch(`https://luxinfinity.vercel.app/api/twitter?url=${encodeURIComponent(url)}`)
      const result = await res.json()
      if (result.status && result.data) {
        const { videos = [], photos = [] } = result.data
        for (const v of videos) {
          const best = v.variants?.filter(x => x.contentType === 'video/mp4').sort((a, b) => b.bitrate - a.bitrate)[0]
          if (best?.url) media.push({ type: 'video', url: best.url })
          else if (v.url) media.push({ type: 'video', url: v.url })
        }
        for (const p of photos) {
          if (p.url) media.push({ type: 'image', url: p.url })
        }
      }
    } catch {}

    if (!media.length) {
      try {
        const res = await fetch(`https://api.delirius.store/download/twitterdl?url=${encodeURIComponent(url)}`)
        const result = await res.json()
        if (result.found && Array.isArray(result.media) && result.media.length) {
          const tipo = result.type || 'video'
          media = result.media.map(m => ({ type: tipo, url: m.url }))
        }
      } catch {}
    }

    if (!media.length) return m.reply(`*⌬┤ ❗ ├⌬ Sin resultados.*\n> Verificá el link o asegurate de que tenga contenido multimedia.`)
    
    if (media.length === 1) {
      const item = media[0]
      const buf = Buffer.from(await (await fetch(item.url, { timeout: 60000 })).arrayBuffer())
      await conn.sendMessage(chatId, { [item.type]: buf, mimetype: item.type === 'video' ? 'video/mp4' : undefined, caption: `*⌬┤ ✅ ├⌬ Tweet descargado*` }, { quoted: m })
    } else {
      const album = generateWAMessageFromContent(chatId, {
        albumMessage: { expectedImageCount: media.length, contextInfo: { stanzaId: m.key.id, participant: m.key.participant || m.key.remoteJid, quotedMessage: m.message } }
      }, {})
      await conn.relayMessage(chatId, album.message, { messageId: album.key.id })

      await Promise.all(media.map(async (item, i) => {
        try {
          const buf = Buffer.from(await (await fetch(item.url, { timeout: 60000 })).arrayBuffer())
          const msg = await generateWAMessage(chatId, {
            [item.type]: buf,
            caption: i === 0 ? `*⌬┤ ✅ ├⌬ Tweet Carrusel*` : ''
          }, { upload: conn.waUploadToServer })
          msg.message.messageContextInfo = { messageAssociation: { associationType: 1, parentMessageKey: album.key } }
          await conn.relayMessage(chatId, msg.message, { messageId: msg.key.id })
        } catch (err) { console.error('[TW_ITEM]', err) }
      }))
    }
    
    userDb.kogen -= 1
    await conn.sendMessage(chatId, { text: `${config.PREMIUM_SYMBOL} Utilizaste *1 ${config.PREMIUM_NAME}*` }, { quoted: m })
    
  } catch (e) { 
    console.error('[TW]', e.message)
    m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo completar la descarga. Intentá de nuevo.`) 
  }
}

handler.help = [`twitter <link> ${config.PREMIUM_SYMBOL}`]
handler.command = ['tw', 'twitter', 'tweet', 'x']
handler.tags = ['descargas']

export default handler