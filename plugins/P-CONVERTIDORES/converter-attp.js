import { writeFile, readFile, rm } from 'fs/promises'
import path from 'path'
import { tmpdir } from 'os'
import { v4 as uuidv4 } from 'uuid'
import { spawn } from 'child_process'
import { attp } from '@axel-dev09/zen-dl'

const handler = async (m, { conn, text, command }) => {
  try {
    if (!text) return m.reply(`*⌬┤ ✙ ├⌬ USO:* !${command} <texto>`)
    const gifBuf     = await attp(text)
    const inputPath  = path.join(tmpdir(), `${uuidv4()}.gif`)
    const outputPath = path.join(tmpdir(), `${uuidv4()}.webp`)
    await writeFile(inputPath, gifBuf)

    const stickerBuf = await new Promise((resolve, reject) => {
      const ff = spawn('ffmpeg', [
        '-i', inputPath,
        '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,fps=15,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
        '-vcodec', 'libwebp', '-loop', '0', '-ss', '00:00:00.0', '-t', '00:00:10.0',
        '-preset', 'default', '-an', '-vsync', '0', '-s', '512:512', outputPath,
      ])
      ff.on('close', async (code) => {
        await rm(inputPath, { force: true }).catch(() => {})
        if (code !== 0) { await rm(outputPath, { force: true }).catch(() => {}); return reject(new Error('ffmpeg falló')) }
        const buf = await readFile(outputPath)
        await rm(outputPath, { force: true }).catch(() => {})
        resolve(buf)
      })
    })

    await conn.sendMessage(m.chat, { sticker: stickerBuf }, { quoted: m })
  } catch (e) {
    console.error('[attp]', e.message)
    m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo generar el sticker.`)
  }
}

handler.help = ['attp <texto>']
handler.command = ['attp', 'atextpng', 'textgif']
handler.tags = ['convertidores']

export default handler