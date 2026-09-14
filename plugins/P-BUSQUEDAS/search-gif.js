import fetch from 'node-fetch'
import * as baileysMod from '@whiskeysockets/baileys'

const pkg = baileysMod.default && Object.keys(baileysMod).length === 1 ? baileysMod.default : baileysMod
const { generateWAMessageFromContent, generateWAMessage } = pkg

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) return m.reply(`*⌬┤ ✙ ├⌬ USO.*\n> *${usedPrefix}${command} <búsqueda>*`)

  await m.reply(`*⌬┤ ⏳ ├⌬ Buscando...*`)
  
  try {
    const res = await fetch(`https://g.tenor.com/v1/search?q=${encodeURIComponent(text)}&key=LIVDSRZULELA&limit=6`)
    const json = await res.json()
    
    if (!json.results?.length) return m.reply(`*⌬┤ ✙ ├⌬ SIN RESULTADOS.*\n> No se encontraron GIFs para *${text}*.`)
    
    const items = json.results
    
    const album = generateWAMessageFromContent(m.chat, {
      albumMessage: { expectedImageCount: items.length, contextInfo: { stanzaId: m.key.id, participant: m.key.participant || m.key.remoteJid, quotedMessage: m.message } }
    }, {})
    await conn.relayMessage(m.chat, album.message, { messageId: album.key.id })

    await Promise.all(items.map(async (item, i) => {
      try {
        const url = item.media[0].mp4.url
        const buf = Buffer.from(await fetch(url).then(r => r.arrayBuffer()))
        const msg = await generateWAMessage(m.chat, {
          video: buf,
          gifPlayback: true,
          caption: i === 0 ? `*⌬┤ 🎬 ├⌬ GIFs*\n> 🔎 *${text}*` : ''
        }, { upload: conn.waUploadToServer })
        msg.message.messageContextInfo = { messageAssociation: { associationType: 1, parentMessageKey: album.key } }
        await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
      } catch (e) {}
    }))
  } catch (e) {
    await m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo completar la búsqueda.`)
  }
}

handler.help = ['gif <búsqueda>']
handler.command = ['gif', 'buscargif', 'tenorgif']
handler.tags = ['busquedas']

export default handler