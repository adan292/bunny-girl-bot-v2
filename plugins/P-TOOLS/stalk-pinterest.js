import fetch from 'node-fetch'

const handler = async (m, { conn, command, text, usedPrefix }) => {
  const query = text?.trim()
  if (!query) return m.reply(`*⌬┤ ✙ ├⌬ USO.*\n> *${usedPrefix}${command} <username>*`)
  await m.reply(`*⌬┤ ⏳ ├⌬ Buscando perfil...*`)

  try {
    const res = await fetch(`https://api.delirius.store/tools/pintereststalk?username=${encodeURIComponent(query)}`, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    const json = await res.json()
    if (!json?.status || !json?.data) throw new Error()
    
    const d = json.data
    const cap = `*⌬┤ 📌 ├⌬ PINTEREST STALK*\n> 👤 *${d.full_name || d.name}* (@${d.username})\n> 📝 ${d.about || d.bio || '—'}\n> 👥 Seguidores: *${d.follower_count || d.followers || '—'}*\n> ➡️ Siguiendo: *${d.following_count || d.following || '—'}*\n> 📌 Pins: *${d.pin_count || d.pins || '—'}*`
    
    if (d.image_xlarge_url || d.avatar || d.profile_cover) {
      await conn.sendMessage(m.chat, { image: { url: d.image_xlarge_url || d.avatar || d.profile_cover }, caption: cap }, { quoted: m })
    } else {
      await m.reply(cap)
    }
  } catch {
    await m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo obtener la información. Intentá de nuevo.`)
  }
}

handler.command = ['pintereststalk']
handler.tags = ['tools']
handler.help = ['pintereststalk <usuario>']
export default handler