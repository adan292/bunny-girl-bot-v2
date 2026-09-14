import User from '../../lib/database/models/zen-users.js'
import config from '../../config.js'

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const SYMBOLS = [
  { s: '7️⃣', w: 2,  m3: 50, m2: 5 },
  { s: '💎', w: 4,  m3: 20, m2: 3 },
  { s: '🔔', w: 7,  m3: 10, m2: 2 },
  { s: '🍉', w: 10, m3: 5,  m2: 1.5 },
  { s: '🍇', w: 12, m3: 3,  m2: 1 },
  { s: '🍋', w: 15, m3: 3,  m2: 1 },
  { s: '🍒', w: 20, m3: 3,  m2: 1 }
]

function getRandomSymbol() {
  const totalWeight = SYMBOLS.reduce((acc, curr) => acc + curr.w, 0)
  let random = Math.random() * totalWeight
  for (const sym of SYMBOLS) {
    if (random < sym.w) return sym
    random -= sym.w
  }
  return SYMBOLS[SYMBOLS.length - 1]
}

const handler = async (m, { conn, text, usedPrefix, command, userDb }) => {
  if (!userDb) return

  const cooldown = 15000 
  const now = Date.now()
  const remaining = cooldown - (now - (userDb.lastSlots || 0))

  if (remaining > 0) {
    return m.reply(`*⌬┤ ⏳ ├⌬ MÁQUINA EN USO.*\n> Esperá *${Math.ceil(remaining / 1000)}s* para volver a tirar.`)
  }

  const apuesta = parseInt(text)
  const minBet = 100
  const maxBet = 10000

  if (isNaN(apuesta) || apuesta < minBet || apuesta > maxBet) {
    let help = `*╔═══⌦ ✦ 🎰 ZEN-SLOTS ✦ ⌫═══╗*\n\n`
             + `> ✍️ *Uso:* ${usedPrefix + command} <apuesta>\n`
             + `> 💰 *Límites:* ${minBet} - ${maxBet} ${config.CURRENCY_NAME}\n\n`
             + `*⌬┤ 🏆 TABLA DE PREMIOS ├⌬*\n`
             + `> 7️⃣7️⃣7️⃣ = Apuesta x50\n`
             + `> 💎💎💎 = Apuesta x20\n`
             + `> 🔔🔔🔔 = Apuesta x10\n`
             + `> 🍉🍉🍉 = Apuesta x5\n`
             + `> 🍒🍒🍒 = Apuesta x3\n`
             + `> 🍒🍒⬜ = Apuesta x1 (Recuperas)\n\n`
             + `*╚══⌦ ${config.footer} ⌫══╝*`
    return m.reply(help)
  }

  if (userDb.zenCoins < apuesta) {
    return m.reply(`*⌬┤ ❌ ├⌬ FONDOS INSUFICIENTES.*\n> Tienes *${userDb.zenCoins}* ${config.CURRENCY_NAME}.`)
  }

  userDb.zenCoins -= apuesta
  userDb.lastSlots = now
  await User.updateOne({ jid: m.sender }, { $inc: { zenCoins: -apuesta }, $set: { lastSlots: now } })

  const buildFrame = (r1, r2, r3, statusStr) => {
    return `*╔═══⌦ ✦ 🎰 ZEN-SLOTS ✦ ⌫═══╗*\n\n`
         + `> 👤 *Apostador:* @${m.sender.split('@')[0]}\n`
         + `> 🪙 *Apostó:* ${apuesta} ${config.CURRENCY_SYMBOL}\n\n`
         + `      [  ${r1}  |  ${r2}  |  ${r3}  ]\n\n`
         + `${statusStr}\n`
         + `*╚══⌦ ${config.footer} ⌫══╝*`
  }

  const msgContext = {
    text: buildFrame('🌀', '🌀', '🌀', '> 🔄 _Tirando de la palanca..._'),
    mentions: [m.sender]
  }
  const sentMsg = await conn.sendMessage(m.chat, msgContext, { quoted: m })
  const msgKey = sentMsg.key

  for (let i = 0; i < 3; i++) {
    await sleep(700)
    let t1 = getRandomSymbol().s
    let t2 = getRandomSymbol().s
    let t3 = getRandomSymbol().s
    await conn.sendMessage(m.chat, { 
      edit: msgKey, 
      text: buildFrame(t1, t2, t3, '> 🎰 _Los rodillos están girando..._'),
      mentions: [m.sender] 
    })
  }

  await sleep(800)

  const res1 = getRandomSymbol()
  const res2 = getRandomSymbol()
  const res3 = getRandomSymbol()

  let multiplicador = 0
  let matchSymbol = null
  let mensajeFinal = ""
  let suerteAmuleto = false

  if (res1.s === res2.s && res2.s === res3.s) {
    multiplicador = res1.m3
    matchSymbol = res1.s
    mensajeFinal = `*🎁 ¡JACKPOT!* (3x ${matchSymbol})\n> 💰 ¡Ganaste **${apuesta * multiplicador}** ${config.CURRENCY_NAME}!`
  } else if (res1.s === res2.s) {
    multiplicador = res1.m2
    matchSymbol = res1.s
    mensajeFinal = `*✅ ¡PREMIO MENOR!* (2x ${matchSymbol})\n> 🪙 Recuperas/Ganas **${Math.floor(apuesta * multiplicador)}** ${config.CURRENCY_NAME}.`
  } else if (res2.s === res3.s) {
    multiplicador = res2.m2
    matchSymbol = res2.s
    mensajeFinal = `*✅ ¡PREMIO MENOR!* (2x ${matchSymbol})\n> 🪙 Recuperas/Ganas **${Math.floor(apuesta * multiplicador)}** ${config.CURRENCY_NAME}.`
  } else if (res1.s === res3.s) {
    multiplicador = res1.m2
    matchSymbol = res1.s
    mensajeFinal = `*✅ ¡PREMIO MENOR!* (2x ${matchSymbol})\n> 🪙 Recuperas/Ganas **${Math.floor(apuesta * multiplicador)}** ${config.CURRENCY_NAME}.`
  } else if (userDb.inventory?.amulet === 'gambler' && Math.random() < 0.05) {
    multiplicador = 1.5
    matchSymbol = '🍒'
    suerteAmuleto = true
    mensajeFinal = `*🎲 ¡TU AMULETO DEL TAHÚR TE SALVÓ!* (2x 🍒)\n> 🪙 Recuperas/Ganas **${Math.floor(apuesta * multiplicador)}** ${config.CURRENCY_NAME}.`
  } else {
    multiplicador = 0
    mensajeFinal = `*💀 PERDISTE.*\n> Tus **${apuesta}** ${config.CURRENCY_NAME} se los queda el casino.`
  }

  if (multiplicador > 0) {
    const ganancia = Math.floor(apuesta * multiplicador)
    userDb.zenCoins += ganancia
    await User.updateOne({ jid: m.sender }, { $inc: { zenCoins: ganancia } })
  }

  await conn.sendMessage(m.chat, { 
    edit: msgKey, 
    text: suerteAmuleto
      ? buildFrame('🍒', '🍒', res3.s, mensajeFinal)
      : buildFrame(res1.s, res2.s, res3.s, mensajeFinal),
    mentions: [m.sender] 
  })
}

handler.help = ['slots <apuesta>']
handler.tags = ['eco']
handler.command = ['slots', 'tragamonedas', 'slot', 'apostar']
handler.register = true

export default handler