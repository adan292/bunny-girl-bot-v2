import { db } from '../../database/db.js'

export default {
  name: ['chetar', 'cheat'],
  description: 'Otorga una gran cantidad de Fragmentos al usuario (solo owners).',
  category: 'economy',
  ownerOnly: true,

  async run({ sender, reply, react }) {
    try {
      const eco = db.getEco(sender)

      // Cantidad solicitada (BigInt)
      const amount = BigInt('9999999999999999999')

      // Obtener bolsillo actual y convertir a BigInt (soporta number o string)
      const rawBolsillo = eco.bolsillo ?? 0
      let bolsilloBig
      if (typeof rawBolsillo === 'string') {
        // si está vacío o no es numérico, default a 0
        bolsilloBig = rawBolsillo === '' ? 0n : BigInt(rawBolsillo)
      } else {
        // número (por ejemplo 0 o 50000000)
        bolsilloBig = BigInt(Math.trunc(Number(rawBolsillo) || 0))
      }

      const nuevoBolsillo = bolsilloBig + amount

      // Guardar como string para que JSON/SQLite no rompan con BigInt
      db.setEco(sender, { bolsillo: nuevoBolsillo.toString() })

      // Formateador de miles (usa comas)
      const format = (big) => {
        const s = big.toString()
        return s.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      }

      await react('⚡')
      await reply({
        text:
          `✅ *Cheateado con éxito*\n\n` +
          `+${format(amount)} Fragmentos añadidos a tu bolsillo.\n` +
          `👜 Bolsillo actual: ${format(nuevoBolsillo)} Fragmentos`
      })
    } catch (e) {
      console.error('Error en comando chetar:', e)
      await reply({ text: `❌ Ocurrió un error al chetar: ${e.message}` })
    }
  }
}
