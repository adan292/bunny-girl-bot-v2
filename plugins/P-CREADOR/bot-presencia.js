const handler = async (m, { conn, args, usedPrefix, command }) => {
  const tipo = args[0]?.toLowerCase()

  if (!tipo || !['escribiendo', 'grabando', 'pausado'].includes(tipo)) {
    return m.reply(
      `*⌬┤ 👁️ ├⌬ PRESENCIA.*\n\n▢ *${usedPrefix}${command} escribiendo*\n▢ *${usedPrefix}${command} grabando*\n▢ *${usedPrefix}${command} pausado*`
    )
  }

  const mapa = { 'escribiendo': 'composing', 'grabando': 'recording', 'pausado': 'paused' }
  await conn.sendPresenceUpdate(mapa[tipo], m.chat)
  m.reply(`*⌬┤ ✅ ├⌬ PRESENCIA ACTIVADA.*\n▢ *Estado:* ${tipo}`)
}

handler.help = ['presencia <estado>']
handler.tags = ['owner']
handler.command = ['presencia', 'presence']
handler.ownerOnly = true

export default handler