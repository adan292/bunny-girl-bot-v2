import { seedsCatalog, recipes, getFarmData } from '../../lib/games/rpg/rpgFarm.js'

const handler = async (m, { usedPrefix }) => {
  const farm = await getFarmData(m.sender)
  
  const hasHarvest = farm.harvest && farm.harvest.length > 0
  const hasFood = farm.food && farm.food.length > 0
  const hasSeeds = farm.seeds && Object.values(farm.seeds).some(a => a > 0)

  if (!hasHarvest && !hasFood && !hasSeeds) {
    return m.reply(`*⌬┤ 🌾 ├⌬ GRANERO VACÍO.*\n> No tenés nada guardado. ¡Comprá semillas y empezá a plantar!`)
  }

  let texto = `*⌬┤ 🌾 ├⌬ TU GRANERO*\n\n`

  if (hasSeeds) {
    texto += `*🌱 Semillas:*\n`
    for (const [item, amt] of Object.entries(farm.seeds)) {
      if (amt > 0) texto += `> ${seedsCatalog[item]?.emoji || '🌱'} ${item.toUpperCase()}: *${amt}*\n`
    }
    texto += `\n`
  }

  if (hasHarvest) {
    texto += `*📦 Cosechas (Crudas):*\n`
    farm.harvest.forEach(h => {
      texto += `> ${seedsCatalog[h.item]?.emoji || '📦'} ${h.item.toUpperCase()}: *${h.amount}*\n`
    })
    texto += `\n`
  }

  if (hasFood) {
    texto += `*🍲 Comida Preparada:*\n`
    farm.food.forEach(f => {
      const recipeKey = Object.keys(recipes).find(k => recipes[k].gives.food === f.item)
      const emoji = recipeKey ? recipes[recipeKey].emoji : '🍽️'
      texto += `> ${emoji} ${f.item.toUpperCase()}: *${f.amount}*\n`
    })
    texto += `\n`
  }

  texto += `> 🍳 Recetas: *${usedPrefix}recetas*\n> 💰 Vender: *${usedPrefix}venderfarm*`
  
  return m.reply(texto)
}

handler.help = ['granero']
handler.tags = ['rpg']
handler.command = ['granero', 'almacen']
handler.register = true
export default handler