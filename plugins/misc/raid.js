import { db } from '../../database/db.js'

const SOPORTE_IMG = 'https://cdn.dix.lat/me/hbat_20261012-r2x1-yrha-cb69.jpg'

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
      const simpleNumber = targetJid.split('@')[0]

      if (isSoporte) {
        // enviar imagen de soporte con caption
        try {
          await sock.sendMessage(from, {
            image: { url: SOPORTE_IMG },
            caption: `✅ El número *${simpleNumber}* (${pushName}) está en *soporte*.`
          }, { quoted: msg })
          await react('✅')
          return
        } catch (err) {
          console.error('[raid] fallo al enviar imagen de soporte, cayendo a texto:', err)
          await react('⚠️')
          // seguir y enviar mensaje de texto
        }
      }

      // si no es soporte o falló el envío de imagen
      if (isSoporte) {
        await react('✅')
        return await reply({ text: `✅ El número *${simpleNumber}* (${pushName}) está en *soporte*.` })
      } else {
        await react('❌')
        return await reply({ text: `❌ El número *${simpleNumber}* (${pushName}) *NO* está en soporte.` })
      }

    } catch (e) {
      console.error('[raid]', e)
      try { await react('❌') } catch {}
      await reply({ text: `❌ Error: ${e?.message || e}` })
    }
  }
}
