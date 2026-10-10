import { db } from '../../database/db.js'

export default {
  name: ['depositar', 'retirar'],
  description: 'Mueve mai coins entre bolsillo y banco',
  category: 'economy',
  ownerOnly: false,

  async run({ sender, cmdName, args, reply, react }) {
    const eco = db.getEco(sender)
    const disponible = cmdName === 'depositar' ? eco.bolsillo : eco.banco

    let cantidad
    const arg = (args[0] || '').toLowerCase()

    if (arg === 'all' || arg === 'todo') {
      cantidad = disponible
    } else {
      cantidad = parseInt(args[0])
    }

    if (!cantidad || isNaN(cantidad) || cantidad <= 0) {
      return await reply({ text: `⚠️ Especifica una cantidad válida.\n\n*Ejemplo:* .${cmdName} 500\n*O:* .${cmdName} all` })
    }

    if (cmdName === 'depositar') {
      if (cantidad > eco.bolsillo) {
        return await reply({ text: `❌ No tenés suficientes mai coins en el bolsillo.\n\n*Bolsillo:* ${eco.bolsillo} mai coins` })
      }

      db.setEco(sender, {
        bolsillo: eco.bolsillo - cantidad,
        banco: eco.banco + cantidad
      })

      await react('🏦')
      await reply({
        text: `🏦 *Depósito exitoso*\n\n` +
          `*Depositado:* ${cantidad} mai coins\n` +
          `*Bolsillo:* ${eco.bolsillo - cantidad} mai coins\n` +
          `*Banco:* ${eco.banco + cantidad} mai coins`
      })

    } else if (cmdName === 'retirar') {
      if (cantidad > eco.banco) {
        return await reply({ text: `❌ No tenés suficientes mai coins en el banco.\n\n*Banco:* ${eco.banco} mai coins` })
      }

      db.setEco(sender, {
        bolsillo: eco.bolsillo + cantidad,
        banco: eco.banco - cantidad
      })

      await react('👜')
      await reply({
        text: `👜 *Retiro exitoso*\n\n` +
          `*Retirado:* ${cantidad} mai coins\n` +
          `*Bolsillo:* ${eco.bolsillo + cantidad} mai coins\n` +
          `*Banco:* ${eco.banco - cantidad} mai coins`
      })
    }
  }
}
