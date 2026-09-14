import axios from 'axios'
import { sendSmart } from '../../lib/serializer.js'
import fs from 'fs'
import path from 'path'
import { rm } from 'fs/promises'
import { pipeline } from 'stream/promises'
import config from '../../config.js'
import { playvid } from '../../lib/scrapers/playvideo.js'

const DELIRIUS = 'https://api.delirius.store/download'

async function fetchMp4(url) {
  const formats = ['360p', '480p', '720p']
  let last
  for (const fmt of formats) {
    try {
      const { data } = await axios.get(
        `${DELIRIUS}/ytmp4?url=${encodeURIComponent(url)}&format=${fmt}`,
        { timeout: 35000 }
      )
      if (data?.status === true && data?.data?.download) return data.data
    } catch (e) { last = e }
  }

  try {
    const fallbackRes = await playvid.convert(url, '360p')
    if (fallbackRes?.url) {
      return { download: fallbackRes.url, title: fallbackRes.filename || 'YouTube Video' }
    }
  } catch (e) {
    last = e
  }

  throw last || new Error('No se pudo obtener el video en ningún formato')
}

function extractYtId(text) {
  const m = text.match(/(?:youtu\.be\/|v=|\/shorts\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

async function resolveYtUrl(query) {
  if (/^https?:\/\//.test(query)) {
    const id = extractYtId(query) || 'default'
    return { url: query, id, title: 'YouTube Video', channel: 'Desconocido', views: '---', thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` }
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

  if (!query) return m.reply(`*⌬┤ ✙ ├⌬ USO.*\n> Ingresá un enlace o nombre de video.\n\n> *Ejemplo:* ${usedPrefix}${command} https://youtu.be/xxx`)

  if (command === 'ytmp4dl') {
    if (userDb.kogen < 1) return m.reply(`*⌬┤ 💎 ├⌬ SIN ${config.PREMIUM_NAME.toUpperCase()}.*\n> No tenés suficientes ${config.PREMIUM_NAME} para usar este comando.`)

    const [type, ...idParts] = query.split(' ')
    const videoQuery = idParts.join(' ')
    if (!type || !videoQuery) return

    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })
    await m.reply(`*⌬┤ ⏳ ├⌬ DESCARGANDO VIDEO*\n\n> _Esto puede tardar un momento..._`)

    const isDoc   = type === 'doc'
    const tmpDir  = path.resolve('./tmp')
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })
    const localPath = path.join(tmpDir, `ytmp4_${Date.now()}.mp4`)

    let dlTitle    = 'YouTube Video'
    let downloaded = false

    try {
      const ytUrl    = `https://www.youtube.com/watch?v=${videoQuery}`
      const media    = await fetchMp4(ytUrl)
      dlTitle        = media.title || dlTitle

      const mediaRes = await axios.get(media.download, { responseType: 'stream', timeout: 120000 })
      await pipeline(mediaRes.data, fs.createWriteStream(localPath))

      if (fs.existsSync(localPath) && fs.statSync(localPath).size > 1000) downloaded = true
    } catch {}

    if (!downloaded) {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      await rm(localPath, { force: true }).catch(() => {})
      return m.reply(`*⌬┤ ✙ ├⌬ ERROR.*\n> No se pudo descargar el video. Puede tener restricción de edad o copyright.`)
    }

    try {
      if (isDoc) {
        await conn.sendMessage(m.chat, {
          document: { url: localPath }, mimetype: 'video/mp4',
          fileName: `${dlTitle}.mp4`, caption: `*⌬┤ 🎬 ├⌬ YOUTUBE VIDEO DOC*`
        }, { quoted: m })
      } else {
        await conn.sendMessage(m.chat, {
          video: { url: localPath }, caption: `*⌬┤ 🎬 ├⌬ YOUTUBE VIDEO*\n\n> *Título:* ${dlTitle}`,
          mimetype: 'video/mp4', fileName: `${dlTitle}.mp4`
        }, { quoted: m })
      }
      userDb.kogen -= 1
      await conn.sendMessage(m.chat, { text: `${config.PREMIUM_SYMBOL} Utilizaste *1 ${config.PREMIUM_NAME}*` }, { quoted: m })
      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    } catch {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      await m.reply(`*⌬┤ ✙ ├⌬ ERROR.*\n> Hubo un error al enviar el archivo.`)
    } finally {
      await rm(localPath, { force: true }).catch(() => {})
    }
    return
  }

  const sender = m.sender
  await m.reply(`🔍 *Buscando información...*`)

  try {
    const resolved = await resolveYtUrl(query)

    let txt = `*╔═══⌦ ✦ 📺 YOUTUBE SEARCH ✦ ⌫═══╗*\n\n`
            + `> 🎥 *Título:* ${resolved.title}\n`
            + `> 👁️ *Vistas:* ${resolved.views}\n`
            + `> 👤 *Canal:* ${resolved.channel}\n\n`
            + `> _Elegí el formato para descargar debajo:_`

    const isLid    = sender.includes('@lid')

    const nativeFlowButtons = [{
      text: `Elegir formato ⚙️`,
      sections: [{
        title: `✧ Formatos de Video ✧`,
        rows: [
          { header: '', title: `📽️ | Video (MP4)`,       description: `» Reproductor de video estándar`,  id: `${usedPrefix}ytmp4dl norm ${resolved.id}` },
          { header: '', title: `📄 | Video (Documento)`, description: `» Archivo original descargable`,    id: `${usedPrefix}ytmp4dl doc ${resolved.id}`  },
        ]
      }]
    }]

    await sendSmart(conn, m, {
      image:      { url: resolved.thumbnail },
      caption:    txt,
      footer:     global.botname || config.botName,
      buttons:    nativeFlowButtons,
      headerType: 4,
      mentions:   isLid ? [] : [sender],
    }, {}, userDb)

  } catch (err) {
    console.error('[YTMP4 ERROR]', err.message)
    return m.reply(`*⌬┤ ✙ ├⌬ ERROR.*\n> No se pudo obtener información del video.`)
  }
}

handler.help    = [`ytmp4 <url/texto> ${config.PREMIUM_SYMBOL}`]
handler.command = ['ytmp4', 'ytv', 'ytvideo', 'ytmp4dl']
handler.tags    = ['descargas']

export default handler