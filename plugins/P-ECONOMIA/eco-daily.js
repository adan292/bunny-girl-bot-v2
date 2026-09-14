import User from '../../lib/database/models/zen-users.js'
import config from '../../config.js'

const handler = async (m, { userDb }) => {
  if (!userDb) return
  const tiempoEspera = 86400000 
  const ahora = Date.now()

  if (ahora - userDb.lastDaily < tiempoEspera) {
    const falta = tiempoEspera - (ahora - userDb.lastDaily)
    return m.reply(`*⌬┤ ⏳ ├⌬ EN ESPERA.*\n> Ya reclamaste tu recompensa diaria.\n> Volvé en *${Math.floor(falta / 3600000)}h y ${Math.floor((falta % 3600000) / 60000)}m*.`)
  }

  const base = 1000
  const bono = userDb.level * 100
  const total = base + bono

  userDb.zenCoins += total
  userDb.lastDaily = ahora

  await User.updateOne({ jid: m.sender }, { $inc: { zenCoins: total }, $set: { lastDaily: ahora } })

  const txt = `*╔═══⌦ ✦ 🎁 DIARIO ✦ ⌫═══╗*\n\n`
            + `> 💰 *Recompensa:* ${base} ${config.CURRENCY_SYMBOL}\n`
            + `> ✨ *Bono Nivel:* ${bono} ${config.CURRENCY_SYMBOL}\n`
            + `> 💵 *Total:* ${total} ${config.CURRENCY_SYMBOL}\n\n`
            + `*╚══⌦ ${config.footer} ⌫══╝*`

  m.reply(txt)
}

handler.help = ['diario']
handler.tags = ['eco']
handler.command = ['daily', 'diario', 'claim']
handler.register = true
export default handler