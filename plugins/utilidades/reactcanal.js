export default {
  name: ['reactcanal'],
  description: 'Hace que todos los bots reaccionen a un mensaje de canal',
  category: 'utils',
  ownerOnly: false,

  async run({ sock, args, reply, react }) {
    const link = args[0]
    const emoji = args[1]

    if (!link || !emoji) {
      return await reply({ text: '⚠️ Usa: *.reactcanal <link del mensaje> <emoji>*' })
    }

    const match = link.match(/channel\/([A-Za-z0-9]+)\/(\d+)/)
    if (!match) {
      return await reply({ text: '❌ Ese no es un link válido de mensaje de canal.' })
    }

    const invite = match[1]
    const serverId = match[2]

    await react('🐢')
    await reply({ text: `🐢 *Procesando...* Reaccionando con ${emoji} en todos los bots.` })

    let exito = false

    try {
      // 🔑 newsletterReactMessage necesita el JID real (xxxx@newsletter),
      // no el código corto de invitación de la URL.
      const meta = await sock.newsletterMetadata('invite', invite)
      const canalJid = meta.id

      await sock.newsletterReactMessage(canalJid, serverId, emoji)
      exito = true
    } catch (e) {
      console.error('Error reaccionando al canal:', e)
    }

    try {
      const { broadcastReaccionCanal } = await import('../../core/subbotManager.js')
      broadcastReaccionCanal({ invite, serverId, emoji })
    } catch {
      // si este bot es un subbot, no tiene el manager real -> lo ignoramos
    }

    if (exito) {
      await react('✅')
      await reply({ text: `✅ ¡Listo! Todos los bots están reaccionando con ${emoji}` })
    } else {
      await react('❌')
      await reply({ text: `❌ No se pudo reaccionar al mensaje. Verifica el link.` })
    }
  }
}