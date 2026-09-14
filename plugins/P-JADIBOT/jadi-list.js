import { subBots } from '../../lib/jadibot.js'
import config from '../../config.js'

const handler = async (m, { usedPrefix }) => {
  if (!subBots || subBots.size === 0) {
    return m.reply(`*⌬┤ ℹ️ ├⌬ VACÍO*\n> No hay ningún sub-bot activo en este momento.`)
  }

  let text = `*╔═══⌦ ✦ 🤖 SUB-BOTS ✦ ⌫═══╗*\n\n`
  text += `> 📊 *Conectados:* ${subBots.size} de ${config.limiteSubbots || 30}\n\n`

  let count = 1
  for (const [numero] of subBots.entries()) {
    text += `> *${count}.* wa.me/${numero}\n`
    count++
  }
  
  text += `\n*╚══⌦ ${config.footer} ⌫══╝*\n> _Usa ${usedPrefix}serbot para alojar el tuyo._`
  m.reply(text)
}

handler.help = ['bots']
handler.tags = ['jadibot']
handler.command = ['bots', 'listabots', 'subbots']
handler.noRegister = true
export default handler