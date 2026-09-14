import axios from 'axios'
import config from '../../config.js'

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) {
    return m.reply(`*⌬┤ ⚠️ ├⌬ PARÁMETRO REQUERIDO.*\n\n> Por favor, ingresá el nombre de la canción o video que querés buscar.\n> Ejemplo: *${usedPrefix + command} Sia Chandelier*`)
  }

  try {
    const apiRes = await axios.get(`https://luxinfinity.vercel.app/api/search/youtube?query=${encodeURIComponent(text)}&limit=10`, {
      timeout: 15000
    })

    if (!apiRes.data || apiRes.data.status !== true || !Array.isArray(apiRes.data.data) || apiRes.data.data.length === 0) {
      return m.reply(`*⌬┤ 🔍 ├⌬ SIN RESULTADOS.*\n\n> No se encontraron videos que coincidan con la búsqueda: *"${text}"*.`)
    }

    const videos = apiRes.data.data
    const primerVideo = videos[0]

    let txt = `*╔═══⌦ ✦ 🔍 BÚSQUEDA YOUTUBE ✦ ⌫═══╗*\n\n`
    txt += `> 🔎 *Búsqueda:* ${text}\n`
    txt += `> 📊 *Resultados:* ${videos.length}\n\n`

    videos.forEach((v, i) => {
      txt += `*${i + 1}.* ${v.title}\n`
      txt += `   🔗 *Enlace:* ${v.url}\n`
      txt += `   ⏱️ *Duración:* ${v.duration?.text || '---'} │ 👁️ *Vistas:* ${v.views || '---'}\n`
      txt += `   👤 *Canal:* ${v.author?.name || '---'} │ 📅 *Subido:* ${v.publishDate || '---'}\n\n`
    })

    txt += `*╚══⌦ ${config.footer} ⌫══╝*`

    if (primerVideo.thumb) {
      await conn.sendMessage(
        m.chat,
        { image: { url: primerVideo.thumb }, caption: txt },
        { quoted: m }
      )
    } else {
      await conn.sendMessage(
        m.chat,
        { text: txt },
        { quoted: m }
      )
    }

  } catch (e) {
    console.error('[YTSEARCH ERROR]', e.message)
    m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n\n> Ocurrió un error al realizar la búsqueda en YouTube. Volvé a intentar en unos instantes.`)
  }
}

handler.help = ['ytsearch <búsqueda>']
handler.tags = ['busquedas']
handler.command = ['yts', 'ytsearch', 'youtube', 'buscarvideo']
handler.register = true

export default handler