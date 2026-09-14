import fetch from 'node-fetch'
import User, { RANGOS } from '../../lib/database/models/zen-users.js'
import config from '../../config.js'

const TITLE_LABEL = {
  title_cazador: '🏷️ El Cazador',
  title_magnate: '🏷️ Magnate',
  title_legendario: '🏷️ Leyenda Viva',
  title_sombra: '🏷️ Sombra'
}

const BADGE_EMOJI = {
  relic_corona: '👑',
  relic_orbe: '🔮',
  relic_fenix: '🐦‍🔥'
}

const extraerNum = (jid = '') => (typeof jid === 'string' ? jid : '').split('@')[0].split(':')[0].replace(/\D/g, '')

const resolveTargetJid = (m, participants = []) => {
  const raw = m.mentionedJid?.[0] || m.quoted?.sender || null
  if (!raw) return null
  if (!raw.endsWith('@lid')) return raw
  const p = participants.find(p => p.id === raw || p.lid === raw)
  if (p?.phoneNumber) return `${String(p.phoneNumber).replace(/\D/g, '')}@s.whatsapp.net`
  if (p?.id?.includes('@s.whatsapp.net')) return p.id
  return raw
}

const findByNum = (jid) => {
  const num = extraerNum(jid)
  if (!num) return null
  return User.findOne({ jid: { $regex: `^${num}@` } }).lean()
}

const handler = async (m, { conn, participants }) => {
  const targetRaw = resolveTargetJid(m, participants)
  const isSelf = !targetRaw || extraerNum(targetRaw) === extraerNum(m.sender)

  const u = isSelf
    ? await User.findOne({ jid: { $regex: `^${extraerNum(m.sender)}@` } }).lean()
    : await findByNum(targetRaw)

  if (!u) return isSelf ? undefined : m.reply('*⌬┤ ❌ · USUARIO NO REGISTRADO.*')

  const displayJid = u.jid
  const rango = RANGOS[Math.min(u.level, RANGOS.length - 1)]
  const xpNec = Math.floor(Math.pow(u.level, 1.5) * 100) + 200
  const social = u.social || {}
  const inv = u.inventory || {}

  let pfp = await conn.profilePictureUrl(displayJid, 'image').catch(() => null)
  if (!pfp) pfp = 'https://i.ibb.co/sphnd13T/images-4.jpg'

  const insignias = (inv.badges || [])
    .map(b => BADGE_EMOJI[b] || '')
    .filter(Boolean)
    .join(' ')

  const badgeSuffix = insignias ? ` [ ${insignias} ]` : ''

  let txt = `*╔═══⌦ ✦ ✨ PERFIL ✨ ✦ ⌫═══╗*\n\n`
  txt += `> 👤 *Nombre:* ${u.name || 'Invitado'}${badgeSuffix}\n`
  if (!isSelf) txt += `> 🔖 *Usuario:* @${extraerNum(displayJid)}\n`
  if (inv.title) txt += `> 🏷️ *Título:* ${TITLE_LABEL[inv.title] || inv.title}\n`
  if (social.nickname) txt += `> 🎭 *Apodo:* ${social.nickname}\n`
  if (social.bio)      txt += `> 📜 *Bio:* ${social.bio}\n`
  txt += `> 🆔 *Serie:* ${u.serial || '---'}\n\n`

  txt += `*⌬┤ 🏆 RANGO Y NIVEL ├⌬*\n`
  txt += `> 🆙 *Nivel:* ${u.level}\n`
  txt += `> 👑 *Rango:* ${rango}\n`
  txt += `> ✨ *XP:* [ ${u.xp} / ${xpNec} ]\n\n`

  let socialInfo = ''
  if (social.country)  socialInfo += `> 🌎 *País:* ${social.country}\n`
  if (social.birthday) socialInfo += `> 🎂 *Cumpleaños:* ${social.birthday}\n`
  if (social.zodiac)   socialInfo += `> 🔯 *Signo:* ${social.zodiac}\n`
  if (social.song)     socialInfo += `> 🎵 *Canción:* ${social.song}\n`
  if (social.color)    socialInfo += `> 🎨 *Color:* ${social.color}\n`
  if (social.food)     socialInfo += `> 🍱 *Comida:* ${social.food}\n`
  if (socialInfo) txt += `*⌬┤ 👤 INFORMACIÓN ├⌬*\n${socialInfo}\n`

  txt += `*⌬┤ 🏦 ECONOMÍA ├⌬*\n`
  txt += `> 🪙 *Billetera:* ${u.zenCoins} ${config.CURRENCY_SYMBOL}\n`
  txt += `> 💳 *Banco:* ${u.bankBalance} ${config.CURRENCY_SYMBOL}\n`
  txt += `> ${config.PREMIUM_SYMBOL} *${config.PREMIUM_NAME}:* ${u.kogen} ${config.PREMIUM_SYMBOL}\n\n`

  txt += `*⌬┤ 🎒 MOCHILA ├⌬*\n`
  txt += `> ⚒️ ${inv.pickaxeDurability || 0} | 🏹 ${inv.bowDurability || 0} | 🎣 ${inv.baitDurability || 0}\n\n`

  txt += `*╚══⌦ ${config.footer} ⌫══╝*`

  let imgBuffer
  try {
    const res = await fetch(pfp)
    if (res.ok) imgBuffer = Buffer.from(await res.arrayBuffer())
  } catch {
    imgBuffer = null
  }

  try {
    const payload = imgBuffer
      ? { image: imgBuffer, caption: txt, mentions: [displayJid] }
      : { text: txt, mentions: [displayJid] }
    await conn.sendMessage(m.chat, payload, { quoted: m })
  } catch (err) {
    console.error('[PERFIL ERROR]', err.message)
  }
}

handler.help = ['perfil [@usuario]']
handler.tags = ['registro']
handler.command = ['perfil', 'profile', 'me']
handler.register = true
export default handler