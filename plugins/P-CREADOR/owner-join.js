const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) return m.reply(`*⌬┤ ⚠️ ├⌬ USO CORRECTO*\n> *${usedPrefix + command}* <enlace de whatsapp>`)

  const linkRegex = /chat\.whatsapp\.com\/([0-9A-Za-z]{20,24})/i
  const match = text.match(linkRegex)

  if (!match) return m.reply('*⌬┤ ❌ ├⌬ ENLACE INVÁLIDO.*\n> Asegurate de que sea un enlace válido de invitación a un grupo de WhatsApp.')

  const code = match[1]

  await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

  try {
    const res = await conn.groupAcceptInvite(code)
    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    m.reply(`*⌬┤ ✅ ├⌬ UNIÓN EXITOSA.*\n> El bot acaba de unirse al grupo correctamente.\n> 🆔 *ID:* ${res}`)
  } catch (e) {
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    m.reply(`*⌬┤ ❌ ├⌬ ERROR AL UNIRSE.*\n> Es posible que el enlace haya sido restablecido, que el grupo esté lleno o que el bot haya sido eliminado permanentemente de ese grupo en el pasado.`)
  }
}

handler.help = ['join <link>']
handler.tags = ['owner']
handler.command = ['join', 'entrar', 'unirse', 'joingroup']
handler.ownerOnly = true

export default handler