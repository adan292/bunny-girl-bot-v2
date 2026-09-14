import fetch from 'node-fetch'
import { pinsearch } from '../../lib/scrapers/pinterest.js'
import * as baileysMod from '@whiskeysockets/baileys'

const pkg = baileysMod.default && Object.keys(baileysMod).length === 1 ? baileysMod.default : baileysMod
const { generateWAMessageFromContent, generateWAMessage } = pkg

const pinCache    = new Map()
const pinEnviados = new Map()

const IMG_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 11; Redmi Note 8) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
  'Referer':    'https://www.pinterest.com/',
  'Accept':     'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
}

async function fetchImageBuffer(url) {
  const res = await fetch(url, { headers: IMG_HEADERS, timeout: 20000 })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const ct = res.headers.get('content-type') || ''
  if (!ct.startsWith('image/')) throw new Error(`Content-Type inválido: ${ct}`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 2000) throw new Error(`Buffer muy pequeño: ${buf.length}b`)
  return buf
}

async function getPins(text, sender) {
  const cacheKey = 'pinv3:' + text
  const sentKey  = `sent:${sender}:${text}`

  let lista = pinCache.get(cacheKey)
  if (!lista) {
    const results = await pinsearch(text, 80) 
    if (!results?.length) return null
    lista = results.filter(r => r.image && r.pinId).sort(() => Math.random() - 0.5)
    pinCache.set(cacheKey, lista)
    setTimeout(() => pinCache.delete(cacheKey), 1000 * 60 * 60)
  }

  const enviados   = pinEnviados.get(sentKey) || new Set()
  let disponibles  = lista.filter(r => !enviados.has(r.pinId))
  if (disponibles.length < 6) {
    enviados.clear()
    disponibles = [...lista].sort(() => Math.random() - 0.5)
  }

  const pool = disponibles.slice(0, 12)
  pool.forEach(e => enviados.add(e.pinId))
  pinEnviados.set(sentKey, enviados)

  return pool
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) return m.reply(`*⌬┤ ✙ ├⌬ USO.*\n> *${usedPrefix}${command} <búsqueda>*`)

  const query = text.trim()
  await m.reply(`*⌬┤ ⏳ ├⌬ Buscando en Pinterest...*`)

  try {
    const pool = await getPins(query, m.sender)
    if (!pool) return m.reply(`*⌬┤ ✙ ├⌬ SIN RESULTADOS.*\n> No se encontraron imágenes para *${query}*.`)

    const validas = []
    for (const item of pool) {
      if (validas.length >= 6) break
      try {
        const buf = await fetchImageBuffer(item.image)
        validas.push({ buf, pinId: item.pinId })
      } catch {
      }
    }

    if (!validas.length) return m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo cargar ninguna imagen. Intentá de nuevo.`)

    const album = generateWAMessageFromContent(m.chat, {
      albumMessage: {
        expectedImageCount: validas.length,
        contextInfo: { stanzaId: m.key.id, participant: m.key.participant || m.key.remoteJid, quotedMessage: m.message }
      }
    }, {})
    await conn.relayMessage(m.chat, album.message, { messageId: album.key.id })

    for (let i = 0; i < validas.length; i++) {
      try {
        const msg = await generateWAMessage(m.chat, {
          image:   validas[i].buf,
          caption: i === 0 ? `*⌬┤ 📌 ├⌬ PINTEREST*\n> 🔎 *${query}*` : ''
        }, { upload: conn.waUploadToServer })
        msg.message.messageContextInfo = { messageAssociation: { associationType: 1, parentMessageKey: album.key } }
        await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
      } catch {}
    }

  } catch (e) {
    await m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo completar la búsqueda.`)
  }
}

handler.help    = ['pinimg <búsqueda>']
handler.command = ['pin', 'pinterest', 'pinimg', 'pinterestimg', 'pinterestbuscar', 'pinsearch']
handler.tags    = ['busquedas']

export default handler
