const MAX_CACHE = 2000
const antideleteCache = new Map()

function cacheSet(jid, id, data) {
  const key = `${jid}-${id}`
  antideleteCache.set(key, data)
  if (antideleteCache.size > MAX_CACHE) antideleteCache.delete(antideleteCache.keys().next().value)
}

function cacheGet(jid, id) { return antideleteCache.get(`${jid}-${id}`) }
function cacheDel(jid, id) { antideleteCache.delete(`${jid}-${id}`) }

const handler = async (m, { args, groupDb, usedPrefix, command }) => {
  const modo = args[0]?.toLowerCase()
  if (!['on', '1', 'true', 'activar', 'off', '0', 'false', 'desactivar'].includes(modo)) {
    return m.reply(`*⌬┤ ✙ ├⌬ MODO INVÁLIDO.*\n> Usá: *${usedPrefix}${command} on | off*`)
  }

  const activar = ['on', '1', 'true', 'activar'].includes(modo)
  groupDb.antidelete = activar
  await groupDb.save()

  return m.reply(`*⌬┤ 🗑️ ├⌬ ANTI DELETE ${activar ? 'ACTIVADO' : 'DESACTIVADO'}.*`)
}

handler.before = async (m, { conn, groupDb }) => {
  if (!m.isGroup) return false

  const msg = m.message
  if (msg && m.mtype !== 'protocolMessage' && m.mtype !== 'senderKeyDistributionMessage' && !m.fromMe) {
    cacheSet(m.chat, m.key.id, { sender: m.sender, fromMe: m.fromMe, waMsg: { key: m.key, message: msg } })
  }

  if (m.mtype === 'protocolMessage' && msg?.protocolMessage?.type === 0) {
    const deletedKey = msg.protocolMessage?.key
    if (deletedKey && groupDb?.antidelete) {
      const delJid = deletedKey.remoteJid || m.chat
      const delId = deletedKey.id
      const cached = cacheGet(delJid, delId)

      if (cached && !cached.fromMe) {
        const aviso = `*⌬┤ 🗑️ ├⌬ MENSAJE ELIMINADO*\n> @${cached.sender.split('@')[0]} eliminó este mensaje:`
        try {
          await conn.sendMessage(m.chat, { text: aviso, mentions: [cached.sender] })
          await conn.sendMessage(m.chat, { forward: cached.waMsg })
        } catch {}
        cacheDel(delJid, delId)
      }
    }
    return false
  }

  return false
}

handler.help = ['antidelete <on/off>']
handler.tags = ['group']
handler.command = ['antidel', 'antidelete']
handler.groupOnly = true
handler.adminOnly = true
handler.alwaysBefore = true
handler.noRegister = true

export default handler
