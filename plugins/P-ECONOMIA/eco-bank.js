import User from '../../lib/database/models/zen-users.js'
import config from '../../config.js'

const handler = async (m, { text, usedPrefix, command, userDb }) => {
  if (!userDb) return
  const args = text.trim().split(/\s+/)
  const now = Date.now()

  if (userDb.bankBalance > 0 && userDb.bankExpiry > 0 && now > userDb.bankExpiry) {
    const amount = userDb.bankBalance
    userDb.zenCoins += amount
    userDb.bankBalance = 0
    userDb.bankExpiry = 0
    await User.updateOne({ jid: m.sender }, { $inc: { zenCoins: amount }, $set: { bankBalance: 0, bankExpiry: 0 } })
  }

  if (['d', 'dep', 'depositar'].includes(command)) {
    let inputMonto = args[0]
    let horas = parseInt(args[1])

    if (!inputMonto || isNaN(horas) || horas <= 0) {
      return m.reply(`*⌬┤ 🏦 ├⌬ MODO DEPÓSITO*\n\n> *Uso:* ${usedPrefix + command} <monto|all> <horas>\n> 🧾 *Costo:* 1 ${config.PREMIUM_SYMBOL} por hora.\n\n> *Ejemplo:* ${usedPrefix + command} all 24`)
    }

    let monto = ['all', 'todo'].includes(inputMonto.toLowerCase()) ? userDb.zenCoins : parseInt(inputMonto)

    if (isNaN(monto) || monto <= 0) return m.reply('*⌬┤ ⚠️ · MONTO INVÁLIDO.*')
    if (userDb.zenCoins < monto) return m.reply('*⌬┤ ❌ · DINERO INSUFICIENTE EN BILLETERA.*')
    if (userDb.kogen < horas) return m.reply(`*⌬┤ ❌ ├⌬ ${config.PREMIUM_NAME.toUpperCase()}S INSUFICIENTES.* Necesitás ${horas} ${config.PREMIUM_SYMBOL}.`)

    const baseProteccion = userDb.bankExpiry > now ? userDb.bankExpiry : now
    const nuevaExpiracion = baseProteccion + (horas * 3600000)

    userDb.zenCoins -= monto
    userDb.kogen -= horas
    userDb.bankBalance += monto
    userDb.bankExpiry = nuevaExpiracion

    await User.updateOne({ jid: m.sender }, {
      $inc: { zenCoins: -monto, kogen: -horas, bankBalance: monto },
      $set: { bankExpiry: nuevaExpiracion }
    })

    const fecha = new Date(nuevaExpiracion).toLocaleString('es-AR')
    return m.reply(`*╔═══⌦ ✦ 🏦 DEPÓSITO ✦ ⌫═══╗*\n\n> 💰 *Monto:* ${monto} ${config.CURRENCY_SYMBOL}\n> ⏳ *Horas:* ${horas}\n> ${config.PREMIUM_SYMBOL} *Costo:* ${horas} ${config.PREMIUM_SYMBOL}\n\n> 🛡️ *Protegido hasta:* ${fecha}\n*╚══⌦ ${config.footer} ⌫══╝*`)
  }

  if (['r', 'retirar', 'with'].includes(command)) {
    let inputMonto = args[0]
    if (!inputMonto) return m.reply(`*⌬┤ 🏦 ├⌬ USO:* ${usedPrefix + command} <monto|all>`)

    let monto = ['all', 'todo'].includes(inputMonto.toLowerCase()) ? userDb.bankBalance : parseInt(inputMonto)

    if (isNaN(monto) || monto <= 0) return m.reply('*⌬┤ ⚠️ · MONTO INVÁLIDO.*')
    if (userDb.bankBalance < monto) return m.reply('*⌬┤ ❌ · SALDO BANCARIO INSUFICIENTE.*')

    userDb.bankBalance -= monto
    userDb.zenCoins += monto

    await User.updateOne({ jid: m.sender }, { $inc: { bankBalance: -monto, zenCoins: monto } })
    return m.reply(`*⌬┤ ✅ ├⌬ RETIRO EXITOSO*\n> Sacaste **${monto}** ${config.CURRENCY_SYMBOL} de tu cuenta bancaria hacia tu billetera.`)
  }
}

handler.help = ['depositar <monto> <horas>', 'retirar <monto>']
handler.tags = ['eco']
handler.command = ['d', 'dep', 'depositar', 'r', 'retirar', 'with']
handler.register = true
export default handler