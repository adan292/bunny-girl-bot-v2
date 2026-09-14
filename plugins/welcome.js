import Group from '../lib/database/models/zen-groups.js'
import { jidNormalizedUser } from '@whiskeysockets/baileys'
import { groupCache, groupDbCache } from '../lib/caches.js'

const DEFAULT_BV = '*╭┈ ✧ ¡BIENVENIDO/A! ✧ ┈*\n*│* 👋🏻 Hola, %user\n*│* ⛩️ Grupo: *%group*\n*│* 👥 Miembro N°: *%count*\n*╰┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈*\n> 🌟 _Disfrutá tu estadía y recordá leer las reglas._'
const DEFAULT_DP = '*╭┈ ✧ ¡HASTA PRONTO! ✧ ┈*\n*│* 🚪 %user ha salido.\n*│* 📉 Quedamos *%count* miembros.\n*╰┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈*\n> 🥀 _Esperamos que vuelvas algún día..._'
const DEFAULT_IMG = 'https://i.ibb.co/sphnd13T/images-4.jpg'

async function getBuffer(url) {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error) {
    return null
  }
}

const parsear = (texto, user, group, count) => {
  const u = (user || '').split('@')[0]
  return (texto || '')
    .replace(/%user/g, `@${u}`)
    .replace(/%group/g, String(group || 'el grupo'))
    .replace(/%count/g, String(count || '?'))
}

const handler = async (m, { conn, args, command, groupDb }) => {
  const option = args[0]?.toLowerCase()
  const text = args.join(' ')

  if (command === 'welcome' || command === 'bienvenida') {
    if (!option) return m.reply(`*⌬┤ ⚙️ ├⌬ CONFIG BIENVENIDA*\n> Estado: ${groupDb.welcome ? '✅ ON' : '❌ OFF'}\n> *Uso:* .welcome on / off`)
    
    if (['on', '1', 'true', 'activar'].includes(option)) {
      groupDb.welcome = true
      await groupDb.save()
      return m.reply(`*⌬┤ ✅ ├⌬ BIENVENIDA ACTIVADA*`)
    } else if (['off', '0', 'false', 'desactivar'].includes(option)) {
      groupDb.welcome = false
      await groupDb.save()
      return m.reply(`*⌬┤ ❌ ├⌬ BIENVENIDA DESACTIVADA*`)
    } else {
      return m.reply(`*⌬┤ ❕ ├⌬ OPCIÓN INVÁLIDA*\n> Usa: .welcome on / off`)
    }
  }

  if (command === 'bye' || command === 'despedida') {
    if (!option) return m.reply(`*⌬┤ ⚙️ ├⌬ CONFIG DESPEDIDA*\n> Estado: ${groupDb.goodbye ? '✅ ON' : '❌ OFF'}\n> *Uso:* .bye on / off`)
    
    if (['on', '1', 'true', 'activar'].includes(option)) {
      groupDb.goodbye = true
      await groupDb.save()
      return m.reply(`*⌬┤ ✅ ├⌬ DESPEDIDA ACTIVADA*`)
    } else if (['off', '0', 'false', 'desactivar'].includes(option)) {
      groupDb.goodbye = false
      await groupDb.save()
      return m.reply(`*⌬┤ ❌ ├⌬ DESPEDIDA DESACTIVADA*`)
    } else {
      return m.reply(`*⌬┤ ❕ ├⌬ OPCIÓN INVÁLIDA*\n> Usa: .bye on / off`)
    }
  }

  if (command === 'setwelcome') {
    if (!text) return m.reply('*⌬┤ ✙ ├⌬ Escribí el mensaje de bienvenida.*\n\n> *Variables permitidas:*\n- `%user` = Menciona al usuario\n- `%group` = Nombre del grupo\n- `%count` = Miembro número "X"')
    groupDb.welcomeMsg = text
    await groupDb.save()
    return m.reply('*⌬┤ ✅ · MENSAJE DE BIENVENIDA GUARDADO*')
  }

  if (command === 'setbye') {
    if (!text) return m.reply('*⌬┤ ✙ ├⌬ Escribí el mensaje de despedida.*\n\n> *Variables permitidas:*\n- `%user` = Menciona al usuario\n- `%group` = Nombre del grupo\n- `%count` = Miembros restantes')
    groupDb.goodbyeMsg = text
    await groupDb.save()
    return m.reply('*⌬┤ ✅ · MENSAJE DE DESPEDIDA GUARDADO*')
  }
}

export async function manejarParticipantes(conn, update) {
  const { id, participants, action } = update
  if (!id) return
  const chatJid = jidNormalizedUser(id)

  try {
    let group = groupDbCache.get(chatJid)
    if (!group) {
      group = await Group.findOne({ id: chatJid }).lean()
      if (group) groupDbCache.set(chatJid, group)
    }
    
    if (!group || (!group.welcome && !group.goodbye)) return

    const myNumber = conn.user.id.split(':')[0]
    const isMainBot = !conn.isSubBot
    if (group.primaryBot && group.primaryBot !== myNumber) return
    if (isMainBot && group.mainBotSleeping) return
    if (!isMainBot && group.disabledBots?.includes(myNumber)) return

    const meta = groupCache.get(chatJid) || await conn.groupMetadata(chatJid).catch(() => ({}))
    const groupName = meta?.subject || 'el grupo'
    const count = meta?.participants?.length || '?'

    for (let item of participants) {
      const jid = jidNormalizedUser(typeof item === 'string' ? item : (item?.id || item?.jid))
      if (!jid || jid === jidNormalizedUser(conn.user.id)) continue

      const isAdd = action === 'add' && group.welcome
      const isRem = (action === 'remove' || action === 'leave') && group.goodbye

      if (isAdd || isRem) {
        let pfpUrl = await conn.profilePictureUrl(jid, 'image').catch(() => null)
        if (!pfpUrl) pfpUrl = DEFAULT_IMG
        const pfpBuffer = await getBuffer(pfpUrl)
        const texto = parsear(isAdd ? (group.welcomeMsg || DEFAULT_BV) : (group.goodbyeMsg || DEFAULT_DP), jid, groupName, count)

        await conn.sendMessage(chatJid, {
          image: pfpBuffer || { url: pfpUrl },
          caption: texto,
          mentions: [jid]
        })
      }
    }
  } catch (e) {
    console.error('[WELCOME ERROR]', e.message)
  }
}

handler.help = ['welcome <on/off>', 'bye <on/off>', 'setwelcome <texto>', 'setbye <texto>']
handler.tags = ['group']
handler.command = ['welcome', 'bienvenida', 'bye', 'despedida', 'setwelcome', 'setbye']
handler.groupOnly = true
handler.adminOnly = true
handler.manejarParticipantes = manejarParticipantes

export default handler