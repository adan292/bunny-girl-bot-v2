import fetch from 'node-fetch'
import { upload } from '@axel-dev09/zen-dl'

const handler = async (m, { conn, text, usedPrefix }) => {
  let buffer
  try {
    const q = m.quoted ? m.quoted : m
    const mime = (q.msg || q).mimetype || ''

    if (mime.startsWith('image/')) {
      buffer = await q.download() 
    } else if (text && /^https?:\/\/.*\.(jpe?g|png|gif)$/i.test(text)) {
      const res = await fetch(text)
      if (!res.ok) throw new Error()
      buffer = Buffer.from(await res.arrayBuffer())
    } else {
      return m.reply(`*⌬┤ ✙ ├⌬ SIN IMAGEN.*\n> Respondé a una imagen o enviá un link directo.`)
    }
    
    await m.react('📤')
    const { url: urlCatbox } = await upload(buffer, `compress_${Date.now()}.jpg`)
    const response = await fetch(`https://api.siputzx.my.id/api/iloveimg/compress?image=${encodeURIComponent(urlCatbox)}`)
    
    if (!response.ok) throw new Error()
    const compressed = Buffer.from(await response.arrayBuffer())
    
    await conn.sendMessage(m.chat, { image: compressed, caption: `*⌬┤ 🎯 ├⌬ IMAGEN COMPRIMIDA.*` }, { quoted: m })
    await m.react('✅')
  } catch { 
    await m.react('✖️')
    m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo completar. Intentá de nuevo.`) 
  }
}

handler.command = ['comprimir', 'compress']
handler.tags = ['tools']
handler.help = ['comprimir <imagen/url>']
export default handler