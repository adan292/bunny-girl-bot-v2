import config from '../../config.js'
import { getFarmData, TERRAINS, buyTerrain, buyPlot } from '../../lib/games/rpg/rpgFarm.js'

const handler = async (m, { command, args, usedPrefix, userDb }) => {
  if (!userDb) return

  if (['terrenos', 'miterreno'].includes(command)) {
    const farm = await getFarmData(m.sender)
    const current = TERRAINS.find(t => t.level === farm.terrainLevel)
    const next = TERRAINS.find(t => t.level === farm.terrainLevel + 1)
    
    let txt = `*⌬┤ 🗺️ ├⌬ BIENES RAÍCES RURALES*\n\n`
            + `> 🏡 *Terreno Nivel:* ${current.level}\n`
            + `> 📏 *Capacidad:* ${farm.maxPlots} / ${current.capacity} Parcelas\n\n`
    
    const plotCost = 2000 + (farm.maxPlots * 1000)
    
    if (farm.maxPlots < current.capacity) {
      txt += `*🌱 Ampliar Parcelas:*\n> Podés comprar 1 parcela más por *${plotCost} ${config.CURRENCY_SYMBOL}*.\n> *Uso:* ${usedPrefix}comprarparcela\n\n`
    } else {
      txt += `*🌱 Ampliar Parcelas:*\n> Alcanzaste el límite de tu terreno. Necesitás comprar el siguiente nivel.\n\n`
    }

    if (next) {
      txt += `*🗺️ Expandir Terreno:*\n> Terreno Nivel ${next.level} (Capacidad: ${next.capacity})\n> Costo: *${next.cost} ${config.CURRENCY_SYMBOL}*\n> *Uso:* ${usedPrefix}comprarterreno`
    } else {
      txt += `*🗺️ Expandir Terreno:*\n> ¡Ya tenés el terreno más grande del juego!`
    }

    return m.reply(txt)
  }

  if (['comprarterreno'].includes(command)) {
    const res = await buyTerrain(m.sender)
    if (!res.ok) {
      if (res.reason === 'maxLevel') return m.reply(`*⌬┤ ❌ ├⌬ NIVEL MÁXIMO.*\n> Ya tienes el terreno más grande.`)
      if (res.reason === 'noMoney') return m.reply(`*⌬┤ 💸 ├⌬ SIN FONDOS.*\n> Necesitás *${res.cost} ${config.CURRENCY_SYMBOL}* para comprar este terreno.`)
      return m.reply('*⌬┤ ❌ · ERROR.*')
    }
    return m.reply(`*⌬┤ 🏡 ├⌬ TERRENO EXPANDIDO.*\n> Ahora tienes Terreno Nivel *${res.level}*.\n> Tu nueva capacidad máxima es de *${res.capacity} parcelas*.`)
  }

  if (['comprarparcela'].includes(command)) {
    const res = await buyPlot(m.sender)
    if (!res.ok) {
      if (res.reason === 'terrainFull') return m.reply(`*⌬┤ 🚫 ├⌬ LÍMITE ALCANZADO.*\n> No caben más parcelas en este terreno. Usá *${usedPrefix}comprarterreno* para expandirte.`)
      if (res.reason === 'noMoney') return m.reply(`*⌬┤ 💸 ├⌬ SIN FONDOS.*\n> Necesitás *${res.cost} ${config.CURRENCY_SYMBOL}* para agregar una parcela.`)
      return m.reply('*⌬┤ ❌ · ERROR.*')
    }
    return m.reply(`*⌬┤ 🌱 ├⌬ PARCELA AÑADIDA.*\n> Gastaste *${res.cost} ${config.CURRENCY_SYMBOL}*.\n> Ahora tienes un total de *${res.maxPlots} parcelas*.`)
  }
}

handler.help = ['terrenos', 'comprarterreno', 'comprarparcela']
handler.tags = ['rpg']
handler.command = ['terrenos', 'miterreno', 'comprarterreno', 'comprarparcela']
handler.register = true
export default handler