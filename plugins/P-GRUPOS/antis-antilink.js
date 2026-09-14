const GROUP_LINK_REGEX = /chat\.whatsapp\.com\/(?:invite\/)?([0-9A-Za-z]{20,24})/i
const CHANNEL_LINK_REGEX = /whatsapp\.com\/channel\/([0-9A-Za-z]{20,24})/i

const channelWarns = new Map()

const handler = async (m, { args, groupDb }) => {
  const option = args[0]?.toLowerCase()

  if (!option) {
    return m.reply(`*⌬┤ 🔗 ├⌬ ANTILINK*\n\n> Estado: ${groupDb.antilink ? '✅ ON' : '❌ OFF'}\n> *Uso:* .antilink on / off`)
  }

  if (['on', '1', 'true', 'activar', 'enable'].includes(option)) {
    if (groupDb.antilink) return m.reply(`*⌬┤ ⚠️ ├⌬ YA ACTIVADO*\n> El antilink ya estaba activado.`)

    groupDb.antilink = true
    await groupDb.save()
    return m.reply(`*⌬┤ ✅ ├⌬ ANTILINK ACTIVADO*\n> Se eliminarán los enlaces de otros grupos y se expulsará al infractor. Enlaces de canales recibirán advertencia.`)

  } else if (['off', '0', 'false', 'desactivar', 'disable'].includes(option)) {
    if (!groupDb.antilink) return m.reply(`*⌬┤ ⚠️ ├⌬ YA DESACTIVADO*\n> El antilink ya estaba desactivado.`)

    groupDb.antilink = false
    await groupDb.save()
    return m.reply(`*⌬┤ ❌ ├⌬ ANTILINK DESACTIVADO*`)

  } else {
    return m.reply(`*⌬┤ ❕ ├⌬ OPCIÓN INVÁLIDA*\n> Usa: .antilink on / off`)
  }
}

handler.before = async (m, { conn, isAdmin, isOwner, isBotAdmin, groupDb }) => {
  if (!m.isGroup || m.fromMe) return false
  if (!groupDb?.antilink) return false
  if (isAdmin || isOwner || !isBotAdmin) return false

  const text = m.body || m.text || ''
  if (!text) return false

  const isGroupLink = GROUP_LINK_REGEX.test(text)
  const isChannelLink = CHANNEL_LINK_REGEX.test(text)

  if (!isGroupLink && !isChannelLink) return false

  if (isGroupLink) {
    const groupMatch = text.match(GROUP_LINK_REGEX)
    if (groupMatch) {
      const linkCode = groupMatch[1]
      const currentCode = await conn.groupInviteCode(m.chat).catch(() => null)
      if (currentCode && linkCode === currentCode) return false
    }

    try {
      await conn.sendMessage(m.chat, { delete: m.key })
      await m.reply(`*⌬┤ 🔗 ENLACE DE GRUPO DETECTADO ├⌬*\n\n> @${m.sender.split('@')[0]}, los enlaces externos no están permitidos. Serás expulsado inmediatamente.`, { mentions: [m.sender] })
      await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove')
    } catch (e) {
      console.error('[ANTILINK GROUP ERROR]', e.message)
    }
    return true
  }

  if (isChannelLink) {
    const key = `${m.chat}:${m.sender}`
    const hasWarning = channelWarns.has(key)

    try {
      await conn.sendMessage(m.chat, { delete: m.key })

      if (!hasWarning) {
        channelWarns.set(key, true)
        await m.reply(`*⌬┤ 📢 ADVERTENCIA DE CANAL ├⌬*\n\n> @${m.sender.split('@')[0]}, los enlaces de canales no están permitidos.\n> Esta es tu *primera advertencia*. Si volvés a enviar otro enlace de canal, serás expulsado del grupo.`, { mentions: [m.sender] })
      } else {
        channelWarns.delete(key)
        await m.reply(`*⌬┤ 🥾 EXPULSIÓN DE CANAL ├⌬*\n\n> @${m.sender.split('@')[0]} fue expulsado por reincidir enviando enlaces de canales de WhatsApp.`, { mentions: [m.sender] })
        await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove')
      }
    } catch (e) {
      console.error('[ANTILINK CHANNEL ERROR]', e.message)
    }
    return true
  }

  return false
}

handler.help = ['antilink <on/off>']
handler.tags = ['group']
handler.command = ['antilink', 'antienlace']
handler.groupOnly = true
handler.adminOnly = true
handler.botAdminOnly = true
handler.alwaysBefore = true
handler.noRegister = true

export default handler