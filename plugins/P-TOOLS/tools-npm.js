import axios from 'axios'

const handler = async (m, { conn, command, text, usedPrefix }) => {
  if (!text) return m.reply(`*⌬┤ ✙ ├⌬ USO.*\n> *${usedPrefix}${command} <nombre de paquete>*`)
  await m.reply(`*⌬┤ ⏳ ├⌬ Buscando paquete en NPM...*`)
  
  try {
    const res = await axios.get(`https://api.popcat.xyz/v2/npm?q=${encodeURIComponent(text)}`)
    const data = res.data?.message || res.data
    if (!data || data.error) throw new Error()
    
    const cap = `📦 *${data.name}*\n> 🔢 Versión: *${data.version}*\n> 📝 ${data.description}\n> 👤 Autor: *${data.author}*\n> 📅 Publicado: ${data.last_published}\n> 📊 Descargas este año: *${data.downloadsthisyear}*`
    await conn.sendMessage(m.chat, { text: cap }, { quoted: m })
  } catch { 
    m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> Paquete no encontrado o error en el servidor.`) 
  }
}

handler.command = ['npm', 'popnpm']
handler.tags = ['tools']
handler.help = ['npm <paquete>']
export default handler