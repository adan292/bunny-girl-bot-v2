const DURACIONES = {
  '0':    { label: 'Desactivado',  secs: 0 },
  '1d':   { label: '24 horas',     secs: 86400 },
  '7d':   { label: '7 días',       secs: 604800 },
  '90d':  { label: '90 días',      secs: 7776000 },
}

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const opcion = args[0]?.toLowerCase()

  if (!opcion || !DURACIONES[opcion]) {
    const lista = Object.entries(DURACIONES).map(([k, v]) => `▢ *${k}* — ${v.label}`).join('\n')
    return m.reply(`*⌬┤ ⏳ ├⌬ MENSAJES TEMPORALES.*\n\n${lista}\n\n*Uso:* ${usedPrefix}${command} <opción>`)
  }

  const { label, secs } = DURACIONES[opcion]
  await conn.updateDefaultDisappearingMode(secs)
  m.reply(
    secs === 0
      ? `*⌬┤ ✅ ├⌬ MENSAJES TEMPORALES DESACTIVADOS.*`
      : `*⌬┤ ✅ ├⌬ MENSAJES TEMPORALES ACTIVADOS.*\n▢ *Duración:* ${label}`
  )
}

handler.help = ['tempmsg <duracion>']
handler.tags = ['owner']
handler.command = ['tempmsg', 'desaparecer', 'disappear']
handler.ownerOnly = true

export default handler