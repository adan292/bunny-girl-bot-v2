const MEDIA_CONFIG = {
  antinotadevoz: { emoji: '🎙️', name: 'ANTI NOTA DE VOZ', dbKey: 'antinotadevoz', msg: 'las notas de voz' },
  antisticker:   { emoji: '🎭', name: 'ANTI STICKER', dbKey: 'antisticker', msg: 'los stickers' },
  antivideo:     { emoji: '🎬', name: 'ANTI VIDEO', dbKey: 'antivideo', msg: 'los videos' },
  antiimagen:    { emoji: '🖼️', name: 'ANTI IMAGEN', dbKey: 'antiimagen', msg: 'las imágenes' },
}

const handler = async (m, { args, groupDb, usedPrefix, command }) => {
  const conf = MEDIA_CONFIG[command]
  if (!conf) return

  const modo = args[0]?.toLowerCase()
  if (!['on', '1', 'true', 'activar', 'off', '0', 'false', 'desactivar'].includes(modo)) {
    return m.reply(`*⌬┤ ✙ ├⌬ MODO INVÁLIDO.*\n> Usá: *${usedPrefix}${command} on | off*`)
  }

  const activar = ['on', '1', 'true', 'activar'].includes(modo)
  groupDb[conf.dbKey] = activar
  await groupDb.save()
  
  return m.reply(`*⌬┤ ${conf.emoji} ├⌬ ${conf.name} ${activar ? 'ACTIVADO' : 'DESACTIVADO'}.*`)
}

handler.before = async (m, { conn, isAdmin, isOwner, groupDb }) => {
  if (!m.isGroup || m.fromMe || isAdmin || isOwner || !groupDb || !m.mtype) return false

  const sender = m.sender
  const nombre = sender.split('@')[0]

  const checks = [
    { flag: 'antinotadevoz', match: m.mtype === 'audioMessage' && m.msg?.ptt === true },
    { flag: 'antisticker', match: m.mtype === 'stickerMessage' },
    { flag: 'antivideo', match: m.mtype === 'videoMessage' && !m.msg?.gifPlayback },
    { flag: 'antiimagen', match: m.mtype === 'imageMessage' },
  ]
  
  for (const { flag, match } of checks) {
    if (!match || !groupDb[flag]) continue
    const conf = MEDIA_CONFIG[flag]
    
    try { await conn.sendMessage(m.chat, { delete: m.key }) } catch {}
    await conn.sendMessage(m.chat, { text: `*⌬┤ ${conf.emoji} ├⌬ ELIMINADO.*\n> @${nombre}, ${conf.msg} no están permitidos en este grupo.`, mentions: [sender] })
    return true
  }

  return false
}

handler.help = ['antinotadevoz', 'antisticker', 'antivideo', 'antiimagen']
handler.tags = ['group']
handler.command = ['antinotadevoz', 'antisticker', 'antivideo', 'antiimagen']
handler.groupOnly = true
handler.adminOnly = true
handler.alwaysBefore = true
handler.noRegister = true

export default handler