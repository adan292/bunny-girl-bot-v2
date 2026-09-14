import { addExif } from '../../lib/sticker.js'
import config from '../../config.js'

const handler = async (m, { conn, text }) => {
  const q = m.quoted ? m.quoted : m
  const mtype = q.mtype
  const mime = (q.msg || q).mimetype || ''

  if (mtype !== 'stickerMessage' && !/webp/i.test(mime)) {
    return m.reply(`*⌬┤ ✙ ├⌬ SIN STICKER.*\n> Respondé a un sticker para editarle el nombre.`)
  }

  let packname = config.packname || 'ZΞN-BOT'
  let author = config.author || 'AXELDEV09'

  if (text?.trim()) {
    const partes = text.split('|').map(s => s.trim())
    if (partes[0]) packname = partes[0]
    if (partes[1]) author = partes[1]
  }

  await m.reply(`*⌬┤ ⏳ ├⌬ Aplicando watermark...*`)

  try {
    const buffer = await q.download()
    if (!buffer || !buffer.length) throw new Error('Sin buffer')
    const stickerBuf = await addExif(buffer, packname, author)
    await conn.sendMessage(m.chat, { sticker: stickerBuf }, { quoted: m })
    await m.reply(`*⌬┤ ✅ ├⌬ STICKER EDITADO.*\n> 📦 Pack: *${packname}*\n> ✍️ Autor: *${author}*`)
  } catch (e) {
    console.error('[WM]', e.message)
    m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo editar el sticker.`)
  }
}

handler.help = ['wm <pack | author>']
handler.command = ['wm', 'take', 'watermark', 'stickerinfo', 'setwm']
handler.tags = ['convertidores']

export default handler