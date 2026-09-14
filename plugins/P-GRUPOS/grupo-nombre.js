const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) return m.reply(`*⌬┤ ⚠️ ├⌬ NOMBRE REQUERIDO.*\n> Ejemplo: *${usedPrefix}${command} Nuevo Nombre*`)

  await conn.groupUpdateSubject(m.chat, text)
  m.reply(`*⌬┤ ✅ ├⌬ NOMBRE ACTUALIZADO.*\n▢ *Nuevo nombre:* ${text}`)
}

handler.help = ['nombre']
handler.tags = ['group']
handler.command = ['nombre', 'groupname', 'setnombre']
handler.groupOnly = true
handler.adminOnly = true
handler.botAdminOnly = true
handler.noRegister = true

export default handler
