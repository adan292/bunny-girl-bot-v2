import config from '../../config.js'

const formatTime = (ms) => {
  if (ms <= 0) return '✅ Listo'

  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)

  if (h > 0) return `⏳ ${h}h ${m}m`
  if (m > 0) return `⏳ ${m}m ${s}s`
  return `⏳ ${s}s`
}

const handler = async (m, { conn, userDb }) => {
  if (!userDb) return

  const now = Date.now()

  const cdDaily    = 86400000
  const cdMine     = 900000
  const cdHunt     = 600000
  const cdFish     = 600000
  const cdWork     = 600000
  const cdCrime    = 1200000
  const cdRob      = 1800000
  const cdKogenRob = 3600000
  const cdDuel     = 300000
  const cdRoulette = 300000

  const stMine     = formatTime(cdMine - (now - (userDb.lastMine || 0)))
  const stHunt     = formatTime(cdHunt - (now - (userDb.lastHunt || 0)))
  const stFish     = formatTime(cdFish - (now - (userDb.lastFish || 0)))
  const stWork     = formatTime(cdWork - (now - (userDb.lastWork || 0)))
  const stCrime    = formatTime(cdCrime - (now - (userDb.lastCrime || 0)))
  const stRob      = formatTime(cdRob - (now - (userDb.lastRob || 0)))
  const stKogenRob = formatTime(cdKogenRob - (now - (userDb.lastKogenRob || 0)))
  const stDuel     = formatTime(cdDuel - (now - (userDb.lastDuel || 0)))
  const stDaily    = formatTime(cdDaily - (now - (userDb.lastDaily || 0)))
  const stRoulette = formatTime(cdRoulette - (now - (userDb.lastRoulette || 0)))

  const roulettePlays = userDb.dailyStats?.rouletteCount || 0

  const rouletteStatus =
    roulettePlays >= 15
      ? '🚫 Límite (15/15)'
      : `${stRoulette} [${roulettePlays}/15]`

  let txt = `*╔═══⌦ ✦ ⏱️ ESTADO DE ECONOMÍA ✦ ⌫═══╗*\n\n`
    + `> 👤 *Usuario:* @${m.sender.split('@')[0]}\n\n`

    + `*⌬┤ ⚒️ TRABAJOS Y RECOLECCIÓN ├⌬*\n`
    + `> ⛏️ *Minar:* ${stMine}\n`
    + `> 🏹 *Cazar:* ${stHunt}\n`
    + `> 🎣 *Pescar:* ${stFish}\n`
    + `> 💼 *Trabajar:* ${stWork}\n\n`

    + `*⌬┤ 🔫 ILEGALES Y COMBATE ├⌬*\n`
    + `> 🔫 *Crimen:* ${stCrime}\n`
    + `> 🥷 *Robar:* ${stRob}\n`
    + `> 🛰️ *Asalto Cuántico:* ${stKogenRob}\n`
    + `> ⚔️ *Duelo:* ${stDuel}\n\n`

    + `*⌬┤ 🎰 EXTRAS ├⌬*\n`
    + `> 🎁 *Diario:* ${stDaily}\n`
    + `> 🎡 *Ruleta:* ${rouletteStatus}\n\n`

    + `*╚══⌦ ${config.footer} ⌫══╝*`

  await conn.sendMessage(
    m.chat,
    {
      text: txt,
      mentions: [m.sender]
    },
    { quoted: m }
  )
}

handler.help = ['einfo']
handler.tags = ['eco']
handler.command = ['einfo', 'cooldowns', 'tiempos', 'cd', 'miscd']
handler.register = true

export default handler