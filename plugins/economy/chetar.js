import { db } from '../../database/db.js'

export default {
  name: ['chetar', 'cheat'],
  description: 'Otorga una gran cantidad de Fragmentos al usuario (solo owners).',
  category: 'economy',
  ownerOnly: true,

  async run({ sender, reply, react }) {
    try {
      const eco = db.getEco(sender)
      const amount = 9999999999999999999n
      const nuevoBolsillo = eco.bolsillo + amount

      db.setEco(sender, { bolsillo: nuevoBolsillo })

      await react('⚡')
      await reply({
        text: `✅ *Cheateado con éxito*\n\n` +
          `+${amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')} Fragmentos añadidos a tu bolsillo.\n` +
          `👜 Bolsillo actual: ${nuevoBolsillo.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')} Fragmentos`
      })
    } catch (e) {
      console.error('Error en comando chetar:', e)
      await reply({ text: `❌ Ocurrió un error al chetar: ${e.message}` })
    }
  }
}
