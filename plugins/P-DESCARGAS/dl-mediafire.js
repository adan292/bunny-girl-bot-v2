import axios from 'axios'
import { createWriteStream, statSync, mkdirSync, readFileSync } from 'fs'
import { rm } from 'fs/promises'
import { pipeline } from 'stream/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { mediafireInfo } from '@axel-dev09/zen-dl'
import config from '../../config.js'

const MAX_MB   = 1024
const UA       = 'Mozilla/5.0 (Linux; Android 11; Redmi Note 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
const MF_MIMES = {
  apk:  'application/vnd.android.package-archive', pdf:  'application/pdf',
  zip:  'application/zip',  rar:  'application/vnd.rar',
  mp4:  'video/mp4',        mkv:  'video/x-matroska',
  mp3:  'audio/mpeg',       m4a:  'audio/mp4',
  jpg:  'image/jpeg',       jpeg: 'image/jpeg', png: 'image/png',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  txt:  'text/plain',       exe:  'application/x-msdownload',
}

const TMP_DIR = join(process.cwd(), 'tmp', 'mfire')
mkdirSync(TMP_DIR, { recursive: true })

async function downloadFile(url, destPath) {
  const res = await axios.get(url, {
    headers:      { 'User-Agent': UA, 'Referer': 'https://www.mediafire.com' },
    responseType: 'stream',
    timeout:      120_000,
    maxRedirects: 10,
  })
  const cl = parseInt(res.headers['content-length'] || '0')
  if (cl > 0 && cl / (1024 * 1024) > MAX_MB)
    throw new Error(`LIMITE:${Math.round(cl / (1024 * 1024))}`)
  await pipeline(res.data, createWriteStream(destPath))
  const { size } = statSync(destPath)
  if (size < 100) throw new Error(`Archivo inválido (${size} bytes)`)
  return size
}

const handler = async (m, { conn, text, usedPrefix, command, userDb }) => {
  let url = text ? text.trim() : ''
  if (!url && m.quoted) {
    const quotedText = m.quoted.body || m.quoted.text || ''
    const match = quotedText.match(/https?:\/\/[^\s]+/i)
    if (match) url = match[0]
  }

  if (!url) return m.reply(`*⌬┤ ✙ ├⌬ ENLACE REQUERIDO.*\n> Enviá o respondé a un mensaje con un enlace válido de MediaFire.`)
  if (!url.includes('mediafire.com')) return m.reply(`*⌬┤ ✙ ├⌬ ENLACE INVÁLIDO.*\n> Asegurate de que sea de MediaFire.`)
  if (userDb.kogen < 1) return m.reply(`*⌬┤ 💎 ├⌬ SIN ${config.PREMIUM_NAME.toUpperCase()}.*\n> No tenés suficientes ${config.PREMIUM_NAME} para usar este comando.`)

  const chatId = m.chat
  await m.reply(`*⌬┤ ⬇️ ├⌬ Descargando archivo...*`)

  const tmpPath = join(TMP_DIR, randomUUID())

  try {
    let info = await mediafireInfo(url)
    if (!info) throw new Error('No se pudo obtener la información.')

    const { name, download } = info

    const headRes = await axios.get(download, { method: 'HEAD', timeout: 15_000 })
    const contentType = headRes.headers['content-type']?.split(';')[0].trim() || 'application/octet-stream'
    const contentLength = parseInt(headRes.headers['content-length'] || '0')
    const sizeMB = contentLength / (1024 * 1024)

    if (contentLength && sizeMB > MAX_MB) {
      return m.reply(`*⌬┤ ⚠️ ├⌬ ARCHIVO MUY GRANDE.*\n> El archivo supera el límite de ${MAX_MB} MB.`)
    }

    const ext = name.split('.').pop()?.toLowerCase() || ''
    const mime = MF_MIMES[ext] || contentType
    const fileName = name || `archivo.${ext}`
    const destPath = `${tmpPath}.${ext}`

    await downloadFile(download, destPath)

    await conn.sendMessage(chatId, {
      document: readFileSync(destPath),
      mimetype: mime,
      fileName,
      caption: `*⌬┤ ✅ ├⌬ Aquí tenés tu archivo.*\n> 📄 *${fileName}*`,
    }, { quoted: m })

    userDb.kogen -= 1
    await conn.sendMessage(chatId, { text: `${config.PREMIUM_SYMBOL} Utilizaste *1 ${config.PREMIUM_NAME}*` }, { quoted: m })

  } catch (e) {
    console.error('[MEDIAFIRE ERROR]', e.message)
    m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo completar. Intentá de nuevo.`)
  } finally {
    await rm(`${tmpPath}.bin`, { force: true }).catch(() => {})
  }
}

handler.help = [`mediafire <link> ${config.PREMIUM_SYMBOL}`]
handler.command = ['mediafire', 'mf', 'mfire', 'mediafiredl']
handler.tags = ['descargas']

export default handler