import { deleteSubBot } from '../../lib/jadibot.js'

const handler = async (m, { conn: zen, args, isOwner }) => {
  if (zen.isSubBot) {
    await m.reply(`*⌬┤ 🗑️ ├⌬ ELIMINADO*\n> La sesión ha sido borrada permanentemente del servidor.`)
    return await deleteSubBot(zen.ownerNumber)
  }

  const senderNumber = m.sender.split('@')[0]
  let numero = args.length ? args[0].replace(/\D/g, '') : senderNumber
  
  if (!isOwner && numero !== senderNumber) {
    return m.reply(`*⌬┤ ❌ ├⌬ SIN PERMISOS*\n> Solo podés eliminar tu propia sesión.`)
  }

  await deleteSubBot(numero)
  m.reply(`*⌬┤ 🗑️ ├⌬ ELIMINADO*\n> Los datos de la sesión (+${numero}) han sido borrados de forma permanente.`)
}

handler.help = ['delbot']
handler.tags = ['jadibot']
handler.command = ['delbot', 'borrarbot']
handler.noRegister = true
export default handler