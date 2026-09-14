/*
 * © Created by AxelDev09 🔥
 */

import axios from 'axios'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
}

async function resolveUrl(url) {
  if (url.includes('vm.tiktok.com') || url.includes('vt.tiktok.com')) {
    const res = await axios.get(url, { headers: HEADERS, maxRedirects: 5, timeout: 10000 })
    return res.request?.res?.responseUrl || res.config?.url || url
  }
  return url
}

export async function tiktokDownload(url) {
  const resolved = await resolveUrl(url)
  const res      = await axios.get(
    `https://tikwm.com/api/?url=${encodeURIComponent(resolved)}`,
    { headers: HEADERS, timeout: 20000 }
  )

  const data = res.data
  if (data?.code !== 0 || !data?.data) throw new Error('tikwm: ' + (data?.msg || 'sin datos'))

  const d = data.data
  return {
    id:          d.id       || '',
    title:       d.title    || '',
    author:      d.author?.nickname || d.author?.unique_id || '',
    thumbnail:   d.cover    || d.origin_cover || '',
    duration:    d.duration || 0,
    nowatermark: d.play     || null,
    watermark:   d.wmplay   || null,
    audio:       d.music    || null,
    images:      Array.isArray(d.images) && d.images.length > 0
                   ? d.images.map(img => typeof img === 'string' ? img : img?.url || img?.cover || '')
                   : null,
    music: {
      title:  d.music_info?.title  || '',
      author: d.music_info?.author || '',
      url:    d.music_info?.play   || null,
      cover:  d.music_info?.cover  || '',
    },
    plays:    d.play_count    || 0,
    likes:    d.digg_count    || 0,
    comments: d.comment_count || 0,
    shares:   d.share_count   || 0,
    source:   'tikwm',
  }
}

export async function tiktokInfo(url) {
  return tiktokDownload(url)
}

export async function tiktokSearch(query, limit = 5) {
  if (!query?.trim()) throw new Error('Se requiere un término de búsqueda')
  const count = Math.min(Math.max(1, limit), 20)
  const res   = await axios.get('https://tikwm.com/api/feed/search', {
    params: { keywords: query, count, cursor: 0, HD: 1 },
    headers: HEADERS,
    timeout: 20000,
  })

  const data = res.data
  if (data?.code !== 0 || !data?.data?.videos?.length)
    throw new Error('tikwm search: ' + (data?.msg || 'sin resultados'))

  return data.data.videos.map(d => ({
    id:          d.id       || '',
    title:       d.title    || '',
    author:      d.author?.nickname || d.author?.unique_id || '',
    thumbnail:   d.cover    || d.origin_cover || '',
    duration:    d.duration || 0,
    nowatermark: d.play     || null,
    watermark:   d.wmplay   || null,
    audio:       d.music    || null,
    images:      Array.isArray(d.images) && d.images.length > 0
                   ? d.images.map(img => typeof img === 'string' ? img : img?.url || img?.cover || '')
                   : null,
    music: {
      title:  d.music_info?.title  || '',
      author: d.music_info?.author || '',
      url:    d.music_info?.play   || null,
      cover:  d.music_info?.cover  || '',
    },
    plays:    d.play_count    || 0,
    likes:    d.digg_count    || 0,
    comments: d.comment_count || 0,
    shares:   d.share_count   || 0,
    source:   'tikwm',
  }))
}
