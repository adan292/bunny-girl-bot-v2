import fetch from 'node-fetch'
import { sendSmart } from '../../lib/serializer.js'
import axios from 'axios'
import config from '../../config.js'

function formatDuration(secs) {
  if (typeof secs === 'string' && secs.includes(':')) return secs
  const m = Math.floor(secs / 60)
  const s = String(secs % 60).padStart(2, '0')
  return `${m}:${s}`
}

async function dzApi(endpoint) {
  const { data } = await axios.get(`https://api.deezer.com/${endpoint}`)
  return data
}

async function executeDeezerDownload(conn, m, chatId, url, userDb) {
  if (userDb.kogen < 1) {
    await m.reply(`*⌬┤ ${config.PREMIUM_SYMBOL} ├⌬ SIN ${config.PREMIUM_NAME.toUpperCase()}.*\n> Necesitás *1 ${config.PREMIUM_NAME}* para descargar.\n> Usá *!kbuy <cantidad>* o *!kbuy all*.`)
    return
  }
  
  await conn.sendMessage(chatId, { react: { text: '⏳', key: m.key } })

  try {
    const response = await fetch(`https://luxinfinity.vercel.app/api/deezer?url=${encodeURIComponent(url)}`)
    const json = await response.json()

    if (!json.status || !json.data) throw new Error('No se pudo obtener el archivo.')

    const data = json.data
    const captionText = `*⌬┤ 🎵 ├⌬ ${data.name}*\n> 👤 *${data.artist}*\n> 💿 *${data.album}*\n> 📅 *Año:* ${data.year || '—'}\n> ⏱️ *${data.duration}*\n> 🔗 ${url}`

    await conn.sendMessage(chatId, {
      image: { url: data.cover },
      caption: captionText
    }, { quoted: m })

    const buffer = Buffer.from(await (await fetch(data.mp3)).arrayBuffer())

    await conn.sendMessage(chatId, {
      document: buffer,
      mimetype: 'audio/mpeg',
      fileName: `${data.name} - ${data.artist}.mp3`,
      caption: `🎶 ${data.name} — ${data.artist}`,
    }, { quoted: m })

    userDb.kogen -= 1
    await conn.sendMessage(chatId, { text: `${config.PREMIUM_SYMBOL} Utilizaste *1 ${config.PREMIUM_NAME}*` }, { quoted: m })
    await conn.sendMessage(chatId, { react: { text: '✅', key: m.key } })
  } catch (e) {
    await conn.sendMessage(chatId, { react: { text: '❌', key: m.key } })
    m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo completar la descarga.`)
  }
}

const handler = async (m, { conn, command, text, usedPrefix, userDb }) => {
  let query = text ? text.trim() : ''
  if (!query && m.quoted) {
    const quotedText = m.quoted.body || m.quoted.text || ''
    const match = quotedText.match(/https?:\/\/[^\s]+/i)
    if (match) query = match[0]
    else query = quotedText.trim()
  }

  const chatId = m.chat

  if (command === 'dzdl') {
    if (!query) return
    const url = query.startsWith('http') ? query : `https://www.deezer.com/track/${query}`
    await m.reply(`*⌬┤ ⏳ ├⌬ DESCARGANDO...*`)
    await executeDeezerDownload(conn, m, chatId, url, userDb)
    return
  }

  if (!query) return m.reply(`*⌬┤ ✙ ├⌬ USO.*\n> *${usedPrefix}deezer <canción o link>*\n> *${usedPrefix}dzalbum <álbum>*\n> *${usedPrefix}dzartist <artista>*\n> *${usedPrefix}dztracks <id>*\n> *${usedPrefix}dztop <id>*`)

  if (['dzalbum', 'deezeralbum'].includes(command)) {
    await m.reply(`*⌬┤ 🔎 ├⌬ Buscando...*`)
    try {
      const res = await dzApi(`search/album?q=${encodeURIComponent(query)}&limit=6`)
      if (!res.data || !res.data.length) return m.reply(`*⌬┤ ❌ ├⌬ SIN RESULTADOS.*`)

      const lines = res.data.map((a, i) =>
        `*${i + 1}.* ${a.title} — _${a.artist.name}_\n> 🎵 ${a.nb_tracks} tracks\n> 🆔 \`${a.id}\` | 🔗 ${a.link}`
      ).join('\n\n')

      await conn.sendMessage(chatId, {
        image: { url: res.data[0].cover_xl || res.data[0].cover_medium },
        caption: `*⌬┤ 💿 ├⌬ ÁLBUMES — "${query}"*\n\n${lines}`,
      }, { quoted: m })
    } catch (e) {
      m.reply(`*⌬┤ ❌ ├⌬ ERROR.*`)
    }
  }

  else if (['dzartist', 'deezerartist'].includes(command)) {
    await m.reply(`*⌬┤ 🔎 ├⌬ Buscando...*`)
    try {
      const res = await dzApi(`search/artist?q=${encodeURIComponent(query)}&limit=6`)
      if (!res.data || !res.data.length) return m.reply(`*⌬┤ ❌ ├⌬ SIN RESULTADOS.*`)

      const lines = res.data.map((a, i) =>
        `*${i + 1}.* ${a.name}\n> 👥 ${(a.nb_fan || 0).toLocaleString()} fans\n> 🆔 \`${a.id}\` | 🔗 ${a.link}`
      ).join('\n\n')

      await conn.sendMessage(chatId, {
        image: { url: res.data[0].picture_xl || res.data[0].picture_medium },
        caption: `*⌬┤ 👤 ├⌬ ARTISTAS — "${query}"*\n\n${lines}`,
      }, { quoted: m })
    } catch (e) {
      m.reply(`*⌬┤ ❌ ├⌬ ERROR.*`)
    }
  }

  else if (['dztracks', 'deezertracks'].includes(command)) {
    if (isNaN(query)) return m.reply(`*⌬┤ ✙ ├⌬ FALTA EL ID.*`)
    await m.reply(`*⌬┤ 🔎 ├⌬ Buscando...*`)
    try {
      const album = await dzApi(`album/${query}`)
      const lines = album.tracks.data.map((tr, i) => `*${i + 1}.* ${tr.title} _${formatDuration(tr.duration)}_`).join('\n')
      const header = `*⌬┤ 💿 ├⌬ ${album.title}* — _${album.artist.name}_\n\n`
      await conn.sendMessage(chatId, {
        image: { url: album.cover_xl || album.cover_medium },
        caption: header + lines,
      }, { quoted: m })
    } catch (e) {
      m.reply(`*⌬┤ ❌ ├⌬ ERROR.*`)
    }
  }

  else if (['dztop', 'deezertop'].includes(command)) {
    if (isNaN(query)) return m.reply(`*⌬┤ ✙ ├⌬ FALTA EL ID.*`)
    await m.reply(`*⌬┤ 🔎 ├⌬ Buscando...*`)
    try {
      const artist = await dzApi(`artist/${query}`)
      const top = await dzApi(`artist/${query}/top?limit=10`)
      const lines = top.data.map((tr, i) => `*${i + 1}.* ${tr.title} — (${formatDuration(tr.duration)})`).join('\n')
      await conn.sendMessage(chatId, {
        image: { url: artist.picture_xl || artist.picture_medium },
        caption: `*⌬┤ 🎤 ├⌬ TOP — ${artist.name}*\n\n${lines}`,
      }, { quoted: m })
    } catch (e) {
      m.reply(`*⌬┤ ❌ ├⌬ ERROR.*`)
    }
  }

  else if (['deezer', 'dz', 'dzsearch', 'deezersearch', 'dldeezer', 'deezerdl'].includes(command)) {
    const isUrl = /deezer\.com|deezer\.page\.link/i.test(query)

    if (isUrl) {
      await m.reply(`*⌬┤ ⏳ ├⌬ DESCARGANDO...*`)
      await executeDeezerDownload(conn, m, chatId, query, userDb)
    } else {
      await m.reply(`*⌬┤ 🔎 ├⌬ Buscando...*`)
      try {
        const response = await fetch(`https://luxinfinity.vercel.app/api/search/deezer?query=${encodeURIComponent(query)}&limit=10&type=track`)
        const json = await response.json()
        const results = json.data

        if (!results || !results.length) return m.reply(`*⌬┤ ❌ ├⌬ SIN RESULTADOS.*`)

        const rows = results.map((r) => {
          let title = r.title.length > 24 ? r.title.substring(0, 24) : r.title
          let desc = `${r.artist.name} - ${r.album.title}`
          if (desc.length > 72) desc = desc.substring(0, 72)
          return { header: '', title: title, description: desc, id: `${usedPrefix}dzdl ${r.link}` }
        })

        const infoText = `*⌬┤ 🎵 ├⌬ DEEZER SEARCH*\n\n> *Búsqueda:* ${query}\n> *Resultados:* ${results.length}\n\n> *Selecciona una canción de la lista.*`
        
        const nativeFlowButtons = [{
          text: `Ver Resultados ⚙️`,
          sections: [{ title: `✧ Selecciona un Track ✧`, rows: rows }]
        }]

        await sendSmart(conn, m, {
          image: { url: results[0].album.cover_big || results[0].album.cover },
          caption: infoText,
          footer: config.botName,
          buttons: nativeFlowButtons,
          headerType: 4,
          mentions: [m.sender]
        }, {}, userDb)

      } catch (e) {
        m.reply(`*⌬┤ ❌ ├⌬ ERROR.*`)
      }
    }
  }
}

handler.help = [`deezer <búsqueda/link> ${config.PREMIUM_SYMBOL}`]
handler.command = ['deezer', 'dz', 'dzsearch', 'deezersearch', 'dldeezer', 'deezerdl', 'dzalbum', 'deezeralbum', 'dzartist', 'deezerartist', 'dztracks', 'deezertracks', 'dztop', 'deezertop', 'dzdl']
handler.tags = ['descargas']

export default handler