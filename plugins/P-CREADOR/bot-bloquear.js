import * as baileysMod from '@whiskeysockets/baileys'
const pkg = baileysMod.default && Object.keys(baileysMod).length === 1 ? baileysMod.default : baileysMod
const { jidNormalizedUser } = pkg

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const user = m.mentionedJid[0] || (m.quoted ? m.quoted.sender : null)

  if (!user) {
    return m.reply(`*⌬┤ ⚠️ ├⌬ USUARIO REQUERIDO.*\n> Mencioná o respondé el mensaje del usuario.`)
  }

  const targetJid = jidNormalizedUser(user)
  const targetNum = targetJid.split('@')[0]
  const accion = command === 'bloquear' || command === 'block' ? 'block' : 'unblock'
  const esBloqueo = accion === 'block'

  await conn.updateBlockStatus(targetJid, accion)
  m.reply(
    esBloqueo
      ? `*⌬┤ 🚫 ├⌬ BLOQUEADO.*\n▢ *Usuario:* @${targetNum}`
      : `*⌬┤ ✅ ├⌬ DESBLOQUEADO.*\n▢ *Usuario:* @${targetNum}`,
    [targetJid]
  )
}

handler.help = ['bloquear @user', 'desbloquear @user']
handler.tags = ['owner']
handler.command = ['bloquear', 'block', 'desbloquear', 'unblock']
handler.ownerOnly = true

export default handler