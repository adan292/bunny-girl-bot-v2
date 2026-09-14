import axios from 'axios'
import { createWriteStream, statSync, mkdirSync, readFileSync } from 'fs'
import { rm } from 'fs/promises'
import { pipeline } from 'stream/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { bookSearch, bookInfo } from '@axel-dev09/zen-dl'
import config from '../../config.js'

const TMP_DIR = join(process.cwd(), 'tmp', 'books')
mkdirSync(TMP_DIR, { recursive: true })

async function downloadFile(dlData, destPath) {
  const { url, headers } = dlData
  const res = await axios.get(url, {
    headers: headers,
    responseType: 'stream',
    timeout: 120_000,
    maxRedirects: 10,
  })
  
  const ct = res.headers['content-type'] || ''
  if (ct.includes('text/html')) {
     throw new Error('Respuesta HTML — posible bloqueo de AntUpload')
  }
  
  await pipeline(res.data, createWriteStream(destPath))
  const { size } = statSync(destPath)
  if (size < 1000) throw new Error(`Archivo inválido (${size} bytes)`)
  return size
}

const handler = async (m, { conn, text, usedPrefix, command, userDb }) => {
  let url = text ? text.trim() : ''
  if (!url && m.quoted) {
    const quotedText = m.quoted.body || m.quoted.text || ''
    const match = quotedText.match(/https?:\/\/[^\s]+/i)
    if (match) url = match[0]
    else url = quotedText.trim()
  }

  if (!url) return m.reply(`*⌬┤ ✙ ├⌬ USO.*\n> *${usedPrefix}${command} <nombre del libro o link>*`)
  if (userDb.kogen < 1) return m.reply(`*⌬┤ 💎 ├⌬ SIN ${config.PREMIUM_NAME.toUpperCase()}.*\n> No tenés suficientes ${config.PREMIUM_NAME} para usar este comando.`)

  const chatId  = m.chat
  await m.reply(`*⌬┤ 🔎 ├⌬ Buscando libro...*`)

  const tmpPath = join(TMP_DIR, randomUUID())

  try {
    let info
    if (/lectulandia\.co/i.test(url)) {
      info = await bookInfo(url)
    } else {
      const search = await bookSearch(url, 1)
      if (!search?.length) return m.reply(`*⌬┤ ❌ ├⌬ NO ENCONTRADO.*\n> No se encontró nada para: *${url}*`)
      info = await bookInfo(search[0].url)
    }

    if (!info) throw new Error('No se pudo extraer información del libro')

    if (info.thumb) {
      try {
        await conn.sendMessage(chatId, {
          image:   { url: info.thumb },
          caption: `*⌬┤ 📚 ├⌬ ${info.title}*\n\n> 👤 *Autor:* ${info.author || 'Desconocido'}\n> 📑 *Género:* ${info.genre || '-'}\n> 📅 *Publicado:* ${info.year || '-'}\n\n> 📖 ${(info.description || '').slice(0, 500)}${(info.description?.length || 0) > 500 ? '...' : ''}`,
        }, { quoted: m })
      } catch {}
    }

    let dlData = info.download?.pdf
    let ext    = 'pdf'
    let mime   = 'application/pdf'

    if (!dlData && info.download?.epub) {
      dlData = info.download.epub
      ext    = 'epub'
      mime   = 'application/epub+zip'
    }

    if (!dlData || !dlData.url) throw new Error('Sin enlaces de AntUpload disponibles')

    const fileName = `${info.title} - ${info.author || 'Autor'}.${ext}`
    const destPath = `${tmpPath}.${ext}`

    await downloadFile(dlData, destPath)

    await conn.sendMessage(chatId, {
      document: readFileSync(destPath),
      mimetype: mime,
      fileName,
      caption:  `✅ *${info.title}*`,
    }, { quoted: m })

    userDb.kogen -= 1
    await conn.sendMessage(chatId, { text: `${config.PREMIUM_SYMBOL} Utilizaste *1 ${config.PREMIUM_NAME}*` }, { quoted: m })

  } catch (e) {
    m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo procesar el libro.`)
  } finally {
    await rm(`${tmpPath}.pdf`, { force: true }).catch(() => {})
    await rm(`${tmpPath}.epub`, { force: true }).catch(() => {})
  }
}

handler.help = [`libro <nombre> ${config.PREMIUM_SYMBOL}`]
handler.command = ['libro', 'lectulandia']
handler.tags = ['descargas']

export default handler