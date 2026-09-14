const OPCIONES = {
  'all': 'todos',
  'contacts': 'contactos',
  'contact_blacklist': 'contactos excepto...',
  'none': 'nadie'
}

const CONFIGS = {
  'lastseen':   { fn: 'updateLastSeenPrivacy',       label: 'Último visto' },
  'foto':       { fn: 'updateProfilePicturePrivacy',  label: 'Foto de perfil' },
  'bio':        { fn: 'updateStatusPrivacy',           label: 'Bio / Estado' },
  'grupos':     { fn: 'updateGroupsAddPrivacy',        label: 'Quién te agrega a grupos' },
  'llamadas':   { fn: 'updateCallPrivacy',             label: 'Llamadas' },
  'ticks':      { fn: 'updateReadReceiptsPrivacy',     label: 'Confirmaciones de lectura' },
}

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const tipo = args[0]?.toLowerCase()
  const valor = args[1]?.toLowerCase()

  if (!tipo || !CONFIGS[tipo]) {
    const lista = Object.entries(CONFIGS).map(([k, v]) => `▢ *${k}* — ${v.label}`).join('\n')
    const vals = Object.entries(OPCIONES).map(([k, v]) => `▢ *${k}* → ${v}`).join('\n')
    return m.reply(
      `*⌬┤ 🔒 ├⌬ PRIVACIDAD DEL BOT.*\n\n*Configuraciones:*\n${lista}\n\n*Valores posibles:*\n${vals}\n\n*Uso:* ${usedPrefix}${command} <config> <valor>\n*Ej:* ${usedPrefix}${command} lastseen none`
    )
  }

  if (!valor || !OPCIONES[valor]) {
    return m.reply(`*⌬┤ ⚠️ ├⌬ VALOR INVÁLIDO.*\n> Valores: *all*, *contacts*, *contact_blacklist*, *none*`)
  }

  const { fn, label } = CONFIGS[tipo]
  await conn[fn](valor)
  m.reply(`*⌬┤ ✅ ├⌬ PRIVACIDAD ACTUALIZADA.*\n▢ *${label}:* ${OPCIONES[valor]}`)
}

handler.help = ['privacidad <config> <valor>']
handler.tags = ['owner']
handler.command = ['privacidad', 'privacy']
handler.ownerOnly = true

export default handler