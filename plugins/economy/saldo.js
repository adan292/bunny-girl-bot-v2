import { db } from '../../database/db.js'

export default {
  name: ['saldo', 'balance', 'bal'],
  description: 'Muestra tu balance de mai coins',
  category: 'economy',
  ownerOnly: false,

  async run({ sender, senderNum, reply, react }) {
    const eco = db.getEco(sender)
    const total = eco.bolsillo + eco.banco

    await react('💎')
    await reply({
      text: `💎 *Balance de mai coins*\n` +
        `╰━━━━━━(☆)━━━━━━─╮\n\n` +
        `*👜 Bolsillo:* ${eco.bolsillo} mai coins\n` +
        `*🏦 Banco:* ${eco.banco} mai coins\n` +
        `*📊 Total:* ${total} mai coins`
    })
  }
}
