import * as baileysMod from '@whiskeysockets/baileys'
import config from '../../config.js'
import { igDownload } from '../../lib/scrapers/_gi.js'

const pkg = baileysMod.default && Object.keys(baileysMod).length === 1 ? baileysMod.default : baileysMod
const { generateWAMessageFromContent, generateWAMessage } = pkg

const handler = async (m, { conn, text, usedPrefix, command, userDb }) => {
  let url = text ? text.trim() : ''
  if (!url && m.quoted) {
    const quotedText = m.quoted.body || m.quoted.text || ''
    const match = quotedText.match(/https?:\/\/[^\s]+/i)
    if (match) url = match[0]
  }

  if (!url) return m.reply(`*⌬┤ ✙ ├⌬ ENLACE REQUERIDO.*\n> Enviá o respondé a un mensaje con un enlace válido de Instagram.`)
  if (!url.includes('instagram.com')) return m.reply(`*⌬┤ ✙ ├⌬ ENLACE INVÁLIDO.*\n> Asegurate de que sea de Instagram.`)
  if (userDb.kogen < 1) return m.reply(`*⌬┤ 💎 ├⌬ SIN ${config.PREMIUM_NAME.toUpperCase()}.*\n> No tenés suficientes ${config.PREMIUM_NAME} para usar este comando.`)

  const chatId = m.chat
  await m.reply(`*⌬┤ 📥 ├⌬ Descargando de Instagram...*`)
  
  try {
    let mediaItems = []

    try {
      const result = await igDownload(url)
      if (result?.items?.length) {
        mediaItems = result.items.filter(i => i.type === 'video' || i.type === 'image')
      }
    } catch {}

    if (!mediaItems.length) {
      try {
        const res = await fetch(`https://api.delirius.store/download/instagram?url=${encodeURIComponent(url)}`)
        const result = await res.json()
        if (result.status && Array.isArray(result.data) && result.data.length) {
          mediaItems = result.data.filter(i => i.type === 'video' || i.type === 'image')
        }
      } catch {}
    }

    if (!mediaItems.length) {
      return m.reply(`*⌬┤ ✙ ├⌬ SIN CONTENIDO.*\n> No se encontró media en ese enlace o es un perfil privado.`)
    }
    
    if (mediaItems.length === 1) {
      const item = mediaItems[0]
      const mediaRes = await fetch(item.url)
      if (!mediaRes.ok) {
        return m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo descargar el archivo (HTTP ${mediaRes.status}).`)
      }
      const buf = Buffer.from(await mediaRes.arrayBuffer())
      const captionMsg = item.type === 'video' ? `*⌬┤ 🎬 ├⌬ INSTAGRAM*` : `*⌬┤ 📸 ├⌬ INSTAGRAM*`
      await conn.sendMessage(chatId, { [item.type]: buf, caption: captionMsg }, { quoted: m })
    } else {
      const downloads = await Promise.all(mediaItems.map(async (item, i) => {
        try {
          const mediaRes = await fetch(item.url)
          if (!mediaRes.ok) throw new Error(`HTTP ${mediaRes.status}`)
          const buf = Buffer.from(await mediaRes.arrayBuffer())
          return { ok: true, item, buf, i }
        } catch {
          return { ok: false }
        }
      }))

      const ok = downloads.filter(d => d.ok)
      if (ok.length === 0) {
        return m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo descargar ningún elemento del álbum.`)
      }

      const album = generateWAMessageFromContent(chatId, {
        albumMessage: { expectedImageCount: ok.length, contextInfo: { stanzaId: m.key.id, participant: m.key.participant || m.key.remoteJid, quotedMessage: m.message } }
      }, {})
      await conn.relayMessage(chatId, album.message, { messageId: album.key.id })

      await Promise.all(ok.map(async ({ item, buf }, idx) => {
        const msg = await generateWAMessage(chatId, {
          [item.type]: buf,
          caption: idx === 0 ? `*⌬┤ 📚 ├⌬ INSTAGRAM CARRUSEL*\n> 🖼️ Álbum descargado.` : ''
        }, { upload: conn.waUploadToServer })
        msg.message.messageContextInfo = { messageAssociation: { associationType: 1, parentMessageKey: album.key } }
        await conn.relayMessage(chatId, msg.message, { messageId: msg.key.id })
      }))

      const failed = mediaItems.length - ok.length
      if (failed > 0) {
        await conn.sendMessage(chatId, { text: `*⌬┤ ⚠️ ├⌬* ${failed} de ${mediaItems.length} elementos no se pudieron descargar.` }, { quoted: m })
      }
    }
    
    userDb.kogen -= 1
    await conn.sendMessage(chatId, { text: `${config.PREMIUM_SYMBOL} Utilizaste *1 ${config.PREMIUM_NAME}*` }, { quoted: m })
    
  } catch (e) {
    if (e.message?.includes('404') || e.message?.includes('500')) {
      return m.reply(`*⌬┤ 🔒 ├⌬ PERFIL PRIVADO O ERROR.*\n> No se pudo extraer la información del enlace.`)
    }
    m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo completar la descarga. Intentá de nuevo.`)
  }
}

handler.help = [`ig <link> ${config.PREMIUM_SYMBOL}`]
handler.command = ['ig', 'instagram', 'igdl', 'instagramdl', 'reel', 'reeldl']
handler.tags = ['descargas']

export default handler