import fs from 'fs'
import path from 'path'

const handler = async (m, { conn }) => {
  const q = m.quoted ? m.quoted : m
  
  const isViewOnce = q.mtype === 'viewOnceMessageV2' || q.mtype === 'viewOnceMessage' || q.msg?.viewOnce
  
  if (!m.quoted || !isViewOnce) {
    return m.reply(`*⌬┤ ❗ ├⌬ SIN MENSAJE.*\n> Respondé a una imagen, video o audio de *ver una sola vez*.`)
  }

  try {
    const buffer = await q.download()
    const mime = q.msg?.mimetype || ''

    if (mime.startsWith('audio/')) {
      const tmpFile = path.join('./tmp', `vo_${Date.now()}.mp3`)
      fs.writeFileSync(tmpFile, buffer)
      await conn.sendMessage(m.chat, { audio: { url: tmpFile }, mimetype: 'audio/mpeg', ptt: true }, { quoted: m })
      fs.unlinkSync(tmpFile)
    } else if (mime.startsWith('video/')) {
      await conn.sendMessage(m.chat, { video: buffer, caption: `*⌬┤ 🎬 ├⌬ VIDEO DESBLOQUEADO.*\n> Este video era de ver una sola vez.` }, { quoted: m })
    } else {
      await conn.sendMessage(m.chat, { image: buffer, caption: `*⌬┤ 📸 ├⌬ IMAGEN DESBLOQUEADA.*\n> Esta imagen era de ver una sola vez.` }, { quoted: m })
    }
  } catch (e) {
    m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo recuperar el mensaje. Intentá de nuevo.\n> _${e.message}_`)
  }
}

handler.command = ['verfoto', 'verview', 'verft', 'vervideo', 'ver', 'vervid', 'veraudio', 'voaudio']
handler.tags = ['tools']
handler.help = ['ver <responder a un vid/aud/img viewonce>']
export default handler