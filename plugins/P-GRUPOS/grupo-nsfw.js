const handler = async (m, { args, usedPrefix, command, groupDb }) => {
  const type = args[0]?.toLowerCase()
  if (!['on', 'off'].includes(type)) return m.reply(`*⌬┤ ✙ ├⌬ USO.*\n> *${usedPrefix}${command} on/off*`)

  const isEnable = type === 'on'
  if (groupDb.nsfw === isEnable) return m.reply(`*⌬┤ ⚠️ ├⌬ ESTADO ACTUAL.*\n> El contenido NSFW ya se encuentra *${isEnable ? 'ACTIVADO' : 'DESACTIVADO'}* en este grupo.`)

  groupDb.nsfw = isEnable
  await groupDb.save()

  m.reply(`*⌬┤ 🔞 ├⌬ NSFW ${isEnable ? 'ACTIVADO' : 'DESACTIVADO'}.*\n> El contenido +18 ${isEnable ? 'ahora está permitido' : 'ha sido bloqueado'} en este grupo.`)
}

handler.help = ['nsfw <on/off>']
handler.tags = ['group']
handler.command = ['nsfw']
handler.groupOnly = true
handler.adminOnly = true
handler.noRegister = true

export default handler