import axios from 'axios'
import fs from 'fs'
import path from 'path'

const handler = async (m, { conn, command, text, usedPrefix }) => {
  if (!text) return m.reply(`*⌬┤ ✙ ├⌬ USO.*\n> *${usedPrefix}${command} <url>*`)
  await m.reply(`*⌬┤ ⏳ ├⌬ Extrayendo código fuente...* Aguardá un momento.`)
  
  try {
    const res = await axios.get(`https://api.delirius.store/tools/htmlextract?url=${encodeURIComponent(text)}`)
    if (!res.data?.html) throw new Error()
    
    const file = path.join('./tmp', `html_${Date.now()}.txt`)
    if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp', { recursive: true })
    fs.writeFileSync(file, res.data.html)
    
    await conn.sendMessage(m.chat, { document: fs.readFileSync(file), fileName: 'html_extract.txt', mimetype: 'text/plain', caption: `🧩 *HTML extraído*\n> 🔗 ${text}` }, { quoted: m })
    fs.unlinkSync(file)
  } catch { 
    m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo completar. Verificá si la URL es válida.`) 
  }
}

handler.command = ['htmlextract', 'html', 'source']
handler.tags = ['tools']
handler.help = ['html <url>']
export default handler