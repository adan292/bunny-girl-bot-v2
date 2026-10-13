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
        return await reply({ text: '❌ Debes especificar un número.

Uso: `.ban 5731xxxxxxx` o responde a un mensaje con `.ban`' })
      }

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
        return await reply({ text: '❌ Número inválido.' })
      }

      // marcar en DB como soporte
      db.setUser(targetJid, { support: true })

      const simpleNumber = targetJid.split('@')[0]
      const pushName = db.getPushName(targetJid) || db.getUser(targetJid).pushName || 'Desconocido'

      // notificar a todos los owners configurados
      const owners = Array.isArray(config.ownerNumber) ? config.ownerNumber : []
      const notifyText = `📣 *Notificación de Soporte*\n\nEl número *${simpleNumber}* (${pushName}) ha sido enviado a *soporte* por @${senderJid.split('@')[0]}.\n\nUsa *.raid ${simpleNumber}* para comprobar su estado.`

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
