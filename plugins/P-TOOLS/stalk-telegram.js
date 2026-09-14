import fetch from 'node-fetch'

const handler = async (m, { conn, command, text, usedPrefix }) => {
  const query = text?.trim()
  if (!query) return m.reply(`*⌬┤ ✙ ├⌬ USO.*\n> *${usedPrefix}${command} <username/canal>*`)
  await m.reply(`*⌬┤ ⏳ ├⌬ Buscando perfil...*`)

  try {
    const isChannel = command.includes('channel')
    const endpoint = isChannel ? 'channelstalk' : 'telegramstalk'
    const paramKey = isChannel ? 'channel' : 'username'
    
    const res = await fetch(`https://api.delirius.store/tools/${endpoint}?${paramKey}=${encodeURIComponent(query)}`, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    const json = await res.json()
    if (!json?.status || !json?.data) throw new Error()
    
    const d = json.data
    const cap = isChannel
      ? `*⌬┤ 📢 ├⌬ TELEGRAM CHANNEL STALK*\n> 📢 *${d.title || d.name}* (@${d.username || query})\n> 📝 ${d.description || d.about || '—'}\n> 👥 Suscriptores: *${d.subscribers || d.members || '—'}*`
      : `*⌬┤ ✈️ ├⌬ TELEGRAM STALK*\n> 👤 *${d.name || d.title}* (@${d.username || query})\n> 📝 ${d.description || d.about || '—'}\n> 👥 Miembros: *${d.members || d.participants_count || '—'}*\n> 🏷️ Tipo: *${d.type || '—'}*`
      
    if (d.photo) {
      await conn.sendMessage(m.chat, { image: { url: d.photo }, caption: cap }, { quoted: m })
    } else {
      await m.reply(cap)
    }
  } catch {
    await m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo obtener la información. Intentá de nuevo.`)
  }
}

handler.command = ['telegramstalk', 'tgstalk', 'channelstalk', 'tgchannel']
handler.tags = ['tools']
handler.help = ['telegramstalk <usuario>', 'channelstalk <canal>']
export default handler