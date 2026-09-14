import fetch from 'node-fetch'
import { format } from 'util'

const MAX_GET_SIZE = 100 * 1024 * 1024

const handler = async (m, { conn, text, usedPrefix }) => {
  if (!text) return m.reply(`*⌬┤ ✙ ├⌬ FALTA EL ENLACE.*\n> Usá *${usedPrefix}get <url>*`)
  if (!/^https?:\/\//.test(text)) return m.reply(`*⌬┤ ✙ ├⌬ ENLACE INVÁLIDO.*\n> El enlace debe comenzar con *https://* o *http://*`)
  
  let response
  try { response = await fetch(text) }
  catch (e) { return m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo conectar a la URL.\n> ${e.message}`) }
  
  const contentType = response.headers.get('content-type') || ''
  const contentLength = parseInt(response.headers.get('content-length') || '0')
  const ext = text.split('.').pop().split('?')[0].toLowerCase()
  
  if (contentLength > MAX_GET_SIZE) return m.reply(`*⌬┤ ✙ ├⌬ ARCHIVO MUY GRANDE.*\n> El límite es 100 MB.`)
  
  let buffer
  try { buffer = Buffer.from(await response.arrayBuffer()) }
  catch (e) { return m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo descargar el archivo.\n> ${e.message}`) }
  
  if (/image\/(jpeg|png|gif|webp)/.test(contentType) || ['jpg','jpeg','png','gif','webp'].includes(ext))
    return conn.sendMessage(m.chat, { image: buffer }, { quoted: m })
  if (/video\/(mp4|webm|ogg)/.test(contentType) || ['mp4','webm','ogg'].includes(ext))
    return conn.sendMessage(m.chat, { video: buffer }, { quoted: m })
  if (/audio\/(mpeg|ogg|mp3|wav)/.test(contentType) || ['mp3','wav'].includes(ext) || contentType === 'application/octet-stream') {
    const mime = contentType.startsWith('audio/') ? contentType : 'audio/mpeg'
    return conn.sendMessage(m.chat, { audio: buffer, mimetype: mime }, { quoted: m })
  }
  
  let content = buffer.toString()
  try { content = format(JSON.parse(content)) } catch {}
  return m.reply(content)
}

handler.command = ['get']
handler.tags = ['tools']
handler.help = ['get <url>']
export default handler