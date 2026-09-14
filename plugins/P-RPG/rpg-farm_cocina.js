import config from '../../config.js'
import { seedsCatalog, recipes, cookRecipe } from '../../lib/games/rpg/rpgFarm.js'

const handler = async (m, { command, args, usedPrefix }) => {

  if (['recetas', 'cocinas'].includes(command)) {
    const lista = Object.entries(recipes)
      .sort((a, b) => a[1].gives.value - b[1].gives.value)
      .map(([id, d]) => {
        const reqs = Object.entries(d.requires)
          .map(([item, cant]) => `${seedsCatalog[item]?.emoji || '📦'} ${item}: *${cant}*`).join(' · ')
        return `> ${d.emoji} *${id.toUpperCase()}*\n> 📋 Req: ${reqs}\n> ✨ ${d.gives.xp} XP | 💰 Valor: ${d.gives.value} ${config.CURRENCY_SYMBOL}\n`
      }).join('\n')

    return m.reply(`*⌬┤ 🍽️ ├⌬ LIBRO DE RECETAS*\n\n${lista}\nUsá *${usedPrefix}cocinar <receta>*`)
  }

  if (['cocinar', 'cook'].includes(command)) {
    const recipeName = (args[0] || '').toLowerCase()
    
    if (!recipeName || !recipes[recipeName]) {
      return m.reply(`*⌬┤ 🍳 ├⌬ COCINAR*\n> Usá *${usedPrefix}recetas* para ver la lista.\n> Ejemplo: *${usedPrefix}cocinar ensalada_basica*`)
    }

    const result = await cookRecipe(m.sender, recipeName)

    if (!result.ok) {
      if (result.reason === 'noIngredients') {
        const reqs = Object.entries(recipes[recipeName].requires)
          .map(([item, cant]) => `> ${seedsCatalog[item]?.emoji || '📦'} ${item}: ${cant}`).join('\n')
        return m.reply(`*⌬┤ ❌ ├⌬ FALTAN INGREDIENTES.*\n\n> Necesitás para *${recipeName.toUpperCase()}*:\n${reqs}\n\n> Revisá tu granero con *${usedPrefix}granero*`)
      }
      return m.reply('*⌬┤ ❌ ├⌬ ERROR.* No se pudo cocinar.')
    }

    return m.reply(`*⌬┤ 🍽️ ├⌬ ¡COCINADO CON ÉXITO!*\n> ${recipes[recipeName].emoji} *${result.food.toUpperCase()}*\n> 🌟 XP Granjero ganada: *+${result.xp}*\n> 💰 Valor de venta: *${recipes[recipeName].gives.value} ${config.CURRENCY_SYMBOL}*\n> Podés venderlo con *${usedPrefix}venderfarm ${recipeName}*`)
  }
}

handler.help = ['recetas', 'cocinar <receta>']
handler.tags = ['rpg']
handler.command = ['recetas', 'cocinas', 'cocinar', 'cook']
handler.register = true
export default handler