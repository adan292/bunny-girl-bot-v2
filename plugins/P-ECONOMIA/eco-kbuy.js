import User from '../../lib/database/models/zen-users.js'
import config from '../../config.js'

const handler = async (m, { args, usedPrefix, command, userDb }) => {
  if (!userDb) return
  const price = config.kogenPrice || 1000

  if (!args[0]) {
    return m.reply(`*╔═══⌦ ✦ 🛒 ${config.PREMIUM_NAME.toUpperCase()} SHOP ✦ ⌫═══╗*\n\n`
      + `> 💵 *Precio:* ${price} ${config.CURRENCY_SYMBOL} = 1 ${config.PREMIUM_SYMBOL}\n`
      + `> ✍️ *Uso:* ${usedPrefix + command} <cantidad>\n`
      + `> 💡 *Tip:* Podés usar *${usedPrefix + command} all*\n\n`
      + `*╚══⌦ ${config.footer} ⌫══╝*`)
  }

  let amount = args[0].toLowerCase() === 'all' 
    ? Math.floor(userDb.zenCoins / price) 
    : parseInt(args[0])

  if (isNaN(amount) || amount <= 0) return m.reply('*⌬┤ ⚠️ · CANTIDAD INVÁLIDA.*')

  const totalCost = amount * price
  if (userDb.zenCoins < totalCost) return m.reply(`*⌬┤ ❌ ├⌬ FONDOS INSUFICIENTES.*\n> Necesitás ${totalCost} ${config.CURRENCY_SYMBOL} para comprar ${amount} ${config.PREMIUM_SYMBOL}.`)

  userDb.zenCoins -= totalCost
  userDb.kogen += amount
  
  await User.updateOne({ jid: m.sender }, { $inc: { zenCoins: -totalCost, kogen: amount } })

  m.reply(`*⌬┤ ✅ ├⌬ COMPRA EXITOSA*\n\n> 📥 *Obtenido:* ${amount} ${config.PREMIUM_SYMBOL}\n> 📤 *Costo:* ${totalCost} ${config.CURRENCY_SYMBOL}`)
}

handler.help = ['kbuy <cantidad/all>']
handler.tags = ['eco']
handler.command = ['kbuy', 'buykogen']
handler.register = true
export default handler