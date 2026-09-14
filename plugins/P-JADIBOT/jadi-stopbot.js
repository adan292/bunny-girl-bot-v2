import { pauseSubBot, subBots } from '../../lib/jadibot.js'

const handler = async (m, { conn: zen, args, isOwner, usedPrefix }) => {
  const senderNumber = m.sender.split('@')[0]

  if (zen.isSubBot) {
    if (senderNumber !== zen.ownerNumber && !isOwner) {
      return m.reply(`*⌬┤ ❌ ├⌬ SIN PERMISOS*\n> Solo el dueño (+${zen.ownerNumber}) puede pausar este sub-bot.`)
    }
    await m.reply(`*⌬┤ ⏸️ ├⌬ PAUSADO*\n> Sesión desconectada temporalmente.\n> Para reactivar, usá el comando de conexión en el bot principal.`)
    return await pauseSubBot(zen.ownerNumber)
  }

  let numero = args.length ? args[0].replace(/\D/g, '') : senderNumber
  
  if (!isOwner && numero !== senderNumber) {
    return m.reply(`*⌬┤ ❌ ├⌬ SIN PERMISOS*\n> Solo podés pausar tu propia sesión.`)
  }

  if (!subBots.has(numero)) {
    return m.reply(`*⌬┤ ❌ ├⌬ ERROR*\n> No tenés ninguna sesión activa en este momento.`)
  }

  await pauseSubBot(numero)
  m.reply(`*⌬┤ ⏸️ ├⌬ PAUSADO*\n> El sub-bot (+${numero}) ha sido apagado.\n> _Tus datos siguen guardados. Usá ${usedPrefix}serbot para reactivarlo._`)
}

handler.help = ['stopbot']
handler.tags = ['jadibot']
handler.command = ['stopbot', 'pausarbot']
handler.noRegister = true
export default handler