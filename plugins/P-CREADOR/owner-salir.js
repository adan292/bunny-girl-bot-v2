const handler = async (m, { conn }) => {
  if (!m.isGroup) return m.reply('*⌬┤ ⚠️ ├⌬ SOLO GRUPOS.*\n> Este comando solo se puede usar dentro de un grupo.')

  await m.reply('*⌬┤ 👋 ├⌬ ÓRDENES DEL OWNER.*\n> Ha sido un placer estar aquí, pero me tengo que ir. ¡Hasta pronto!')
  
  try {
    await conn.groupLeave(m.chat)
  } catch (e) {
    m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No pude abandonar el grupo: ${e.message}`)
  }
}

handler.help = ['salir']
handler.tags = ['owner']
handler.command = ['salir', 'leave', 'salirdelgrupo', 'quit']
handler.ownerOnly = true

export default handler