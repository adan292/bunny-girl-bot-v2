import { loadPlugins, loadPlugin, plugins } from '../../handler.js'
import path from 'path'

const PLUGINS_DIR = path.resolve('./plugins')

const handler = async (m, { conn, text, command }) => {
  const arg = text?.trim().toLowerCase()

  await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

  if (command === 'up' && arg && arg !== 'all' && arg !== 'todo') {
    const nombre = arg.endsWith('.js') ? arg : `${arg}.js`

    const existeExacto = Object.keys(plugins).find(k => k === nombre || k.endsWith(`/${nombre}`))

    if (!existeExacto) {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      return m.reply(`*⌬┤ ❌ ├⌬ PLUGIN NO ENCONTRADO.*\n> No existe ningún plugin cargado llamado *${nombre}*.\n> Usá *${command}* sin argumentos o con *all* para recargar todos.`)
    }

    try {
      await loadPlugin(existeExacto)
      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
      m.reply(`*⌬┤ ✅ ├⌬ PLUGIN ACTUALIZADO.*\n> *${existeExacto}* recargado correctamente.`)
    } catch (e) {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      m.reply(`*⌬┤ ❌ ├⌬ ERROR AL RECARGAR.*\n> ${e.message}`)
    }
    return
  }

  try {
    await loadPlugins()
    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    m.reply(`*⌬┤ ✅ ├⌬ PLUGINS RECARGADOS.*\n> Todos los comandos fueron actualizados en memoria.`)
  } catch (e) {
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    m.reply(`*⌬┤ ❌ ├⌬ ERROR AL RECARGAR.*\n> ${e.message}`)
  }
}

handler.help    = ['up [plugin|all]', 'yo']
handler.tags    = ['owner']
handler.command = ['reload', 'recargar', 'updateplugins', 'recargarplugins', 'up', 'yo']
handler.ownerOnly = true

export default handler
