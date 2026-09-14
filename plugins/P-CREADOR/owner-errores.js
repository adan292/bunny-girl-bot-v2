import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'
import config from '../../config.js'

function getFilesRecursively(dir) {
  let results = []
  if (!fs.existsSync(dir)) return results
  
  const list = fs.readdirSync(dir, { withFileTypes: true })
  for (const item of list) {
    const fullPath = path.join(dir, item.name)
    if (item.isDirectory()) {
      results = results.concat(getFilesRecursively(fullPath))
    } else if (item.isFile() && item.name.endsWith('.js')) {
      results.push(fullPath)
    }
  }
  return results
}

const handler = async (m, { conn }) => {
  await conn.sendMessage(m.chat, { react: { text: '🔎', key: m.key } })
  await m.reply('*⌬┤ ⏳ ├⌬ ANALIZANDO CÓDIGO...*\n> _Escaneando todos los plugins en busca de errores de sintaxis o dependencias faltantes. Por favor espera._')

  const pluginsDir = path.resolve(process.cwd(), 'plugins')
  const files = getFilesRecursively(pluginsDir)
  
  let errores = []

  for (const file of files) {
    const relPath = path.relative(pluginsDir, file).replace(/\\/g, '/')
    try {
      const url = pathToFileURL(file).href + '?t=' + Date.now()
      await import(url)
    } catch (e) {
      errores.push(`*📄 ${relPath}*\n> ❌ ${e.name}: ${e.message}`)
    }
  }

  if (errores.length === 0) {
    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    return m.reply('*⌬┤ ✅ ├⌬ SISTEMA LIMPIO.*\n> No se encontraron errores de sintaxis ni módulos faltantes en ningún plugin.')
  }

  await conn.sendMessage(m.chat, { react: { text: '⚠️', key: m.key } })

  let txt = `*╔═══⌦ ✦ ⚠️ REPORTE DE ERRORES ✦ ⌫═══╗*\n\n`
          + `> Se detectaron problemas en **${errores.length}** plugin(s):\n\n`
          + errores.join('\n\n')
          + `\n\n*╚══⌦ ${config.footer} ⌫══╝*`

  m.reply(txt)
}

handler.help = ['errores']
handler.tags = ['owner']
handler.command = ['errores', 'checkplugins', 'scan', 'linter']
handler.ownerOnly = true

export default handler