import fetch from 'node-fetch'

const MAX_REINTENTOS = 3
const ESPERA_BASE_MS = 1500
const dormir = ms => new Promise(r => setTimeout(r, ms))

async function fetchJson(url, opciones = {}, intentos = MAX_REINTENTOS) {
  let ultimoError
  for (let intento = 1; intento <= intentos; intento++) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 25000)
    try {
      const res = await fetch(url, {
        ...opciones,
        signal: ctrl.signal,
        headers: {
          'user-agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
          'accept': 'application/json',
          'referer': 'https://www.tikwm.com/',
          ...(opciones.headers || {})
        }
      })
      clearTimeout(timer)
      if (!res.ok) throw new Error('HTTP ' + res.status)
      return await res.json()
    } catch (e) {
      ultimoError = e
      console.log(`[tiktok] ⚠️ Intento ${intento} falló: ${e.message}`)
      clearTimeout(timer)
      if (intento < intentos) await dormir(ESPERA_BASE_MS * intento)
    }
  }
  throw ultimoError || new Error('Fallaron todos los intentos')
}

async function fetchBuffer(url, intentos = 2) {
  let ultimoError
  for (let i = 1; i <= intentos; i++) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 30000)
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: {
          'user-agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120',
          'referer': 'https://www.tikwm.com/'
        }
      })
      clearTimeout(timer)
      if (!res.ok) throw new Error('HTTP ' + res.status)
      return Buffer.from(await res.arrayBuffer())
    } catch (e) {
      ultimoError = e
      clearTimeout(timer)
      if (i < intentos) await dormir(1000 * i)
    }
  }
  throw ultimoError
}

export default {
  command: ['tiktok', 'tt'],
  category: 'downloads',
  description: 'Descargar un video de TikTok.',
  run: async ({ msg, sock, args, usedPrefix, command }) => {
    if (!args.length) {
      return msg.reply(
        `《✧》 Por favor, ingresa un enlace de TikTok.\n` +
        `Ejemplo: *${usedPrefix}tiktok* https://vt.tiktok.com/xxxxx`
      )
    }
    const text = args.join(' ').trim()
    const isUrl = /(?:https?:?\/{2})?(?:w{3}|vm|vt|t)?\.?tiktok\.com\/[^\s&]+/i.test(text)
    if (!isUrl) {
      return msg.reply('《✧》 Por favor ingresa un enlace *válido* de TikTok.')
    }

    // Extraer URL limpia (si es vm.tiktok.com o vt.tiktok.com seguir redirect)
    let url = text.match(/(?:https?:\/\/)?(?:vm|vt|www|t)\.?tiktok\.com\/[^\s&]+/i)?.[0]
    if (!url) return msg.reply('《✧》 No se pudo extraer el enlace.')
    if (!/^https?:\/\//.test(url)) url = 'https://' + url.replace(/^\/+/, '')

    try {
      await msg.react('🕒')

      // tikwm.com — sin API key, devuelve cover, play (sin marca de agua), hdplay, music, stats
      const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`
      const json = await fetchJson(apiUrl)
      if (json.code !== 0 || !json.data) {
        throw new Error(json.msg || 'No se pudo obtener el video')
      }
      const d = json.data
      const videoUrl = d.hdplay || d.play || d.wmplay
      if (!videoUrl) throw new Error('No hay enlace de video')

      const author = d.author || {}
      const stats = {
        likes: d.digg_count || 0,
        comments: d.comment_count || 0,
        shares: d.share_count || 0,
        views: d.play_count || 0
      }
      const caption =
        `ㅤ۟∩　ׅ　★ ໌　ׅ　🅣𝗂𝗄𝖳𝗈𝗄 🅓ownload　ׄᰙ\n\n` +
        `𖣣ֶㅤ֯⌗ ✎  ׄ ⬭ *Título:* ${d.title || 'Sin título'}\n` +
        `𖣣ֶㅤ֯⌗ ꕥ  ׄ ⬭ *Autor:* ${author.nickname || author.unique_id || 'Desconocido'}${author.unique_id ? ' @' + author.unique_id : ''}\n` +
        `𖣣ֶㅤ֯⌗ ⴵ  ׄ ⬭ *Duración:* ${d.duration ? d.duration + 's' : 'N/A'}\n` +
        `𖣣ֶㅤ֯⌗ ❖  ׄ ⬭ *Likes:* ${Number(stats.likes).toLocaleString()}\n` +
        `𖣣ֶㅤ֯⌗ ❀  ׄ ⬭ *Comentarios:* ${Number(stats.comments).toLocaleString()}\n` +
        `𖣣ֶㅤ֯⌗ ✿  ׄ ⬭ *Vistas:* ${Number(stats.views).toLocaleString()}\n` +
        `𖣣ֶㅤ֯⌗ ☆  ׄ ⬭ *Compartidos:* ${Number(stats.shares).toLocaleString()}\n` +
        `𖣣ֶㅤ֯⌗ ❒  ׄ ⬭ *Sonido:* ${d.music_info?.title || 'audio original'}`.trim()

      // Enviar miniatura con info SI la cover es accesible; si no, enviar solo el caption
      const coverSent = await (async () => {
        if (!d.cover) return false
        try {
          const coverBuf = await fetchBuffer(d.cover)
          if (!coverBuf || coverBuf.length < 200) return false
          await sock.sendMessage(msg.chat, {
            image: coverBuf,
            caption
          }, { quoted: msg })
          return true
        } catch (e) {
          console.log('[tiktok] cover falló, enviando sin miniatura:', e.message)
          return false
        }
      })()
      if (!coverSent) await msg.reply(caption)

      // Enviar video con Buffer (descargamos a buffer para evitar links firmados que expiren)
      const videoBuf = await fetchBuffer(videoUrl)
      if (videoBuf && videoBuf.length > 1024) {
        await sock.sendMessage(msg.chat, {
          video: videoBuf,
          mimetype: 'video/mp4',
          fileName: `tiktok_${d.id || Date.now()}.mp4`
        }, { quoted: msg })
      } else {
        // Fallback: enviar por URL si la descarga a buffer falló
        await sock.sendMessage(msg.chat, {
          video: { url: videoUrl },
          mimetype: 'video/mp4',
          caption: '⚠️ Video enviado por enlace directo (calidad puede variar).'
        }, { quoted: msg })
      }

      // Enviar audio/música si existe
      if (d.music) {
        try {
          const audioBuf = await fetchBuffer(d.music)
          if (audioBuf && audioBuf.length > 1024) {
            await sock.sendMessage(msg.chat, {
              audio: audioBuf,
              mimetype: 'audio/mpeg',
              fileName: sanitize(d.music_info?.title || 'tiktok_audio') + '.mp3'
            }, { quoted: msg })
          }
        } catch (e) {
          console.log('[tiktok] audio falló:', e.message)
        }
      }

      await msg.react('✔️')
    } catch (e) {
      console.error('[tiktok] error:', e)
      await msg.react('✖️')
      await msg.reply(
        `> Error al descargar de TikTok después de ${MAX_REINTENTOS} intentos: ${e?.message || 'error desconocido'}\n` +
        `> Verifica que el enlace sea público y no haya sido eliminado, e intenta de nuevo.`
      )
    }
  }
}

function sanitize(s = 'audio') {
  return String(s).replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80) || 'audio'
}
