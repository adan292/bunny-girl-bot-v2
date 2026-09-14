import * as baileysMod from '@whiskeysockets/baileys'

const pkg = baileysMod.default && Object.keys(baileysMod).length === 1 ? baileysMod.default : baileysMod
const { jidNormalizedUser } = pkg

const handler = async (m, { conn, participants, config }) => {
  const user = m.mentionedJid[0] ? m.mentionedJid[0] : (m.quoted ? m.quoted.sender : null)

  if (!user) {
    return m.reply(`*⌬┤ ⚠️ ├⌬ USUARIO REQUERIDO.*\n> Mencioná o respondé el mensaje del usuario a expulsar.`)
  }

  const botJid    = jidNormalizedUser(conn.user.id)
  const targetJid = jidNormalizedUser(user)
  const targetNum = targetJid.split('@')[0].replace(/\D/g, '')

  if (targetJid === botJid) {
    return m.reply(`*⌬┤ 🤖 ├⌬ ACCIÓN INVÁLIDA.*\n> No puedo expulsarme a mí mismo.`)
  }

  const owners = Array.isArray(config.ownerNumber) ? config.ownerNumber : [config.ownerNumber]
  const esOwnerTarget = owners.some(o => {
    let a = o.replace(/\D/g, '')
    if (a.startsWith('549')) a = '54' + a.slice(3)
    if (a.startsWith('521')) a = '52' + a.slice(3)
    let b = targetNum
    if (b.startsWith('549')) b = '54' + b.slice(3)
    if (b.startsWith('521')) b = '52' + b.slice(3)
    return a === b
  })

  if (esOwnerTarget) {
    return m.reply(`*⌬┤ 👑 ├⌬ ACCIÓN BLOQUEADA.*\n> No puedo expulsar al dueño del bot.`)
  }

  const targetIsAdmin = participants.some(p =>
    (p.admin === 'admin' || p.admin === 'superadmin' || p.isCommunityAdmin) &&
    (jidNormalizedUser(p.id) === targetJid || (p.lid && jidNormalizedUser(p.lid) === targetJid))
  )

  if (targetIsAdmin) {
    return m.reply(`*⌬┤ 🛡️ ├⌬ ACCIÓN BLOQUEADA.*\n> No puedo expulsar a un administrador del grupo.`)
  }

  try {
    await conn.groupParticipantsUpdate(m.chat, [targetJid], 'remove')
    const senderNum = m.sender.split('@')[0]
    const txt = `*⌬┤ 🥾 ├⌬ EXPULSIÓN.*\n▢ *Usuario:* @${targetNum}\n▢ *Por:* @${senderNum}`
    await conn.sendMessage(m.chat, { text: txt, mentions: [targetJid, m.sender] }, { quoted: m })
  } catch (e) {
    m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo expulsar al usuario.`)
  }
}

handler.help = ['ban @tag']
handler.tags = ['group']
handler.command = ['ban', 'kick', 'echar', 'expulsar']
handler.groupOnly = true
handler.adminOnly = true
handler.botAdminOnly = true
handler.noRegister = true

export default handler
