const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) return m.reply(`*⌬┤ ⚠️ ├⌬ DESCRIPCIÓN REQUERIDA.*\n> Ejemplo: *${usedPrefix}${command} Nueva descripción*`)

  await conn.groupUpdateDescription(m.chat, text)
  m.reply(`*⌬┤ ✅ ├⌬ DESCRIPCIÓN ACTUALIZADA.*\n▢ *Nueva descripción:* ${text}`)
}

handler.help = ['desc']
handler.tags = ['group']
handler.command = ['desc', 'descripcion', 'setdesc']
handler.groupOnly = true
handler.adminOnly = true
handler.botAdminOnly = true
handler.noRegister = true

export default handler
