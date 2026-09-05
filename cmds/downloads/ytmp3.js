import yts from 'yt-search'
import fetch from 'node-fetch'
import { spawn } from 'child_process'

const MAX_REINTENTOS = 3
const ESPERA_BASE_MS = 1500
const PENDING_TTL_MS = 10 * 60 * 1000
const MAX_MB_AUDIO = 50 * 1024 * 1024
const MAX_MB_VIDEO = 100 * 1024 * 1024

const ALIAS_MENU = ['play']
const ALIAS_AUDIO_DIRECTO = ['mp3', 'ytmp3', 'ytaudio', 'playaudio', 'voice', 'ytvoice']

function getPendingMap(sock) {
  if (!sock._ginkoPlayPending) sock._ginkoPlayPending = new Map()
  return sock._ginkoPlayPending
}

function esIphone(m) {
  return /^3A.{18}$/.test(String(m?.key?.id || ''))
}

function dormir(ms) { return new Promise(r => setTimeout(r, ms)) }

function conTiempo(promesa, ms, etiqueta) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Tiempo de espera agotado (${Math.round(ms / 1000)}s): ${etiqueta}`)),
      ms
    )
  })
  return Promise.race([promesa, timeout]).finally(() => clearTimeout(timer))
}

function sanitizeFilename(name = 'audio') {
  return String(name)
    .replace(/\.(mp3|mp4|mkv|webm|mov|avi|m4a)$/i, '')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'audio'
}

function esMp3Valido(buf) {
  if (!buf || buf.length < 4) return false
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) return true
  if (buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0) return true
  return false
}

function esMp4Valido(buf) {
  if (!buf || buf.length < 12) return false
  try { return buf.slice(4, 8).toString('latin1') === 'ftyp' } catch { return false }
}

// Convierte MP3 en buffer a OPUS (OGG) usando ffmpeg y devuelve buffer
async function convertirMp3AOpusBuffer(mp3Buffer) {
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', [
      '-hide_banner', '-loglevel', 'error',
      '-i', 'pipe:0',
      '-c:a', 'libopus',
      '-b:a', '64k',
      '-vbr', 'on',
      '-f', 'ogg',
      'pipe:1'
    ])
    const chunks = []
    const errChunks = []

    ff.stdout.on('data', d => chunks.push(d))
    ff.stderr.on('data', d => errChunks.push(d))
    ff.on('error', err => reject(err))
    ff.on('close', code => {
      if (code !== 0) {
        const msg = Buffer.concat(errChunks).toString() || `ffmpeg exited ${code}`
        return reject(new Error(msg))
      }
      resolve(Buffer.concat(chunks))
    })

    try {
      ff.stdin.write(mp3Buffer)
      ff.stdin.end()
    } catch (err) { reject(err) }
  })
}

const isYTUrl = (url = '') =>
  /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/i.test(url)

const getVideoId = (text = '') => {
  const raw = String(text || '').trim()
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    /[?&]v=([a-zA-Z0-9_-]{11})/
  ]
  for (const pattern of patterns) {
    const m = raw.match(pattern)
    if (m?.[1]) return m[1]
  }
  return null
}

async function getVideoInfo(input, video_id) {
  const BUSQUEDA_TIMEOUT = 20000
  if (video_id) {
    try {
      const info = await conTiempo(
        yts({ videoId: video_id }),
        BUSQUEDA_TIMEOUT,
        'no se pudo obtener la información del video'
      )
      if (info?.videoId) {
        return { ...info, url: `https://youtu.be/${info.videoId}`, image: info.thumbnail || info.image }
      }
    } catch {}
  }
  const search = await conTiempo(
    yts(input),
    BUSQUEDA_TIMEOUT,
    'la búsqueda en YouTube tardó demasiado (revisa tu conexión)'
  )
  return search.videos?.[0] || search.all?.find(v => v.type === 'video') || null
}

async function getAudioFromApi(url) {
  const apiUrl = `https://api.lempi.lat/dl/yta?url=${encodeURIComponent(url)}&apikey=montekey28`
  const ctrlMeta = new AbortController()
  const toMeta = setTimeout(() => ctrlMeta.abort(), 25000)
  let res
  try {
    res = await fetch(apiUrl, { headers: { accept: 'application/json' }, signal: ctrlMeta.signal })
  } finally { clearTimeout(toMeta) }
  if (!res.ok) throw new Error(`API respondió HTTP ${res.status}`)
  const json = await res.json()
  if (!json?.status || !json?.datos?.url) throw new Error('La API no devolvió enlace de descarga')

  const ctrlAudio = new AbortController()
  const toAudio = setTimeout(() => ctrlAudio.abort(), 90000)
  let audioRes
  try {
    audioRes = await fetch(json.datos.url, { signal: ctrlAudio.signal })
  } finally { clearTimeout(toAudio) }
  if (!audioRes.ok) throw new Error(`Enlace de audio roto (HTTP ${audioRes.status})`)
  const buffer = Buffer.from(await audioRes.arrayBuffer())
  if (buffer.length < 50 * 1024) throw new Error(`Archivo demasiado pequeño (${buffer.length} bytes)`)
  return { buffer, name: json.datos.archivo || 'audio.mp3' }
}

async function getVideoFromApi(url) {
  const apiUrl = `https://api.lempi.lat/dl/ytv?url=${encodeURIComponent(url)}&apikey=montekey28`
  const ctrlMeta = new AbortController()
  const toMeta = setTimeout(() => ctrlMeta.abort(), 30000)
  let res
  try {
    res = await fetch(apiUrl, { headers: { accept: 'application/json', 'user-agent': 'Mozilla/5.0' }, signal: ctrlMeta.signal })
  } finally { clearTimeout(toMeta) }
  if (!res.ok) throw new Error(`API respondió HTTP ${res.status}`)
  const json = await res.json()
  if (!json?.status || !json?.datos?.url) throw new Error('La API no devolvió enlace de video')

  const ctrlVideo = new AbortController()
  const toVideo = setTimeout(() => ctrlVideo.abort(), 120000)
  let videoRes
  try {
    videoRes = await fetch(json.datos.url, { signal: ctrlVideo.signal, headers: { 'user-agent': 'Mozilla/5.0' } })
  } finally { clearTimeout(toVideo) }
  if (!videoRes.ok) throw new Error(`Enlace de video roto (HTTP ${videoRes.status})`)
  const buffer = Buffer.from(await videoRes.arrayBuffer())
  if (buffer.length < 100 * 1024) throw new Error(`Archivo demasiado pequeño (${buffer.length} bytes)`)
  return { buffer, name: json.datos.archivo || 'video.mp4', calidad: json.datos.calidad || '360p' }
}

async function descargarAudio(url) {
  let ultimo = null
  for (let i = 1; i <= MAX_REINTENTOS; i++) {
    try {
      const r = await getAudioFromApi(url)
      if (r?.buffer?.length && esMp3Valido(r.buffer)) return r
      ultimo = new Error('El archivo no es un MP3 válido')
    } catch (e) { ultimo = e }
    if (i < MAX_REINTENTOS) await dormir(ESPERA_BASE_MS * i)
  }
  throw ultimo || new Error('Fallaron todos los intentos')
}

async function descargarVideo(url) {
  let ultimo = null
  for (let i = 1; i <= MAX_REINTENTOS; i++) {
    try {
      const r = await getVideoFromApi(url)
      if (r?.buffer?.length && esMp4Valido(r.buffer)) return r
      ultimo = new Error('El archivo no es un MP4 válido')
    } catch (e) { ultimo = e }
    if (i < MAX_REINTENTOS) await dormir(ESPERA_BASE_MS * i)
  }
  throw ultimo || new Error('Fallaron todos los intentos')
}

function registrarListener(sock) {
  if (sock._ginkoPlayListener) return
  sock._ginkoPlayListener = true
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    for (const m of messages || []) {
      if (!m?.message || !m?.key?.id) continue
      if (m.key.fromMe) continue
      try { await procesarRespuesta(sock, m) } catch {}
    }
  })
}

async function procesarRespuesta(sock, m) {
  const pending = getPendingMap(sock)
  if (pending.size === 0) return

  const reaction = m.message?.reactionMessage
  if (reaction?.key?.id) {
    const emoji = String(reaction.text || '').trim()
    const job = pending.get(reaction.key.id)
    if (job && !job._procesando && !job._completado) {
      const mapeo = { '👍': 'audio', '❤️': 'video', '📄': 'audiodoc', '📁': 'videodoc', '🔊': 'voice' }
      const eleccion = mapeo[emoji]
      if (eleccion) await ejecutarDescarga(sock, job, eleccion, m)
    }
    return
  }

  let selectedId = ''
  let ctxStanzaId = ''

  const lrm = m.message?.listResponseMessage
  const brm = m.message?.buttonsResponseMessage
  const trm = m.message?.templateButtonReplyMessage
  const irm = m.message?.interactiveResponseMessage
  const nfrm = irm?.nativeFlowResponseMessage

  if (lrm?.singleSelectReply?.selectedRowId) {
    selectedId = String(lrm.singleSelectReply.selectedRowId)
    ctxStanzaId = lrm.contextInfo?.stanzaId || ''
  } else if (brm?.selectedButtonId) {
    selectedId = String(brm.selectedButtonId)
    ctxStanzaId = brm.contextInfo?.stanzaId || ''
  } else if (trm?.selectedId) {
    selectedId = String(trm.selectedId)
    ctxStanzaId = trm.contextInfo?.stanzaId || ''
  } else if (nfrm?.paramsJson) {
    try { const p = JSON.parse(typeof nfrm.paramsJson === 'string' ? nfrm.paramsJson : '{}'); selectedId = String(p.id || '') } catch {}
    ctxStanzaId = irm?.contextInfo?.stanzaId || nfrm.contextInfo?.stanzaId || ''
  } else if (irm?.body?.text) {
    selectedId = String(irm.body.text)
  }

  if (selectedId) {
    const job = ctxStanzaId ? pending.get(ctxStanzaId) : null
    if (job && !job._procesando && !job._completado) {
      await ejecutarDescarga(sock, job, selectedId, m)
      return
    }
    if (!ctxStanzaId) {
      const chat = m.key.remoteJid
      for (const [, j] of Array.from(pending.entries()).reverse()) {
        if (j.chat === chat && !j._procesando && !j._completado) { await ejecutarDescarga(sock, j, selectedId, m); return }
      }
    }
    return
  }

  const ext = m.message?.extendedTextMessage
  const texto = String(m.message?.conversation || ext?.text || '').trim().toLowerCase()
  const citado = ext?.contextInfo?.stanzaId
  if (citado && texto) {
    const job = pending.get(citado)
    if (job && !job._procesando && !job._completado) {
      const primera = texto.split(/\s+/)[0]
      if (['1','audio','mp3'].includes(primera)) await ejecutarDescarga(sock, job, 'audio', m)
      else if (['2','video','mp4'].includes(primera)) await ejecutarDescarga(sock, job, 'video', m)
      else if (['3','videodoc'].includes(primera)) await ejecutarDescarga(sock, job, 'videodoc', m)
      else if (['4','audiodoc'].includes(primera)) await ejecutarDescarga(sock, job, 'audiodoc', m)
      else if (['5','voice','voz','nota','voicenote','ptt'].includes(primera)) await ejecutarDescarga(sock, job, 'voice', m)
    }
  }
}

async function ejecutarDescarga(sock, job, modo, m) {
  job._procesando = true
  const chat = job.chat

  const id = String(modo || '').trim().toLowerCase()
  let tipo = 'audio', comoDoc = false
  if (id === '__ginko_pad' || id === 'audiodoc' || id === '4' || id === '📄') { tipo = 'audio'; comoDoc = true }
  else if (id === '__ginko_pa' || id === 'audio' || id === '1' || id === 'mp3' || id === '👍' || id === '🎵') { tipo = 'audio'; comoDoc = false }
  else if (id === '__ginko_pvd' || id === 'videodoc' || id === '3' || id === '📁') { tipo = 'video'; comoDoc = true }
  else if (id === '__ginko_pv' || id === 'video' || id === '2' || id === 'mp4' || id === '❤️' || id === '🎬') { tipo = 'video'; comoDoc = false }
  else if (id === 'voice' || id === 'ptt' || id === 'voz' || id === '5' || id === '🔊') { tipo = 'voice'; comoDoc = false }

  const reactionEmoji = tipo === 'audio' ? (comoDoc ? '📄' : '🎵') : (tipo === 'video' ? (comoDoc ? '📁' : '🎬') : '🔊')
  try { await sock.sendMessage(chat, { react: { text: reactionEmoji, key: m.key } }) } catch {}

  await sock.sendMessage(chat, {
    text: `⏳ Descargando ${tipo === 'audio' ? 'audio (MP3)' : tipo === 'video' ? 'video (MP4)' : 'nota de voz (PTT)'}${comoDoc ? ' como documento' : ''}...\n> *${job.title}*`
  }, { quoted: m })

  try {
    if (tipo === 'audio') {
      const r = await descargarAudio(job.url)
      if (r.buffer.length > MAX_MB_AUDIO) throw new Error(`El audio es demasiado grande (más de ${Math.round(MAX_MB_AUDIO/1024/1024)} MB)`) 
      await sock.sendMessage(chat, {
        [comoDoc ? 'document' : 'audio']: r.buffer,
        mimetype: 'audio/mpeg',
        fileName: `${sanitizeFilename(job.title)}.mp3`,
        ptt: false
      }, { quoted: m })
    } else if (tipo === 'voice') {
      const r = await descargarAudio(job.url)
      if (r.buffer.length > MAX_MB_AUDIO) throw new Error(`El audio es demasiado grande (más de ${Math.round(MAX_MB_AUDIO/1024/1024)} MB)`) 
      try {
        const opusBuf = await convertirMp3AOpusBuffer(r.buffer)
        // Enviar como nota de voz (OGG/Opus). Muchos clientes esperan audio/ogg; codecs=opus
        await sock.sendMessage(chat, {
          audio: opusBuf,
          mimetype: 'audio/ogg; codecs=opus',
          ptt: true,
          fileName: `${sanitizeFilename(job.title)}.ogg`
        }, { quoted: m })
      } catch (err) {
        // Fallback: enviar MP3 si la conversión falla
        await sock.sendMessage(chat, {
          [comoDoc ? 'document' : 'audio']: r.buffer,
          mimetype: 'audio/mpeg',
          fileName: `${sanitizeFilename(job.title)}.mp3`,
          ptt: false
        }, { quoted: m })
      }
    } else {
      const r = await descargarVideo(job.url)
      if (r.buffer.length > MAX_MB_VIDEO) throw new Error(`El video es demasiado grande (más de ${Math.round(MAX_MB_VIDEO/1024/1024)} MB)`) 
      if (!esMp4Valido(r.buffer)) {
        comoDoc = true
        await sock.sendMessage(chat, { text: '⚠️ La API no devolvió un MP4 válido, te lo envío como documento.' }, { quoted: m }).catch(() => {})
      }
      await sock.sendMessage(chat, {
        [comoDoc ? 'document' : 'video']: r.buffer,
        mimetype: 'video/mp4',
        fileName: `${sanitizeFilename(job.title)}.mp4`,
        caption: `乂 *Video descargado*\n> ❒ Título › *${job.title}*${r.calidad ? `\n> ❒ Calidad › *${r.calidad}*` : ''}`
      }, { quoted: m })
    }
    job._completado = true
    setTimeout(() => getPendingMap(sock).delete(job.cardId), 60_000)
  } catch (e) {
    job._procesando = false
    await sock.sendMessage(chat, {
      text: `❌ *Error al descargar:* ${e?.message || e}\n\n> Prueba con otro enlace o vuelve a intentarlo en unos segundos.`
    }, { quoted: m })
  }
}

const cmd = {
  command: [...ALIAS_MENU, ...ALIAS_AUDIO_DIRECTO],
  category: 'downloads',
  description: 'Descargar música/video de YouTube con menú de botones.',

  run: async ({ msg, sock, args, usedPrefix, command }) => {
    try {
      if (!args[0]) {
        return msg.reply(`《✧》Uso: *${usedPrefix}play <búsqueda o URL>*\nEj: *${usedPrefix}play* bad bunny diles`)
      }

      const input = args.join(' ').trim()
      const videoId = getVideoId(input)
      const query = videoId ? `https://youtu.be/${videoId}` : input

      try { await sock.sendMessage(msg.chat, { react: { text: '⏳', key: msg.key } }) } catch {}

      const info = await getVideoInfo(query, videoId)
      if (!info?.url) {
        try { await sock.sendMessage(msg.chat, { react: { text: '❌', key: msg.key } }) } catch {}
        return msg.reply('《✧》No se encontró un video válido de YouTube.')
      }
      const url = info.url
      const title = info.title || 'audio'
      const thumbnail = info.thumbnail || info.image || null
      const channel = info.author?.name || info.author || 'Desconocido'
      const duration = info.timestamp || 'Desconocido'
      const views = Number(info.views || 0).toLocaleString('es-HN')
      const ago = info.ago || 'Desconocido'

      if (ALIAS_AUDIO_DIRECTO.includes(command)) {
        const estado = await sock.sendMessage(msg.chat, { text: `⏳ Descargando *${title}*...` }, { quoted: msg }).catch(() => null)
        try {
          const r = await descargarAudio(url)
          if (command === 'voice' || command === 'ytvoice') {
            try {
              const opusBuf = await convertirMp3AOpusBuffer(r.buffer)
              await sock.sendMessage(msg.chat, { audio: opusBuf, mimetype: 'audio/ogg; codecs=opus', ptt: true, fileName: `${sanitizeFilename(title)}.ogg` }, { quoted: msg })
            } catch (err) {
              // fallback to mp3
              await sock.sendMessage(msg.chat, { audio: r.buffer, fileName: `${sanitizeFilename(title)}.mp3`, mimetype: 'audio/mpeg' }, { quoted: msg })
            }
          } else {
            await sock.sendMessage(msg.chat, { audio: r.buffer, fileName: `${sanitizeFilename(title)}.mp3`, mimetype: 'audio/mpeg' }, { quoted: msg })
          }
          try { if (estado?.key) await sock.sendMessage(msg.chat, { delete: estado.key }) } catch {}
        } catch (e) {
          await msg.reply(`《✧》No se pudo descargar el audio: ${e?.message || e}`)
        } finally {
          try { await sock.sendMessage(msg.chat, { react: { text: '✅', key: msg.key } }) } catch {}
        }
        return
      }

      registrarListener(sock)

      const usarBotones = !esIphone(msg)

      const infoTxt =
        `🎬 *RESULTADO ENCONTRADO*\n\n` +
        `> ❖ Título  › *${title}*\n` +
        `> ❖ Canal   › *${channel}*\n` +
        `> ⴵ Duración › *${duration}*\n` +
        `> ❀ Vistas  › *${views}*\n` +
        `> ✩ Publicado › *${ago}*\n` +
        `> ❒ Enlace › ${url}\n\n`

      const caption = usarBotones
        ? infoTxt +
          `🟢 *Toca el botón* de abajo para elegir formato:\n\n` +
          `🔵 Si el menú no se abre, *cita este mensaje* y escribe:\n` +
          `   *1* o *audio*   → Audio MP3 🎵\n` +
          `   *2* o *video*   → Video MP4 🎬\n` +
          `   *3* o *videodoc* → Video como documento 📁\n` +
          `   *4* o *audiodoc* → Audio como documento 📄\n` +
          `   *5* o *voice* → Nota de voz (PTT) 🔊`
        : infoTxt +
          `🟡 *Reacciona a este mensaje* con un emoji:\n` +
          `   👍  → Audio MP3 🎵\n` +
          `   ❤️  → Video MP4 🎬\n` +
          `   📄  → Audio como documento\n` +
          `   📁  → Video como documento\n` +
          `   🔊  → Nota de voz (PTT)\n\n` +
          `🔵 O bien *cita este mensaje* y escribe:\n` +
          `   *1* o *audio* / *2* o *video* / *3* o *videodoc* / *4* o *audiodoc* / *5* o *voice*`

      // Botones rápidos directos (formato buttonsMessage con type:1 = quick_reply).
      // Dos botones visibles directamente debajo de la imagen: Audio MP3 y Video MP4.
      // Las opciones de documento y ayuda extra siguen disponibles citando el
      // mensaje o por reacciones. Usamos 2 botones para máxima compatibilidad.
      const botonesRespuesta = usarBotones ? [
        {
          buttonId: '__ginko_pa',
          buttonText: { displayText: '🎵 Audio MP3' },
          type: 1
        },
        {
          buttonId: '__ginko_pv',
          buttonText: { displayText: '🎬 Video MP4' },
          type: 1
        }
      ] : []

      // Payload: imagen + caption + botones rápidos. headerType=4 = imagen.
      // footerText se usa en el formato buttonsMessage (no "footer").
      const payload = usarBotones && thumbnail
        ? {
            image: { url: thumbnail },
            caption,
            footerText: '❦ Bunny Girl · toca un botón',
            buttons: botonesRespuesta,
            headerType: 4
          }
        : thumbnail
          ? { image: { url: thumbnail }, caption }
          : { text: caption }

      let card
      const opts = { quoted: msg }
      try {
        card = await sock.sendMessage(msg.chat, payload, opts)
      } catch (e) {
        // Si los botones fallan, mandar solo la imagen sin botones (funciona por reacciones/citas)
        card = await sock.sendMessage(msg.chat, thumbnail ? { image: { url: thumbnail }, caption } : { text: caption }, opts).catch(async () =>
          await sock.sendMessage(msg.chat, { text: caption }, opts)
        )
      }

      if (!card?.key?.id) return msg.reply('❌ No se pudo enviar la tarjeta de opciones.')

      const job = {
        cardId: card.key.id, cardKey: card.key, chat: msg.chat,
        url, title, channel, duration, views, ago, thumbnail,
        pref: usedPrefix, commandMsg: msg,
        _createdAt: Date.now(), _procesando: false, _completado: false
      }
      getPendingMap(sock).set(card.key.id, job)
      setTimeout(() => {
        const p = getPendingMap(sock)
        const j = p.get(card.key.id)
        if (j && !j._procesando && !j._completado) p.delete(card.key.id)
      }, PENDING_TTL_MS)

      try { await sock.sendMessage(msg.chat, { react: { text: '✅', key: msg.key } }) } catch {}
    } catch (e) {
      try { await sock.sendMessage(msg.chat, { react: { text: '❌', key: msg.key } }) } catch {}
      msg.reply(`《✧》*Error:* ${e?.message || e}\n\n> Prueba de nuevo en unos segundos.`)
    }
  }
}

export default cmd
