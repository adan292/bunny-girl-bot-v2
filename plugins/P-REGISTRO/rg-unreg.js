import User from '../../lib/database/models/zen-users.js'

const handler = async (m, { text, usedPrefix }) => {
  let userDb = await User.findOne({ jid: m.sender })

  if (userDb.serial && userDb.serial !== '') {
    if (!text) {
      return m.reply(`*⌬┤ ⚠️ ├⌬ FALTA SERIAL.*\n> Ingresá tu serial para confirmar.\n> Ejemplo: *${usedPrefix}unreg A1B2C3D4E5*\n> Si no lo recordás, usá *${usedPrefix}serial*`)
    }

    if (userDb.serial !== text.trim().toUpperCase()) {
      return m.reply('*⌬┤ ❌ ├⌬ SERIAL INCORRECTO.*\n> Verificá que esté bien escrito o usá el comando para verlo.')
    }
  }

  userDb.registered = false
  userDb.name = ''
  userDb.age = 0
  userDb.serial = ''
  await userDb.save()

  m.reply('*⌬┤ ✅ ├⌬ REGISTRO ELIMINADO.*\n> Tus datos han sido borrados.\n> Ya no tenés acceso a la economía ni comandos exclusivos.')
}

handler.help = ['unreg <sn>']
handler.tags = ['registro']
handler.command = ['unreg', 'borrarregistro']
handler.register = true
export default handler