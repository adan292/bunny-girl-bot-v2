import { tmpdir } from 'os'
import { join } from 'path'
import { writeFileSync, readFileSync } from 'fs'
import { rm } from 'fs/promises'
import { execSync } from 'child_process'

const tmp = ext => join(tmpdir(), `conv_${Date.now()}.${ext}`)
const clean = async (...ps) => { for (const p of ps) if (p) await rm(p, { force: true }).catch(() => {}) }
const VELOCIDADES = [0.25, 0.5, 1.5, 2, 3]

const handler = async (m, { conn, command, text }) => {
  const mtype = m.quoted?.mtype || m.mtype

  if (command === 'tovideo' || command === 'tomp4') {
    if (mtype !== 'audioMessage') return m.reply(`*⌬┤ ✙ ├⌬ SIN AUDIO.*\n> Respondé un audio para convertirlo a video.`)
    await m.reply(`*⌬┤ ⏳ ├⌬ Convirtiendo...*`)
    let i, o
    try {
      const buffer = await (m.quoted || m).download()
      if (!buffer) throw new Error('Sin buffer')
      i = tmp('mp3'); o = tmp('mp4')
      writeFileSync(i, buffer)
      execSync(`ffmpeg -y -f lavfi -i color=c=black:s=1280x720:r=1 -i "${i}" -shortest -c:v libx264 -c:a aac -strict experimental "${o}"`, { stdio: 'pipe', timeout: 60000 })
      await conn.sendMessage(m.chat, { video: readFileSync(o), mimetype: 'video/mp4' }, { quoted: m })
    } catch {
      m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo convertir.`)
    } finally { await clean(i, o) }
    return
  }

  if (mtype !== 'videoMessage') return m.reply(`*⌬┤ ✙ ├⌬ SIN VIDEO.*\n> Respondé un video para aplicarle este efecto.`)
  let i, o

  try {
    const buffer = await (m.quoted || m).download()
    if (!buffer) throw new Error('Sin buffer')
    i = tmp('mp4'); o = tmp('mp4')
    writeFileSync(i, buffer)

    if (command === 'reversevid') {
      await m.reply(`*⌬┤ ⏳ ├⌬ Revirtiendo video...*`)
      execSync(`ffmpeg -y -i "${i}" -vf reverse -af areverse "${o}"`, { stdio: 'pipe', timeout: 60000 })
    } 
    else if (command === 'speedvid') {
      const speed = parseFloat(text)
      if (!VELOCIDADES.includes(speed)) return m.reply(`*⌬┤ ✙ ├⌬ VELOCIDAD INVÁLIDA.*\n> Opciones: *0.25 · 0.5 · 1.5 · 2 · 3*`)
      await m.reply(`*⌬┤ ⏳ ├⌬ Acelerando video...*`)
      const vf = `setpts=${(1 / speed).toFixed(4)}*PTS`
      const af = `atempo=${speed <= 0.5 ? 0.5 : speed >= 2 ? 2 : speed}`
      execSync(`ffmpeg -y -i "${i}" -vf "${vf}" -af "${af}" "${o}"`, { stdio: 'pipe', timeout: 60000 })
    }

    await conn.sendMessage(m.chat, { video: readFileSync(o), mimetype: 'video/mp4' }, { quoted: m })
  } catch {
    m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo procesar el video.`)
  } finally { await clean(i, o) }
}

handler.help = ['tovideo', 'reversevid', 'speedvid <vel>']
handler.command = ['tovideo', 'tomp4', 'reversevid', 'speedvid']
handler.tags = ['convertidores']

export default handler