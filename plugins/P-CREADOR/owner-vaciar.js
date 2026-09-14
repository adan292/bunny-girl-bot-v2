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

const handler = async (m, { usedPrefix, command, participants }) => {
  const targetRaw = resolveTargetJid(m, participants)
  if (!targetRaw) return m.reply(`*⌬┤ ⚠️ ├⌬ USO CORRECTO*\n> *${usedPrefix + command}* @usuario\n> Ejemplo: *${usedPrefix + command}* (respondiendo al mensaje)`)

  const targetJid = targetRaw.includes('@s.whatsapp.net') ? targetRaw : `${extraerNum(targetRaw)}@s.whatsapp.net`
  const targetNum = extraerNum(targetJid)

  if (targetJid === m.sender) return m.reply('*⌬┤ 🤡 · ¿Querés vaciar tu propia cuenta?*')

  const v = await User.findOne({ jid: targetJid })
  if (!v) return m.reply('*⌬┤ ❌ · USUARIO NO REGISTRADO.*')

  const resetData = {
    zenCoins: 0,
    bankBalance: 0,
    bankExpiry: 0,
    kogen: 0,
    level: 0,
    xp: 0,
    'inventory.pickaxe': 'none',
    'inventory.pickaxeDurability': 0,
    'inventory.bow': 'none',
    'inventory.bowDurability': 0,
    'inventory.bait': 'none',
    'inventory.baitDurability': 0,
    'inventory.sword': 0,
    'inventory.potion': 0,
    'inventory.shield': 0,
    'inventory.suit': false,
    'inventory.mask': false,
    bestiary: {},
    aquarium: {}
  }

  await User.updateOne({ jid: targetJid }, { $set: resetData })

  const tCacheJid = userCache.get(targetJid)
  const tCacheNum = userCache.get(targetNum)

  const clearCache = (cache) => {
    if (!cache) return
    cache.zenCoins = 0
    cache.bankBalance = 0
    cache.bankExpiry = 0
    cache.kogen = 0
    cache.level = 0
    cache.xp = 0
    cache.inventory = {
      pickaxe: 'none', pickaxeDurability: 0,
      bow: 'none', bowDurability: 0,
      bait: 'none', baitDurability: 0,
      sword: 0, potion: 0, shield: 0,
      suit: false, mask: false
    }
    cache.bestiary = {}
    cache.aquarium = {}
  }

  clearCache(tCacheJid)
  if (tCacheNum && tCacheNum !== tCacheJid) clearCache(tCacheNum)

  let txt = `*╔═══⌦ ✦ ☠️ BANCARROTA TOTAL ✦ ⌫═══╗*\n\n`
          + `> 👤 *Usuario:* @${targetNum}\n`
          + `> ⚠️ *Castigo:* Se ha vaciado absolutamente TODO.\n\n`
          + `> _Billetera, Banco, ${config.PREMIUM_NAME}s, Inventario, Buffs, Nivel y Colecciones regresaron a 0._\n\n`
          + `*╚══⌦ ${config.footer} ⌫══╝*`

  m.reply(txt, { mentions: [targetJid] })
}

handler.help = ['vaciar @user']
handler.tags = ['owner']
handler.command = ['vaciar', 'cleareco', 'resetuser', 'bancarrota']
handler.ownerOnly = true

export default handler