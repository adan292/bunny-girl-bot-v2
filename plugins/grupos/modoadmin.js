import { db } from '../../database/db.js'

export default {
  name: ['modoadmin'],
  description: 'Activa o desactiva el modo solo-admins en el grupo',
  category: 'grupos',
  groupOnly: true,
  adminOnly: true,

  async run({ from, args, reply }) {
    const opcion = args[0]?.toLowerCase()

    if (opcion !== 'on' && opcion !== 'off') {
      return await reply({ text: '⚠️ Usa: *.modoadmin on* o *.modoadmin off*' })
    }

    const activar = opcion === 'on'
    db.setGroup(from, { adminMode: activar })

    await reply({
      text: activar
        ? '🔒 *Modo admin activado.* Solo admins, owner y coowners pueden usar comandos en este grupo.'
        : '🔓 *Modo admin desactivado.* Todos los usuarios pueden usar comandos de nuevo.'
    })
  }
}