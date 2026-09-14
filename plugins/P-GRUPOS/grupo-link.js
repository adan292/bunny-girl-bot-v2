const handler = async (m, { conn, usedPrefix, command }) => {
  const code = await conn.groupInviteCode(m.chat)
  m.reply(`*⌬┤ 🔗 ├⌬ LINK DEL GRUPO.*\n▢ https://chat.whatsapp.com/${code}`)
}

handler.help = ['link']
handler.tags = ['group']
handler.command = ['link', 'invitar', 'invite']
handler.groupOnly = true
handler.adminOnly = true
handler.noRegister = true

export default handler
