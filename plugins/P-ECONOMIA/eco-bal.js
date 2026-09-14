import { RANGOS } from '../../lib/database/models/zen-users.js'
import User from '../../lib/database/models/zen-users.js'
import config from '../../config.js'

const extraerNum = (jid = '') => (typeof jid === 'string' ? jid : '').split('@')[0].split(':')[0].replace(/\D/g, '')

const resolveTargetJid = (m, participants = []) => {
  const raw = m.mentionedJid?.[0] || m.quoted?.sender || null
  if (!raw) return null
  if (!raw.endsWith('@lid')) return raw
  const p = participants.find(p => p.id === raw || p.lid === raw)
  if (p?.phoneNumber) return `${String(p.phoneNumber).replace(/\D/g, '')}@s.whatsapp.net`
  if (p?.id?.includes('@s.whatsapp.net')) return p.id
  return raw
}

const findByNum = (jid) => {
  const num = extraerNum(jid)
  if (!num) return null
  return User.findOne({ jid: { $regex: `^${num}@` } }).lean()
}

const formatBalance = (u, jid, now) => {
  const rango = RANGOS[Math.min(u.level, RANGOS.length - 1)]
  const estaProtegido = u.bankExpiry > now
  const expira = estaProtegido
    ? `${Math.floor((u.bankExpiry - now) / 3600000)}h ${Math.floor(((u.bankExpiry - now) % 3600000) / 60000)}m`
    : 'INACTIVO ⚠️'
  return `*╔═══⌦ ✦ 💳 CUENTA ✦ ⌫═══╗*\n\n`
       + `> 👤 *Usuario:* @${extraerNum(jid)}\n`
       + `> 🆙 *Nivel:* ${u.level}\n`
       + `> 🏆 *Rango:* ${rango}\n\n`
       + `*⌬┤ 💰 BILLETERA ├⌬*\n`
       + `> ${config.CURRENCY_SYMBOL} *${config.CURRENCY_NAME}:* ${u.zenCoins} ${config.CURRENCY_SYMBOL}\n`
       + `> 🔓 *Estado:* EXPUESTO A ROBOS\n\n`
       + `*⌬┤ 🏦 BANCO ├⌬*\n`
       + `> 💳 *Saldo:* ${u.bankBalance} ${config.CURRENCY_SYMBOL}\n`
       + `> 🛡️ *Protección:* ${estaProtegido ? 'ACTIVA ✅' : 'INACTIVA ❌'}\n`
       + `> ⏳ *Expira:* ${expira}\n\n`
       + `*⌬┤ ✨ PREMIUM ├⌬*\n`
       + `> ${config.PREMIUM_SYMBOL} *${config.PREMIUM_NAME}:* ${u.kogen} ${config.PREMIUM_SYMBOL}\n\n`
       + `*╚══⌦ ${config.footer} ⌫══╝*`
}

const handler = async (m, { userDb, participants }) => {
  if (!userDb) return
  const senderJid = userDb.jid
  const now = Date.now()

  const targetRaw = resolveTargetJid(m, participants)
  const isSelf = !targetRaw || extraerNum(targetRaw) === extraerNum(m.sender)

  if (!isSelf) {
    const v = await findByNum(targetRaw)
    if (!v) return m.reply('*⌬┤ ❌ · USUARIO NO REGISTRADO.*')
    return m.reply(formatBalance(v, v.jid, now), { mentions: [v.jid] })
  }

  if (userDb.bankBalance > 0 && userDb.bankExpiry > 0 && now > userDb.bankExpiry) {
    const amount = userDb.bankBalance
    userDb.zenCoins += amount
    userDb.bankBalance = 0
    userDb.bankExpiry = 0
    await User.updateOne({ jid: senderJid }, {
      $inc: { zenCoins: amount },
      $set: { bankBalance: 0, bankExpiry: 0 }
    })
  }

  m.reply(formatBalance(userDb, senderJid, now), { mentions: [senderJid] })
}

handler.help = ['balance [@usuario]']
handler.tags = ['eco']
handler.command = ['bal', 'balance', 'wallet', 'cartera', 'puntos']
handler.register = true
export default handler