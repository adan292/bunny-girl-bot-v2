import { getSubBotMeta, saveSubBotMeta, subBots } from '../../lib/jadibot.js'

const handler = async (m, { conn, args, usedPrefix, command, userDb }) => {
  const modo = args[0]?.toLowerCase()
  const activar = ['on', '1', 'activar'].includes(modo)
  const desactivar = ['off', '0', 'desactivar'].includes(modo)

  if (conn.isSubBot && conn.ownerNumber === m.sender.split('@')[0]) {
    if (!activar && !desactivar) {
      const estado = conn.noButtons ? '❌ *Desactivados*' : '✅ *Activados*'
      return m.reply(
        `*⌬┤ 📵 ├⌬ BOTONES DEL SUB-BOT*\n\n`
      + `> Estado actual: ${estado}\n\n`
      + `> Si tu WhatsApp es iOS y los botones no funcionan, desactiválos.\n`
      + `> Afecta a *todos* los usuarios de tu bot.\n\n`
      + `> *${usedPrefix}${command} off* — desactivar botones\n`
      + `> *${usedPrefix}${command} on* — activar botones`
      )
    }

    conn.noButtons = activar ? false : true
    const bot = subBots.get(conn.ownerNumber)
    if (bot) bot.noButtons = conn.noButtons

    const meta = await getSubBotMeta()
    if (!meta[conn.ownerNumber]) meta[conn.ownerNumber] = {}
    meta[conn.ownerNumber].noButtons = conn.noButtons
    await saveSubBotMeta(meta)

    return m.reply(
      `*⌬┤ 📵 ├⌬ BOTONES DEL SUB-BOT ${conn.noButtons ? 'DESACTIVADOS' : 'ACTIVADOS'}*\n`
    + `> ${conn.noButtons
        ? 'Las opciones se mostrarán como texto numerado. Todos los usuarios de este bot lo verán así.'
        : 'Los botones interactivos están activos para todos los usuarios de este bot.'}`
    )
  }

  if (!activar && !desactivar) {
    const estado = userDb?.noButtons ? '❌ *Desactivados*' : '✅ *Activados*'
    return m.reply(
      `*⌬┤ 📵 ├⌬ TUS BOTONES*\n\n`
    + `> Estado actual: ${estado}\n\n`
    + `> Cambiá esto si tu WhatsApp no muestra los botones correctamente.\n`
    + `> Solo te afecta a vos, los demás usuarios no se ven afectados.\n\n`
    + `> *${usedPrefix}${command} off* — desactivar botones\n`
    + `> *${usedPrefix}${command} on* — activar botones`
    )
  }

  if (!userDb) return m.reply(`*⌬┤ ✙ ├⌬ ERROR.*\n> No se pudo actualizar tu preferencia.`)

  userDb.noButtons = desactivar
  await userDb.save()

  return m.reply(
    `*⌬┤ 📵 ├⌬ BOTONES ${desactivar ? 'DESACTIVADOS' : 'ACTIVADOS'}*\n`
  + `> ${desactivar
      ? 'Las opciones se mostrarán como texto numerado. Solo para vos.'
      : 'Los botones interactivos están activos nuevamente. Solo para vos.'}`
  )
}

handler.help    = ['botones <on/off>']
handler.tags    = ['config']
handler.command = ['botones', 'buttons']

export default handler
