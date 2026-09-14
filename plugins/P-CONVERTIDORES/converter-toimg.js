import { tmpdir } from 'os'
import { join } from 'path'
import { writeFileSync, readFileSync } from 'fs'
import { rm } from 'fs/promises'
import { execSync } from 'child_process'

const tmp = ext => join(tmpdir(), `conv_${Date.now()}.${ext}`)
const clean = async (...ps) => { for (const p of ps) if (p) await rm(p, { force: true }).catch(() => {}) }

const handler = async (m, { conn, command }) => {
  const q = m.quoted ? m.quoted : m
  const mtype = q.mtype
  const mime = (q.msg || q).mimetype || ''

  const esSticker = mtype === 'stickerMessage' || /webp/i.test(mime)
  const esVideo = mtype === 'videoMessage'

  if (command === 'toimg') {
    if (!esSticker) return m.reply(`*⌬┤ ✙ ├⌬ SIN STICKER.*\n> Respondé a un sticker para convertirlo a imagen.`)
    await m.react('⏳')
    let i, o
    try {
      const buffer = await q.download()
      if (!buffer || !buffer.length) throw new Error('Sin buffer')
      i = tmp('webp'); o = tmp('png')
      writeFileSync(i, buffer)
      execSync(`ffmpeg -y -i "${i}" -vframes 1 -c:v png "${o}"`, { stdio: 'pipe' })
      await conn.sendMessage(m.chat, { image: readFileSync(o) }, { quoted: m })
      await m.react('✅')
    } catch {
      await m.react('❌')
      m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo extraer la imagen del sticker.`)
    } finally { await clean(i, o) }
    return
  }

  if (command === 'togif') {
    if (!esVideo && !esSticker) return m.reply(`*⌬┤ ✙ ├⌬ SIN MEDIA.*\n> Respondé un video o sticker animado para convertir a GIF.`)
    if (esVideo && (q.msg?.seconds || 0) >= 15) return m.reply(`*⌬┤ ✙ ├⌬ ARCHIVO MUY LARGO.*\n> El video debe durar menos de 15 segundos.`)
    
    await m.react('⏳')
    let i, o
    try {
      const buffer = await q.download()
      if (!buffer || !buffer.length) throw new Error('Sin buffer')
      const ext = esSticker ? 'webp' : 'mp4'
      i = tmp(ext); o = tmp('mp4')
      writeFileSync(i, buffer)
      execSync(`ffmpeg -y -i "${i}" -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p" -c:v libx264 -movflags +faststart "${o}"`, { stdio: 'pipe' })
      await conn.sendMessage(m.chat, { video: readFileSync(o), mimetype: 'video/mp4', gifPlayback: true }, { quoted: m })
      await m.react('✅')
    } catch {
      await m.react('❌')
      m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo convertir a GIF.`)
    } finally { await clean(i, o) }
  }
}

handler.help = ['toimg', 'togif']
handler.command = ['toimg', 'togif']
handler.tags = ['convertidores']

export default handler