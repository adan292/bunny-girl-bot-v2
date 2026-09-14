/*
 * © Created by AxelDev09 🔥
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

const UA = 'Mozilla/5.0 (Linux; Android 11; Redmi Note 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const AJAX_URL = 'https://igsnapinsta.com/wp-admin/admin-ajax.php';
const BASE_URL = 'https://igsnapinsta.com';

let _cookies = '';
let _cookiesTime = 0;

async function getCookies() {
  const now = Date.now();
  if (_cookies && (now - _cookiesTime < 8 * 60 * 1000)) {
    return _cookies;
  }
  const res = await axios.get(`${BASE_URL}/es/`, {
    headers: { 'User-Agent': UA },
    timeout: 12000,
    validateStatus: () => true
  });
  const raw = res.headers['set-cookie'] || [];
  _cookies = raw.map(c => c.split(';')[0]).join('; ');
  _cookiesTime = Date.now();
  return _cookies;
}

function decodeUrl(encodedUrl) {
  try { 
    return Buffer.from(encodedUrl, 'base64').toString('utf-8'); 
  } catch { 
    return encodedUrl; 
  }
}

function parseItems(html) {
  const $ = cheerio.load(html);
  const items = [];
  const seenUrls = new Set();

  function add(item) {
    const clean = item.url.replace(/&amp;/g, '&').trim();
    if (!clean || seenUrls.has(clean)) return;
    seenUrls.add(clean);
    items.push({ ...item, url: clean });
  }

  $('.media-item').each((_, el) => {
    const $el = $(el);
    const src = $el.find('source[src]').attr('src');
    if (src && !src.includes('kdnsd')) {
      const btnText = $el.find('a.button-download').text().trim();
      const resMatch = btnText.match(/(\d+[Xx×]\d+[Pp]?)/i);
      const quality = resMatch ? resMatch[1].toUpperCase() : null;
      add({ type: 'video', url: src, quality, label: btnText || 'video' });
      return;
    }

    const imgSrc = $el.find('img[src]').attr('src') || '';
    if ((imgSrc.includes('cdninstagram') || imgSrc.includes('fbcdn')) && !imgSrc.includes('kdnsd')) {
      add({ type: 'image', url: imgSrc, quality: null, label: 'image' });
      return;
    }

    $el.find('a[href]').each((_, a) => {
      const href = $(a).attr('href') || '';
      if (!href.includes('kdnsd/v1/download')) return;
      const btnText = $(a).text().trim();
      const isAudio = /audio/i.test(btnText);
      const isVideo = /video/i.test(btnText);
      const resMatch = btnText.match(/(\d+[Xx×]\d+[Pp]?|\d+KBPS|\d+kbps)/i);
      const quality = resMatch ? resMatch[1].toUpperCase() : null;
      const type = isAudio ? 'audio' : isVideo ? 'video' : 'image';
      add({ type, url: href.replace(/&amp;/g, '&'), quality, label: btnText });
    });

    $el.find('img[src]').each((_, img) => {
      const s = $(img).attr('src') || '';
      if (s.includes('kdnsd/v1/download')) {
        add({ type: 'image', url: s, quality: null, label: 'image' });
      }
    });
  });

  if (!items.length) {
    $('source[src]').each((_, el) => {
      const src = $(el).attr('src') || '';
      if (src && !src.includes('kdnsd')) {
        add({ type: 'video', url: src, quality: null, label: 'video' });
      }
    });
    $('img[src]').each((_, el) => {
      const src = $(el).attr('src') || '';
      if ((src.includes('cdninstagram') || src.includes('fbcdn')) && !src.includes('kdnsd')) {
        add({ type: 'image', url: src, quality: null, label: 'image' });
      }
    });
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      if (!href.includes('kdnsd/v1/download')) return;
      const btnText = $(el).text().trim();
      const isAudio = /audio/i.test(btnText);
      const resMatch = btnText.match(/(\d+[Xx×]\d+[Pp]?|\d+KBPS)/i);
      add({ 
        type: isAudio ? 'audio' : 'video', 
        url: href.replace(/&amp;/g, '&'), 
        quality: resMatch?.[1]?.toUpperCase() || null, 
        label: btnText 
      });
    });
  }

  return items;
}

function detectType(url) {
  if (url.includes('/reel/')) return 'reel';
  if (url.includes('/p/')) return 'post';
  if (url.includes('/stories/')) return 'story';
  if (url.includes('/tv/')) return 'video';
  const path = new URL(url).pathname.replace(/\/$/, '');
  if (path.split('/').length === 2) return 'profile';
  return 'post';
}

async function igFallbackV1(url) {
  const { data } = await axios.get('https://api.delirius.store/download/instagram', {
    params: { url },
    timeout: 12000
  })
  if (!data?.status || !Array.isArray(data?.data) || data.data.length === 0) {
    throw new Error('fallback-v1 sin resultados')
  }
  return {
    type: detectType(url),
    items: data.data.map(i => ({ type: i.type, url: i.url, quality: null, label: i.type }))
  }
}

async function igFallbackV2(url) {
  const { data } = await axios.get('https://api.delirius.store/download/instagramv2', {
    params: { url },
    timeout: 12000
  })
  if (!data?.status || !Array.isArray(data?.data?.download) || data.data.download.length === 0) {
    throw new Error('fallback-v2 sin resultados')
  }
  return {
    type: detectType(url),
    items: data.data.download.map(i => ({ type: i.type, url: i.url, quality: null, label: i.type }))
  }
}

export async function igDownload(url) {
  if (!url.includes('instagram.com')) {
    throw new Error('URL inválida. Debe ser un link de Instagram.');
  }

  const base = url.split('?')[0].split('#')[0];
  url = base.endsWith('/') ? base : base + '/';

  const cookies = await getCookies();

  try {
    const { data } = await axios.post(
      AJAX_URL,
      new URLSearchParams({ action: 'kdnsd_get_video', social: 'instagram', url }),
      {
        headers: {
          'User-Agent': UA,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': `${BASE_URL}/es/`,
          'Origin': BASE_URL,
          'X-Requested-With': 'XMLHttpRequest',
          'Cookie': cookies,
        },
        timeout: 12000
      }
    );

    if (!data?.success || !data?.data?.html) {
      const html = data?.data?.html || '';
      if (html.includes('private') || html.includes('privado') || data?.data?.message?.includes('private')) {
        throw new Error('Perfil privado. Solo se puede descargar contenido de perfiles públicos.');
      }
      throw new Error('scraper-principal sin contenido');
    }

    const html = data.data.html;
    if (html.includes('Please try again') || html.includes('try again')) {
      throw new Error('scraper-principal rate limit');
    }

    const type = detectType(url);
    const items = parseItems(html);

    if (!items.length) throw new Error('scraper-principal sin items');

    return { type, items };

  } catch (primaryErr) {
    _cookies = '';
    _cookiesTime = 0;

    if (primaryErr.message?.includes('privado') || primaryErr.message?.includes('private')) {
      throw primaryErr;
    }

    try {
      return await igFallbackV1(url);
    } catch {
      try {
        return await igFallbackV2(url);
      } catch {
        throw new Error('No se pudo obtener el contenido por ningún medio. Verificá que el post sea público.');
      }
    }
  }
}

export async function igReelDownload(url) {
  if (!url.includes('instagram.com') || (!url.includes('/reel/') && !url.includes('/p/'))) {
    throw new Error('URL inválida. Debe ser un link de reel o post de Instagram.');
  }
  return igDownload(url);
}

export async function igStalk(input) {
  const username = input.replace(/https?:\/\/(www\.)?instagram\.com\/?/, '').replace(/\/$/, '').replace('@', '').split('?')[0].trim();
  if (!username) {
    throw new Error('Usuario inválido.');
  }

  const UAs = [
    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    'Twitterbot/1.0',
    'WhatsApp/2.23.1 A',
  ];

  for (const ua of UAs) {
    try {
      const { data: html } = await axios.get(`https://www.instagram.com/${username}/`, {
        headers: { 'User-Agent': ua, 'Accept-Language': 'en-US,en;q=0.9' },
        timeout: 10000
      });
      const $ = cheerio.load(html);
      const meta = $('meta[property="og:description"]').attr('content') || '';
      const name = $('meta[property="og:title"]').attr('content') || '';
      const avatar = $('meta[property="og:image"]').attr('content') || '';
      if (!name && !meta) continue;
      const m = meta.match(/([\d,.KkMm]+)\s*Followers[,\s]+([\d,.KkMm]+)\s*Following[,\s]+([\d,.KkMm]+)\s*Posts?/i);
      const bioRaw = meta.replace(/[\d,.KkMm]+\s*Followers[^-–—]*[-–—]\s*/i, '').trim();
      const bioClean = bioRaw.replace(/^See Instagram photos and videos from .+/i, '').trim();
      const fullNameClean = name
        .replace(/\s*\(@?[^)]*\)\s*/g, '')
        .replace(/\s*[•·]\s*Instagram.*/i, '')
        .trim();
      const isVerified = html.includes('"is_verified":true') || html.includes('"verified":true') || html.includes('aria-label="Verified"');
      const isPrivate = html.includes('"is_private":true');
      return {
        username,
        fullName: fullNameClean || username,
        bio: bioClean || '',
        followers: m ? m[1] : '?',
        following: m ? m[2] : '?',
        posts: m ? m[3] : '?',
        isPrivate,
        isVerified,
        avatar,
        url: `https://www.instagram.com/${username}/`,
      };
    } catch {}
  }

  throw new Error('No se pudo obtener información del perfil.');
}

export async function igStories(input) {
  const username = input.replace(/https?:\/\/(www\.)?instagram\.com\/?/, '').replace(/\/$/, '').replace('@', '').split('?')[0].trim();
  if (!username) {
    throw new Error('Usuario inválido.');
  }
  for (const base of ['https://storiesig.info', 'https://imginn.com']) {
    try {
      const { data: html } = await axios.get(`${base}/stories/${username}/`, {
        headers: { 'User-Agent': UA },
        timeout: 10000
      });
      const $ = cheerio.load(html);
      const items = [];
      $('img[src], source[src], video[src]').each((_, el) => {
        const src = $(el).attr('src') || '';
        if (src && (src.includes('cdninstagram') || src.includes('fbcdn') || src.includes(base))) {
          const type = $(el).is('source, video') ? 'video' : 'image';
          items.push({ type, url: src });
        }
      });
      if (items.length) {
        return { username, items };
      }
    } catch {}
  }
  throw new Error('No se encontraron stories o el perfil es privado.');
}