import { qrGenerate } from '@axel-dev09/zen-dl'

const handler = async (m, { conn, command, text, usedPrefix }) => {
  if (!text) return m.reply(`*⌬┤ ✙ ├⌬ USO.*\n> *${usedPrefix}${command} <texto o link>*`)
  
  try {
    const qr = await qrGenerate(text, 300)
    await conn.sendMessage(m.chat, { image: qr.buffer, caption: `*⌬┤ ✅ ├⌬ QR GENERADO.*\n> 📎 Contenido: ${text}` }, { quoted: m })
  } catch { 
    m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo generar el código QR.`) 
  }
}

handler.command = ['qrcode', 'qr']
handler.tags = ['tools']
handler.help = ['qr <texto>']
export default handler