import fetch from 'node-fetch'

const handler = async (m, { conn, command, text, usedPrefix }) => {
  const query = text?.trim()
  if (!query) return m.reply(`*⌬┤ ✙ ├⌬ USO.*\n> *${usedPrefix}${command} <username>*`)
  
  await m.reply(`*⌬┤ ⏳ ├⌬ Buscando perfil...*`)

  try {
    const res = await fetch(`https://api.delirius.store/tools/igstalk?username=${encodeURIComponent(query)}`, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    const json = await res.json()
    if (!json?.status || !json?.data) throw new Error()
    
    const d = json.data
    const cap = `*⌬┤ 📸 ├⌬ INSTAGRAM STALK*\n> 👤 *${d.full_name}* (@${d.username})\n> 🔗 ${d.url}\n> 📝 ${d.biography || '—'}\n> 🏷️ ${d.category || '—'}\n> 📸 Posts: *${d.posts}*\n> 👥 Seguidores: *${d.followers}*\n> ➡️ Siguiendo: *${d.following}*\n> ✅ Verificado: *${d.verified ? 'Sí' : 'No'}*\n> 🔒 Privado: *${d.private ? 'Sí' : 'No'}*`
    
    await conn.sendMessage(m.chat, { image: { url: d.profile_picture }, caption: cap }, { quoted: m })
  } catch {
    await m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo obtener la información. Intentá de nuevo.`)
  }
}

handler.command = ['igstalk', 'instagramstalk']
handler.tags = ['tools']
handler.help = ['igstalk <usuario>']
export default handler