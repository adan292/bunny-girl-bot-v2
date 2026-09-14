import fetch from 'node-fetch'

const handler = async (m, { conn, command, text, usedPrefix }) => {
  const query = text?.trim()
  if (!query) return m.reply(`*⌬┤ ✙ ├⌬ USO.*\n> *${usedPrefix}${command} <username>*`)
  await m.reply(`*⌬┤ ⏳ ├⌬ Buscando perfil...*`)

  try {
    const res = await fetch(`https://api.delirius.store/tools/tiktokstalk?q=${encodeURIComponent(query)}`, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    const json = await res.json()
    if (!json?.status || !json?.data) throw new Error()
    
    const d = json.data
    const u = d.user || d
    const s = d.stats || d
    
    const cap = `*⌬┤ 🎵 ├⌬ TIKTOK STALK*\n> 👤 *${u.nickname || u.unique_id}* (@${u.unique_id})\n> 📝 ${u.signature || '—'}\n> 👥 Seguidores: *${s.followerCount || s.follower_count}*\n> ➡️ Siguiendo: *${s.followingCount || s.following_count}*\n> ❤️ Likes: *${s.heartCount || s.heart_count}*\n> 🎥 Videos: *${s.videoCount || s.video_count}*\n> ✅ Verificado: *${u.verified ? 'Sí' : 'No'}*\n> 🔒 Privado: *${u.privateAccount || u.private_account ? 'Sí' : 'No'}*`
    
    const avatar = u.avatarLarger || u.avatar_larger || u.avatarMedium
    if (avatar) {
      await conn.sendMessage(m.chat, { image: { url: avatar }, caption: cap }, { quoted: m })
    } else {
      await m.reply(cap)
    }
  } catch {
    await m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo obtener la información. Intentá de nuevo.`)
  }
}

handler.command = ['tiktokstalk', 'ttstalk', 'tkstal']
handler.tags = ['tools']
handler.help = ['tiktokstalk <usuario>']
export default handler