const handler = async (m, { conn }) => {
  if (!m.quoted) return m.reply(`*⌬┤ ⚠️ ├⌬ MENSAJE REQUERIDO.*\n> Respondé el mensaje que querés eliminar.`)

  try {
    await conn.sendMessage(m.chat, { 
      delete: { 
        remoteJid: m.chat, 
        fromMe: false, 
        id: m.quoted.id, 
        participant: m.quoted.author
      } 
    })
  } catch (e) {
    m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo eliminar el mensaje.`)
  }
}

handler.help = ['del']
handler.tags = ['group']
handler.command = ['del', 'delete', 'borrar']
handler.groupOnly = true
handler.adminOnly = true
handler.botAdminOnly = true
handler.noRegister = true

export default handler
