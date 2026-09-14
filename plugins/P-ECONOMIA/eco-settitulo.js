import User from '../../lib/database/models/zen-users.js'
import config from '../../config.js'

const TITLE_LABEL = {
  title_cazador: 'El Cazador',
  title_magnate: 'Magnate',
  title_legendario: 'Leyenda Viva',
  title_sombra: 'Sombra'
}

const handler = async (m, { text, userDb }) => {
  if (!userDb) return
  const titles = userDb.inventory.titles || []

  if (!text) {
    if (titles.length === 0) {
      return m.reply('*⌬┤ ❌ ├⌬ SIN TÍTULOS.*\n> No tenés ningún título comprado para equipar.')
    }
    let txt = `*╔═══⌦ ✦ 🏷️ EQUIPAR TÍTULO ✦ ⌫═══╗*\n\n`
    titles.forEach((t, i) => {
      const label = TITLE_LABEL[t] || t
      const active = userDb.inventory.title === t ? '✅' : '❌'
      txt += `*${i + 1}.* ${label} [${active}]\n`
    })
    txt += `\n> _Uso: !equipartitulo <número>_`
    txt += `\n*╚══⌦ ${config.footer} ⌫══╝*`
    return m.reply(txt)
  }

  const idx = parseInt(text) - 1
  const chosen = titles[idx]
  if (!chosen) return m.reply('*⌬┤ ⚠️ · Número de título inválido.*')

  await User.updateOne({ jid: m.sender }, { $set: { 'inventory.title': chosen } })
  userDb.inventory.title = chosen

  m.reply(`*⌬┤ 🏷️ ├⌬ TÍTULO EQUIPADO*\n> Ahora tenés equipado el título: *"${TITLE_LABEL[chosen] || chosen}"*`)
}

handler.help = ['equipartitulo <número>']
handler.tags = ['eco']
handler.command = ['equipartitulo', 'settitulo', 'equipartitle']
handler.register = true
export default handler