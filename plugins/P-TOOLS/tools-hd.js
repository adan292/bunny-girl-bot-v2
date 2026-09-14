import fetch from 'node-fetch'
import path from 'path'
import os from 'os'
import fs from 'fs/promises'
import { spawn } from 'child_process'

async function hdEnhance(inputBuf, inputMime) {
  const API = 'https://us-central1-vector-ink.cloudfunctions.net/upscaleImage'
  const tmpDir = path.join(os.tmpdir(), 'vectorink')
  const ext = /png/i.test(inputMime) ? 'png' : /webp/i.test(inputMime) ? 'webp' : 'jpg'
  const tmpPath = path.join(tmpDir, `img_${Date.now()}.${ext}`)
  const out = { ok: false }
  try {
    await fs.mkdir(tmpDir, { recursive: true })
    await fs.writeFile(tmpPath, inputBuf)
    const r = await fetch(API, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://vectorink.io', referer: 'https://vectorink.io/', 'user-agent': 'Mozilla/5.0' },
      body: JSON.stringify({ data: { image: inputBuf.toString('base64') } }),
    })
    if (!r.ok) { out.error = `HTTP ${r.status}`; return out }
    const j = JSON.parse(await r.text().catch(() => '{}'))
    const inner = JSON.parse(j?.result || '{}')
    const webpB64 = inner?.image?.b64_json
    if (!webpB64) { out.error = 'no_b64'; return out }
    const webpBuf = Buffer.from(webpB64, 'base64')
    const inP = path.join(tmpDir, `in_${Date.now()}.webp`)
    const outP = path.join(tmpDir, `out_${Date.now()}.png`)
    await fs.writeFile(inP, webpBuf)
    await new Promise((res, rej) => {
      const p = spawn('ffmpeg', ['-y', '-i', inP, '-frames:v', '1', outP], { stdio: 'pipe' })
      p.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg failed')))
      p.on('error', rej)
    })
    out.ok = true
    out.buffer = await fs.readFile(outP)
    try { await fs.unlink(inP); await fs.unlink(outP) } catch {}
    return out
  } catch (e) { out.error = e.message; return out }
  finally { try { await fs.unlink(tmpPath) } catch {} }
}

const handler = async (m, { conn, usedPrefix, command }) => {
  const q = m.quoted ? m.quoted : m
  const mime = (q.msg || q).mimetype || ''
  
  if (!mime.startsWith('image/')) return m.reply(`*⌬┤ ✙ ├⌬ SIN IMAGEN.*\n> Respondé a una imagen o envíala junto con el comando *${usedPrefix}${command}*.`)
  
  await m.reply(`*⌬┤ 🔧 ├⌬ Mejorando imagen...*\n> Esto puede tardar unos segundos.`)
  
  try {
    const buffer = await q.download()
    const result = await hdEnhance(buffer, mime)
    
    if (!result.ok) return m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo mejorar la imagen. (${result.error || 'error interno'})`)
    
    await conn.sendMessage(m.chat, { image: result.buffer, caption: `*⌬┤ ✅ ├⌬ IMAGEN MEJORADA.*` }, { quoted: m })
  } catch { 
    m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo completar. Intentá de nuevo.`) 
  }
}

handler.command = ['hd', 'enhance', 'remini']
handler.tags = ['tools']
handler.help = ['hd <responder a imagen>']
export default handler