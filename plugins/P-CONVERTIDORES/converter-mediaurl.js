import { upload } from '@axel-dev09/zen-dl'

const TIPOS = { videoMessage: 'video', imageMessage: 'image', audioMessage: 'audio', stickerMessage: 'sticker' }
const EXTS  = { videoMessage: 'mp4',   imageMessage: 'jpg',   audioMessage: 'mp3',   stickerMessage: 'webp'   }

const handler = async (m) => {
  const mtype = m.quoted?.mtype || m.mtype
  if (!mtype || !TIPOS[mtype]) return m.reply(`*⌬┤ ✙ ├⌬ SIN MEDIA.*\n> Respondé un video, gif, audio o imagen.`)

  await m.reply(`*⌬┤ ⏳ ├⌬ Subiendo archivo...*`)

  try {
    const buffer = await (m.quoted || m).download()
    if (!buffer) throw new Error('Sin buffer')
    const { url } = await upload(buffer, `media_${Date.now()}.${EXTS[mtype]}`)
    await m.reply(`*⌬┤ 🔗 ├⌬ URL GENERADA.*\n> ${url}`)
  } catch {
    m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo subir el archivo.`)
  }
}

handler.help = ['tourl']
handler.command = ['tovideourl', 'tourl', 'upload', 'togifurl', 'tomediaurl', 'tofotourl']
handler.tags = ['convertidores']

export default handler