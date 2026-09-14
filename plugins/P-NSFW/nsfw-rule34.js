import fetch from 'node-fetch'
import * as baileysMod from '@whiskeysockets/baileys'

const pkg = baileysMod.default && Object.keys(baileysMod).length === 1 ? baileysMod.default : baileysMod
const { generateWAMessageFromContent, generateWAMessage } = pkg

const handler = async (m, { conn, text, usedPrefix, command }) => {
  const tags = text?.trim() || ''
  await m.react('🔞')
  await m.reply(`*⌬┤ ⏳ ├⌬ Buscando resultados en Rule34...*`)
  
  try {
    let url = `https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&limit=60`
    if (tags) url += `&tags=${encodeURIComponent(tags)}`
    
    url += `&user_id=5267539&api_key=dc12e2cb36b1bab5e941e7024bd2ac35dcdc9285bc047a4c99921bbfbc8ce5320b7f874de7e7e9ac23781ff9414f2cea88cb2e2cda77bfc36975576dc0fede0a`

    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } })
    
    if (!res.ok) throw new Error()
    
    const body = await res.text()
    if (!body || body.trim().length === 0) throw new Error()

    const json = JSON.parse(body)

    if (!Array.isArray(json) || json.length === 0) {
      await m.react('❌')
      return m.reply(`*⌬┤ ❌ ├⌬ SIN RESULTADOS.*\n> No se encontró nada para los tags: _${tags || 'random'}_`)
    }

    const items = json.sort(() => 0.5 - Math.random()).slice(0, 6)
    
    const album = generateWAMessageFromContent(m.chat, {
      albumMessage: { expectedImageCount: items.length, contextInfo: { stanzaId: m.key.id, participant: m.key.participant || m.key.remoteJid, quotedMessage: m.message } }
    }, {})
    await conn.relayMessage(m.chat, album.message, { messageId: album.key.id })

    await Promise.all(items.map(async (item, i) => {
      try {
        const mediaUrl = item.file_url || item.sample_url
        if (!mediaUrl) return

        const buf = Buffer.from(await fetch(mediaUrl).then(r => r.arrayBuffer()))
        const itemTags = (item.tags || '').split(' ').slice(0, 8).join(', ') || '-'
        const isVideo = mediaUrl.toLowerCase().endsWith('.mp4') || mediaUrl.toLowerCase().endsWith('.webm')
        
        const caption = i === 0 
          ? `*⌬┤ 🔞 ├⌬ RULE34*\n> 🏷️ ${itemTags}\n> 📊 Score: ${item.score || 0}` 
          : `> 🏷️ ${itemTags}\n> 📊 Score: ${item.score || 0}`
        
        const msg = await generateWAMessage(m.chat, {
          [isVideo ? 'video' : 'image']: buf,
          caption: caption
        }, { upload: conn.waUploadToServer })
        
        msg.message.messageContextInfo = { messageAssociation: { associationType: 1, parentMessageKey: album.key } }
        await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
      } catch (e) {}
    }))
    
    await m.react('✅')

  } catch (e) {
    await m.react('❌')
    m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo procesar la solicitud o el servidor no responde. Intentá de nuevo.`)
  }
}

handler.command = ['rule34', 'r34']
handler.tags = ['nsfw']
handler.help = ['rule34 [tags]']
handler.nsfw = true
export default handler