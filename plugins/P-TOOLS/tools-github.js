import axios from 'axios'

const handler = async (m, { conn, command, args, usedPrefix }) => {
  if (!args[0]) return m.reply(`*⌬┤ ✙ ├⌬ USO.*\n> *${usedPrefix}${command} <usuario>*`)
  await m.reply(`*⌬┤ ⏳ ├⌬ Buscando en GitHub...*`)
  
  try {
    const res = await axios.get(`https://api.popcat.xyz/v2/github/${encodeURIComponent(args[0])}`)
    const d = res.data?.message
    if (!d || res.data?.error) throw new Error()
    
    const cap = `👤 *${d.name || d.login || args[0]}*\n> 🔗 ${d.url}\n> 🏷️ ${d.account_type}\n> 🌍 ${d.location || '—'}\n> 📧 ${d.email || '—'}\n> 📦 Repos: *${d.public_repos}*\n> 👥 Seguidores: *${d.followers}*\n> ➡️ Siguiendo: *${d.following}*\n> 📝 ${d.bio || '—'}\n> 📅 Creado: ${d.created_at}`
    
    await conn.sendMessage(m.chat, { image: { url: d.avatar }, caption: cap }, { quoted: m })
  } catch { 
    m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo encontrar el usuario en GitHub.`) 
  }
}

handler.command = ['github', 'popgithub']
handler.tags = ['tools']
handler.help = ['github <usuario>']
export default handler