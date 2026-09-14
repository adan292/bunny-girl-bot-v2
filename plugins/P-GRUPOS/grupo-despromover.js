import * as baileysMod from '@whiskeysockets/baileys'

const pkg = baileysMod.default && Object.keys(baileysMod).length === 1 ? baileysMod.default : baileysMod
const { jidNormalizedUser } = pkg

const handler = async (m, { conn }) => {
  const user = m.mentionedJid[0] || (m.quoted ? m.quoted.sender : null)
  if (!user) return m.reply(`*⌬┤ ⚠️ ├⌬ USUARIO REQUERIDO.*\n> Mencioná o respondé el mensaje del usuario a despromover.`)

  const targetJid = jidNormalizedUser(user)
  const targetNum = targetJid.split('@')[0]

  const { participants } = await conn.groupMetadata(m.chat)
  const target = participants.find(p =>
    jidNormalizedUser(p.id) === targetJid || (p.lid && jidNormalizedUser(p.lid) === targetJid)
  )

  if (target?.admin === 'superadmin' || target?.isCommunityAdmin) {
    return m.reply(`*⌬┤ 👑 ├⌬ ACCIÓN BLOQUEADA.*\n▢ No puedo despromover al admin supremo del grupo.`)
  }

  await conn.groupParticipantsUpdate(m.chat, [targetJid], 'demote')
  m.reply(`*⌬┤ ⬇️ ├⌬ DESPROMOVIDO.*\n▢ *Quitado de admin:* @${targetNum}`, [targetJid])
}

handler.tags = ['group']
handler.command = ['despromover', 'demote', 'deadmin']
handler.groupOnly = true
handler.adminOnly = true
handler.botAdminOnly = true
handler.noRegister = true

export default handler
