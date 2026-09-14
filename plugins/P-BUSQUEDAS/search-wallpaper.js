import fetch from 'node-fetch'
import * as baileysMod from '@whiskeysockets/baileys'

const pkg = baileysMod.default && Object.keys(baileysMod).length === 1 ? baileysMod.default : baileysMod
const { generateWAMessageFromContent, generateWAMessage } = pkg

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) return m.reply(`*⌬┤ ✙ ├⌬ USO.*\n> *${usedPrefix}${command} <búsqueda>*`)

  const textoReal = text.trim()
  await m.reply(`*⌬┤ ⏳ ├⌬ Buscando...*`)
  
  try {
    const res = await fetch(`https://api.delirius.store/search/wallpapers?q=${encodeURIComponent(textoReal)}`)
    const json = await res.json()
    
    if (!json.status || !json.data?.length) return m.reply(`*⌬┤ ✙ ├⌬ SIN RESULTADOS.*\n> No se encontraron wallpapers para *${textoReal}*.`)
    
    const items = json.data.sort(() => Math.random() - 0.5).slice(0, 6)
    
    const album = generateWAMessageFromContent(m.chat, {
      albumMessage: { expectedImageCount: items.length, contextInfo: { stanzaId: m.key.id, participant: m.key.participant || m.key.remoteJid, quotedMessage: m.message } }
    }, {})
    await conn.relayMessage(m.chat, album.message, { messageId: album.key.id })

    await Promise.all(items.map(async (item, i) => {
      try {
        const buf = Buffer.from(await fetch(item.image).then(r => r.arrayBuffer()))
        const msg = await generateWAMessage(m.chat, {
          image: buf,
          caption: i === 0 ? `*⌬┤ 🖼️ ├⌬ WALLPAPERS*\n> 🔎 *${textoReal}*` : ''
        }, { upload: conn.waUploadToServer })
        msg.message.messageContextInfo = { messageAssociation: { associationType: 1, parentMessageKey: album.key } }
        await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
      } catch (e) {}
    }))
  } catch (e) { 
    await m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo completar la búsqueda.`) 
  }
}

handler.help = ['wallpaper <búsqueda>']
handler.command = ['wallpaper', 'fondo']
handler.tags = ['busquedas']

export default handler