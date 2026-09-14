import User from '../../lib/database/models/zen-users.js'

const handler = async (m) => {
  let userDb = await User.findOne({ jid: m.sender })

  m.reply(`*⌬┤ 🔐 ├⌬ TU CÓDIGO DE SERIE:*\n\n> \`${userDb.serial}\`\n\n~No lo compartas.~`)
}

handler.help = ['serial']
handler.tags = ['registro']
handler.command = ['miserial', 'sn', 'serial']
handler.register = true
export default handler