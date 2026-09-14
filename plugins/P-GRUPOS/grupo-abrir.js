const handler = async (m, { conn }) => {
  await conn.groupSettingUpdate(m.chat, 'not_announcement')
  m.reply(`*⌬┤ 🔓 ├⌬ GRUPO ABIERTO.*\n▢ Todos los miembros pueden enviar mensajes.`)
}

handler.help = ['abrir']
handler.tags = ['group']
handler.command = ['abrir', 'open', 'opengroup']
handler.groupOnly = true
handler.adminOnly = true
handler.botAdminOnly = true
handler.noRegister = true

export default handler
