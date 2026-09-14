import fs from 'fs'
import { rm } from 'fs/promises'
import path from 'path'
import { tmpdir } from 'os'
import { execSync } from 'child_process'
import fetch from 'node-fetch'
import axios from 'axios'
import { addExif } from '../../lib/sticker.js'
import config from '../../config.js'

const TMP = tmpdir()
const toUni = e => [...e].map(c => c.codePointAt(0).toString(16)).join('-')
const tmpFile = ext => path.join(TMP, `emj_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`)
const clean = async (...paths) => { for (const p of paths) if (p) await rm(p, { force: true }).catch(() => {}) }

async function runEmojimix(m, conn, text) {
  if (!text?.includes('+')) return m.reply(`*⌬┤ ✙ ├⌬ USO:* !emojimix 😎+😅`)
  const [e1, e2] = text.split('+').map(s => s.trim())
  if (!e1 || !e2) return m.reply(`*⌬┤ ✙ ├⌬ DOS EMOJIS.*\n> Separalos con *+*`)
  await m.reply(`*⌬┤ ⏳ ├⌬ Procesando...*`)
  const url = `https://www.gstatic.com/android/keyboard/emojikitchen/20201001/u${toUni(e1)}/u${toUni(e1)}_u${toUni(e2)}.png`
  const res = await fetch(url)
  if (!res.ok) return m.reply(`*⌬┤ ❌ ├⌬ NO EXISTE.*\n> Esa combinación no existe.`)
  const buffer = await res.buffer()
  const png = tmpFile('png')
  const webpOut = tmpFile('webp')
  fs.writeFileSync(png, buffer)
  try {
    execSync(`ffmpeg -y -i "${png}" -vf "scale=512:512" -vcodec libwebp -lossless 1 "${webpOut}"`, { stdio: 'pipe', timeout: 30000 })
    const stickerBuf = await addExif(fs.readFileSync(webpOut), config.packname, config.author)
    await conn.sendMessage(m.chat, { sticker: stickerBuf }, { quoted: m })
  } finally { await clean(png, webpOut) }
}

async function runEmojimix2(m, conn, text) {
  if (!text?.includes('+')) return m.reply(`*⌬┤ ✙ ├⌬ USO:* !emojimix2 😎+😅`)
  const [e1, e2] = text.split('+').map(s => s.trim())
  if (!e1 || !e2) return m.reply(`*⌬┤ ✙ ├⌬ DOS EMOJIS.*\n> Separalos con *+*`)
  await m.reply(`*⌬┤ ⏳ ├⌬ Procesando...*`)
  const url  = `https://tenor.googleapis.com/v2/featured?key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ&contentfilter=high&media_filter=png_transparent&component=proactive&collection=emoji_kitchen_v5&q=${encodeURIComponent(e1)}_${encodeURIComponent(e2)}`
  const res  = await fetch(url)
  const json = await res.json()
  if (!json.results?.length) return m.reply(`*⌬┤ ❌ ├⌬ NO EXISTE.*\n> Esa combinación no existe.`)
  for (const r of json.results) await conn.sendMessage(m.chat, { image: { url: r.url } }, { quoted: m })
}

async function runBrat(m, conn, text) {
  if (!text) return m.reply(`*⌬┤ ✙ ├⌬ USO:* !brat <texto>`)
  await m.reply(`*⌬┤ ⏳ ├⌬ Procesando...*`)
  const png = tmpFile('png')
  const webpOut = tmpFile('webp')
  try {
    const res = await axios.get(`https://api.yupra.my.id/api/image/brat?text=${encodeURIComponent(text)}`, { responseType: 'arraybuffer' })
    fs.writeFileSync(png, res.data)
    execSync(`ffmpeg -y -i "${png}" -vcodec libwebp -lossless 1 -qscale 100 -preset default -loop 0 -an -vsync 0 -s 512x512 "${webpOut}"`, { stdio: 'pipe', timeout: 30000 })
    const stickerBuf = await addExif(fs.readFileSync(webpOut), config.packname, config.author)
    await conn.sendMessage(m.chat, { sticker: stickerBuf }, { quoted: m })
  } finally { await clean(png, webpOut) }
}

const NOTO_BASE = 'https://fonts.gstatic.com/s/e/notoemoji/latest'

function emojiToCode(input) {
  input = input.trim()
  if (/^[0-9a-f]{4,}(-[0-9a-f]{4,})*$/i.test(input)) return input.toLowerCase()
  const points = []
  for (const char of input) {
    const cp = char.codePointAt(0)
    if (cp > 0xFFFF || cp >= 0x200D || cp === 0xFE0F || cp > 0x20) {
      if (cp !== 0xFE0F) points.push(cp.toString(16))
    }
  }
  return points.join('-')
}

async function fetchEmojiGif(code) {
  const tryFetch = async url => {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(15000) })
    if (res.ok) return res.buffer()
    return null
  }
  const buf = await tryFetch(`${NOTO_BASE}/${code}/512.gif`)
  if (buf) return buf
  const baseCode = code.split('-')[0]
  if (baseCode !== code) { const buf2 = await tryFetch(`${NOTO_BASE}/${baseCode}/512.gif`); if (buf2) return buf2 }
  throw new Error('noAnimado')
}

async function gifToWebp(gifBuffer) {
  const gifPath  = tmpFile('gif')
  const webpPath = tmpFile('webp')
  try {
    fs.writeFileSync(gifPath, gifBuffer)
    execSync(`ffmpeg -y -i "${gifPath}" -vf "scale=512:512:flags=lanczos,split[s0][s1];[s0]palettegen=reserve_transparent=on:transparency_color=ffffff[p];[s1][p]paletteuse" -loop 0 "${webpPath}"`, { stdio: 'pipe', timeout: 30000 })
    if (!fs.existsSync(webpPath) || fs.statSync(webpPath).size < 100) {
      execSync(`ffmpeg -y -i "${gifPath}" -vcodec libwebp -vf "scale=512:512:flags=lanczos" -loop 0 -preset default -an -vsync 0 "${webpPath}"`, { stdio: 'pipe', timeout: 30000 })
    }
    return fs.readFileSync(webpPath)
  } finally { await clean(gifPath, webpPath) }
}

async function runEmojiSticker(m, conn, text) {
  if (!text?.trim()) return m.reply(`*⌬┤ ✙ ├⌬ USO:* !emojisticker 😎`)
  await m.reply(`*⌬┤ ⏳ ├⌬ Procesando...*`)
  const code = emojiToCode(text.trim())
  if (!code) return m.reply(`*⌬┤ ✙ ├⌬ USO:* !emojisticker 😎`)
  const gifBuf = await fetchEmojiGif(code)
  const webpBuf = await gifToWebp(gifBuf)
  const stickerBuf = await addExif(webpBuf, config.packname, config.author)
  await conn.sendMessage(m.chat, { sticker: stickerBuf }, { quoted: m })
}

const RUNNERS = {
  emojimix: runEmojimix, emojicombine: runEmojimix, emojimixar: runEmojimix,
  emojimix2: runEmojimix2, emojicombine2: runEmojimix2, emojimixar2: runEmojimix2,
  brat: runBrat, bratsticker: runBrat, bratfigurinha: runBrat,
  emojisticker: runEmojiSticker, emojianim: runEmojiSticker, stickeremoji: runEmojiSticker,
}

const handler = async (m, { conn, command, text }) => {
  const run = RUNNERS[command]
  if (!run) return
  try {
    await run(m, conn, text)
  } catch (e) {
    console.error(`[EMOJIS:${command}]`, e.message)
    if (e.message === 'noAnimado') return m.reply(`*⌬┤ ❌ ├⌬ SIN ANIMACIÓN.*\n> No se encontró animación para ese emoji.`)
    m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo completar la operación.`)
  }
}

handler.help = ['emojimix <emoji+emoji>', 'emojimix2 <emoji+emoji>', 'brat <texto>']
handler.command = ['emojimix','emojicombine','emojimixar','emojimix2','emojicombine2','emojimixar2','brat','bratsticker','bratfigurinha','emojisticker','emojianim','stickeremoji']
handler.tags = ['convertidores']

export default handler