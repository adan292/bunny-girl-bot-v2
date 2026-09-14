import User, { RANGOS } from './database/models/zen-users.js'

const xpBuffer = new Map()
let flushTimer = null

async function getBuffer(url) {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error) {
    return null
  }
}

function scheduleFlush() {
  if (flushTimer) return
  flushTimer = setTimeout(async () => {
    flushTimer = null
    const entries = [...xpBuffer.entries()]
    xpBuffer.clear()
    await Promise.allSettled(
      entries.map(([jid, xp]) =>
        User.updateOne({ jid }, { $inc: { xp } })
      )
    )
  }, 10000)
}

export async function checkDailyReset(jid) {
  const ahora = Date.now()

  const user = await User.findOne({ jid }, {
    registered: 1, dailyStats: 1, bankBalance: 1, bankExpiry: 1
  }).lean()

  if (!user?.registered) return null

  const needsDailyReset = ahora - user.dailyStats.lastReset > 86400000
  const needsBankExpiry = user.bankBalance > 0 && user.bankExpiry > 0 && ahora > user.bankExpiry

  if (!needsDailyReset && !needsBankExpiry) return null

  const updates = { $set: {} }

  if (needsDailyReset) {
    Object.assign(updates.$set, {
      'dailyStats.workCount':     0,
      'dailyStats.mineCount':     0,
      'dailyStats.crimeCount':    0,
      'dailyStats.rouletteCount': 0,
      'dailyStats.suitUsed':      false,
      'dailyStats.maskUsed':      false,
      'dailyStats.swordUsed':     false,
      'dailyStats.buy_mythic':    0,
      'dailyStats.buy_rare':      0,
      'dailyStats.buy_normal':    0,
      'dailyStats.buy_sword':     0,
      'dailyStats.buy_potion':    0,
      'dailyStats.buy_shield':    0,
      'dailyStats.buy_suit':      0,
      'dailyStats.buy_mask':      0,
      'dailyStats.buy_amulet':    0,
      'dailyStats.buy_cosmetic':  0,
      'dailyStats.buy_legendary': 0,
      'dailyStats.transferToday': 0,
      'dailyStats.lastReset':     ahora,
    })
  }

  if (needsBankExpiry) {
    updates.$inc = { zenCoins: user.bankBalance }
    updates.$set.bankBalance = 0
    updates.$set.bankExpiry  = 0
  }

  return User.findOneAndUpdate({ jid }, updates, { new: true })
}

export async function checkLevelUp(m, conn, userDb) {
  if (!userDb?.registered) return false

  const xpGanado    = Math.floor(Math.random() * 16) + 15
  const xpNecesario = Math.floor(Math.pow(userDb.level, 1.5) * 100) + 200
  const subeNivel   = (userDb.xp + xpGanado) >= xpNecesario

  if (!subeNivel) {
    xpBuffer.set(userDb.jid, (xpBuffer.get(userDb.jid) || 0) + xpGanado)
    scheduleFlush()
    return false
  }

  const recompensa = (userDb.level + 1) * 100
  const updatedUser = await User.findOneAndUpdate(
    { jid: userDb.jid },
    { $inc: { level: 1, zenCoins: recompensa }, $set: { xp: 0 } },
    { new: true }
  )

  const rangoIndex = Math.min(updatedUser.level, RANGOS.length - 1)
  const rangoActual = RANGOS[rangoIndex]
  
  let pfpUrl = await conn.profilePictureUrl(m.sender, 'image').catch(e => {
    console.error('[rpgManager] profilePictureUrl error:', e.message)
    return null
  })
  if (!pfpUrl) pfpUrl = 'https://i.ibb.co/sphnd13T/images-4.jpg'
  const pfpBuffer = await getBuffer(pfpUrl)

  const upTxt = `*┏━━•❈ ✨ LEVEL UP ✨ ❈•━━┓*\n\n> 👤 *Usuario:* @${m.sender.split('@')[0]}\n> 🆙 *Nuevo Nivel:* ${updatedUser.level}\n> 🏆 *Rango:* ${rangoActual}\n> 🎁 *Premio:* ${recompensa} ZenCoins\n\n*┗━━━━•❅•°•❈•°•❅•━━━━┛*`

  await conn.sendMessage(m.chat, { image: pfpBuffer || { url: pfpUrl }, caption: upTxt, mentions: [m.sender] }, { quoted: m })
    .catch(e => console.error('[rpgManager] sendMessage level up error:', e.message))

  return updatedUser
}