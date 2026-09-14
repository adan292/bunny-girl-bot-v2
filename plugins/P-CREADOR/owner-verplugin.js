import fs from 'fs'
import path from 'path'
import config from '../../config.js'

function findFileRecursively(dir, fileName) {
  const list = fs.readdirSync(dir, { withFileTypes: true })
  for (const item of list) {
    const fullPath = path.join(dir, item.name)
    if (item.isDirectory()) {
      const found = findFileRecursively(fullPath, fileName)
      if (found) return found
    } else if (item.name === fileName) {
      return fullPath
    }
  }
  return null
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) return m.reply(`*⌬┤ ⚠️ ├⌬ USO:* ${usedPrefix + command} <nombre>\n> Ejemplo: *${usedPrefix + command} eco-bal*`)

  let fileName = text.trim()
  if (!fileName.endsWith('.js')) fileName += '.js'

  const pluginsDir = path.resolve(process.cwd(), 'plugins')
  const filePath = findFileRecursively(pluginsDir, fileName)

  if (!filePath) return m.reply(`*⌬┤ ❌ ├⌬ NO ENCONTRADO.*\n> No existe ningún plugin llamado *${fileName}*.`)

  const relPath = path.relative(pluginsDir, filePath)

  await conn.sendMessage(m.chat, {
    document: fs.readFileSync(filePath),
    mimetype: 'application/javascript',
    fileName: fileName,
    caption: `*╔═══⌦ ✦ 📄 PLUGIN ENCONTRADO ✦ ⌫═══╗*\n\n> 📁 *Ruta:* plugins/${relPath.replace(/\\/g, '/')}\n> ⚖️ *Peso:* ${(fs.statSync(filePath).size / 1024).toFixed(2)} KB\n\n*╚══⌦ ${config.footer} ⌫══╝*`
  }, { quoted: m })
}

handler.help = ['verplugin <nombre>']
handler.tags = ['owner']
handler.command = ['verplugin', 'getplugin', 'getp']
handler.ownerOnly = true

export default handler