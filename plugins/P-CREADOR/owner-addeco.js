import User from '../../lib/database/models/zen-users.js'
import { userCache } from '../../lib/caches.js'
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

const handler = async (m, { text, usedPrefix, command, participants }) => {
  const targetRaw = resolveTargetJid(m, participants)
  if (!targetRaw) return m.reply(`*⌬┤ ⚠️ ├⌬ USO CORRECTO*\n> *${usedPrefix + command}* <cantidad> <moneda> @usuario\n> Ejemplo: *${usedPrefix + command} 500 zencoins* (respondiendo)`)

  const targetJid = targetRaw.includes('@s.whatsapp.net') ? targetRaw : `${extraerNum(targetRaw)}@s.whatsapp.net`
  const targetNum = extraerNum(targetJid)

  const amountMatch = text.match(/-?\d+/)
  if (!amountMatch) return m.reply('*⌬┤ ⚠️ · CANTIDAD INVÁLIDA.*')
  const amount = parseInt(amountMatch[0])

  const isKogen = /kogen/i.test(text) || new RegExp(config.PREMIUM_NAME, 'i').test(text)
  const field = isKogen ? 'kogen' : 'zenCoins'
  const currencyName = isKogen ? config.PREMIUM_NAME : config.CURRENCY_NAME
  const currencySymbol = isKogen ? config.PREMIUM_SYMBOL : config.CURRENCY_SYMBOL

  const v = await User.findOne({ jid: targetJid })
  if (!v) return m.reply('*⌬┤ ❌ · USUARIO NO REGISTRADO.*')

  v[field] += amount

  await User.updateOne({ jid: targetJid }, { $inc: { [field]: amount } })

  const tCacheJid = userCache.get(targetJid)
  const tCacheNum = userCache.get(targetNum)
  if (tCacheJid) tCacheJid[field] += amount
  if (tCacheNum && tCacheNum !== tCacheJid) tCacheNum[field] += amount

  m.reply(`*⌬┤ ✅ ├⌬ FONDOS MODIFICADOS*\n> Se añadieron/quitaron **${amount}** ${currencySymbol} a @${targetNum}.\n> 💰 *Nuevo saldo:* ${v[field]} ${currencyName}.`, { mentions: [targetJid] })
}

handler.help = ['addeco <cantidad> <moneda> @user']
handler.tags = ['owner']
handler.command = ['addeco', 'añadir', 'addzencoins', 'addkogen', 'darplata']
handler.ownerOnly = true

export default handler