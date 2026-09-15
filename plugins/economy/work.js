import { db } from '../../database/db.js'

const COOLDOWN = 60 * 60 * 1000 // 1 hora en ms

const TRABAJOS = [
  { texto: '⚔️ Exterminaste una maldición de grado 2', base: 150 },
  { texto: '🩸 Completaste una misión de grado 3', base: 100 },
  { texto: '📜 Entregaste un informe al Jujutsu Tech', base: 80 },
  { texto: '🗡️ Sobreviviste a un dominio expandido', base: 200 },
  { texto: '🏯 Patrullaste el perímetro de la escuela', base: 70 },
  { texto: '💀 Sellaste una maldición especial de grado 1', base: 300 },
  { texto: '🔮 Recolectaste energía maldita del ambiente', base: 120 },
  { texto: '📦 Transportaste objetos malditos con seguridad', base: 90 },
]

const BONUS_ITEMS = {
  'pala':              50,
  'pico':             120,
  'katana_maldita':   300,
  'cristal_dominio':  600,
}

export default {
  name: ['work', 'trabajar'],
  description: 'Trabaja para ganar Fragmentos',
  category: 'economy',
  ownerOnly: false,

  async run({ sender, reply, react }) {
    const eco = db.getEco(sender)
    const ahora = Date.now()
    const tiempoRestante = COOLDOWN - (ahora - eco.lastWork)

    if (tiempoRestante > 0) {
      const mins = Math.floor(tiempoRestante / 60000)
      const segs = Math.floor((tiempoRestante % 60000) / 1000)
      return await reply({
        text: `⏳ Ya trabajaste recientemente.\n\n> Podés volver a trabajar en *${mins}m ${segs}s*`
      })
    }

    const trabajo = TRABAJOS[Math.floor(Math.random() * TRABAJOS.length)]

    // Calculamos bonus según items en inventario
    let bonus = 0
    for (const itemId of eco.inventario) {
      bonus += BONUS_ITEMS[itemId] ?? 0
    }

    // Ganancia aleatoria dentro de un rango del trabajo elegido
    const variacion = Math.floor(Math.random() * 50) - 25 // ±25
    const ganado = Math.max(10, trabajo.base + variacion + bonus)

    const nuevoBolsillo = eco.bolsillo + ganado

    db.setEco(sender, {
      bolsillo: nuevoBolsillo,
      lastWork: ahora
    })

    await react('💰')
    await reply({
      text: `${trabajo.texto}\n\n` +
        `💰 *Ganaste:* ${ganado} Fragmentos${bonus > 0 ? ` *(+${bonus} bonus de items)*` : ''}\n` +
        `👜 *Bolsillo actual:* ${nuevoBolsillo} Fragmentos\n\n` +
        `> ⏳ Próximo trabajo en *1 hora*`
    })
  }
}