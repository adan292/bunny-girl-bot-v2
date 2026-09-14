import config from '../../config.js'
import { getSortedSeeds, buySeed } from '../../lib/games/rpg/rpgFarm.js'
import { calcFarmerLevel } from '../../lib/games/rpg/rpgFarmerProfile.js'

const handler = async (m, { command, args, usedPrefix, userDb }) => {
  if (!userDb) return

  const userLevel = calcFarmerLevel(userDb.farmerXP || 0)
  const totalLimit = 15 + (userLevel * 2)
  const hoy = new Date().toDateString()
  const compradas = userDb.farm?.lastSeedPurchaseDate === hoy ? (userDb.farm?.dailySeedsBought || 0) : 0

  if (['tiendacultivo', 'semillas'].includes(command)) {
    const allSeeds = getSortedSeeds()
    const seedsDisponibles = allSeeds.filter(s => s.reqLevel <= userLevel + 3)
    
    let lista = seedsDisponibles.map(s => {
      const tiempoMin = Math.floor(s.growTime / 60000)
      if (s.reqLevel > userLevel) {
        return `> 🔒 *${s.id.toUpperCase()}* — Se desbloquea al Nivel ${s.reqLevel}`
      }
      return `> ${s.emoji} *${s.id.toUpperCase()}* — ${s.price} ${config.CURRENCY_SYMBOL} | ⏱️ ${tiempoMin}m | Lvl: ${s.reqLevel}`
    }).join('\n')

    let texto = `*⌬┤ 🌾 ├⌬ TIENDA DE SEMILLAS (Nivel ${userLevel})*\n`
              + `> 🛒 Límite de hoy: *${compradas}/${totalLimit}*\n\n`
              + `${lista}\n\n`
              + `Usá *${usedPrefix}comprarsemilla <semilla> <cantidad>*\n`
              + `_Tip: Sube de nivel cocinando para desbloquear más semillas y aumentar tu límite._`
    
    return m.reply(texto)
  }

  if (['comprarsemilla', 'buyseed'].includes(command)) {
    const seed = (args[0] || '').toLowerCase()
    const amount = Math.max(1, Number(args[1]) || 1)
    
    if (!seed) return m.reply(`*⌬┤ ❌ ├⌬ SEMILLA INVÁLIDA.*\n> Revisá la tienda con *${usedPrefix}semillas*`)

    const result = await buySeed(m.sender, seed, amount)
    if (!result.ok) {
      if (result.reason === 'invalidSeed') return m.reply(`*⌬┤ ❌ ├⌬ SEMILLA INVÁLIDA.*\n> Revisá la tienda con *${usedPrefix}semillas*`)
      if (result.reason === 'levelTooLow') return m.reply(`*⌬┤ 🚫 ├⌬ NIVEL INSUFICIENTE.*\n> Para comprar esta semilla necesitas ser Nivel *${result.req}* (Eres Nivel ${result.current}).`)
      if (result.reason === 'dailyLimit') return m.reply(`*⌬┤ 🛑 ├⌬ LÍMITE DIARIO.*\n> Tu límite es de *${result.limit}* semillas por día (Compraste: ${result.current}).`)
      if (result.reason === 'noMoney') return m.reply(`*⌬┤ 💸 ├⌬ SIN FONDOS.*\n> Necesitás dinero para comprar esta semilla.`)
      return m.reply('*⌬┤ ❌ ├⌬ ERROR.* No se pudo completar la compra.')
    }
    
    return m.reply(`*⌬┤ ✅ ├⌬ COMPRADO.*\n> *${seed.toUpperCase()}* ×${amount}\n> 💰 Costo: *${result.totalCost} ${config.CURRENCY_SYMBOL}*\n> 📉 Límite restante hoy: *${result.limit}*\n> Usá *${usedPrefix}plantar ${seed}*`)
  }
}

handler.help = ['tiendacultivo', 'comprarsemilla <semilla> <cant>']
handler.tags = ['rpg']
handler.command = ['tiendacultivo', 'semillas', 'comprarsemilla', 'buyseed']
handler.register = true
export default handler