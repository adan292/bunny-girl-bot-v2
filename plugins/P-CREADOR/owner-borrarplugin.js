import fs from 'fs'
import path from 'path'

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

const handler = async (m, { text, usedPrefix, command }) => {
  if (!text) return m.reply(`*⌬┤ ⚠️ ├⌬ USO:* ${usedPrefix + command} <nombre>\n> Ejemplo: *${usedPrefix + command} eco-bal*`)

  let fileName = text.trim()
  if (!fileName.endsWith('.js')) fileName += '.js'

  const pluginsDir = path.resolve(process.cwd(), 'plugins')
  const filePath = findFileRecursively(pluginsDir, fileName)

  if (!filePath) return m.reply(`*⌬┤ ❌ ├⌬ NO ENCONTRADO.*\n> No existe ningún plugin llamado *${fileName}*.`)

  try {
    fs.unlinkSync(filePath)
    const relPath = path.relative(pluginsDir, filePath).replace(/\\/g, '/')
    m.reply(`*⌬┤ 🗑️ ├⌬ PLUGIN ELIMINADO EXITOSAMENTE.*\n> Se borró: *plugins/${relPath}*\n\n> 💡 _Si estabas en modo producción, usá el comando de reload para actualizar la memoria._`)
  } catch (e) {
    m.reply(`*⌬┤ ❌ ├⌬ ERROR AL BORRAR.*\n> ${e.message}`)
  }
}

handler.help = ['borrarplugin <nombre>']
handler.tags = ['owner']
handler.command = ['borrarplugin', 'delplugin', 'delp']
handler.ownerOnly = true

export default handler