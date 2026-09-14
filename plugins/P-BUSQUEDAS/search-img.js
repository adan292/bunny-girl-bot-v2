import axios from 'axios'
import * as cheerio from 'cheerio'
import fetch from 'node-fetch'
import * as baileysMod from '@whiskeysockets/baileys'

const pkg = baileysMod.default && Object.keys(baileysMod).length === 1 ? baileysMod.default : baileysMod
const { generateWAMessageFromContent, generateWAMessage } = pkg

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) return m.reply(`*⌬┤ ✙ ├⌬ USO.*\n> *${usedPrefix}${command} <término>*`)

  await m.reply(`*⌬┤ ⏳ ├⌬ Buscando...*`)
  
  try {
    let lista = []
    const res = await axios.get(
      `https://www.bing.com/images/search?q=${encodeURIComponent(text)}&form=HDRSC2`,
      { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.bing.com/' } }
    )
    const $ = cheerio.load(res.data)
    $('a.iusc').each((_, el) => {
      try { const p = JSON.parse($(el).attr('m')); if (p?.murl) lista.push(p.murl) } catch {}
    })
    
    if (!lista.length) return m.reply(`*⌬┤ ✙ ├⌬ SIN RESULTADOS.*\n> No se encontraron resultados para esa búsqueda.`)
    
    const items = lista.sort(() => Math.random() - 0.5).slice(0, 6)
    
    const album = generateWAMessageFromContent(m.chat, {
      albumMessage: { expectedImageCount: items.length, contextInfo: { stanzaId: m.key.id, participant: m.key.participant || m.key.remoteJid, quotedMessage: m.message } }
    }, {})
    await conn.relayMessage(m.chat, album.message, { messageId: album.key.id })

    await Promise.all(items.map(async (url, i) => {
      try {
        const buf = Buffer.from(await fetch(url).then(r => r.arrayBuffer()))
        const msg = await generateWAMessage(m.chat, {
          image: buf,
          caption: i === 0 ? `*⌬┤ 🖼️ ├⌬ IMÁGENES*\n> 🔎 *${text}*` : ''
        }, { upload: conn.waUploadToServer })
        msg.message.messageContextInfo = { messageAssociation: { associationType: 1, parentMessageKey: album.key } }
        await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
      } catch (e) {}
    }))
  } catch (e) { 
    await m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo completar la búsqueda.`) 
  }
}

handler.help = ['imagen <término>']
handler.command = ['img', 'imagen']
handler.tags = ['busquedas']

export default handler