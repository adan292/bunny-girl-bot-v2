import { sendImageAsSticker, sendVideoAsSticker } from '../../lib/sticker.js'
import config from '../../config.js'

const handler = async (m, { conn }) => {
  const q = m.quoted ? m.quoted : m
  const mime = (q.msg || q).mimetype || ''

  const esImg = q.mtype === 'imageMessage' || /image/i.test(mime)
  const esVid = q.mtype === 'videoMessage' || /video/i.test(mime)

  if (!esImg && !esVid) {
    return m.reply(`*⌬┤ ✙ ├⌬ SIN MEDIA.*\n> Enviá o respondé a una imagen o video.`)
  }

  const packname = config.packname || 'ZΞN-BOT'
  const author   = config.author || 'AXELDEV09'

  await m.reply(`*⌬┤ ⏳ ├⌬ Creando sticker...*`)

  try {
    const buffer = await q.download()
    if (!buffer) throw new Error('No se pudo descargar la media')

    if (esImg) {
      await sendImageAsSticker(conn, m.chat, buffer, m, { packname, author })
    } else {
      if ((q.msg?.seconds || 0) > 11) {
        return m.reply(`*⌬┤ ✙ ├⌬ VIDEO MUY LARGO.*\n> El video debe durar menos de 11 segundos.`)
      }
      await sendVideoAsSticker(conn, m.chat, buffer, m, { packname, author })
    }
  } catch (e) {
    console.error('[STICKER ERROR]', e.message)
    m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo crear el sticker. Intentá enviando la imagen/video nuevamente.`)
  }
}

handler.help = ['sticker <img/vid>']
handler.command = ['sticker', 's', 'stiker', 'stic', 'figurinha']
handler.tags = ['convertidores']

export default handler