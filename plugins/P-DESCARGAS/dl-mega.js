import { File } from 'megajs'
import mime from 'mime-types'
import { createWriteStream } from 'fs'
import { rm } from 'fs/promises'
import { pipeline } from 'stream/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import config from '../../config.js'

function formatBytes(bytes) {
  if (!bytes) return '0 Bytes'
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i]
}

async function animarProgreso(conn, chatId, key) {
  for (let i = 1; i <= 10; i++) {
    const barra = '█'.repeat(i) + '░'.repeat(10 - i)
    await conn.sendMessage(chatId, { edit: key, text: `*⌬┤ ⏳ ├⌬ Descargando... ${i * 10}% ${barra}*` })
    await new Promise(r => setTimeout(r, 300))
  }
}

const handler = async (m, { conn, text, usedPrefix, command, userDb }) => {
  let url = text ? text.trim() : ''
  if (!url && m.quoted) {
    const quotedText = m.quoted.body || m.quoted.text || ''
    const match = quotedText.match(/https?:\/\/[^\s]+/i)
    if (match) url = match[0]
  }

  if (!url) return m.reply(`*⌬┤ ❗ ├⌬ ENLACE REQUERIDO.*\n> Enviá o respondé a un mensaje con un enlace válido de Mega.`)
  if (!url.includes('mega.nz')) return m.reply(`*⌬┤ ❗ ├⌬ LINK INVÁLIDO.*\n> Asegurate de que sea de Mega.`)
  if (userDb.kogen < 1) return m.reply(`*⌬┤ 💎 ├⌬ SIN ${config.PREMIUM_NAME.toUpperCase()}.*\n> No tenés suficientes ${config.PREMIUM_NAME} para usar este comando.`)

  const chatId = m.chat
  const progresoMsg = await m.reply(`*⌬┤ ⏳ ├⌬ Obteniendo archivo de Mega... 0% ░░░░░░░░░░*\n> 📌 Límite: 300 MB`)
  let tmpPath = ''

  try {
    const file = File.fromURL(url)
    await file.loadAttributes()

    const mimeType = mime.lookup(file.name.split('.').pop()) || 'application/octet-stream'
    const sizeMB   = Math.round(file.size / (1024 * 1024))
    if (sizeMB > 300) return m.reply(`*⌬┤ ⚠️ ├⌬ El archivo supera el límite de 300 MB (*${sizeMB} MB*).*`)

    await animarProgreso(conn, chatId, progresoMsg.key)

    tmpPath = join(process.cwd(), 'tmp', `${randomUUID()}.tmp`)
    await pipeline(file.download(), createWriteStream(tmpPath))

    await conn.sendMessage(chatId, {
      document: { url: tmpPath },
      fileName: file.name,
      mimetype: mimeType,
      caption:  `*⌬┤ 📂 ├⌬ ${file.name}*\n> 📦 ${formatBytes(file.size)}\n> 🚀 ${mimeType}\n> Made by: ${global.botname || config.botName}`,
    }, { quoted: m })

    userDb.kogen -= 1
    await conn.sendMessage(m.chat, { text: `${config.PREMIUM_SYMBOL} Utilizaste *1 ${config.PREMIUM_NAME}*` }, { quoted: m })

  } catch (error) {
    return m.reply(`*⌬┤ ❌ ├⌬ No se pudo descargar desde Mega.*\n> Error: ${error.message}`)
  } finally {
    if (tmpPath) {
      await rm(tmpPath, { force: true }).catch(() => {})
    }
  }
}

handler.help = [`mega <link> ${config.PREMIUM_SYMBOL}`]
handler.command = ['mega', 'mg']
handler.tags = ['descargas']

export default handler