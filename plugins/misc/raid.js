import { db } from '../../database/db.js'

const SOPORTE_IMG = 'https://cdn.dix.lat/me/hbat_20261012-r2x1-yrha-cb69.jpg'
const NO_SOPORTE_IMG = 'https://cdn.dix.lat/me/qif4_20261012-r2x1-t6qq-81b5.jpg'

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
        if (input.includes('@')) return input
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

      const imageUrl = isSoporte ? SOPORTE_IMG : NO_SOPORTE_IMG
      const caption = isSoporte
        ? `✅ El número *${simpleNumber}* (${pushName}) está en *soporte*.`
        : `❌ El número *${simpleNumber}* (${pushName}) *NO* está en soporte.`

      try {
        await sock.sendMessage(from, {
          image: { url: imageUrl },
          caption
        }, { quoted: msg })
        await react(isSoporte ? '✅' : '❌')
        return
      } catch (err) {
        console.error('[raid] fallo al enviar imagen, cayendo a texto:', err)
        await react('⚠️')
        return await reply({ text: caption })
      }
    } catch (e) {
      console.error('[raid]', e)
      try { await react('❌') } catch {}
      await reply({ text: `❌ Error: ${e?.message || e}` })
    }
  }
}
