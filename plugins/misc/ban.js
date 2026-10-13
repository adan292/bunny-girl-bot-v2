import { db } from '../../database/db.js'
import config from '../../config.js'

export default {
  name: ['ban'],
  description: 'Enviar un número a soporte (owner-only). Marca al usuario como soporte y notifica a los owners.',
  category: 'owner',
  ownerOnly: true,

  async run({ sock, from, msg, args, react, reply, sender }) {
    try {
      const senderJid = sender || msg.key?.participant || msg.key?.remoteJid
      if (!db.hasRole(senderJid, 'owner')) {
        return await reply({ text: '❌ Acceso denegado. Solo los owners pueden usar este comando.' })
      }

      await react('🕒')

      const input = args.join(' ').trim()

      // intentar obtener número del mensaje citado si no hay args
      let target = input
      if (!target) {
        const ctx = msg.message?.extendedTextMessage?.contextInfo
        const quoted = ctx?.quotedMessage
        if (quoted) {
          target = ctx?.participant || ctx?.remoteJid
        }
      }

      if (!target) {
        await react('❌')
        return await reply({
          text: '❌ Debes especificar un número.\n\nUso: `.ban 5731xxxxxxx` o responde a un mensaje con `.ban`'
        })
      }

      const normalize = (value) => {
        if (!value) return null
        const text = value.toString().trim()
        if (text.includes('@')) return text
        const digits = text.replace(/\D/g, '')
        if (!digits) return null
        return `${digits}@s.whatsapp.net`
      }

      const targetJid = normalize(target)
      if (!targetJid) {
        await react('❌')
        return await reply({ text: '❌ Número inválido.' })
      }

      // marcar en DB como soporte
      db.setUser(targetJid, { support: true })

      const simpleNumber = targetJid.split('@')[0]
      const user = db.getUser(targetJid)
      const pushName = db.getPushName(targetJid) || user?.pushName || 'Desconocido'

      // notificar a todos los owners configurados
      const owners = Array.isArray(config.ownerNumber) ? config.ownerNumber : []
      const notifyText =
        `📣 *Notificación de Soporte*\n\n` +
        `El número *${simpleNumber}* (${pushName}) ha sido enviado a *soporte* por *@${(senderJid || '').split('@')[0]}*.\n\n` +
        `Usa *.raid ${simpleNumber}* para revisar o controlar esta cuenta.`

      for (const num of owners) {
        const ownerJid = `${num}@s.whatsapp.net`
        try {
          await sock.sendMessage(ownerJid, { text: notifyText, mentions: [ownerJid, targetJid] })
        } catch (err) {
          console.error('[ban] fallo al notificar owner', ownerJid, err?.message || err)
        }
      }

      await react('✅')
      return await reply({ text: `✅ Número *${simpleNumber}* enviado a soporte.` })

    } catch (e) {
      console.error('[ban]', e)
      try { await react('❌') } catch {}
      await reply({ text: `❌ Error: ${e?.message || e}` })
    }
  }
}
