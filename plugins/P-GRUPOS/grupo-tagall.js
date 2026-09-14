const handler = async (m, { conn, text, participants }) => {
  const mentions = participants.map(p => p.id)
  const texto = text || '📢 Atención a todos.'
  const lista = participants.map(p => `▢ @${p.id.split('@')[0]}`).join('\n')

  const txt = `*⌬┤ 📢 ├⌬ TAG ALL.*\n▢ *Mensaje:* ${texto}\n\n${lista}`

  await conn.sendMessage(m.chat, { text: txt, mentions }, { quoted: m })
}

handler.help = ['tagall']
handler.tags = ['group']
handler.command = ['tagall', 'mencionartodos', 'invocar', 'todos']
handler.groupOnly = true
handler.adminOnly = true
handler.noRegister = true

export default handler
