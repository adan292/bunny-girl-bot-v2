import { getSubBotMeta, saveSubBotMeta } from '../../lib/jadibot.js'

const handler = async (m, { conn: zen, args, usedPrefix, command }) => {
  if (!zen.isSubBot) return m.reply(`*⌬┤ ⚠️ ├⌬ SOLO SUB-BOTS*\n> Este comando es exclusivo para dueños de Sub-Bots en sus respectivas sesiones.`)

  const senderNumber = m.sender.replace(/\D/g, '')
  const ownerNumber = zen.ownerNumber.replace(/\D/g, '')
  
  const normalizar = (n) => {
    let x = n.replace(/\D/g, '')
    if (x.startsWith('549')) x = '54' + x.slice(3)
    if (x.startsWith('521')) x = '52' + x.slice(3)
    return x
  }

  if (normalizar(senderNumber) !== normalizar(ownerNumber)) {
    return m.reply(`*⌬┤ ❌ ├⌬ SIN PERMISOS*\n> Solo el creador de este sub-bot (+${zen.ownerNumber}) puede cambiar su nombre.`)
  }

  const nuevoNombre = args.join(' ').trim()
  if (!nuevoNombre) return m.reply(`*⌬┤ ℹ️ ├⌬ USO CORRECTO:*\n> ${usedPrefix}${command} MiBotcito`)
  if (nuevoNombre.length > 20) return m.reply(`*⌬┤ ⚠️ ├⌬ NOMBRE MUY LARGO*\n> El nombre no puede superar los 20 caracteres.`)

  zen.botname = nuevoNombre
  const meta = await getSubBotMeta()
  if (!meta[zen.ownerNumber]) meta[zen.ownerNumber] = {}
  meta[zen.ownerNumber].name = nuevoNombre
  await saveSubBotMeta(meta)

  m.reply(`*⌬┤ ✅ ├⌬ ÉXITO*\n> El nombre de tu bot ha sido cambiado a: *${nuevoNombre}*`)
}

handler.help = ['setbotname <nombre>']
handler.tags = ['jadibot']
handler.command = ['setbotname', 'setnamebot', 'namebot']
handler.noRegister = true
export default handler