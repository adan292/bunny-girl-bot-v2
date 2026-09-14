import fetch from 'node-fetch'

const handler = async (m, { conn, command, text, usedPrefix }) => {
  const query = text?.trim()
  if (!query) return m.reply(`*⌬┤ ✙ ├⌬ USO.*\n> *${usedPrefix}${command} <username>*`)
  await m.reply(`*⌬┤ ⏳ ├⌬ Buscando perfil...*`)

  try {
    const res = await fetch(`https://api.delirius.store/tools/threadsststalk?username=${encodeURIComponent(query)}`, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    const json = await res.json()
    if (!json?.status || !json?.data) throw new Error()
    
    const d = json.data
    const cap = `*⌬┤ 🧵 ├⌬ THREADS STALK*\n> 👤 *${d.full_name || d.name}* (@${d.username})\n> 📝 ${d.biography || d.bio || '—'}\n> 👥 Seguidores: *${d.follower_count || d.followers || '—'}*\n> ✅ Verificado: *${d.is_verified || d.verified ? 'Sí' : 'No'}*`
    
    if (d.profile_pic_url || d.avatar) {
      await conn.sendMessage(m.chat, { image: { url: d.profile_pic_url || d.avatar }, caption: cap }, { quoted: m })
    } else {
      await m.reply(cap)
    }
  } catch {
    await m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo obtener la información. Intentá de nuevo.`)
  }
}

handler.command = ['threadsstalk', 'threads']
handler.tags = ['tools']
handler.help = ['threadsstalk <usuario>']
export default handler