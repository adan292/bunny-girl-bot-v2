import axios from 'axios'
import config from '../../config.js'

const handler = async (m, { conn, text, usedPrefix, command, userDb }) => {
  let url = text ? text.trim() : ''
  if (!url && m.quoted) {
    const quotedText = m.quoted.body || m.quoted.text || ''
    const match = quotedText.match(/https?:\/\/[^\s]+/i)
    if (match) url = match[0]
  }

  if (!url) return m.reply(`*⌬┤ ❗ ├⌬ LINK REQUERIDO.*\n> Ej: *${usedPrefix}${command} https://f-droid.org/en/packages/com.termux/*`)
  if (!url.includes('f-droid.org')) return m.reply(`*⌬┤ ❗ ├⌬ LINK INVÁLIDO.*\n> Asegurate de que sea un link de F-Droid.`)
  if (userDb.kogen < 1) return m.reply(`*⌬┤ 💎 ├⌬ SIN ${config.PREMIUM_NAME.toUpperCase()}.*\n> No tenés suficientes ${config.PREMIUM_NAME} para usar este comando.`)

  const chatId = m.chat
  await m.reply(`*⌬┤ ⏳ ├⌬ Buscando información de la app...*`)

  try {
    const res = await axios.get(`https://api.vreden.my.id/api/v1/download/fdroid?url=${encodeURIComponent(url)}`)
    const app = res.data?.result
    if (!app) return m.reply(`*⌬┤ ❌ ├⌬ No se pudo obtener la información.*`)

    const latest = app.versions?.[0]

    await conn.sendMessage(chatId, {
      text: `*⌬┤ 📱 ├⌬ ${app.name}*\n> 📝 ${app.summary}\n\n> 📖 _${app.description.substring(0, 300)}..._\n\n> 🔖 Versión: *${latest?.version || '-'}*\n> 📅 Fecha: *${latest?.added || '-'}*\n> ⚙️ Req: *${latest?.requirements || '-'}*\n> 📦 Tamaño: *${latest?.size || '-'}*`,
    }, { quoted: m })

    if (!latest?.link) return

    await conn.sendMessage(chatId, {
      document: { url: latest.link },
      mimetype: 'application/vnd.android.package-archive',
      fileName: `${app.name}-${latest.version}.apk`,
      caption:  `*⌬┤ 📥 ├⌬ APK descargado de F-Droid*`,
    }, { quoted: m })
    
    userDb.kogen -= 1
    await conn.sendMessage(chatId, { react: { text: '✅', key: m.key } })
    await conn.sendMessage(m.chat, { text: `${config.PREMIUM_SYMBOL} Utilizaste *1 ${config.PREMIUM_NAME}*` }, { quoted: m })

  } catch {
    return m.reply(`*⌬┤ ❗ ├⌬ Error al obtener la información de la app.*`)
  }
}

handler.help = [`fdroid <link> ${config.PREMIUM_SYMBOL}`]
handler.command = ['fdroid', 'appinfo']
handler.tags = ['descargas']

export default handler