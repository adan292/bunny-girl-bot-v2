import config from '../../config.js'
import { itemsCatalog, getFarmData, buyFarmItem, useFarmItem, waterPlot, curePlot } from '../../lib/games/rpg/rpgFarm.js'

const handler = async (m, { command, args, usedPrefix }) => {

  if (['regar'].includes(command)) {
    const index = Number(args[0]) - 1
    if (isNaN(index) || index < 0) return m.reply(`*⌬┤ 💧 ├⌬ REGAR*\n> Indicá la parcela que necesita agua.\n> Ejemplo: *${usedPrefix}regar 1*`)
    const res = await waterPlot(m.sender, index)
    if (!res.ok) return m.reply(`*⌬┤ ❌ ├⌬ NO NECESITA AGUA.*\n> Esa parcela no existe o está hidratada.`)
    return m.reply(`*⌬┤ 💧 ├⌬ PARCELA REGADA.*\n> La planta vuelve a crecer con normalidad.`)
  }

  if (['curar', 'curarplagas'].includes(command)) {
    const index = Number(args[0]) - 1
    if (isNaN(index) || index < 0) return m.reply(`*⌬┤ 🧪 ├⌬ CURAR PLAGAS*\n> Indicá la parcela infectada.\n> Ejemplo: *${usedPrefix}curar 1*`)
    const res = await curePlot(m.sender, index)
    if (!res.ok) return m.reply(`*⌬┤ ❌ ├⌬ NO ESTÁ INFECTADA.*\n> Esa parcela no existe o está sana.`)
    return m.reply(`*⌬┤ 🧪 ├⌬ PLAGAS ELIMINADAS.*\n> La planta vuelve a crecer con normalidad.`)
  }

  if (['tiendaobjetos', 'farmshop'].includes(command)) {
    let txt = `*⌬┤ 🏪 ├⌬ TIENDA DE CUIDADOS*\n\n`
    for (const [id, item] of Object.entries(itemsCatalog)) {
      txt += `> ${item.emoji} *${id.toUpperCase()}*\n`
      txt += `> 💰 Precio: *${item.price} ${config.CURRENCY_SYMBOL}*\n`
      txt += `> ℹ️ ${item.desc}\n\n`
    }
    txt += `Usá *${usedPrefix}comprarobjeto <objeto> <cantidad>*`
    return m.reply(txt)
  }

  if (['comprarobjeto'].includes(command)) {
    const itemId = (args[0] || '').toLowerCase()
    const amount = Math.max(1, Number(args[1]) || 1)
    
    if (!itemId || !itemsCatalog[itemId]) return m.reply(`*⌬┤ ❌ ├⌬ OBJETO INVÁLIDO.*\n> Mirá la tienda con *${usedPrefix}tiendaobjetos*`)
    
    const res = await buyFarmItem(m.sender, itemId, amount)
    if (!res.ok) {
      if (res.reason === 'dailyLimit') return m.reply(`*⌬┤ 🛑 ├⌬ LÍMITE DIARIO.*\n> El límite para este objeto es de *${res.limit}* al día.`)
      if (res.reason === 'noMoney') return m.reply(`*⌬┤ 💸 ├⌬ SIN FONDOS.*`)
      return m.reply('*⌬┤ ❌ · ERROR.*')
    }
    return m.reply(`*⌬┤ ✅ ├⌬ COMPRADO.*\n> ${itemsCatalog[itemId].emoji} *${itemId.toUpperCase()}* ×${amount}\n> Costo: *${res.totalCost} ${config.CURRENCY_SYMBOL}*`)
  }

  if (['usarobjeto'].includes(command)) {
    const itemId = (args[0] || '').toLowerCase()
    const index = Number(args[1]) - 1
    
    if (!itemId) return m.reply(`*⌬┤ 🧰 ├⌬ USAR OBJETO*\n> Ejemplo: *${usedPrefix}usarobjeto fertilizante 1*`)
    
    const res = await useFarmItem(m.sender, itemId, isNaN(index) ? -1 : index)
    if (!res.ok) {
      if (res.reason === 'noStock') return m.reply(`*⌬┤ ❌ ├⌬ SIN STOCK.*\n> No tienes este objeto en el inventario.`)
      if (res.reason === 'invalidPlot') return m.reply(`*⌬┤ ❌ ├⌬ PARCELA INVÁLIDA.*\n> Indicá una parcela que esté creciendo actualmente.`)
      return m.reply('*⌬┤ ❌ · ERROR.*')
    }

    if (res.effect === 'reduce_time') return m.reply(`*⌬┤ 💩 ├⌬ FERTILIZANTE APLICADO.*\n> El tiempo de crecimiento se ha reducido un 15%.`)
    if (res.effect === 'anti_plaga') return m.reply(`*⌬┤ 🧪 ├⌬ PESTICIDA APLICADO.*\n> Tu granja está protegida de plagas por 24 horas.`)
    if (res.effect === 'anti_sequia') return m.reply(`*⌬┤ 🚿 ├⌬ ASPERSOR ACTIVADO.*\n> Tu granja está protegida de sequías por 24 horas.`)
    if (res.effect === 'anti_pudricion') return m.reply(`*⌬┤ 🎃 ├⌬ ESPANTAPÁJAROS COLOCADO.*\n> Tus plantas durarán 24 horas extra antes de pudrirse.`)
  }

  if (['inventariofarm'].includes(command)) {
    const farm = await getFarmData(m.sender)
    let txt = `*⌬┤ 🧰 ├⌬ INVENTARIO DE CUIDADOS*\n\n`
    let hay = false
    for (const [id, cant] of Object.entries(farm.items)) {
      if (cant > 0) {
        txt += `> ${itemsCatalog[id].emoji} *${id.toUpperCase()}*: ${cant}\n`
        hay = true
      }
    }
    if (!hay) txt += `> No tienes objetos especiales.`
    
    txt += `\n*🛡️ Protecciones Activas:*\n`
    const now = Date.now()
    const p = farm.buffs.anti_plaga > now ? 'Activo ✅' : 'Inactivo ❌'
    const s = farm.buffs.anti_sequia > now ? 'Activo ✅' : 'Inactivo ❌'
    const pu = farm.buffs.anti_pudricion > now ? 'Activo ✅' : 'Inactivo ❌'
    
    txt += `> 🧪 Pesticida: ${p}\n> 🚿 Aspersor: ${s}\n> 🎃 Espantapájaros: ${pu}`
    
    return m.reply(txt)
  }
}

handler.help = ['regar <n>', 'curar <n>', 'tiendaobjetos', 'comprarobjeto', 'usarobjeto', 'inventariofarm']
handler.tags = ['rpg']
handler.command = ['regar', 'curar', 'curarplagas', 'tiendaobjetos', 'farmshop', 'comprarobjeto', 'usarobjeto', 'inventariofarm']
handler.register = true
export default handler