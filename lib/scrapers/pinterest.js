/*
 * © Created by AxelDev09 🔥
 */

import axios from 'axios'
import * as cheerio from 'cheerio'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
}

function toOriginal(src) {
  return src.replace(/\/\d+x\//, '/originals/').replace(/\/\d+x\d+\//, '/originals/')
}

function isValidPin(src) {
  return (
    src.includes('i.pinimg.com') &&
    /\.(jpg|jpeg|png|webp)/.test(src) &&
    !src.includes('/60x60/') &&
    !src.includes('/videos/thumbnails/')
  )
}

function extractVidsFromHtml(html, limit) {
  const seen = new Set()
  const vids = []
  const RE   = /https:\/\/v\d+\.pinimg\.com\/videos\/[^\s"'\\]+\.mp4/g
  for (const m of html.matchAll(RE)) {
    const original = m[0]
    if (seen.has(original)) continue
    seen.add(original)
    const hd = original.replace(/\/\d+p\//, '/720p/')
    const sd = original.replace(/\/\d+p\//, '/480p/')
    vids.push({ video: hd, sd, original })
    if (vids.length >= limit) break
  }
  return vids
}

export async function pinvid(input, limit = 5) {
  if (input.includes('pinterest.com/pin/') || input.includes('pin.it/')) {
    let resolvedUrl = input
    if (input.includes('pin.it/')) {
      const r = await axios.get(input, { headers: HEADERS, maxRedirects: 5, timeout: 10000 })
      resolvedUrl = r.request?.res?.responseUrl || r.config?.url || input
    }
    const res  = await axios.get(resolvedUrl, { headers: HEADERS, timeout: 15000 })
    const vids = extractVidsFromHtml(res.data, limit)
    if (!vids.length) throw new Error('Este pin no tiene video')
    return vids.map((v, i) => ({ index: i + 1, ...v }))
  }

  const res  = await axios.get(
    `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(input + ' video')}`,
    { headers: HEADERS, timeout: 15000 }
  )
  const vids = extractVidsFromHtml(res.data, limit)
  if (!vids.length) throw new Error('Sin videos en Pinterest')
  return vids.map((v, i) => ({ index: i + 1, ...v }))
}

function extractFromHtml(html) {
  const $ = cheerio.load(html)
  const pinIds  = []
  const seenIds = new Set()
  $('a[href*="/pin/"]').each((_, el) => {
    const m = ($(el).attr('href') || '').match(/\/pin\/(\d+)/)
    if (m && !seenIds.has(m[1])) { seenIds.add(m[1]); pinIds.push(m[1]) }
  })
  if (!pinIds.length) {
    for (const m of html.matchAll(/"id"\s*:\s*"(\d{15,})"/g)) {
      if (!seenIds.has(m[1])) { seenIds.add(m[1]); pinIds.push(m[1]) }
    }
  }
  const imgList  = []
  const seenImgs = new Set()
  $('img').each((_, el) => {
    const src    = $(el).attr('src') || ''
    const srcset = $(el).attr('srcset') || ''
    const sources = [src, ...srcset.split(',').map(s => s.trim().split(' ')[0])]
    for (const s of sources) {
      if (!isValidPin(s)) continue
      const high = toOriginal(s)
      if (!seenImgs.has(high)) { seenImgs.add(high); imgList.push(high) }
    }
  })
  $('[style]').each((_, el) => {
    const m = ($(el).attr('style') || '').match(/url\(['"]?(https:\/\/i\.pinimg\.com[^'")\.s]+)['"]?\)/)
    if (m && isValidPin(m[1])) {
      const high = toOriginal(m[1])
      if (!seenImgs.has(high)) { seenImgs.add(high); imgList.push(high) }
    }
  })
  return { pinIds, imgList }
}

const _pinSearchCache = new Map()

export async function pinsearch(query, limit = 50) {
  const cacheKey = `search:${query}`
  let cached = _pinSearchCache.get(cacheKey)

  if (!cached) {
    cached = { items: [], page: 0, bookmark: null, done: false }
    _pinSearchCache.set(cacheKey, cached)
    setTimeout(() => _pinSearchCache.delete(cacheKey), 1000 * 60 * 30)
  }

  const seenIds = new Set(cached.items.map(i => i.pinId).filter(Boolean))

  while (cached.items.length < limit && !cached.done) {
    try {
      let html
      if (cached.page === 0) {
        const res = await axios.get(
          `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`,
          { headers: HEADERS, timeout: 15000 }
        )
        html = res.data
        const bmMatch = html.match(/"bookmark"\s*:\s*"([^"]+)"/)
        cached.bookmark = bmMatch ? bmMatch[1] : null
      } else if (cached.bookmark) {
        const res = await axios.get('https://www.pinterest.com/resource/SearchResource/get/', {
          params: {
            source_url: `/search/pins/?q=${encodeURIComponent(query)}`,
            data: JSON.stringify({
              options: { query, scope: 'pins', bookmarks: [cached.bookmark], page_size: 25 },
              context: {}
            }),
            _: Date.now()
          },
          headers: {
            ...HEADERS,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json',
            'Referer': `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`,
          },
          timeout: 15000
        })
        const apiData = res.data
        cached.bookmark = apiData?.resource_response?.bookmark || null
        if (!cached.bookmark) cached.done = true

        const newIds = (apiData?.resource_response?.data || [])
          .filter(p => p.id && !seenIds.has(p.id))
          .map(p => {
            seenIds.add(p.id)
            const img = p.images?.orig?.url || p.images?.['736x']?.url || p.image_signature
              ? `https://i.pinimg.com/originals/${p.image_signature?.replace(/(..)(..)(..)(.+)/, '$1/$2/$3/$4')}.jpg`
              : null
            return img ? { index: cached.items.length + 1, image: img, url: `https://www.pinterest.com/pin/${p.id}/`, pinId: p.id } : null
          })
          .filter(Boolean)
        cached.items.push(...newIds)
        cached.page++
        continue
      } else {
        cached.done = true
        break
      }

      const { pinIds, imgList } = extractFromHtml(html)
      for (let i = 0; i < imgList.length; i++) {
        const pid = pinIds[i]
        if (pid && seenIds.has(pid)) continue
        if (pid) seenIds.add(pid)
        cached.items.push({
          index:  cached.items.length + 1,
          image:  imgList[i],
          url:    pid ? `https://www.pinterest.com/pin/${pid}/` : imgList[i],
          pinId:  pid || null
        })
      }
      cached.page++
    } catch { cached.done = true; break }
  }

  if (!cached.items.length) throw new Error('Sin resultados en Pinterest')
  return cached.items.slice(0, limit)
}

function extractPinData(html) {
  const $ = cheerio.load(html)
  let found = null
  $('script').each((_, el) => {
    const txt = $(el).html() || ''
    const idx = txt.indexOf('"v3GetPinQuery')
    if (idx !== -1 && !found) {
      const jsonStart = txt.lastIndexOf('{', idx)
      let depth = 0, end = -1
      for (let i = jsonStart; i < txt.length; i++) {
        if (txt[i] === '{') depth++
        else if (txt[i] === '}') { depth--; if (depth === 0) { end = i; break } }
      }
      if (end !== -1) {
        try { found = JSON.parse(txt.slice(jsonStart, end + 1)) } catch {}
      }
    }
  })
  const key = found ? Object.keys(found)[0] : null
  const pin = key ? found[key]?.data : null
  if (!pin || found[key]?.__typename === 'PinNotFound') return null
  return pin
}

export async function pinimg(input, limit = 5) {
  if (!input.includes('pinterest.com/pin/') && !input.includes('pin.it/')) {
    return pinsearch(input, limit)
  }

  let resolvedUrl = input
  if (input.includes('pin.it/')) {
    const r = await axios.get(input, { headers: HEADERS, maxRedirects: 5, timeout: 10000 })
    resolvedUrl = r.request?.res?.responseUrl || r.config?.url || input
  }

  const res  = await axios.get(resolvedUrl, {
    headers: { ...HEADERS, 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36' },
    timeout: 15000
  })
  const html = res.data
  const pin  = extractPinData(html)

  const cleanUrl = resolvedUrl.split('?')[0].split('/sent/')[0]
  const id    = cleanUrl.match(/\/pin\/(\d+)/)?.[1] || ''

  if (pin) {
    const creator = pin.nativeCreator || pin.closeupAttribution || pin.originPinner || {}
    const tags    = (pin.pinJoin?.seoBreadcrumbs || []).map(b => b.name).filter(Boolean)
    const saves   = pin.aggregatedPinData?.aggregatedStats?.saves ?? null
    const board   = pin.board?.url ? `https://www.pinterest.com${pin.board.url}` : null

    return {
      id,
      title:        pin.title || pin.seoTitle || '',
      description:  pin.description?.trim() || pin.seoAltText || pin.gridDescription?.trim() || '',
      altText:      pin.seoAltText || '',
      image:        pin.images_orig?.url || pin.imageLargeUrl || pin.images_736x?.url || '',
      images: {
        orig:  pin.images_orig?.url || pin.imageLargeUrl || '',
        '736': pin.images_736x?.url || '',
        '474': pin.images_474x?.url || '',
        '236': pin.images_236x?.url || '',
        '136': pin.images_136x136?.url || '',
      },
      width:         pin.images_474x?.width  || pin.images_736x?.width  || 0,
      height:        pin.images_474x?.height || pin.images_736x?.height || 0,
      dominantColor: pin.dominantColor || '',
      saves:         saves,
      repins:        pin.repinCount ?? 0,
      createdAt:     pin.createdAt || '',
      tags,
      domain:        pin.domain || '',
      link:          pin.link   || '',
      board,
      creator: {
        username: creator.username || '',
        fullName: creator.fullName || creator.full_name || '',
      },
      pinner: {
        username: pin.pinner?.username || '',
      },
      url: cleanUrl,
    }
  }

  const $ = cheerio.load(html)
  const seen = new Set()
  const imgs = []
  $('img').each((_, el) => {
    const src    = $(el).attr('src') || ''
    const srcset = $(el).attr('srcset') || ''
    const sources = [src, ...srcset.split(',').map(s => s.trim().split(' ')[0])]
    for (const s of sources) {
      if (!isValidPin(s)) continue
      const high = toOriginal(s)
      if (!seen.has(high)) { seen.add(high); imgs.push(high) }
    }
  })
  const unique = [...new Set(imgs)].filter(Boolean)
  if (!unique.length) throw new Error('No se pudo extraer la imagen del pin')

  return {
    id,
    title: '', description: '', altText: '', image: unique[0],
    images: { orig: unique[0], '736': '', '474': '', '236': unique[0], '136': '' },
    width: 0, height: 0, dominantColor: '', saves: null, repins: 0,
    createdAt: '', tags: [], domain: '', link: '', board: null,
    creator: { username: '', fullName: '' }, pinner: { username: '' },
    url: cleanUrl,
  }
}
