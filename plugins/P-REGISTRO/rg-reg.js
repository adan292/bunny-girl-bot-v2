import crypto from 'crypto'
import User from '../../lib/database/models/zen-users.js'
import { userCache } from '../../lib/caches.js'

const Reg = /\|?(.*)([.|] *?)([0-9]*)$/i

async function getBuffer(url) {
  try {
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error) {
    return null
  }
}

const handler = async (m, { conn, text, usedPrefix, command, userDb }) => {
  if (userDb && userDb.registered) return m.reply('*⌬┤ ✙ · YA ESTÁS REGISTRADO.*')

  if (!Reg.test(text)) return m.reply(`*⌬┤ ✙ ├⌬ FORMATO:* ${usedPrefix + command} nombre.edad`)

  let [, name, , age] = text.match(Reg)
  name = name.trim(); age = parseInt(age)
  if (name.length >= 30 || age > 100 || age < 5) return m.reply('*⌬┤ ⚠️ · DATOS INVÁLIDOS.*')

  const sn = crypto.createHash('md5').update(m.sender + Date.now()).digest('hex').slice(0, 10).toUpperCase()

  const isFirstTime = !userDb || !userDb.everRegistered

  // Normalizar siempre a @s.whatsapp.net para tener una key canónica en la DB
  const num = m.sender.split('@')[0].split(':')[0].replace(/\D/g, '')
  const jidCanon = `${num}@s.whatsapp.net`

  let updateData = {
    name,
    age,
    registered: true,
    everRegistered: true,
    serial: sn
  }

  if (isFirstTime) {
    updateData.zenCoins = 1500
    updateData.kogen = 5
    updateData['dailyStats.lastReset'] = Date.now()
  }

  const updatedUser = await User.findOneAndUpdate(
    { jid: { $regex: `^${num}@` } },
    { $set: { ...updateData, jid: jidCanon } },
    { upsert: true, new: true }
  )

  if (updatedUser) {
    userCache.set(jidCanon, updatedUser)
    userCache.set(num, updatedUser)
  }

  let rewardText = isFirstTime
    ? `*🎁 RECOMPENSA INICIAL:*\n> 🪙 1500 ZenCoins\n> ✨ 5 Kōgen`
    : `*🎁 RECOMPENSA:*\n> ¡Bienvenido de vuelta!\n> _(Las recompensas de inicio solo se dan una vez)_`

  let pfpUrl = await conn.profilePictureUrl(m.sender, 'image').catch(() => null)
  if (!pfpUrl) pfpUrl = 'https://i.ibb.co/sphnd13T/images-4.jpg'
  const pfpBuffer = await getBuffer(pfpUrl)

  const caption = `*┏━•❈✅ REGISTRO EXITOSO*\n\n> 👤 *Nombre:* ${name}\n> 🎂 *Edad:* ${age} años\n> 🔐 *Serie:* ${sn}\n\n${rewardText}\n\n*┗━━━━•❅•°•❈*`

  await conn.sendMessage(m.chat, { image: pfpBuffer || { url: pfpUrl }, caption, mentions: [m.sender] }, { quoted: m })
}

handler.help = ['reg <nombre.edad>']
handler.tags = ['registro']
handler.command = ['reg', 'verificar', 'verify', 'registrar']
export default handler
