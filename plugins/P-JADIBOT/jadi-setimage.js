import { getSubBotMeta, saveSubBotMeta } from '../../lib/jadibot.js'

const handler = async (m, { conn: zen, args, usedPrefix, command }) => {
  if (!zen.isSubBot) return m.reply(`*⌬┤ ⚠️ ├⌬ SOLO SUB-BOTS*\n> Este comando es exclusivo para dueños de Sub-Bots en sus respectivas sesiones.`)

  const senderNumber = m.sender.replace(/\D/g, '')
  const ownerNumber = zen.ownerNumber.replace(/\D/g, '')
  
  const normalizar = (n) => {
    let x = n.replace(/\D/g, '')
    if (x.startsWith('549')) x = '54' + x.slice(3)
    if (x.startsWith('521')) x = '52' + x.slice(3)
    return x
  }

  if (normalizar(senderNumber) !== normalizar(ownerNumber)) {
    return m.reply(`*⌬┤ ❌ ├⌬ SIN PERMISOS*\n> Solo el creador de este sub-bot (+${zen.ownerNumber}) puede cambiar su imagen.`)
  }

  const url = args.join(' ').trim()
  if (!url) return m.reply(`*⌬┤ ℹ️ ├⌬ USO CORRECTO:*\n> ${usedPrefix}${command} https://i.ibb.co/ejemplo.jpg\n> _Sube tu imagen a imgbb.com u otro host y pega el link directo._`)
  if (!/^https?:\/\//.test(url)) return m.reply(`*⌬┤ ⚠️ ├⌬ URL INVÁLIDA*\n> Proporciona un enlace válido que empiece con http o https.`)

  zen.menuImage = url
  const meta = await getSubBotMeta()
  if (!meta[zen.ownerNumber]) meta[zen.ownerNumber] = {}
  meta[zen.ownerNumber].menuImage = url
  await saveSubBotMeta(meta)

  m.reply(`*⌬┤ ✅ ├⌬ ÉXITO*\n> La imagen del menú ha sido actualizada.\n> Usá *${usedPrefix}menu* para ver el cambio.`)
}

handler.help = ['setbotimage <url>']
handler.tags = ['jadibot']
handler.command = ['setbotimage', 'setfotobot', 'imagebot']
handler.noRegister = true
export default handler