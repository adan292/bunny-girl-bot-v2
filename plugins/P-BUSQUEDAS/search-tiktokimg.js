import fetch from 'node-fetch'
import * as baileysMod from '@whiskeysockets/baileys'

const pkg = baileysMod.default && Object.keys(baileysMod).length === 1 ? baileysMod.default : baileysMod
const { generateWAMessageFromContent, generateWAMessage } = pkg

const handler = async (m, { conn, text, usedPrefix, command, userDb }) => {
  if (!text) return m.reply(`*⌬┤ ✙ ├⌬ USO.*\n> *${usedPrefix}${command} <búsqueda>*`)

  if (userDb.kogen < 1) {
    return m.reply(`*⌬┤ 💎 ├⌬ SIN KŌGEN.*\n> No tenés suficientes Kōgen para usar este comando Premium.`)
  }

  const textoReal = text.trim()
  await m.reply(`*⌬┤ ⏳ ├⌬ Buscando...*`)
  
  try {
    const res = await fetch(`https://api.delirius.store/search/tiktoksearchimages?query=${encodeURIComponent(textoReal)}`)
    const json = await res.json()
    
    if (!json.status || !json.data?.length) return m.reply(`*⌬┤ ✙ ├⌬ SIN RESULTADOS.*\n> No se encontró nada para *${textoReal}*.`)
    
    const postsConCarrusel = json.data.filter(p => p.download && p.download.length > 1)
    if (!postsConCarrusel.length) return m.reply(`*⌬┤ ✙ ├⌬ SIN CARRUSELES.*\n> No se encontraron TikToks de imágenes para *${textoReal}*.`)
    
    const item = postsConCarrusel.sort(() => Math.random() - 0.5)[0]
    const images = item.download

    const album = generateWAMessageFromContent(m.chat, {
      albumMessage: { expectedImageCount: images.length, contextInfo: { stanzaId: m.key.id, participant: m.key.participant || m.key.remoteJid, quotedMessage: m.message } }
    }, {})
    await conn.relayMessage(m.chat, album.message, { messageId: album.key.id })

    await Promise.all(images.map(async (url, i) => {
      try {
        const buf = Buffer.from(await fetch(url).then(r => r.arrayBuffer()))
        const msg = await generateWAMessage(m.chat, {
          image: buf,
          caption: i === 0 ? `*⌬┤ 🎵 ├⌬ TIKTOK CARRUSEL*\n> ${item.title?.slice(0, 80) || '?'}\n> 🔎 *${textoReal}*` : ''
        }, { upload: conn.waUploadToServer })
        msg.message.messageContextInfo = { messageAssociation: { associationType: 1, parentMessageKey: album.key } }
        await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
      } catch (e) {}
    }))

    userDb.kogen -= 1

  } catch (e) { 
    await m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo completar la búsqueda.`) 
  }
}

handler.kogen = 1
handler.help = ['tiktokimg <búsqueda> ✦']
handler.command = ['tiktokimg', 'tktimg']
handler.tags = ['busquedas']

export default handler