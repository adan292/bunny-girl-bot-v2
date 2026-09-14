import * as baileysMod from '@whiskeysockets/baileys'

const pkg = baileysMod.default && Object.keys(baileysMod).length === 1 ? baileysMod.default : baileysMod
const { jidNormalizedUser } = pkg

const handler = async (m, { conn, text, usedPrefix, participants }) => {
  let num = text ? text.replace(/[^0-9]/g, '') : ''
  
  if (!num) {
    return m.reply(`*⌬┤ ⚠️ ├⌬ NÚMERO REQUERIDO.*\n\n> Uso: ${usedPrefix}agregar <número sin +>`)
  }

  const targetJid = jidNormalizedUser(`${num}@s.whatsapp.net`)
  const isAlreadyInGroup = participants.some(p => p.id === targetJid)

  if (isAlreadyInGroup) {
    return m.reply('*⌬┤ ⚠️ · El usuario ya está dentro del grupo.*')
  }

  try {
    const res = await conn.groupParticipantsUpdate(m.chat, [targetJid], 'add')
    const status = res?.[targetJid] || res?.[0]?.[targetJid] || (res?.[0] ? res[0] : null)

    if (status === '403' || status === '401' || status?.status === '403' || status?.status === '401') {
      const code = await conn.groupInviteCode(m.chat)
      return m.reply(`*⌬┤ 🔒 PRIVACIDAD ACTIVADA ├⌬*\n\n> @${num} tiene configurada su privacidad para no ser añadido de forma directa.\n> Enlace de invitación enviado:\n> https://chat.whatsapp.com/${code}`, { mentions: [targetJid] })
    }

    m.reply(`*⌬┤ ✅ ├⌬ USUARIO AGREGADO*\n\n> @${num} ha sido añadido con éxito al grupo.`, { mentions: [targetJid] })

  } catch (e) {
    const errorStr = String(e?.stack || e?.message || e)
    const isRestricted = errorStr.includes('reachout') || errorStr.includes('restricted') || e?.data === 463 || e?.statusCode === 463

    if (isRestricted) {
      try {
        const code = await conn.groupInviteCode(m.chat)
        return m.reply(`*⌬┤ 🔒 RESTRICCIÓN DE CONTACTO ├⌬*\n\n> WhatsApp tiene restringida temporalmente la capacidad del bot de añadir contactos directamente.\n> Por favor, compartile este enlace para que se una voluntariamente:\n> https://chat.whatsapp.com/${code}`)
      } catch {
        return m.reply(`*⌬┤ 🔒 RESTRICCIÓN DE CONTACTO ├⌬*\n\n> WhatsApp tiene restringida temporalmente la capacidad del bot de añadir contactos directamente. Comparte un enlace de invitación manual.`)
      }
    }

    console.error(e)
    m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n\n> No se pudo agregar al usuario. Comprobá si el número es válido y tiene cuenta de WhatsApp activa.`)
  }
}

handler.help = ['agregar @tag']
handler.tags = ['group']
handler.command = ['add', 'agregar', 'añadir', 'invitar']
handler.groupOnly = true
handler.adminOnly = true
handler.botAdminOnly = true
handler.noRegister = true

export default handler