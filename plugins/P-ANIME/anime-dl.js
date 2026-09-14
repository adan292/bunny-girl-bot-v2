import axios from 'axios'
import { sendSmart } from '../../lib/serializer.js'
import { createWriteStream, unlinkSync, existsSync } from 'fs'
import { pipeline } from 'stream/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { File as MegaFile } from 'megajs'
import { aflvSearch, aflvDownload, tioSearch, tioInfo, tioDownload } from '@axel-dev09/zen-dl'

const UA = 'Mozilla/5.0 (Linux; Android 11; Redmi Note 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
const JIKAN = 'https://api.jikan.moe/v4'

function buildMarco(lines) {
  return [
    `╭▼△▼△▼△▼△▼△▼△▼△▼△▼`,
    ...lines.map(l => `├ׁ̟̇❯❯ ${l}`),
    `┖┴▼△▼△▼△▼△▼△▼△▼△▼△▼`,
  ].join('\n')
}

function chunkEps(eps, size = 24) {
  const chunks = []
  for (let i = 0; i < eps.length; i += size) chunks.push(eps.slice(i, i + size))
  return chunks
}

async function traducir(texto) {
  if (!texto) return texto
  try {
    const partes = texto.match(/.{1,450}/g) || []
    let resultado = ''
    for (const parte of partes) {
      const { data } = await axios.get(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(parte)}&langpair=en|es`)
      resultado += (data.responseData.translatedText || parte) + ' '
    }
    return resultado.trim()
  } catch {
    return texto
  }
}

async function jikanInfo(title) {
  try {
    const { data } = await axios.get(`${JIKAN}/anime`, { params: { q: title, limit: 1 }, timeout: 10000 })
    const a = data?.data?.[0]
    if (!a) return null
    return {
      thumb: a.images?.jpg?.large_image_url || a.images?.jpg?.image_url || null,
      type: a.type || null,
      year: a.year || a.aired?.prop?.from?.year || null,
      status: a.status || null,
      episodes: a.episodes || null,
      duration: a.duration || null,
      score: a.score ? `${a.score}/10` : null,
      genres: a.genres?.map(g => g.name).join(', ') || null,
      studio: a.studios?.[0]?.name || null,
      rating: a.rating || null,
      desc: a.synopsis?.replace(/\[Written by MAL Rewrite\]/g, '').trim() || null,
    }
  } catch { return null }
}

async function downloadFromMega(rawUrl, filePath) {
  let str = decodeURIComponent(rawUrl).replace(/&amp;/g, '&')
  const iframeMatch = str.match(/src=["'](https?:\/\/[^"']+)["']/i)
  if (iframeMatch) str = iframeMatch[1]
  const megaMatch = str.match(/(?:https?:\/\/)?(?:www\.)?mega\.(?:nz|co\.nz)\/(?:file\/|embed\/?|e\/|#!)?[^"'\s]+/i)
  if (!megaMatch) throw new Error('El link proporcionado por la página no es de Mega o es inválido.')
  let cleanUrl = megaMatch[0].replace('mega.co.nz', 'mega.nz').replace(/\/embed\/?#!/i, '/#!').replace(/\/embed\//i, '/file/').replace(/\/e\//i, '/file/')
  if (!cleanUrl.includes('#') && !cleanUrl.includes('!')) throw new Error('Link incompleto.')
  const file = MegaFile.fromURL(cleanUrl)
  await file.loadAttributes()
  const stream = file.download()
  await pipeline(stream, createWriteStream(filePath))
}

async function downloadToFile(url, filePath) {
  const { data } = await axios.get(url, { headers: { 'User-Agent': UA, 'Referer': 'https://www.yourupload.com/' }, responseType: 'stream', timeout: 180000 })
  await pipeline(data, createWriteStream(filePath))
}

async function buscar(query) {
  try {
    const res = await tioSearch(query, 10)
    if (res.length) return { results: res, fuente: 'tio' }
  } catch {}
  const res = await aflvSearch(query, 10)
  return { results: res, fuente: 'aflv' }
}

if (!global.animeSearchCache) global.animeSearchCache = new Map()

const handler = async (m, { conn, args, usedPrefix, userDb }) => {
  const query = args.join(' ').trim()
  if (!query) return m.reply(`*⌬┤ ✙ ├⌬ USO.*\n> *${usedPrefix}anime <nombre>*`)

  await m.reply(`*⌬┤ 🔍 ├⌬ BUSCANDO...*\n> Buscando *${query}* en la base de datos.`)

  let results, fuente
  try {
    ;({ results, fuente } = await buscar(query))
  } catch {
    return m.reply(`*⌬┤ ✙ ├⌬ SIN RESULTADOS.*\n> No encontré resultados para *${query}*.`)
  }

  if (!results.length) return m.reply(`*⌬┤ ✙ ├⌬ SIN RESULTADOS.*\n> No encontré resultados para *${query}*.`)

  global.animeSearchCache.set(m.chat, { results, fuente, step: 'search', userJid: m.sender })

  const rows = results.map((a, i) => ({
    header: '',
    title: `${i + 1}. ${a.title}`.substring(0, 24),
    description: (a.type || 'Anime').substring(0, 72),
    id: `anime_sel_${i}`
  }))

  await sendSmart(conn, m, {
    text: `[ 🎌 ] *ANIME SEARCH*\n\n> *${results.length} resultados para:* _${query}_`,
    footer: `TioAnime + AnimeFlv`,
    buttons: [{
      text: 'Ver resultados',
      sections: [{ title: '🎌 RESULTADOS', rows }]
    }],
  }, {}, userDb)
}

handler.all = async function (m, { conn, userDb }) {
  if (!m.responseId || !m.responseId.startsWith('anime_')) return false

  const cached = global.animeSearchCache.get(m.chat)
  if (!cached) return false
  if (cached.userJid !== m.sender) return m.reply(`*⌬┤ 🚫 ├⌬ BLOQUEADO.*\n> Esta búsqueda la hizo otro usuario.`)

  const responseId = m.responseId

  if (responseId.startsWith('anime_sel_') && cached.step === 'search') {
    const idx = parseInt(responseId.replace('anime_sel_', ''))
    const anime = cached.results[idx]
    if (!anime) return false

    await m.reply(`*⌬┤ ⏳ ├⌬ CARGANDO INFO...*\n> Obteniendo detalles de *${anime.title}*...`)

    let tioData, jikan
    try {
      ;[tioData, jikan] = await Promise.all([ tioInfo(anime.slug).catch(()=>({title: anime.title})), jikanInfo(anime.title) ])
    } catch (e) {
      return m.reply(`*⌬┤ ✙ ├⌬ ERROR.*\n> ${e.message}`)
    }

    const nd = '—'
    const [statusT, genresT, descT] = await Promise.all([
      traducir(jikan?.status || nd), traducir(jikan?.genres || nd), traducir((jikan?.desc || tioData.desc || nd).substring(0, 450))
    ])

    const info = {
      title: tioData.title || anime.title,
      slug: anime.slug,
      thumb: jikan?.thumb || tioData.thumb || 'https://files.catbox.moe/9zzegh.jpg',
      type: jikan?.type || tioData.type || nd,
      year: jikan?.year || tioData.year || nd,
      status: statusT || nd,
      episodes: tioData.episodes || jikan?.episodes || nd,
      duration: jikan?.duration || nd,
      score: jikan?.score || nd,
      genres: genresT || nd,
      studio: jikan?.studio || nd,
      rating: jikan?.rating || nd,
      desc: descT || nd,
      episodeList: tioData.episodeList || [],
    }

    global.animeSearchCache.set(m.chat, { ...cached, info, step: 'info', slug: anime.slug })

    const caption = [
      `[ 🎌 ] *ANIME ENCONTRADO*`, '',
      buildMarco([
        `▢ *Nombre:* ${info.title}`, `▢ *Tipo:* ${info.type}`, `▢ *Año:* ${info.year}`, `▢ *Estado:* ${info.status}`,
        `▢ *Episodios:* ${info.episodes}`, `▢ *Duración:* ${info.duration}`, `▢ *Puntuación:* ${info.score}`,
        `▢ *Géneros:* ${info.genres}`, `▢ *Estudio:* ${info.studio}`, `▢ *Rating:* ${info.rating}`,
      ]), '', `📝 *Sinopsis:*\n${info.desc}`,
    ].join('\n')

    const chunks = chunkEps(info.episodeList || Array.from({length: parseInt(info.episodes)||0}, (_, i) => i + 1))
    const sections = chunks.length
      ? chunks.map(chunk => ({
          title: `Eps ${chunk[0]}–${chunk[chunk.length - 1]}`,
          rows: chunk.map(ep => ({ header: '', title: `Episodio ${ep}`, description: info.title.substring(0, 72), id: `anime_ep_${ep}` }))
        }))
      : [{ title: `📺 EPISODIOS`, rows: [{ header: '', title: 'Sin episodios', description: '', id: 'anime_noop' }] }]

    await sendSmart(conn, m, {
      image: { url: info.thumb },
      caption: caption,
      footer: `TioAnime · MyAnimeList`,
      buttons: [{ text: `Ver episodios`, sections }]
    }, {}, userDb)

    return true
  }

  if (responseId.startsWith('anime_ep_') && cached.step === 'info') {
    const ep = parseInt(responseId.replace('anime_ep_', ''))
    const { info, fuente, slug } = cached

    if (userDb.kogen < 1) {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      return m.reply(`*⌬┤ 💎 ├⌬ SIN KŌGEN.*\n> No tenés suficientes Kōgen para descargar este episodio.`)
    }

    const tmpFile = join(tmpdir(), `anime_${slug}_ep${ep}_${Date.now()}.mp4`)

    try {
      const descargarFn = fuente === 'tio' ? tioDownload : aflvDownload
      const result = await descargarFn(slug, ep)
      const serverUsed = result.server || 'mega'

      await m.reply(`*⌬┤ ⏳ ├⌬ DESCARGANDO...*\n> Episodio *${ep}* de *${info.title}*.\n> Servidor: *${serverUsed.toUpperCase()}*\n> Esto puede tardar unos minutos.`)
      await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

      if (serverUsed === 'mega') await downloadFromMega(result.url, tmpFile)
      else await downloadToFile(result.url, tmpFile)

      await conn.sendMessage(m.chat, {
        video: { url: tmpFile },
        caption: `*⌬┤ ✅ ├⌬ LISTO.*\n▢ *Anime:* ${info.title}\n▢ *Episodio:* ${ep}\n▢ *Servidor:* ${serverUsed.toUpperCase()}`,
        mimetype: 'video/mp4', fileName: `${slug}-ep${ep}.mp4`,
      }, { quoted: m })

      userDb.kogen -= 1
      await conn.sendMessage(m.chat, { text: `✦ Utilizaste *1 Kōgen*` }, { quoted: m })
      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

    } catch (e) {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      const errTxt = e.message?.includes('YourUpload')
        ? `*⌬┤ ✙ ├⌬ SIN SERVIDOR.*\n> Ningún servidor disponible para el ep *${ep}*. Intenta con otro.`
        : `*⌬┤ ✙ ├⌬ ERROR.*\n> ${e.message}`
      await m.reply(errTxt)
    } finally {
      if (existsSync(tmpFile)) unlinkSync(tmpFile)
    }

    return true
  }
}

handler.command = ['anime', 'animeflv', 'buscanime']
handler.tags = ['anime']
handler.help = ['anime <nombre>']
export default handler
