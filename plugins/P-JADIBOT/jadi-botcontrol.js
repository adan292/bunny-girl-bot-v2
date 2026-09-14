import GroupDb from '../../lib/database/models/zen-groups.js'
import { groupDbCache } from '../../lib/caches.js'
import { subBots } from '../../lib/jadibot.js'

const myNum = (conn) => normalizarNum((conn.user?.id || '').split(':')[0].split('@')[0])

function normalizarNum(n) {
  if (!n) return ''
  n = n.replace(/\D/g, '')
  if (n.startsWith('549')) n = '54' + n.slice(3)
  if (n.startsWith('521')) n = '52' + n.slice(3)
  return n
}

function resolverNumeroBot(m, args, conn) {
  if (m.mentionedJid?.length) return normalizarNum(m.mentionedJid[0].split('@')[0])
  if (m.quoted?.sender) return normalizarNum(m.quoted.sender.split('@')[0])
  const primer = (args[0] || '').replace(/\D/g, '')
  if (primer.length > 5) return normalizarNum(primer)
  return myNum(conn)
}

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
  const esAdminUOwer = isAdmin || isOwner

  const esSubBotDuenoDeOtro = !conn.isSubBot && [...subBots.keys()].includes(senderNum)
  if (esSubBotDuenoDeOtro) return

  if (!esAdminUOwer && !esSubBotDueno) {
    return m.reply(`*⌬┤ ❌ ├⌬ SIN PERMISOS*\n> Solo los administradores o el dueño principal del bot pueden usar este comando.`)
  }

  const cmd = command
  const primerArg = (args[0] || '').toLowerCase()
  const esMainBot = !conn.isSubBot

  if (cmd === 'bot' || cmd === 'boton') {
    if (!esAdminUOwer && esSubBotDueno) {
      const myNumber = myNum(conn)
      const actuales = groupDb.disabledBots || []
      if (!actuales.includes(myNumber)) {
        return m.reply(`*⌬┤ ℹ️ ├⌬ YA ACTIVO*\n> Tu sub-bot (+${myNumber}) ya está activo en este grupo.`)
      }
      const nuevosDisabled = actuales.filter(n => n !== myNumber)
      await actualizarGroupDb(groupDb, { disabledBots: nuevosDisabled })
      return m.reply(`*⌬┤ ✅ ├⌬ SUB-BOT ACTIVADO*\n> Tu sub-bot (+${myNumber}) ha sido reactivado en este grupo.`)
    }

    if (primerArg === 'todos') {
      await actualizarGroupDb(groupDb, { disabledBots: [], mainBotSleeping: false, primaryBot: '' })
      return m.reply(`*⌬┤ ✅ ├⌬ TODOS ACTIVADOS*\n> Todos los bots están activos nuevamente en este grupo.`)
    }

    const numero = resolverNumeroBot(m, args, conn)
    const actuales = groupDb.disabledBots || []
    const nuevosDisabled = actuales.filter(n => n !== numero && n !== 'todos')

    if (actuales.length === nuevosDisabled.length && !actuales.includes('todos')) {
      return m.reply(`*⌬┤ ℹ️ ├⌬ YA ACTIVO*\n> El bot +${numero} ya está activo en este grupo.`)
    }

    await actualizarGroupDb(groupDb, { disabledBots: nuevosDisabled })
    return m.reply(`*⌬┤ ✅ ├⌬ ACTIVADO*\n> El bot +${numero} está activo nuevamente en este grupo.`)
  }

  if (cmd === 'botoff') {
    if (!esAdminUOwer && esSubBotDueno) {
      const myNumber = myNum(conn)
      const actuales = groupDb.disabledBots || []
      if (actuales.includes(myNumber)) {
        return m.reply(`*⌬┤ ℹ️ ├⌬ YA INACTIVO*\n> Tu sub-bot (+${myNumber}) ya está inactivo en este grupo.`)
      }
      const nuevosDisabled = [...actuales.filter(n => n !== 'todos'), myNumber]
      await actualizarGroupDb(groupDb, { disabledBots: nuevosDisabled })
      return m.reply(`*⌬┤ 🔕 ├⌬ SUB-BOT DESACTIVADO*\n> Tu sub-bot (+${myNumber}) ha sido silenciado en este grupo.`)
    }

    if (primerArg === 'todos') {
      await actualizarGroupDb(groupDb, { disabledBots: ['todos'] })
      return m.reply(
        `*⌬┤ 🔕 ├⌬ TODOS DESACTIVADOS*\n` +
        `> Todos los sub-bots han sido silenciados en este grupo.\n` +
        `> Usá *${usedPrefix}bot todos* para reactivarlos.`
      )
    }

    const numero = resolverNumeroBot(m, args, conn)
    const mainBotNumber = conn.isSubBot ? conn.mainBotNumber : normalizarNum(conn.user.id.split(':')[0].split('@')[0])

    if (numero === mainBotNumber) {
      return m.reply(
        `*⌬┤ ⚠️ ├⌬ ACCIÓN INVÁLIDA*\n` +
        `> El bot principal no puede desactivarse por sí solo.\n` +
        `> Para silenciarlo en este grupo, asigná un sub-bot como principal con *${usedPrefix}principal @bot*.`
      )
    }

    const actuales = groupDb.disabledBots || []
    if (actuales.includes(numero)) {
      return m.reply(`*⌬┤ ℹ️ ├⌬ YA INACTIVO*\n> El bot +${numero} ya estaba desactivado en este grupo.`)
    }

    const nuevosDisabled = [...actuales.filter(n => n !== 'todos'), numero]
    await actualizarGroupDb(groupDb, { disabledBots: nuevosDisabled })
    return m.reply(
      `*⌬┤ 🔕 ├⌬ DESACTIVADO*\n` +
      `> El bot +${numero} fue silenciado en este grupo.\n` +
      `> Usá *${usedPrefix}bot @bot* para reactivarlo.`
    )
  }

  if (cmd === 'principal' || cmd === 'setprimary') {
    if (!esAdminUOwer) {
      return m.reply(`*⌬┤ ❌ ├⌬ SIN PERMISOS*\n> Solo los administradores o el dueño principal pueden cambiar el bot principal del grupo.`)
    }

    if (['off', 'none', 'todos', 'quitar', 'reset'].includes(primerArg)) {
      if (!groupDb.primaryBot) {
        return m.reply(`*⌬┤ ℹ️ ├⌬ SIN BOT PRINCIPAL*\n> No había ningún bot asignado como principal en este grupo.`)
      }
      await actualizarGroupDb(groupDb, { primaryBot: '' })
      return m.reply(`*⌬┤ ✅ ├⌬ BOT PRINCIPAL QUITADO*\n> Todos los bots responderán normalmente en este grupo.`)
    }

    const numero = resolverNumeroBot(m, args, conn)

    if (!numero || numero.length < 5) {
      return m.reply(
        `*⌬┤ ℹ️ ├⌬ USO CORRECTO:*\n` +
        `> *${usedPrefix}principal @bot* — etiquetá al bot a asignar.\n` +
        `> *${usedPrefix}principal* respondiendo a un mensaje del bot.\n` +
        `> *${usedPrefix}principal off* — quita el bot principal.`
      )
    }

    if (groupDb.primaryBot === numero) {
      return m.reply(`*⌬┤ ℹ️ ├⌬ YA ES PRINCIPAL*\n> El bot +${numero} ya es el principal en este grupo.`)
    }

    await actualizarGroupDb(groupDb, { primaryBot: numero })
    return m.reply(
      `*⌬┤ 👑 ├⌬ BOT PRINCIPAL ASIGNADO*\n` +
      `> El bot +${numero} es ahora el único que responderá en este grupo.\n` +
      `> Los demás bots ignoran este grupo pero siguen activos en otros chats.\n` +
      `> Para quitar: *${usedPrefix}principal off*`
    )
  }
}

handler.help = [
  'bot [todos / @bot]',
  'botoff [todos / @bot]',
  'principal [@bot / off]',
]
handler.tags = ['jadibot']
handler.command = ['bot', 'boton', 'botoff', 'principal', 'setprimary']
handler.groupOnly = true
handler.noRegister = true
export default handler