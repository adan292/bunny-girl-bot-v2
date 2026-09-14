import User from '../../lib/database/models/zen-users.js'
import GroupDb from '../../lib/database/models/zen-groups.js'
import config from '../../config.js'

const extraerNum = (jid) => (jid || '').split('@')[0].split(':')[0].replace(/\D/g, '')
const chatKey = (jid) => (jid || '').replace(/\./g, '_').replace(/@/g, '_at_')

const esOwner = (jid) => {
  let n = extraerNum(jid)
  if (n.startsWith('549')) n = '54' + n.slice(3)
  if (n.startsWith('521')) n = '52' + n.slice(3)
  return config.ownerNumber.some(o => {
    let a = extraerNum(o)
    if (a.startsWith('549')) a = '54' + a.slice(3)
    if (a.startsWith('521')) a = '52' + a.slice(3)
    return a === n
  })
}

const handler = async (m, { conn, args, command, groupDb, participants, usedPrefix, isAdmin, isOwner, isBotAdmin }) => {

  if (command !== 'warns' && !isAdmin && !isOwner) {
    return m.reply(`*⌬┤ 👤 ├⌬ SOLO ADMINS.*\n> @${m.sender.split('@')[0]}, necesitás ser admin para usar este comando.`, { mentions: [m.sender] })
  }

  if (command === 'setwarnlimit') {
    const num = parseInt(args[0])
    if (isNaN(num) || num < 1 || num > 10) {
      return m.reply(`*⌬┤ ✙ ├⌬ LÍMITE INVÁLIDO.*\n> Ingresá un número entre 1 y 10.\n> *Ej:* ${usedPrefix}setwarnlimit 5`)
    }
    await GroupDb.updateOne({ id: m.chat }, { warnLimit: num }, { upsert: true })
    groupDb.warnLimit = num
    return m.reply(`*⌬┤ ⚙️ ├⌬ LÍMITE ACTUALIZADO.*\n> El nuevo límite de advertencias es *${num}*.`)
  }

  const target = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null)

  if (command === 'warns') {
    const who = target || m.sender
    const targetDb = await User.findOne({ jid: { $regex: `^${extraerNum(who)}@` } })
    const key = chatKey(m.chat)
    const currentWarns = targetDb?.warns?.get(key) || 0
    const limit = groupDb?.warnLimit || 3
    return m.reply(`*⌬┤ ⚠️ ├⌬ ADVERTENCIAS*\n> @${who.split('@')[0]} tiene *${currentWarns}/${limit}* advertencias en este grupo.`, { mentions: [who] })
  }

  if (!target) return m.reply(`*⌬┤ ✙ ├⌬ FALTA OBJETIVO.*\n> Mencioná o respondé al mensaje del usuario.`)
  if (target === conn.user.id) return m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No me puedo advertir a mí mismo.`)
  if (esOwner(target)) return m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No podés advertir al creador del bot.`)

  const pTarget = participants.find(p => p.id === target)
  if (pTarget?.admin) return m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No podés advertir a un administrador.`)

  const numTarget = extraerNum(target)
  let targetDb = await User.findOne({ jid: { $regex: `^${numTarget}@` } })
  if (!targetDb) {
    targetDb = new User({ jid: target })
    await targetDb.save()
  }

  const key = chatKey(m.chat)
  const limit = groupDb?.warnLimit || 3
  let currentWarns = targetDb.warns?.get(key) || 0

  if (['unwarn', 'delwarn'].includes(command)) {
    if (currentWarns <= 0) return m.reply(`*⌬┤ ❕ ├⌬ SIN ADVERTENCIAS.*\n> El usuario no tiene advertencias en este grupo.`)
    targetDb.warns.set(key, currentWarns - 1)
    targetDb.markModified('warns')
    await targetDb.save()
    return m.reply(`*⌬┤ ♻️ ├⌬ ADVERTENCIA REMOVIDA.*\n> Se le quitó una advertencia a @${target.split('@')[0]}.\n> *Total:* ${currentWarns - 1}/${limit}`, { mentions: [target] })
  }

  if (command === 'warn') {
    if (!isBotAdmin) return m.reply(`*⌬┤ 🤖 ├⌬ BOT SIN PERMISOS.*\n> Necesito ser administrador para expulsar usuarios si llegan al límite.`)

    currentWarns += 1

    if (currentWarns >= limit) {
      targetDb.warns.delete(key)
      targetDb.markModified('warns')
      await targetDb.save()

      try { await conn.groupParticipantsUpdate(m.chat, [target], 'remove') } catch {}
      return m.reply(`*⌬┤ 🚫 ├⌬ EXPULSADO.*\n> @${target.split('@')[0]} alcanzó el límite de *${limit} advertencias* y fue eliminado del grupo.`, { mentions: [target] })
    } else {
      targetDb.warns.set(key, currentWarns)
      targetDb.markModified('warns')
      await targetDb.save()

      const reason = args.join(' ').replace(/@\d+/g, '').trim() || 'Sin motivo'
      return m.reply(`*⌬┤ ⚠️ ├⌬ ADVERTENCIA.*\n> @${target.split('@')[0]}, recibiste una advertencia.\n> *Motivo:* ${reason}\n> *Estado:* ${currentWarns}/${limit}`, { mentions: [target] })
    }
  }
}

handler.help = ['warn @user', 'unwarn @user', 'warns', 'setwarnlimit <1-10>']
handler.tags = ['group']
handler.command = ['warn', 'unwarn', 'delwarn', 'setwarnlimit', 'warns']
handler.groupOnly = true
handler.noRegister = true

export default handler
