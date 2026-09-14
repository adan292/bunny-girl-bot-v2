import { tmpdir } from 'os'
import { join } from 'path'
import { writeFileSync, readFileSync } from 'fs'
import { rm } from 'fs/promises'
import { execSync } from 'child_process'

const tmp = ext => join(tmpdir(), `conv_${Date.now()}.${ext}`)
const clean = async (...ps) => { for (const p of ps) if (p) await rm(p, { force: true }).catch(() => {}) }

const handler = async (m, { conn, command }) => {
  const mtype = m.quoted?.mtype || m.mtype

  if (command === 'todoc' || command === 'todocumento') {
    if (mtype !== 'videoMessage' && mtype !== 'audioMessage')
      return m.reply(`*⌬┤ ✙ ├⌬ SIN ARCHIVO.*\n> Respondé un video o audio para convertirlo a documento.`)

    await m.reply(`*⌬┤ ⏳ ├⌬ Convirtiendo...*`)
    try {
      const isVid = mtype === 'videoMessage'
      const buffer = await (m.quoted || m).download()
      if (!buffer) throw new Error('Sin buffer')
      await conn.sendMessage(m.chat, {
        document: buffer,
        mimetype: isVid ? 'video/mp4' : 'audio/mpeg',
        fileName: isVid ? 'archivo.mp4' : 'archivo.mp3'
      }, { quoted: m })
    } catch {
      m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo convertir.`)
    }
    return
  }

  if (mtype !== 'videoMessage') return m.reply(`*⌬┤ ✙ ├⌬ SIN VIDEO.*\n> Respondé un video para pasarlo a audio.`)
  await m.reply(`*⌬┤ ⏳ ├⌬ Extrayendo audio...*`)
  let i, o
  try {
    const buffer = await (m.quoted || m).download()
    if (!buffer) throw new Error('Sin buffer')
    i = tmp('mp4'); o = tmp('mp3')
    writeFileSync(i, buffer)
    execSync(`ffmpeg -y -i "${i}" -vn -acodec libmp3lame -q:a 2 "${o}"`, { stdio: 'pipe', timeout: 60000 })
    await conn.sendMessage(m.chat, { audio: readFileSync(o), mimetype: 'audio/mpeg', ptt: false }, { quoted: m })
  } catch {
    m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo extraer el audio.`)
  } finally { await clean(i, o) }
}

handler.help = ['toaudio', 'todoc']
handler.command = ['toaudio', 'tomp3', 'todoc', 'todocumento']
handler.tags = ['convertidores']

export default handler