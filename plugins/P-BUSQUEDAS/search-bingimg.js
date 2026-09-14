import fetch from 'node-fetch'
import * as baileysMod from '@whiskeysockets/baileys'

const pkg = baileysMod.default && Object.keys(baileysMod).length === 1 ? baileysMod.default : baileysMod
const { generateWAMessageFromContent, generateWAMessage } = pkg

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) return m.reply(`*⌬┤ ✙ ├⌬ USO.*\n> *${usedPrefix}${command} <búsqueda>*`)

  await m.reply(`*⌬┤ ⏳ ├⌬ Buscando...*`)
  
  try {
    const res = await fetch(`https://api.delirius.store/search/bingimage?query=${encodeURIComponent(text)}`)
    const json = await res.json()
    
    if (!json.status || !json.data?.length) return m.reply(`*⌬┤ ✙ ├⌬ SIN RESULTADOS.*\n> No se encontraron imágenes para *${text}*.`)
    
    const items = json.data.sort(() => Math.random() - 0.5).slice(0, 6)
    
    const album = generateWAMessageFromContent(m.chat, {
      albumMessage: { expectedImageCount: items.length, contextInfo: { stanzaId: m.key.id, participant: m.key.participant || m.key.remoteJid, quotedMessage: m.message } }
    }, {})
    await conn.relayMessage(m.chat, album.message, { messageId: album.key.id })

    await Promise.all(items.map(async (item, i) => {
      try {
        const buf = Buffer.from(await fetch(item.direct || item.thumbnail).then(r => r.arrayBuffer()))
        const msg = await generateWAMessage(m.chat, {
          image: buf,
          caption: i === 0 ? `*⌬┤ 🔍 ├⌬ BING IMÁGENES*\n> 🔎 *${text}*` : ''
        }, { upload: conn.waUploadToServer })
        msg.message.messageContextInfo = { messageAssociation: { associationType: 1, parentMessageKey: album.key } }
        await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
      } catch (e) {}
    }))
  } catch (e) { 
    await m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo completar la búsqueda.`) 
  }
}

handler.help = ['bingimg <búsqueda>']
handler.command = ['bingimg', 'bingimagen']
handler.tags = ['busquedas']

export default handler