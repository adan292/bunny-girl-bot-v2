import fetch from 'node-fetch'
import config from '../../config.js'

const MAX_MB = 500
const GDRIVE_MIMES = {
  'audio/mpeg': { ext: 'mp3', tipo: 'audio' }, 'audio/mp4': { ext: 'm4a', tipo: 'audio' },
  'audio/ogg':  { ext: 'ogg', tipo: 'audio' }, 'video/mp4': { ext: 'mp4', tipo: 'video' },
  'video/x-matroska': { ext: 'mkv', tipo: 'document' }, 'image/jpeg': { ext: 'jpg', tipo: 'image' },
  'image/png':  { ext: 'png', tipo: 'image' }, 'image/gif': { ext: 'gif', tipo: 'image' },
  'application/pdf': { ext: 'pdf', tipo: 'document' }, 'application/zip': { ext: 'zip', tipo: 'document' },
  'application/vnd.android.package-archive': { ext: 'apk', tipo: 'document' },
}

function formatSize(bytes) {
  if (!bytes) return '?'
  const mb = bytes / (1024 * 1024)
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`
}

const handler = async (m, { conn, text, usedPrefix, command, userDb }) => {
  let url = text ? text.trim() : ''
  if (!url && m.quoted) {
    const quotedText = m.quoted.body || m.quoted.text || ''
    const match = quotedText.match(/https?:\/\/[^\s]+/i)
    if (match) url = match[0]
  }

  if (!url) return m.reply(`*⌬┤ ✙ ├⌬ ENLACE REQUERIDO.*\n> Enviá o respondé a un mensaje con un enlace válido de Google Drive.`)
  if (!/drive\.google\.com/i.test(url)) return m.reply(`*⌬┤ ✙ ├⌬ ENLACE INVÁLIDO.*\n> Asegurate de que sea un enlace de Google Drive.`)
  if (userDb.kogen < 1) return m.reply(`*⌬┤ 💎 ├⌬ SIN ${config.PREMIUM_NAME.toUpperCase()}.*\n> No tenés suficientes ${config.PREMIUM_NAME} para usar este comando.`)

  const chatId = m.chat
  await m.reply(`*⌬┤ ⏳ ├⌬ Obteniendo archivo de Google Drive...*`)

  try {
    const apiRes = await fetch(`https://luxinfinity.vercel.app/api/gdrive?url=${encodeURIComponent(url)}`)
    const apiJson = await apiRes.json()

    if (!apiJson.status || !apiJson.data?.download) {
      return m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo obtener el archivo. ¿Es público el enlace?`)
    }

    const { name, download } = apiJson.data

    const headRes = await fetch(download, { method: 'HEAD', timeout: 15_000, redirect: 'follow' })
    const contentType = headRes.headers.get('content-type')?.split(';')[0].trim() || 'application/octet-stream'
    const contentLength = parseInt(headRes.headers.get('content-length') || '0')
    const sizeMB = contentLength / (1024 * 1024)

    if (contentLength && sizeMB > MAX_MB) {
      return m.reply(`*⌬┤ ⚠️ ├⌬ ARCHIVO MUY GRANDE.*\n> El archivo pesa ~${sizeMB.toFixed(1)} MB y supera el límite de ${MAX_MB} MB.`)
    }

    const { ext, tipo } = GDRIVE_MIMES[contentType] || { ext: 'bin', tipo: 'document' }
    const fileName = name || `archivo.${ext}`

    await m.reply(`*⌬┤ ⏳ ├⌬ Descargando:* ${fileName}*...*\n> 📁 ${formatSize(contentLength)}`)

    const fileRes = await fetch(download, { timeout: 120_000, redirect: 'follow' })
    if (!fileRes.ok) return m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo descargar el archivo.`)

    const buffer = Buffer.from(await fileRes.arrayBuffer())
    const realSizeMB = buffer.length / (1024 * 1024)

    if (realSizeMB > MAX_MB) return m.reply(`*⌬┤ ⚠️ ├⌬ El archivo supera el límite de ${MAX_MB} MB (*${realSizeMB.toFixed(1)} MB*).*`)

    const caption = `*⌬┤ ✅ ├⌬ Aquí tenés tu archivo.*\n> 📄 *${fileName}*\n> 📁 ${formatSize(buffer.length)}`

    if (tipo === 'audio')      await conn.sendMessage(chatId, { audio: buffer, mimetype: contentType, ptt: false, fileName }, { quoted: m })
    else if (tipo === 'video') await conn.sendMessage(chatId, { video: buffer, mimetype: contentType, fileName, caption }, { quoted: m })
    else if (tipo === 'image') await conn.sendMessage(chatId, { image: buffer, caption }, { quoted: m })
    else                       await conn.sendMessage(chatId, { document: buffer, mimetype: contentType, fileName, caption }, { quoted: m })

    userDb.kogen -= 1
    await conn.sendMessage(chatId, { text: `${config.PREMIUM_SYMBOL} Utilizaste *1 ${config.PREMIUM_NAME}*` }, { quoted: m })

  } catch (e) {
    console.error('[GDRIVE]', e.message)
    m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo completar. Intentá de nuevo.`)
  }
}

handler.help = [`gdrive <link> ${config.PREMIUM_SYMBOL}`]
handler.command = ['gdrive', 'googledrive', 'gdl']
handler.tags = ['descargas']

export default handler