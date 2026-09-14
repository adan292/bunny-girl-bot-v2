import User from '../../lib/database/models/zen-users.js'
import config from '../../config.js'

const handler = async (m, { text, usedPrefix, command }) => {
  const u = await User.findOne({ jid: m.sender }).lean()
  if (!u) return

  const validKeys = {
    bio:     'bio',
    apodo:   'nickname',
    pais:    'country',
    cancion: 'song',
    color:   'color',
    comida:  'food',
    signo:   'zodiac',
    cumple:  'birthday'
  }

  const args     = text.split(' ')
  const keyInput = args[0]?.toLowerCase()
  const val      = args.slice(1).join(' ')

  if (!keyInput || !validKeys[keyInput]) {
    let help = `*╔═══⌦ ✦ ✍️ EDITOR ✦ ⌫═══╗*\n\n`
    help += `> *Uso:* ${usedPrefix + command} <categoría> <texto>\n\n`
    help += `*Categorías disponibles:*\n`
    Object.keys(validKeys).forEach(k => help += `> • ${k}\n`)
    help += `\n*Ejemplo:* ${usedPrefix + command} bio Amante de los bots\n`
    help += `*Quitar:* ${usedPrefix + command} bio none\n`
    help += `*╚══⌦ ${config.footer} ⌫══╝*`
    return m.reply(help)
  }

  if (!val) return m.reply(`*⌬┤ ⚠️ ├⌬ Falta el valor.*\n> Uso: ${usedPrefix + command} ${keyInput} <texto>`)

  const dbKey   = validKeys[keyInput]
  const isDelete = ['none', 'quitar', 'borrar', 'delete'].includes(val.toLowerCase())

  await User.updateOne(
    { jid: m.sender },
    { $set: { [`social.${dbKey}`]: isDelete ? '' : val } }
  )

  m.reply(`*⌬┤ ✅ ├⌬ ACTUALIZADO.*\n> Se ha ${isDelete ? 'eliminado' : 'cambiado'} tu *${keyInput}* correctamente.`)
}

handler.help    = ['editperfil']
handler.tags    = ['registro']
handler.command = ['set', 'editperfil', 'setperfil']
handler.register = true
export default handler
