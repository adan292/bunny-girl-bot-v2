import { seedsCatalog, checkPlots, harvestPlot, getFarmData } from '../../lib/games/rpg/rpgFarm.js'

const remainingTime = (plot) => {
  const r = plot.growTime - plot.progress
  return { min: Math.max(0, Math.floor(r / 60000)), seg: Math.max(0, Math.floor((r % 60000) / 1000)) }
}

const handler = async (m, { command, args, usedPrefix }) => {
  
  if (['parcelas', 'cultivo'].includes(command)) {
    const plots = await checkPlots(m.sender)
    const farm = await getFarmData(m.sender)
    const max = farm.maxPlots
    const usadas = plots.length
    const libres = max - usadas

    if (!usadas) return m.reply(`*⌬┤ 🌱 ├⌬ SIN CULTIVOS*\n\n> 📊 Usadas: *0/${max}*\n> 📂 Libres: *${libres}*\n\n> Empezá con *${usedPrefix}plantar <semilla>*\n> Tienda: *${usedPrefix}tiendacultivo*`)

    let listas = 0
    let plotsTexto = ''

    plots.forEach((plot, i) => {
      const { seed } = plot
      const emoji = seedsCatalog[seed]?.emoji || '🌱'
      
      if (plot.state === 'dead') {
        const causa = plot.deadReason === 'sequía' ? 'Seca 💧' : 'Comida por plagas 🐛'
        plotsTexto += `> 💀 *${i + 1}. ${seed.toUpperCase()}* — MUERTA (${causa}) (Cosecha para limpiar)\n`
      } else if (plot.state === 'rotten') {
        plotsTexto += `> 🪰 💀 *${i + 1}. ${seed.toUpperCase()}* — PODRIDA (Por abandono)\n`
      } else if (plot.state === 'ready') {
        listas++
        plotsTexto += `> ${emoji} 🟢 *${i + 1}. ${seed.toUpperCase()}* — ✔ Lista\n`
      } else if (plot.needsWater) {
        plotsTexto += `> 💧 ⚠️ *${i + 1}. ${seed.toUpperCase()}* — NECESITA AGUA (Usá ${usedPrefix}regar ${i+1})\n`
      } else if (plot.infected) {
        plotsTexto += `> 🐛 ⚠️ *${i + 1}. ${seed.toUpperCase()}* — PLAGA DETECTADA (Usá ${usedPrefix}curar ${i+1})\n`
      } else {
        const t = remainingTime(plot)
        const grow = plot.growTime
        const filled = Math.round(Math.min(1, plot.progress / grow) * 10)
        const barra = '█'.repeat(filled) + '░'.repeat(10 - filled)
        const pct = Math.floor(Math.min(1, plot.progress / grow) * 100)
        plotsTexto += `> ${emoji} 🟡 *${i + 1}. ${seed.toUpperCase()}* — ${t.min}m ${t.seg}s [${barra}] ${pct}%\n`
      }
    })

    const footer = listas > 0 ? `\n> ✅ *${listas}* parcelas listas — usá *${usedPrefix}cosechar todo*` : `\n> Aún creciendo...`
    return m.reply(`*⌬┤ 🌾 ├⌬ TUS PARCELAS*\n\n> 📊 Usadas: *${usadas}/${max}*\n> 📂 Libres: *${libres}*\n\n${plotsTexto}${footer}`)
  }

  if (['cosechar', 'recolectar'].includes(command)) {
    const plots = await checkPlots(m.sender)
    if (!plots || !plots.length) return m.reply(`*⌬┤ 🌱 ├⌬ SIN PARCELAS.*\n> No tenés parcelas plantadas.`)

    const opcion = (args[0] || '').toLowerCase()
    
    if (opcion === 'todo' || opcion === 'all') {
      const listas = plots.map((pl, i) => ({ ...pl, index: i })).filter(pl => pl.state === 'ready' || pl.state === 'dead' || pl.state === 'rotten').sort((a, b) => b.index - a.index)
      if (!listas.length) return m.reply(`*⌬┤ ⏳ ├⌬ NO HAY NADA QUE RECOGER.*\n> Ninguna parcela está lista o muerta.`)
      
      let totalFXP = 0
      const acc = {}
      let perdidas = 0

      for (const pl of listas) {
        const result = await harvestPlot(m.sender, pl.index)
        if (result.ok) {
          if (result.lost || result.rotten) {
            perdidas++
          } else {
            totalFXP += result.farmerXp
            acc[result.item] = (acc[result.item] || 0) + result.amount
          }
        }
      }

      let listaItems = Object.entries(acc).map(([item, amt]) => `> ${seedsCatalog[item]?.emoji || '🌱'} *${item.toUpperCase()}* ×${amt}`).join('\n')
      if (perdidas > 0) listaItems += `\n> 💀 *Plantas perdidas limpiadas:* ${perdidas}`

      if (Object.keys(acc).length === 0 && perdidas > 0) return m.reply(`*⌬┤ 🧹 ├⌬ LIMPIEZA COMPLETA*\n> Has limpiado ${perdidas} plantas muertas de tu terreno.`)

      return m.reply(`*⌬┤ 🌾 ├⌬ COSECHA COMPLETA*\n\n${listaItems}\n\n> 🌟 XP Granjero ganada: *+${totalFXP}*\n> 💡 *TIP:* ¡No lo vendas crudo! Cocinarlo te dará más dinero.`)
    } 
    
    const index = Number(opcion) - 1
    if (isNaN(index) || index < 0) return m.reply(`*⌬┤ 🌾 ├⌬ COSECHAR*\n> Indicá un número válido o usá *${usedPrefix}cosechar todo*`)
    if (!plots[index]) return m.reply(`*⌬┤ ❌ ├⌬ NO EXISTE.*\n> Esa parcela no existe.`)
    
    if (plots[index].state === 'growing') return m.reply(`*⌬┤ ⏳ ├⌬ AÚN NO.*\n> La planta sigue creciendo o está en peligro.`)
    
    const result = await harvestPlot(m.sender, index)
    if (!result.ok) return m.reply('*⌬┤ ❌ ├⌬ ERROR.* No se pudo cosechar.')
    
    if (result.lost || result.rotten) return m.reply(`*⌬┤ 💀 ├⌬ PLANTA PERDIDA.*\n> Limpiaste los restos de *${result.item.toUpperCase()}* de tu parcela.`)

    return m.reply(`*⌬┤ 🌾 ├⌬ COSECHADO.*\n> ${seedsCatalog[result.item]?.emoji} *${result.item.toUpperCase()}* ×${result.amount}\n> 🌟 XP Granjero: *+${result.farmerXp}*`)
  }
}

handler.help = ['parcelas', 'cosechar [n|todo]']
handler.tags = ['rpg']
handler.command = ['parcelas', 'cultivo', 'cosechar', 'recolectar']
handler.register = true
export default handler