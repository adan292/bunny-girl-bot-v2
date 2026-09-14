import { plugins } from '../../handler.js'
import path from 'path'
import config from '../../config.js'

const handler = async (m) => {
  const list = Object.keys(plugins).sort()
  if (list.length === 0) return m.reply('*⌬┤ ⚠️ · No hay plugins cargados en memoria.*')

  const groups = {}
  let total = 0

  list.forEach(relPath => {
    const parts = relPath.replace(/\\/g, '/').split('/')
    const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : 'Raíz'
    const file = parts[parts.length - 1]
    
    if (!groups[folder]) groups[folder] = []
    groups[folder].push(file)
    total++
  })

  let txt = `*╔═══⌦ ✦ 📜 LISTA DE PLUGINS ✦ ⌫═══╗*\n\n`
  txt += `> 📦 *Total cargados:* ${total}\n\n`

  for (const [folder, files] of Object.entries(groups)) {
    txt += `*📁 ${folder.toUpperCase()}*\n`
    files.forEach(f => {
      txt += `> 📄 ${f}\n`
    })
    txt += `\n`
  }

  txt += `*╚══⌦ ${config.footer} ⌫══╝*`

  m.reply(txt)
}

handler.help = ['listplugins']
handler.tags = ['owner']
handler.command = ['listplugins', 'plugins', 'lp']
handler.ownerOnly = true

export default handler