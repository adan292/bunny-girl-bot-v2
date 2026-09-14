import config from '../../config.js'
import { seedsCatalog, recipes, getFarmData } from '../../lib/games/rpg/rpgFarm.js'

const TAX_RATE = 0.15

const handler = async (m, { command, args, usedPrefix, userDb }) => {
  if (!userDb) return

  if (['venderfarm', 'sellfarm'].includes(command)) {
    const item = (args[0] || '').toLowerCase()
    const amount = Math.max(1, Number(args[1]) || 1)

    const farm = await getFarmData(m.sender)
    if (!item) return m.reply(`*⌬┤ 💰 ├⌬ MERCADO DEL PUEBLO*\n\n> El alcalde cobra un *15% de impuestos* por ventas.\n> *Uso:* ${usedPrefix}venderfarm <item> <cantidad>`)

    let gananciaBruta = 0
    let emojiItem = ''

    if (seedsCatalog[item]) {
      const stock = farm.harvest.find(h => h.item === item)
      if (!stock || stock.amount < amount) return m.reply(`*⌬┤ ❌ ├⌬ SIN STOCK.*`)
      
      gananciaBruta = seedsCatalog[item].sellPrice * amount
      stock.amount -= amount
      userDb.farm.harvest = farm.harvest.filter(h => h.amount > 0)
      userDb.farmerStats.cropsSold = (userDb.farmerStats.cropsSold || 0) + amount
      emojiItem = seedsCatalog[item].emoji
    } 
    else {
      let recipeKey = Object.keys(recipes).find(k => recipes[k].gives.food === item || k === item)
      if (!recipeKey) return m.reply(`*⌬┤ ❌ ├⌬ ÍTEM INVÁLIDO.*`)
      
      const stock = farm.food.find(f => f.item === recipes[recipeKey].gives.food)
      if (!stock || stock.amount < amount) return m.reply(`*⌬┤ ❌ ├⌬ SIN STOCK.*`)
      
      gananciaBruta = recipes[recipeKey].gives.value * amount
      stock.amount -= amount
      userDb.farm.food = farm.food.filter(f => f.amount > 0)
      userDb.farmerStats.foodSold = (userDb.farmerStats.foodSold || 0) + amount
      emojiItem = recipes[recipeKey].emoji
    }

    const impuestos = Math.floor(gananciaBruta * TAX_RATE)
    const gananciaNeta = gananciaBruta - impuestos

    userDb.zenCoins += gananciaNeta
    userDb.markModified('farm')
    userDb.markModified('farmerStats')
    await userDb.save()

    return m.reply(`*⌬┤ 💰 ├⌬ VENTA EXITOSA*\n\n> ${emojiItem} *${item.toUpperCase()}* ×${amount}\n> 💵 Ganancia Bruta: *${gananciaBruta}*\n> 🏛️ Impuestos (15%): *-${impuestos}*\n> 🪙 Recibes: *${gananciaNeta} ${config.CURRENCY_SYMBOL}*`)
  }
}

handler.help = ['venderfarm <item> <cant>']
handler.tags = ['rpg']
handler.command = ['venderfarm', 'sellfarm']
handler.register = true
export default handler