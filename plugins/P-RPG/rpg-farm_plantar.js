import { seedsCatalog, plantSeed, getFarmData } from '../../lib/games/rpg/rpgFarm.js'

const handler = async (m, { command, args, usedPrefix }) => {
  const seed = (args[0] || '').toLowerCase()
  const esTodo = seed === 'todo' || seed === 'all'

  const farm = await getFarmData(m.sender)
  const hasSeeds = farm.seeds && Object.values(farm.seeds).some(a => a > 0)
  
  if (!hasSeeds) return m.reply(`*⌬┤ 🌱 ├⌬ SIN SEMILLAS.*\n> No tenés semillas.\n> Comprá con *${usedPrefix}comprarsemilla <semilla> <cantidad>*`)

  if (esTodo) {
    let totalPlantadas = 0
    let plantadasDesc = {}

    for (const [s, cant] of Object.entries(farm.seeds)) {
      if (cant > 0) {
        while (true) {
          const f2 = await getFarmData(m.sender)
          if (f2.plots.length >= f2.maxPlots || !f2.seeds[s] || f2.seeds[s] <= 0) break
          
          const res = await plantSeed(m.sender, s)
          if (!res.ok) break
          
          plantadasDesc[s] = (plantadasDesc[s] || 0) + 1
          totalPlantadas++
        }
      }
    }

    if (totalPlantadas === 0) return m.reply(`*⌬┤ ❌ ├⌬ PARCELAS LLENAS.*\n> No tenés espacio para plantar.`)

    let lista = Object.entries(plantadasDesc)
      .map(([s, c]) => `> ${seedsCatalog[s]?.emoji || '🌱'} *${s.toUpperCase()}* ×${c}`)
      .join('\n')

    const farmFinal = await getFarmData(m.sender)
    const libresFinal = farmFinal.maxPlots - farmFinal.plots.length

    return m.reply(`*⌬┤ 🌾 ├⌬ PLANTADO TODO.*\n\n${lista}\n\n> 🟩 Parcelas usadas ahora: *${totalPlantadas}*\n> 📂 Espacio restante: *${libresFinal}*`)
  }

  if (!seed) {
    let lista = Object.entries(farm.seeds)
      .filter(([, amt]) => amt > 0)
      .map(([item, amt]) => `> ${seedsCatalog[item]?.emoji || '🌱'} *${item.toUpperCase()}* — 📦 ${amt}`)
      .join('\n')
    return m.reply(`*⌬┤ 🌾 ├⌬ TUS SEMILLAS*\n\n${lista}\n\nUsá *${usedPrefix}plantar <semilla>* o *${usedPrefix}plantar todo*`)
  }

  if (!seedsCatalog[seed]) return m.reply(`*⌬┤ ❌ ├⌬ SEMILLA INVÁLIDA.*\n> *${seed}* no existe.`)

  const result = await plantSeed(m.sender, seed)

  if (!result.ok) {
    if (result.reason === 'noSeeds') return m.reply(`*⌬┤ ❌ ├⌬ SIN STOCK.*\n> No tenés semillas de *${seed}*.`)
    if (result.reason === 'noSpace') return m.reply(`*⌬┤ ❌ ├⌬ SIN ESPACIO.*\n> No tenés parcelas disponibles. *(Usadas: ${farm.plots.length}/${farm.maxPlots})*`)
    return m.reply('*⌬┤ ❌ ├⌬ ERROR.* No se pudo plantar.')
  }

  const tiempoMin = Math.floor(seedsCatalog[seed].growTime / 60000)
  return m.reply(`*⌬┤ ${seedsCatalog[seed].emoji} ├⌬ PLANTADO.*\n> Semilla: *${seed.toUpperCase()}*\n> Crecimiento: *${tiempoMin} min*\n> Usá *${usedPrefix}parcelas* para ver el progreso.`)
}

handler.help = ['plantar <semilla>', 'plantar todo']
handler.tags = ['rpg']
handler.command = ['plantar', 'sembrar']
handler.register = true
export default handler