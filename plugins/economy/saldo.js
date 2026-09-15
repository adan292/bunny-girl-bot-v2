import { db } from '../../database/db.js'

export default {
  name: ['saldo', 'balance', 'bal'],
  description: 'Muestra tu balance de Fragmentos',
  category: 'economy',
  ownerOnly: false,

  async run({ sender, senderNum, reply, react }) {
    const eco = db.getEco(sender)
    const total = eco.bolsillo + eco.banco

    await react('💎')
    await reply({
      text: `💎 *Balance de Fragmentos*\n` +
        `╰━━━━━━(☆)━━━━━━─╮\n\n` +
        `*👜 Bolsillo:* ${eco.bolsillo} Fragmentos\n` +
        `*🏦 Banco:* ${eco.banco} Fragmentos\n` +
        `*📊 Total:* ${total} Fragmentos`
    })
  }
}