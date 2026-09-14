const handler = async (m, { args, usedPrefix, command, userDb }) => {
  if (!args[0]) return m.reply(`*⌬┤ ✙ ├⌬ USO.*\n> *${usedPrefix}${command} <nueva_edad>*\n> 💰 Costo: *10 Kōgen*`)

  const nuevaEdad = parseInt(args[0])
  if (isNaN(nuevaEdad) || nuevaEdad < 5 || nuevaEdad > 100) {
    return m.reply('*⌬┤ ⚠️ ├⌬ EDAD INVÁLIDA.*\n> Ingresá una edad real (entre 5 y 100 años).')
  }

  if (userDb.age === nuevaEdad) {
    return m.reply('*⌬┤ ⚠️ ├⌬ MISMA EDAD.*\n> Ya tenés esa edad registrada en tu perfil.')
  }

  if (userDb.kogen < 10) {
    return m.reply(`*⌬┤ 💎 ├⌬ SIN KŌGEN.*\n> Necesitás *10 Kōgen* para cambiar tu edad.\n> Actualmente tenés: *${userDb.kogen} ✦*`)
  }

  userDb.age = nuevaEdad
  userDb.kogen -= 10
  await userDb.save()

  m.reply(`*⌬┤ ✅ ├⌬ EDAD ACTUALIZADA.*\n> Tu edad ha sido cambiada a *${nuevaEdad} años*.\n> ✦ Se te han descontado *10 Kōgen*.`)
}

handler.help = ['cambiaredad <edad>']
handler.tags = ['registro']
handler.command = ['cambiaredad', 'setage']

export default handler