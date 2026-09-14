/*
 * © Created by AxelDev09 🔥
 */

import axios from 'axios'
import * as cheerio from 'cheerio'
import { createContext, runInContext } from 'vm'

const UA      = 'Mozilla/5.0 (Linux; Android 11; Redmi Note 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
const BASE    = 'https://snaptik.app'
const HEADERS = { 'User-Agent': UA }

function decodeObfuscated(jsCode) {
  const patched = jsCode
    .replace(/eval\(function\(h,u,n,t,e,r\)/, 'decoded=(function(h,u,n,t,e,r)')
    .replace(/\}\)\s*$/, '})')
  try {
    const ctx = createContext({ decoded: '' })
    runInContext(patched, ctx, { timeout: 5000 })
    return ctx.decoded || ''
  } catch { return '' }
}

function extractInnerHTML(decoded) {
  const marker = 'innerHTML = "'
  const idx    = decoded.indexOf(marker)
  if (idx === -1) return ''
  const start = idx + marker.length
  const end   = decoded.indexOf('"; $(', start)
  if (end === -1) return ''
  return decoded.slice(start, end)
    .replace(/\\"/g, '"')
    .replace(/\\n/g,  '\n')
    .replace(/\\\//g, '/')
}

export async function snaptikDownload(url) {
  if (!url?.trim()) throw new Error('Se requiere una URL de TikTok')

  const r0 = await axios.get(`${BASE}/en2`, {
    headers: HEADERS,
    timeout: 12000,
  })
  const $0      = cheerio.load(r0.data)
  const token   = $0('input[name="token"]').val() || ''
  const cookies = r0.headers['set-cookie']?.map(c => c.split(';')[0]).join('; ') || ''

  if (!token) throw new Error('No se pudo obtener el token de snaptik')

  const params = new URLSearchParams({ url, token, lang: 'en2' })
  const { data } = await axios.post(`${BASE}/abc2.php`, params, {
    headers: {
      ...HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer':      `${BASE}/en2`,
      'Origin':       BASE,
      'Cookie':       cookies,
    },
    timeout: 15000,
  })

  const raw     = typeof data === 'string' ? data : JSON.stringify(data)
  const decoded = decodeObfuscated(raw)

  if (!decoded) throw new Error('No se pudo decodificar el response de snaptik')

  if (decoded.includes('showAlert')) {
    const msgMatch = decoded.match(/showAlert\("([^"]+)"/)
    throw new Error(msgMatch?.[1] || 'Error en snaptik al procesar la URL')
  }

  const html = extractInnerHTML(decoded)
  if (!html) throw new Error('No se encontró HTML de descarga en el response')

  const $ = cheerio.load(html)

  const title     = $('.video-title').text().trim()
  const thumbnail = $('#thumbnail').attr('src') || $('img.avatar').attr('src') || ''

  const btnToken = $('button.btn-render').attr('data-token') || ''
  if (btnToken) {
    let imageUrls = []
    try {
      const payload = btnToken.split('.')[1] || ''
      const json    = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'))
      imageUrls     = json.image_urls || []
    } catch {}

    if (!imageUrls.length) {
      $('img').each((_, el) => {
        const src = $(el).attr('src') || ''
        if (src.includes('tiktokcdn') && !src.includes('avatar')) {
          imageUrls.push(src)
        }
      })
      imageUrls = [...new Set(imageUrls)]
    }

    const downloadUrls = []
    $('a[href*="rapidcdn"]').each((_, el) => {
      const href = $(el).attr('href') || ''
      if (href) downloadUrls.push(href)
    })

    if (imageUrls.length || downloadUrls.length) {
      return {
        title,
        thumbnail,
        type: 'images',
        images: imageUrls,
        imagesWm: downloadUrls,
        source: 'snaptik',
      }
    }
  }

  const sdUrl    = $('a.download-file').first().attr('href') || ''
  const hdApiUrl = $('button[data-tokenhd]').attr('data-tokenhd') || ''
  const hdBackup = $('button[data-backup]').attr('data-backup') || ''

  if (!sdUrl) throw new Error('No se encontró URL de descarga')

  return {
    title,
    thumbnail,
    type: 'video',
    download: {
      sd:    sdUrl,
      hd:    hdBackup || null,
      hdApi: hdApiUrl || null,
    },
    source: 'snaptik',
  }
}
