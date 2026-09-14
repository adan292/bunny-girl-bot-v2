const CONFIGS = [
  { key: 'antilink', emoji: '🔗', name: 'ANTI LINK' },
  { key: 'antinotadevoz', emoji: '🎙️', name: 'ANTI NOTA DE VOZ' },
  { key: 'antimenciongp', emoji: '📢', name: 'ANTI ETIQUETA DE ESTADO' },
  { key: 'antisticker', emoji: '🎭', name: 'ANTI STICKER' },
  { key: 'antivideo', emoji: '🎬', name: 'ANTI VIDEO' },
  { key: 'antiimagen', emoji: '🖼️', name: 'ANTI IMAGEN' },
  { key: 'antidelete', emoji: '🗑️', name: 'ANTI DELETE' },
  { key: 'antitoxic', emoji: '🚫', name: 'ANTI TOXIC' }
]

const handler = async (m, { groupDb, groupMetadata, usedPrefix }) => {
  const grupoName = groupMetadata?.subject || 'este grupo'
  let texto = `*⌬┤ 🛡️ ├⌬ PANEL DE PROTECCIÓN*\n> Grupo: *${grupoName}*\n\n`
  
  for (const conf of CONFIGS) {
    const estado = groupDb[conf.key] ? '🟢 ON' : '🔴 OFF'
    texto += `*${conf.emoji} ${conf.name}* [${estado}]\n> _${usedPrefix}${conf.key} on/off_\n\n`
  }
  
  return m.reply(texto.trim())
}

handler.help = ['antis']
handler.tags = ['group']
handler.command = ['antis']
handler.groupOnly = true
handler.adminOnly = true
handler.noRegister = true

export default handler