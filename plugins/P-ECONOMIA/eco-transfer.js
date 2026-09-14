import User from '../../lib/database/models/zen-users.js'
import config from '../../config.js'
import { userCache } from '../../lib/caches.js'

const DAILY_LIMIT_ZEN = 5_000_000

const resolveTargetJid = (m, participants = []) => {
  const raw = m.mentionedJid?.[0] || m.quoted?.sender || null
  if (!raw) return null
  if (!raw.endsWith('@lid')) return raw
  const p = participants.find(p => p.id === raw || p.lid === raw)
  if (p?.phoneNumber) return `${String(p.phoneNumber).replace(/\D/g, '')}@s.whatsapp.net`
  if (p?.id?.includes('@s.whatsapp.net')) return p.id
  return raw
}

const handler = async (m, { text, usedPrefix, command, userDb, participants }) => {
  const target = resolveTargetJid(m, participants)

  if (!target || !text) return m.reply(`*⌬┤ 💸 ├⌬ USO CORRECTO*\n> *${usedPrefix + command}* <moneda> @user <monto>\n\n> 💡 *Monedas:* ${config.CURRENCY_NAME.toLowerCase()} / ${config.PREMIUM_NAME.toLowerCase()}\n> 💰 *Límite diario:* ${DAILY_LIMIT_ZEN.toLocaleString('es-AR')} ${config.CURRENCY_NAME} / 100 ${config.PREMIUM_NAME}s`)

  const args = text.toLowerCase().split(' ')
  const type = args.includes(config.PREMIUM_NAME.toLowerCase()) || args.includes('kogen') ? 'kogen' : 'zenCoins'
  const monto = parseInt(text.replace(/[^0-9]/g, ''))

  if (isNaN(monto) || monto <= 0) return m.reply('*⌬┤ ⚠️ · CANTIDAD INVÁLIDA.*')
  if (target === m.sender) return m.reply('*⌬┤ 🤡 · ¿TE VAS A ENVIAR A VOS MISMO?*')

  if (type === 'kogen') {
    const limit = 100
    if (monto > limit) return m.reply(`*⌬┤ 🚫 ├⌬ LÍMITE SUPERADO.* El máximo por transacción es ${limit} ${config.PREMIUM_NAME}s.`)
  } else {
    const transferidoHoy = userDb.dailyStats?.transferToday || 0
    const restante = DAILY_LIMIT_ZEN - transferidoHoy
    if (restante <= 0) {
      return m.reply(`*⌬┤ 🚫 ├⌬ LÍMITE DIARIO ALCANZADO.*\n> Ya transferiste el máximo de *${DAILY_LIMIT_ZEN.toLocaleString('es-AR')} ${config.CURRENCY_NAME}* hoy. Volvé a intentarlo mañana.`)
    }
    if (monto > restante) {
      return m.reply(`*⌬┤ 🚫 ├⌬ LÍMITE DIARIO SUPERADO.*\n> Te quedan *${restante.toLocaleString('es-AR')} ${config.CURRENCY_NAME}* disponibles para transferir hoy.`)
    }
  }

  if (userDb[type] < monto) return m.reply(`*⌬┤ ❌ ├⌬ SALDO INSUFICIENTE.* No tenés esa cantidad.`)

  const v = await User.findOne({ jid: target }, { _id: 1 })
  if (!v) return m.reply('*⌬┤ ❌ · USUARIO NO ENCONTRADO.*')

  let comision = (type === 'zenCoins' && monto >= 5000) ? Math.floor(monto * 0.05) : 0
  const neto = monto - comision

  userDb[type] -= monto

  const updateSender = { $inc: { [type]: -monto } }
  if (type === 'zenCoins') {
    updateSender.$inc['dailyStats.transferToday'] = monto
    userDb.dailyStats.transferToday = (userDb.dailyStats.transferToday || 0) + monto
  }

  await Promise.all([
    User.updateOne({ jid: m.sender }, updateSender),
    User.updateOne({ jid: target }, { $inc: { [type]: neto } })
  ])

  const targetNum = target.split('@')[0]
  const tCacheJid = userCache.get(target)
  const tCacheNum = userCache.get(targetNum)

  if (tCacheJid) tCacheJid[type] += neto
  if (tCacheNum && tCacheNum !== tCacheJid) tCacheNum[type] += neto

  let res = `*╔═══⌦ ✦ 📤 ENVÍO EXITOSO ✦ ⌫═══╗*\n\n`
          + `> 👤 *De:* @${m.sender.split('@')[0]}\n`
          + `> 👤 *Para:* @${targetNum}\n`
          + `> 💰 *Monto:* ${monto} ${type === 'kogen' ? config.PREMIUM_SYMBOL : config.CURRENCY_SYMBOL}\n`
  if (comision > 0) res += `> 🧾 *Comisión (5%):* ${comision} ${config.CURRENCY_SYMBOL}\n`
  res += `\n> ✨ *Recibido:* ${neto} ${type === 'kogen' ? config.PREMIUM_SYMBOL : config.CURRENCY_SYMBOL}\n`
  if (type === 'zenCoins') {
    const restanteHoy = DAILY_LIMIT_ZEN - userDb.dailyStats.transferToday
    res += `> 📊 *Restante hoy:* ${restanteHoy.toLocaleString('es-AR')} ${config.CURRENCY_NAME}\n`
  }
  res += `*╚══⌦ ${config.footer} ⌫══╝*`

  m.reply(res, { mentions: [m.sender, target] })
}

handler.help = ['transferir <moneda @tag cantidad>']
handler.tags = ['eco']
handler.command = ['transferir', 'enviar', 'pay', 'give']
handler.register = true
handler.groupOnly = true
export default handler