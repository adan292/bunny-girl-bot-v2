import { db } from '../../database/db.js'

export default {
  name: ['chetar', 'cheat'],
  description: 'Otorga 50,000,000 de Fragmentos al usuario (solo owners).',
  category: 'economy',
  ownerOnly: true,

  async run({ sender, reply, react }) {
    try {
      const eco = db.getEco(sender)
      const amount = 50000000
      const nuevoBolsillo = (eco.bolsillo || 0) + amount

      db.setEco(sender, { bolsillo: nuevoBolsillo })

      await react('⚡')
      await reply({
        text: `✅ *Cheateado con éxito*

` +
              `+${amount.toLocaleString()} Fragmentos añadidos a tu bolsillo.
` +
              `👜 Bolsillo actual: ${nuevoBolsillo.toLocaleString()} Fragmentos`
      })
    } catch (e) {
      console.error('Error en comando chetar:', e)
      await reply({ text: `❌ Ocurrió un error al chetar: ${e.message}` })
    }
  }
}
