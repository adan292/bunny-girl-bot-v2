import axios from 'axios'
import { sendSmart } from '../../lib/serializer.js'
import fs from 'fs'
import path from 'path'
import { rm } from 'fs/promises'
import { pipeline } from 'stream/promises'
import config from '../../config.js'
import { playvid } from '../../lib/scrapers/playvideo.js'
import { playaudio } from '../../lib/scrapers/playaudio.js'

const DELIRIUS = 'https://api.delirius.store'

async function ytSearch(query) {
  const { data } = await axios.get(`${DELIRIUS}/search/ytsearch?q=${encodeURIComponent(query)}`, { timeout: 15000 })
  if (!data?.status || !data?.data?.length) throw new Error('Sin resultados')
  const v = data.data[0]
  return {
    id:        v.videoId,
    url:       v.url || `https://www.youtube.com/watch?v=${v.videoId}`,
    title:     v.title       || 'Sin título',
    channel:   v.author?.name || 'Desconocido',
    views:     Number(v.views || 0).toLocaleString(),
    duration:  v.duration    || '',
    thumbnail: v.image       || `https://i.ytimg.com/vi/${v.videoId}/maxresdefault.jpg`,
  }
}

async function fetchAudio(url) {
  for (const ep of [`${DELIRIUS}/download/ytmp3?url=${encodeURIComponent(url)}`, `${DELIRIUS}/download/ytmp3v2?url=${encodeURIComponent(url)}`]) {
    try {
      const { data } = await axios.get(ep, { timeout: 30000 })
      if ((data?.status === true || data?.success === true) && data?.data?.download) return data.data
    } catch {}
  }
  try {
    const fallbackRes = await playaudio.convert(url, '128k')
    if (fallbackRes?.url) {
      return { download: fallbackRes.url, title: fallbackRes.filename || 'YouTube Audio' }
    }
  } catch {}
  throw new Error('No se pudo obtener el audio')
}

async function fetchVideo(url) {
  for (const fmt of ['360p', '480p', '720p']) {
    try {
      const { data } = await axios.get(`${DELIRIUS}/download/ytmp4?url=${encodeURIComponent(url)}&format=${fmt}`, { timeout: 35000 })
      if (data?.status === true && data?.data?.download) return data.data
    } catch {}
  }
  try {
    const fallbackRes = await playvid.convert(url, '360p')
    if (fallbackRes?.url) {
      return { download: fallbackRes.url, title: fallbackRes.filename || 'YouTube Video' }
    }
  } catch {}
  throw new Error('No se pudo obtener el video')
}

const handler = async (m, { conn, text, usedPrefix, command, userDb }) => {
  if (!text) return m.reply(`*⌬┤ ✙ ├⌬ USO.*\n> Ingresá el nombre de una canción o video.\n\n> *Ejemplo:* ${usedPrefix}${command} linkin park numb`)

  if (command === 'playdl') {
    if (userDb.kogen < 1) return m.reply(`*⌬┤ 💎 ├⌬ SIN ${config.PREMIUM_NAME.toUpperCase()}.*\n> No tenés suficientes ${config.PREMIUM_NAME} para usar este comando.`)

    const [type, ...idParts] = text.split(' ')
    const videoId = idParts.join(' ')
    if (!type || !videoId) return

    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

    const isAudio = type.includes('mp3')
    const isDoc   = type.includes('doc')
    const ext     = isAudio ? 'mp3' : 'mp4'
    const ytUrl   = `https://www.youtube.com/watch?v=${videoId}`

    await m.reply(`*⌬┤ ⏳ ├⌬ DESCARGANDO...*\n\n> _Esto puede tardar un momento..._`)

    const tmpDir = path.resolve('./tmp')
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })
    const localPath = path.join(tmpDir, `playdl_${Date.now()}.${ext}`)

    let dlTitle    = 'YouTube Media'
    let downloaded = false

    try {
      const media = isAudio ? await fetchAudio(ytUrl) : await fetchVideo(ytUrl)
      dlTitle     = media.title || dlTitle

      const mediaRes = await axios.get(media.download, { responseType: 'stream', timeout: 120000 })
      await pipeline(mediaRes.data, fs.createWriteStream(localPath))

      if (fs.existsSync(localPath) && fs.statSync(localPath).size > 1000) downloaded = true
    } catch {}

    if (!downloaded) {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      await rm(localPath, { force: true }).catch(() => {})
      return m.reply(`*⌬┤ ✙ ├⌬ ERROR.*\n> No se pudo descargar. Puede tener restricción o copyright.`)
    }

    try {
      if (isAudio) {
        if (isDoc) {
          await conn.sendMessage(m.chat, { document: { url: localPath }, mimetype: 'audio/mpeg', fileName: `${dlTitle}.mp3`, caption: `*⌬┤ 🎧 ├⌬ AUDIO DOC*` }, { quoted: m })
        } else {
          await conn.sendMessage(m.chat, { audio: { url: localPath }, mimetype: 'audio/mpeg', fileName: `${dlTitle}.mp3` }, { quoted: m })
        }
      } else {
        if (isDoc) {
          await conn.sendMessage(m.chat, { document: { url: localPath }, mimetype: 'video/mp4', fileName: `${dlTitle}.mp4`, caption: `*⌬┤ 🎬 ├⌬ VIDEO DOC*` }, { quoted: m })
        } else {
          await conn.sendMessage(m.chat, { video: { url: localPath }, mimetype: 'video/mp4', caption: `*⌬┤ 🎬 ├⌬ ${dlTitle}*`, fileName: `${dlTitle}.mp4` }, { quoted: m })
        }
      }
      userDb.kogen -= 1
      await conn.sendMessage(m.chat, { text: `${config.PREMIUM_SYMBOL} Utilizaste *1 ${config.PREMIUM_NAME}*` }, { quoted: m })
      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    } catch {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      m.reply(`*⌬┤ ✙ ├⌬ ERROR.*\n> Hubo un error al enviar el archivo.`)
    } finally {
      await rm(localPath, { force: true }).catch(() => {})
    }
    return
  }

  const sender = m.sender
  await m.reply(`🔍 *Buscando...*`)

  let videoInfo = {}
  try {
    videoInfo = await ytSearch(text)
  } catch {
    return m.reply(`*⌬┤ ✙ ├⌬ ERROR.*\n> No se encontraron resultados. Intentá con otro título.`)
  }

  const infoText = `*⌬┤ 🎵 ├⌬ YOUTUBE PLAY*\n\n> *Título:* ${videoInfo.title}\n> *Autor:* ${videoInfo.channel}\n> *Duración:* ${videoInfo.duration}\n> *Vistas:* ${videoInfo.views}\n> *Enlace:* ${videoInfo.url}\n\n> *Elige una opción para descargar:*`
  const isLid    = sender.includes('@lid')

  const nativeFlowButtons = [{
    text: `Elegir formato ⚙️`,
    sections: [{
      title: `✧ Opciones Disponibles ✧`,
      rows: [
        { header: '', title: `🎧 | Audio (MP3)`,       description: `» Reproductor de audio estándar`,  id: `${usedPrefix}playdl ytmp3_norm ${videoInfo.id}` },
        { header: '', title: `📁 | Audio (Documento)`, description: `» Archivo original descargable`,    id: `${usedPrefix}playdl ytmp3_doc ${videoInfo.id}`  },
        { header: '', title: `📽️ | Video (MP4)`,       description: `» Reproductor de video estándar`,  id: `${usedPrefix}playdl ytmp4_norm ${videoInfo.id}` },
        { header: '', title: `📄 | Video (Documento)`, description: `» Archivo original descargable`,    id: `${usedPrefix}playdl ytmp4_doc ${videoInfo.id}`  },
      ]
    }]
  }]

  await sendSmart(conn, m, {
    image:      { url: videoInfo.thumbnail },
    caption:    infoText,
    footer:     global.botname || config.botName,
    buttons:    nativeFlowButtons,
    headerType: 4,
    mentions:   isLid ? [] : [sender],
  }, {}, userDb)
}

handler.help    = [`play <texto> ${config.PREMIUM_SYMBOL}`]
handler.command = ['play', 'playvid', 'play2', 'playdl']
handler.tags    = ['descargas']

export default handler