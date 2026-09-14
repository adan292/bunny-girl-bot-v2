import * as baileysMod from '@whiskeysockets/baileys'

const pkg = baileysMod.default && Object.keys(baileysMod).length === 1 ? baileysMod.default : baileysMod
const { jidNormalizedUser } = pkg

const handler = async (m, { conn }) => {
  const user = m.mentionedJid[0] || (m.quoted ? m.quoted.sender : null)
  if (!user) return m.reply(`*⌬┤ ⚠️ ├⌬ USUARIO REQUERIDO.*\n> Mencioná o respondé el mensaje del usuario a promover.`)

  const targetJid = jidNormalizedUser(user)
  const targetNum = targetJid.split('@')[0]

  await conn.groupParticipantsUpdate(m.chat, [targetJid], 'promote')
  m.reply(`*⌬┤ ⬆️ ├⌬ PROMOVIDO.*\n▢ *Admin:* @${targetNum}`, [targetJid])
}

handler.help = ['promover']
handler.tags = ['group']
handler.command = ['promover', 'promote', 'admin']
handler.groupOnly = true
handler.adminOnly = true
handler.botAdminOnly = true
handler.noRegister = true

export default handler
