import fs from 'fs'
import path from 'path'
import * as baileysMod from '@whiskeysockets/baileys'
import config from '../../config.js'

const pkg = baileysMod.default && Object.keys(baileysMod).length === 1 ? baileysMod.default : baileysMod
const { jidNormalizedUser } = pkg

const ACTIVITY_DIR = path.resolve('./lib/database/data/activity')

function readActivity(groupId) {
  const fp = path.join(ACTIVITY_DIR, `${groupId.replace('@g.us', '')}.json`)
  try {
    if (fs.existsSync(fp)) return JSON.parse(fs.readFileSync(fp, 'utf-8'))
  } catch {}
  return {}
}

const on  = '✅'
const off = '❌'

const handler = async (m, { conn, participants, groupMetadata, groupDb, isBotAdmin }) => {
  if (!m.isGroup) return m.reply(`*⌬┤ 👥 ├⌬ SOLO GRUPOS.*\n> Este comando solo funciona en grupos.`)

  const meta = groupMetadata || await conn.groupMetadata(m.chat).catch(() => ({}))

  const botJid    = jidNormalizedUser(conn.user.id)
  const admins    = participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin' || p.isCommunityAdmin)
  const bots      = participants.filter(p => jidNormalizedUser(p.id) === botJid)
  const totalReal = participants.length

  const createdAt = meta.creation
    ? new Date(meta.creation * 1000).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '---'

  const inviteCode = isBotAdmin
    ? await conn.groupInviteCode(m.chat).catch(() => null)
    : null

  const activity   = readActivity(m.chat)
  const totalMsgs  = Object.values(activity).reduce((a, b) => a + b, 0)
  const conActividad = Object.keys(activity).length
  const sinMensajes  = participants.filter(p => {
    const jid = jidNormalizedUser(p.id)
    return jid !== botJid && !(activity[jid] > 0)
  }).length

  const restrict  = meta.restrict   ? '🔒 Solo admins' : '🌐 Todos'
  const announce  = meta.announce   ? '🔒 Solo admins' : '🌐 Todos'
  const ephemeral = meta.ephemeralDuration
    ? `⏳ ${meta.ephemeralDuration / 86400}d`
    : `${off} Desactivado`

  const joinApproval = meta.joinApprovalMode  ? on  : off
  const memberAdd    = meta.memberAddMode      ? on  : off
  const isCommunity  = meta.isCommunity        ? on  : off
  const isLinked     = meta.linkedParent       ? on  : off

  const desc = meta.desc
    ? (meta.desc.length > 120 ? meta.desc.slice(0, 117) + '...' : meta.desc)
    : '---'

  const db = groupDb || {}
  const disabledCmds = db.disabledCmds?.length     ? db.disabledCmds.join(', ')     : 'ninguno'
  const disabledCats = db.disabledCategories?.length ? db.disabledCategories.join(', ') : 'ninguna'

  let txt = `*╔═══⌦ ✦ 📋 INFO GRUPO ✦ ⌫═══╗*\n\n`

  txt += `*⌬┤ 📌 GENERAL ├⌬*\n`
  txt += `> 📛 *Nombre:* ${meta.subject || '---'}\n`
  txt += `> 🆔 *ID:* ${m.chat}\n`
  txt += `> 📅 *Creado:* ${createdAt}\n`
  txt += `> 📝 *Descripción:* ${desc}\n`
  if (inviteCode) txt += `> 🔗 *Link:* https://chat.whatsapp.com/${inviteCode}\n`
  txt += '\n'

  txt += `*⌬┤ 👥 MIEMBROS ├⌬*\n`
  txt += `> 👤 *Total:* ${totalReal}\n`
  txt += `> 👑 *Admins:* ${admins.length}\n`
  txt += `> 🤖 *Bots:* ${bots.length}\n`
  txt += '\n'

  txt += `*⌬┤ ⚙️ CONFIGURACIÓN ├⌬*\n`
  txt += `> ✏️ *Editar info:* ${restrict}\n`
  txt += `> 💬 *Enviar msgs:* ${announce}\n`
  txt += `> ⏳ *Mensajes temp:* ${ephemeral}\n`
  txt += `> 🚪 *Aprobación ingreso:* ${joinApproval}\n`
  txt += `> ➕ *Miembros pueden agregar:* ${memberAdd}\n`
  txt += `> 🏘️ *Es comunidad:* ${isCommunity}\n`
  txt += `> 🔗 *Vinculado a comunidad:* ${isLinked}\n`
  txt += '\n'

  txt += `*⌬┤ 🤖 CONFIG BOT ├⌬*\n`
  txt += `> 👋 *Bienvenida:* ${db.welcome ? on : off}\n`
  txt += `> 👋 *Despedida:* ${db.goodbye ? on : off}\n`
  txt += '\n'

  txt += `*⌬┤ 🛡️ PROTECCIONES ├⌬*\n`
  txt += `> 🔗 *Antilink:* ${db.antilink ? on : off}\n`
  txt += `> 🎙️ *Anti nota de voz:* ${db.antinotadevoz ? on : off}\n`
  txt += `> 📢 *Anti etiqueta estado:* ${db.antimenciongp ? on : off}\n`
  txt += `> 🎭 *Anti sticker:* ${db.antisticker ? on : off}\n`
  txt += `> 🎬 *Anti video:* ${db.antivideo ? on : off}\n`
  txt += `> 🖼️ *Anti imagen:* ${db.antiimagen ? on : off}\n`
  txt += `> 🗑️ *Anti delete:* ${db.antidelete ? on : off}\n`
  txt += `> 🚫 *Anti toxic:* ${db.antitoxic ? on : off}\n`
  txt += '\n'

  txt += `*⌬┤ ⚙️ BOT MISC ├⌬*\n`
  txt += `> 🚫 *Cmds bloqueados:* ${disabledCmds}\n`
  txt += `> 🚫 *Cats bloqueadas:* ${disabledCats}\n`
  txt += '\n'

  txt += `*⌬┤ 📊 ACTIVIDAD ├⌬*\n`
  txt += `> 📨 *Mensajes registrados:* ${totalMsgs}\n`
  txt += `> 🔥 *Con actividad:* ${conActividad} usuarios\n`
  txt += `> 😴 *Sin mensajes:* ${sinMensajes} usuarios\n`

  txt += `\n*╚══⌦ ${config.footer} ⌫══╝*`

  const pfp = await conn.profilePictureUrl(m.chat, 'image').catch(() => null)

  if (pfp) {
    await conn.sendMessage(m.chat, { image: { url: pfp }, caption: txt }, { quoted: m })
  } else {
    await m.reply(txt)
  }
}

handler.help      = ['infogrupo']
handler.tags      = ['group']
handler.command   = ['infogrupo', 'groupinfo', 'ginfo', 'grupoinfo']
handler.groupOnly = true
handler.noRegister = true

export default handler
