import path from 'path'
import fs from 'fs'
import { startSubBot, subBots } from '../../lib/jadibot.js'

const handler = async (m, { conn: zen, usedPrefix, command }) => {
  if (zen.isSubBot) {
    const mainNum = zen.mainBotNumber
    return m.reply(`*⌬┤ ⚠️ ├⌬ SOLO BOT PRINCIPAL*\n> Este comando solo se puede usar en el bot oficial.\n> 👉 Escribí aquí: wa.me/${mainNum}?text=${usedPrefix}${command}`)
  }

  const numero = m.sender.split('@')[0]

  if (subBots.has(numero)) {
    return m.reply(`*⌬┤ ⚠️ ├⌬ SESIÓN ACTIVA*\n> Ya tenés un sub-bot funcionando. Usá *${usedPrefix}stopbot* para pausarlo.`)
  }

  const sessionPath = path.join('./sessions/subbots', numero)
  const hasSession = fs.existsSync(path.join(sessionPath, 'creds.json'))

  if (hasSession) {
    await m.reply(`*⌬┤ ♻️ ├⌬ RECONECTANDO*\n> Levantando tu sesión guardada, aguardá un momento...`)
  } else {
    await m.reply(`*⌬┤ ⏳ ├⌬ PROCESANDO*\n> Generando un código de vinculación para +${numero}...`)
  }

  try {
    await startSubBot(zen, numero, m)
  } catch (e) {
    m.reply(`*⌬┤ ❌ ├⌬ ERROR*\n> Fallo interno al intentar conectarte.`)
  }
}

handler.help = ['serbot']
handler.tags = ['jadibot']
handler.command = ['serbot', 'jadibot', 'subbot', 'code']
handler.noRegister = true
export default handler