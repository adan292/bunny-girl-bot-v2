import { upload } from '@axel-dev09/zen-dl'

const handler = async (m, { conn, usedPrefix, command }) => {
  const q = m.quoted ? m.quoted : m
  const mime = (q.msg || q).mimetype || ''
  
  if (!mime.startsWith('image/')) return m.reply(`*⌬┤ ✙ ├⌬ SIN IMAGEN.*\n> Respondé a una imagen o envíala junto con el comando *${usedPrefix}${command}*.`)
  
  await m.reply(`*⌬┤ ⏳ ├⌬ Subiendo a ImgBB...*`)
  
  try {
    const buffer = await q.download() 
    const { url } = await upload(buffer, `image_${Date.now()}.jpg`)
    
    if (!url) throw new Error()
    m.reply(`*⌬┤ ✅ ├⌬ IMAGEN SUBIDA.*\n> 🔗 ${url}`)
  } catch { 
    m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo completar la carga.`) 
  }
}

handler.command = ['imgbb', 'upload']
handler.tags = ['tools']
handler.help = ['upload <responder a imagen>']
export default handler