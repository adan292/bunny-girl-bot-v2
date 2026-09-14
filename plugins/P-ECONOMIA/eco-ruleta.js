import User from '../../lib/database/models/zen-users.js'
import config from '../../config.js'

const handler = async (m, { text, usedPrefix, command, userDb }) => {
  if (!userDb) return

  userDb.dailyStats.rouletteCount = userDb.dailyStats.rouletteCount || 0
  if (userDb.dailyStats.rouletteCount >= 15) {
    return m.reply(`*⌬┤ 🚫 ├⌬ LÍMITE DIARIO.*\n> Ya alcanzaste tus 15 jugadas por hoy. Volvé mañana.`)
  }

  const cooldown = 300000 
  const ahora = Date.now()
  const r = ahora - (userDb.lastRoulette || 0)

  if (r < cooldown) {
    const f = cooldown - r
    return m.reply(`*⌬┤ ⏳ ├⌬ MESA OCUPADA.*\n> Esperá: *${Math.floor(f / 60000)}m ${Math.floor((f % 60000) / 1000)}s*.`)
  }

  const args = text.trim().split(/\s+/)
  const eleccion = args[0]?.toLowerCase()
  const monto = parseInt(args[1])

  const helpTxt = `*╔═══⌦ ✦ 🎡 ZEN-CASINO ✦ ⌫═══╗*\n\n`
                + `> 🎰 *Uso:* ${usedPrefix + command} <opción> <monto>\n\n`
                + `*📊 OPCIONES DISPONIBLES:*\n`
                + `> 🔴 *rojo* (Multiplica x2)\n`
                + `> ⚫ *negro* (Multiplica x2)\n`
                + `> 🟢 *verde* (Multiplica x15)\n\n`
                + `*💰 LÍMITES:* 100 - 10,000 ${config.CURRENCY_SYMBOL}\n`
                + `*📊 JUGADAS:* ${userDb.dailyStats.rouletteCount}/15\n`
                + `*╚══⌦ ${config.footer} ⌫══╝*`

  if (!eleccion || isNaN(monto)) return m.reply(helpTxt)
  if (!['rojo', 'negro', 'verde'].includes(eleccion)) return m.reply('*⌬┤ ⚠️ ├⌬ OPCIÓN INVÁLIDA.* Usa: rojo, negro o verde.')
  if (monto < 100 || monto > 10000) return m.reply(`*⌬┤ ⚠️ ├⌬ MONTO INVÁLIDO.* Entre 100 y 10,000 ${config.CURRENCY_NAME}s.`)
  if (userDb.zenCoins < monto) return m.reply(`*⌬┤ ❌ ├⌬ SALDO INSUFICIENTE.*`)

  const rojo = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]
  const num = Math.floor(Math.random() * 37)
  const colorGanador = num === 0 ? 'verde' : (rojo.includes(num) ? 'rojo' : 'negro')

  let gano = eleccion === colorGanador

  let suerteAmuleto = false
  if (!gano && userDb.inventory?.amulet === 'gambler' && Math.random() < 0.05) {
    gano = true
    suerteAmuleto = true
  }

  let mult = eleccion === 'verde' ? 15 : 2
  let ganancia = gano ? monto * (mult - 1) : -monto

  userDb.lastRoulette = ahora
  userDb.dailyStats.rouletteCount += 1
  userDb.zenCoins += ganancia

  await User.updateOne({ jid: m.sender }, {
    $inc: { zenCoins: ganancia, "dailyStats.rouletteCount": 1 },
    $set: { lastRoulette: ahora }
  })
  
  let res = `*╔═══⌦ ✦ 🎰 RESULTADOS ✦ ⌫═══╗*\n\n`
          + `> 🎢 *La bola giró y cayó en:* ${num} (${colorGanador.toUpperCase()})\n`
          + `> 👤 *Apostaste:* ${monto} ${config.CURRENCY_SYMBOL} al **${eleccion.toUpperCase()}**\n\n`

  if (gano) {
    res += `*🎁 ¡GANASTE!* Recibís **${monto * mult}** ${config.CURRENCY_SYMBOL}\n`
    if (suerteAmuleto) res += `> 🎲 _Tu Amuleto del Tahúr cambió tu suerte en el último segundo!_\n`
    res += `> _Multiplicador aplicado: x${mult}_`
  } else {
    res += `*💀 PERDISTE.* El bot se queda con tus **${monto}** ${config.CURRENCY_SYMBOL}\n`
  }

  res += `\n\n*📊 ESTADO:* ${userDb.dailyStats.rouletteCount}/15 jugadas\n`
  res += `*╚══⌦ ${config.footer} ⌫══╝*`

  m.reply(res)
}

handler.help = ['ruleta <opción><monto>']
handler.tags = ['eco']
handler.command = ['ruleta', 'roulette', 'rt']
handler.register = true
export default handler