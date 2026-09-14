import axios from 'axios'
import { sendSmart } from '../../lib/serializer.js'
import fs from 'fs'
import path from 'path'
import { rm } from 'fs/promises'
import { pipeline } from 'stream/promises'
import config from '../../config.js'
import { playaudio } from '../../lib/scrapers/playaudio.js'

const DELIRIUS = 'https://api.delirius.store/download'

async function fetchMp3(url) {
  const endpoints = [
    `${DELIRIUS}/ytmp3?url=${encodeURIComponent(url)}`,
    `${DELIRIUS}/ytmp3v2?url=${encodeURIComponent(url)}`,
  ]
  let last
  for (const ep of endpoints) {
    try {
      const { data } = await axios.get(ep, { timeout: 30000 })
      const ok = data?.status === true || data?.success === true
      if (ok && data?.data?.download) return data.data
    } catch (e) { last = e }
  }

  try {
    const fallbackRes = await playaudio.convert(url, '128k')
    if (fallbackRes?.url) {
      return { download: fallbackRes.url, title: fallbackRes.filename || 'YouTube Audio' }
    }
  } catch (e) {
    last = e
  }

  throw last || new Error('Ambas APIs fallaron')
}

function extractYtId(text) {
  const m = text.match(/(?:youtu\.be\/|v=|\/shorts\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

async function resolveYtUrl(query) {
  if (/^https?:\/\//.test(query)) {
    const id = extractYtId(query) || 'default'
    return { url: query, id, title: 'YouTube Audio', channel: 'Desconocido', views: '---', thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` }
  }
  const searchRes = await axios.get(`https://luxinfinity.vercel.app/api/search/youtube?query=${encodeURIComponent(query)}&limit=1`, { timeout: 15000 })
  if (searchRes.data?.status === true && searchRes.data?.data?.length > 0) {
    const v = searchRes.data.data[0]
    return {
      url: v.url,
      id: v.id,
      title: v.title,
      channel: v.author?.name || 'Desconocido',
      views: v.views || '0',
      thumbnail: v.thumb
    }
  }
  throw new Error('No se encontraron resultados')
}

const handler = async (m, { conn, text, usedPrefix, command, userDb }) => {
  let query = text ? text.trim() : ''
  if (!query && m.quoted) {
    const quotedText = m.quoted.body || m.quoted.text || ''
    const match = quotedText.match(/https?:\/\/[^\s]+/i)
    if (match) query = match[0]
    else query = quotedText.trim()
  }

  if (!query) return m.reply(`*⌬┤ ✙ ├⌬ USO.*\n> Ingresá el nombre de una canción o un enlace.\n\n> *Ejemplo:* ${usedPrefix}${command} linkin park numb`)

  if (command === 'ytmp3dl') {
    if (userDb.kogen < 1) return m.reply(`*⌬┤ 💎 ├⌬ SIN ${config.PREMIUM_NAME.toUpperCase()}.*\n> No tenés suficientes ${config.PREMIUM_NAME} para usar este comando.`)

    const [type, ...idParts] = query.split(' ')
    const videoQuery = idParts.join(' ')
    if (!type || !videoQuery) return

    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })
    await m.reply(`*⌬┤ ⏳ ├⌬ DESCARGANDO AUDIO*\n\n> _Esto puede tardar un momento..._`)

    const isDoc = type === 'doc'
    const tmpDir = path.resolve('./tmp')
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })
    const localPath = path.join(tmpDir, `ytmp3_${Date.now()}.mp3`)

    let dlTitle = 'YouTube Audio'
    let downloaded = false

    try {
      const ytUrl   = `https://www.youtube.com/watch?v=${videoQuery}`
      const media   = await fetchMp3(ytUrl)
      dlTitle       = media.title || dlTitle

      const mediaRes = await axios.get(media.download, { responseType: 'stream', timeout: 120000 })
      await pipeline(mediaRes.data, fs.createWriteStream(localPath))

      if (fs.existsSync(localPath) && fs.statSync(localPath).size > 1000) downloaded = true
    } catch {}

    if (!downloaded) {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      await rm(localPath, { force: true }).catch(() => {})
      return m.reply(`*⌬┤ ✙ ├⌬ ERROR.*\n> No se pudo descargar el audio. Probá con otro enlace.`)
    }

    userDb.kogen -= 1
    await userDb.save()

    await conn.sendMessage(m.chat, {
      audio:    { url: localPath },
      mimetype: 'audio/mpeg',
      fileName: `${dlTitle}.mp3`
    }, { quoted: m })

    await conn.sendMessage(m.chat, { text: `${config.PREMIUM_SYMBOL} Utilizaste *1 ${config.PREMIUM_NAME}*` }, { quoted: m })
    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    await rm(localPath, { force: true }).catch(() => {})
    return
  }

  const sender = m.sender
  await m.reply(`🔍 *Buscando información...*`)

  try {
    const resolved = await resolveYtUrl(query)

    const infoText = `*⌬┤ 🎧 ├⌬ YOUTUBE MP3*\n\n> *Título:* ${resolved.title}\n> *Autor:* ${resolved.channel}\n> *Vistas:* ${resolved.views}\n\n> *Elige el formato para descargar:*`
    const isLid    = sender.includes('@lid')

    const nativeFlowButtons = [{
      text: `Elegir formato ⚙️`,
      sections: [{
        title: `✧ Formatos de Audio ✧`,
        rows: [
          { header: '', title: `🎧 | Audio (MP3)`,       description: `» Reproductor de audio estándar`,  id: `${usedPrefix}ytmp3dl norm ${resolved.id}` },
          { header: '', title: `📁 | Audio (Documento)`, description: `» Archivo original descargable`,    id: `${usedPrefix}ytmp3dl doc ${resolved.id}`  },
        ]
      }]
    }]

    await sendSmart(conn, m, {
      image:      { url: resolved.thumbnail },
      caption:    infoText,
      footer:     global.botname || config.botName,
      buttons:    nativeFlowButtons,
      headerType: 4,
      mentions:   isLid ? [] : [sender],
    }, {}, userDb)

  } catch (err) {
    console.error('[YTMP3 ERROR]', err.message)
    return m.reply(`*⌬┤ ✙ ├⌬ ERROR.*\n> No se pudo obtener información del video.`)
  }
}

handler.help = ['ytmp3 <url/búsqueda>']
handler.tags = ['descargas']
handler.command = ['ytmp3', 'yta', 'ytaudio', 'ytmp3dl']
handler.register = true

export default handler