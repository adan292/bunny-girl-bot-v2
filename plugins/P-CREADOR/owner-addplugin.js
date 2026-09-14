import fs from 'fs'
import path from 'path'

const handler = async (m, { text, usedPrefix, command }) => {
  const q = m.quoted
  if (!q || !q.msg?.fileName) {
    return m.reply(`*⌬┤ ⚠️ ├⌬ RESPONDE A UN DOCUMENTO.*\n> Debés responder a un archivo *.js* enviado como documento.\n> *Uso:* ${usedPrefix + command} <carpeta destino opcional>`)
  }

  const fileName = q.msg.fileName
  if (!fileName.endsWith('.js')) return m.reply('*⌬┤ ❌ ├⌬ FORMATO INVÁLIDO.*\n> Solo se permiten archivos .js')

  let folderPath = text.trim()
  if (folderPath.startsWith('/')) folderPath = folderPath.slice(1)

  const destPath = path.resolve(process.cwd(), 'plugins', folderPath, fileName)

  try {
    fs.mkdirSync(path.dirname(destPath), { recursive: true })

    const buffer = await q.download()
    if (!buffer) throw new Error('No se pudo descargar el buffer del archivo.')

    fs.writeFileSync(destPath, buffer)

    const relPath = path.relative(process.cwd(), destPath).replace(/\\/g, '/')

    m.reply(`*⌬┤ ✅ ├⌬ PLUGIN INSTALADO EXITOSAMENTE.*\n> 📁 *Guardado en:* ${relPath}\n\n> 💡 _Usá el comando de reload para cargarlo inmediatamente si el bot no está en modo desarrollo._`)

  } catch (e) {
    m.reply(`*⌬┤ ❌ ├⌬ ERROR AL GUARDAR.*\n> ${e.message}`)
  }
}

handler.help = ['addplugin <ruta>']
handler.tags = ['owner']
handler.command = ['addplugin', 'saveplugin', 'addp']
handler.ownerOnly = true

export default handler