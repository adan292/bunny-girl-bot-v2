import fetch from 'node-fetch'

const handler = async (m, { conn, command, text, usedPrefix }) => {
  const query = text?.trim()
  if (!query) return m.reply(`*⌬┤ ✙ ├⌬ USO.*\n> *${usedPrefix}${command} <username>*`)
  await m.reply(`*⌬┤ ⏳ ├⌬ Buscando perfil...*`)

  try {
    const res = await fetch(`https://api.delirius.store/tools/robloxstalk?username=${encodeURIComponent(query)}`, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    const json = await res.json()
    if (!json?.status || !json?.data) throw new Error()
    
    const d = json.data
    const cap = `*⌬┤ 🎮 ├⌬ ROBLOX STALK*\n> 👤 *${d.displayName || d.name}* (@${d.name || d.username})\n> 📝 ${d.description || '—'}\n> 👥 Seguidores: *${d.followerCount || d.followers || '—'}*\n> ➡️ Siguiendo: *${d.followingCount || d.following || '—'}*\n> 👫 Amigos: *${d.friendsCount || d.friends || '—'}*`
    
    if (d.avatar || d.avatarUrl) {
      await conn.sendMessage(m.chat, { image: { url: d.avatar || d.avatarUrl }, caption: cap }, { quoted: m })
    } else {
      await m.reply(cap)
    }
  } catch {
    await m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo obtener la información. Intentá de nuevo.`)
  }
}

handler.command = ['robloxstalk', 'rblxstalk']
handler.tags = ['tools']
handler.help = ['robloxstalk <usuario>']
export default handler