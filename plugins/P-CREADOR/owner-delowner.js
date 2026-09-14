import fs from 'fs'
import path from 'path'
import config from '../../config.js'

const OWNERS_FILE = path.resolve(process.cwd(), 'owners.json')

const principalOwners = global.principalOwnersSaved || [...config.ownerNumber]

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
      return m.reply('*⌬┤ 🚫 ├⌬ ACCESO DENEGADO.*\n> Solo los Creadores Principales del bot pueden remover a otros Owners.')
  }

  const targetJid = resolveTargetJid(m, participants, text)
  if (!targetJid) return m.reply(`*⌬┤ ⚠️ ├⌬ USO CORRECTO*\n> *${usedPrefix + command}* @usuario o respondiendo a un mensaje.`)

  const targetNum = extraerNum(targetJid)

  if (!config.ownerNumber.includes(targetNum)) {
    return m.reply('*⌬┤ ❌ · ESTE USUARIO NO ES OWNER.*')
  }

  if (principalOwners.includes(targetNum) || targetNum === '5493772455367') {
      return m.reply('*⌬┤ 🚫 ├⌬ ACCIÓN DENEGADA.*\n> No puedes eliminar a un Creador Principal (los que están registrados en el código base).')
  }

  const index = config.ownerNumber.indexOf(targetNum)
  if (index !== -1) config.ownerNumber.splice(index, 1)

  if (fs.existsSync(OWNERS_FILE)) {
      let extraOwners = JSON.parse(fs.readFileSync(OWNERS_FILE, 'utf8'))
      extraOwners = extraOwners.filter(n => n !== targetNum)
      fs.writeFileSync(OWNERS_FILE, JSON.stringify(extraOwners, null, 2))
  }

  m.reply(`*⌬┤ 🗑️ ├⌬ SUB-OWNER ELIMINADO*\n> El número *+${targetNum}* fue borrado de \`owners.json\` y perdió sus privilegios.`)
}

handler.help = ['delowner @user']
handler.tags = ['owner']
handler.command = ['delowner', 'quitarowner', 'removeowner']
handler.ownerOnly = true

export default handler