import fetch from 'node-fetch'

const handler = async (m, { conn, command, text, usedPrefix }) => {
  const query = text?.trim()
  if (!query) return m.reply(`*⌬┤ ✙ ├⌬ USO.*\n> *${usedPrefix}${command} <username>*`)
  await m.reply(`*⌬┤ ⏳ ├⌬ Buscando perfil...*`)

  try {
    const res = await fetch(`https://api.delirius.store/tools/xstalk?username=${encodeURIComponent(query)}`, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    const json = await res.json()
    if (!json?.status || !json?.data) throw new Error()
    
    const d = json.data
    const cap = `*⌬┤ 🐦 ├⌬ X / TWITTER STALK*\n> 👤 *${d.name}* (@${d.username})\n> 📝 ${d.description || '—'}\n> 👥 Seguidores: *${d.followers_count}*\n> ➡️ Siguiendo: *${d.following_count}*\n> 🐦 Tweets: *${d.tweets_count}*\n> ✅ Verificado: *${d.verified ? 'Sí' : 'No'}*\n> 🔒 Privado: *${d.private ? 'Sí' : 'No'}*\n> 📅 Creado: *${d.created_at || '—'}*`
    
    if (d.profile_image_url) {
      await conn.sendMessage(m.chat, { image: { url: d.profile_image_url }, caption: cap }, { quoted: m })
    } else {
      await m.reply(cap)
    }
  } catch {
    await m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo obtener la información. Intentá de nuevo.`)
  }
}

handler.command = ['xstalk', 'twitterstalk', 'xstalkear']
handler.tags = ['tools']
handler.help = ['xstalk <usuario>']
export default handler