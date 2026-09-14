import config from '../../config.js'

const normalizeToTag = (name) => {
  return name
    .replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

const handler = async (m, { conn, command, userDb }) => {
  if (!userDb) return

  const isBestiary = ['bestiario', 'bestiary', 'cazas'].includes(command)
  const collection = isBestiary ? userDb.bestiary : userDb.aquarium
  const title = isBestiary ? 'BESTIARIO' : 'PECERA'
  const emoji = isBestiary ? '🐾' : '🐟'
  const action = isBestiary ? 'cazar' : 'pescar'

  let items = []

  if (collection) {
    if (collection instanceof Map) {
      items = Array.from(collection.entries())
    } else if (typeof collection.toJSON === 'function') {
      items = Object.entries(collection.toJSON())
    } else {
      items = Object.entries(collection)
    }
  }

  items = items.filter(([key]) => !key.startsWith('$') && !key.startsWith('_') && key !== 'init')

  if (items.length === 0) return m.reply(`*⌬┤ ${emoji} ├⌬ TU ${title} ESTÁ VACÍO.*\n> ¡Sal a ${action} algo para empezar tu colección!`)

  items.sort((a, b) => b[1] - a[1])

  let txt = `*╔═══⌦ ✦ ${emoji} ${title} ✦ ⌫═══╗*\n\n`
  txt += `> 👤 *Dueño:* @${m.sender.split('@')[0]}\n`
  txt += `> 📊 *Descubrimientos:* ${items.length}\n\n`
  txt += `*📜 LISTADO DE CAPTURAS:*\n`

  items.forEach(([name, count]) => {
    const tag = normalizeToTag(name)
    txt += `> *${name}* \`[${tag}]\` — x${count}\n`
  })
  txt += `\n> 💡 _¡Vende tus capturas usando el comando *!contratos* para obtener cuantiosas sumas de ${config.CURRENCY_NAME} y ${config.PREMIUM_NAME}!_\n`
  txt += `*╚══⌦ ${config.footer} ⌫══╝*`
  
  await conn.sendMessage(m.chat, { text: txt, mentions: [m.sender] }, { quoted: m })
}

handler.help = ['bestiario', 'pecera']
handler.tags = ['eco']
handler.command = ['bestiario', 'bestiary', 'cazas', 'pecera', 'peces', 'aquarium']
handler.register = true

export default handler