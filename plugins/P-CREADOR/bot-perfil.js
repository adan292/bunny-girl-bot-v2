const handler = async (m, { conn, args, text, usedPrefix, command }) => {
  const tipo = args[0]?.toLowerCase()
  const valor = text.slice(args[0]?.length || 0).trim()

  if (!tipo || !['nombre', 'bio'].includes(tipo) || !valor) {
    return m.reply(
      `*⌬┤ 👤 ├⌬ PERFIL DEL BOT.*\n\n▢ *${usedPrefix}${command} nombre <nuevo nombre>*\n▢ *${usedPrefix}${command} bio <nueva bio>*`
    )
  }

  if (tipo === 'nombre') {
    await conn.updateProfileName(valor)
    m.reply(`*⌬┤ ✅ ├⌬ NOMBRE ACTUALIZADO.*\n▢ *Nuevo nombre:* ${valor}`)
  } else if (tipo === 'bio') {
    await conn.updateProfileStatus(valor)
    m.reply(`*⌬┤ ✅ ├⌬ BIO ACTUALIZADA.*\n▢ *Nueva bio:* ${valor}`)
  }
}

handler.help = ['botperfil nombre <texto>', 'botperfil bio <texto>']
handler.tags = ['owner']
handler.command = ['botperfil', 'setperfil']
handler.ownerOnly = true

export default handler