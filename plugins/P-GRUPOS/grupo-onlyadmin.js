import GroupDb from '../../lib/database/models/zen-groups.js'
import { groupDbCache } from '../../lib/caches.js'

async function actualizarGroupDb(groupDb, updates) {
  Object.assign(groupDb, updates)
  await GroupDb.findOneAndUpdate(
    { id: groupDb.id },
    { $set: updates },
    { upsert: true }
  )
  groupDbCache.set(groupDb.id, groupDb)
}

const handler = async (m, { conn, args, command, usedPrefix, isAdmin, isOwner, groupDb }) => {
  const senderNum = m.sender.split('@')[0]
  const esSubBotDueno = conn.isSubBot && senderNum === conn.ownerNumber
  const puedeUsar = isAdmin || isOwner || esSubBotDueno

  if (!puedeUsar) {
    return m.reply(`*⌬┤ ❌ ├⌬ SIN PERMISOS*\n> Solo admins o el dueño del bot pueden usar este comando.`)
  }

  const newState = !groupDb.onlyadmin
  await actualizarGroupDb(groupDb, { onlyadmin: newState })

  return m.reply(
    `*⌬┤ 👤 MODERACIÓN DE GRUPO ├⌬*\n\n` +
    `> El modo *Solo Administradores* ha sido: *${newState ? 'ACTIVADO ✅' : 'DESACTIVADO ❌'}*.\n` +
    `> ${newState ? 'Ahora solo los admins y owners pueden usar comandos en este grupo.' : 'Todos los integrantes pueden usar comandos libremente.'}`
  )
}

handler.help = ['onlyadmin — Activa o desactiva comandos solo para admins']
handler.tags = ['jadibot']
handler.command = ['onlyadmin', 'soloadmin', 'adminonly']
handler.groupOnly = true
handler.noRegister = true

export default handler