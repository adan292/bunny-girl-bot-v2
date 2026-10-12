import { db } from '../../database/db.js'

export default {
  name: ['raid'],
  description: 'Verifica si un número está en soporte (solo owners)',
  category: 'owner',
  ownerOnly: true,

  async run({ sock, from, msg, args, react, reply, sender }) {
    try {
      // verificar permisos: solo owners
      const senderJid = sender || msg.key?.participant || msg.key?.remoteJid
      if (!db.hasRole(senderJid, 'owner')) {
        return await reply({ text: '❌ Acceso denegado. Solo los owners pueden usar este comando.' })
      }

      await react('🕒')

      let target = args.join(' ').trim()

      // si no se pasó argumento, intentar obtener número del mensaje citado
      if (!target) {
        const contextInfo = msg.message?.extendedTextMessage?.contextInfo
        const quoted = contextInfo?.quotedMessage
        if (quoted) {
          // si se respondió a un mensaje, tomar el participante del quoted
          const participant = contextInfo?.participant || contextInfo?.remoteJid
          if (participant) target = participant
        }
      }

      if (!target) {
        await react('❌')
        return await reply({ text: '❌ Debes enviar un número de WhatsApp.\n\nUso: `.raid 5731xxxxxxx`' })
      }

      // Normalizar input: puede venir como @123@s.whatsapp.net, con +, con espacios, o solo números
      function normalize(input) {
        if (!input) return null
        input = input.toString().trim()
        // si ya tiene @... dejar tal cual
        if (input.includes('@')) return input
        // eliminar símbolos y espacios
        const digits = input.replace(/[^0-9]/g, '')
        if (!digits) return null
        return `${digits}@s.whatsapp.net`
      }

      const targetJid = normalize(target)
      if (!targetJid) {
        await react('❌')
        return await reply({ text: '❌ Número inválido. Asegurate de enviar solo el número o responder a un mensaje.' })
      }

      const user = db.getUser(targetJid)

      const isSoporte = !!(user.support || user.soporte || user.inSupport || user.isSupport)

      const pushName = db.getPushName(targetJid) || user.pushName || 'Desconocido'

      if (isSoporte) {
        await react('✅')
        return await reply({ text: `✅ El número *${targetJid.split('@')[0]}* (${pushName}) está en *soporte*.` })
      } else {
        await react('❌')
        return await reply({ text: `❌ El número *${targetJid.split('@')[0]}* (${pushName}) *NO* está en soporte.` })
      }

    } catch (e) {
      console.error('[raid]', e)
      try { await react('❌') } catch {}
      await reply({ text: `❌ Error: ${e?.message || e}` })
    }
  }
}
