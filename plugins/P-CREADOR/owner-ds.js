import fs from 'fs'
import path from 'path'
import { subBots } from '../../lib/jadibot.js'
import config from '../../config.js'

const SUBBOT_DIR = path.resolve('./sessions/subbots')

async function limpiarTmp() {
  let count = 0
  const tmpPath = path.resolve(process.cwd(), 'tmp')
  if (!fs.existsSync(tmpPath)) return count
  for (const file of fs.readdirSync(tmpPath)) {
    const fp = path.join(tmpPath, file)
    if (fs.statSync(fp).isFile()) { fs.unlinkSync(fp); count++ }
  }
  return count
}

async function limpiarKeys(sessionPath) {
  let count = 0
  if (!fs.existsSync(sessionPath)) return count
  for (const key of fs.readdirSync(sessionPath)) {
    if (key === 'creds.json' || key === '.paused') continue
    const fp = path.join(sessionPath, key)
    const st = fs.statSync(fp)
    if (st.isFile())      { fs.unlinkSync(fp);                            count++ }
    else if (st.isDirectory()) { fs.rmSync(fp, { recursive: true, force: true }); count++ }
  }
  return count
}

const handler = async (m, { conn, text }) => {
  await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

  const arg = text?.trim().toLowerCase()

  try {
    const tmpBorrados  = await limpiarTmp()
    let   keysBorradas = 0
    let   detalle      = ''

    if (arg && arg !== 'all' && arg !== 'todo') {
      const numero = arg.replace(/\D/g, '')

      if (!fs.existsSync(path.join(SUBBOT_DIR, numero))) {
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        return m.reply(`*⌬┤ ❌ ├⌬ SUB-BOT NO ENCONTRADO.*\n> No existe una sesión para el número *${numero}*.`)
      }

      keysBorradas = await limpiarKeys(path.join(SUBBOT_DIR, numero))
      detalle = `> 🤖 *Sub-bot limpiado:* +${numero}\n`
               + `> 🔑 *Keys borradas:* ${keysBorradas} archivos\n`
               + `> _creds.json conservado._`

    } else if (arg === 'all' || arg === 'todo') {
      let subbotsCleaned = 0
      if (fs.existsSync(SUBBOT_DIR)) {
        for (const carpeta of fs.readdirSync(SUBBOT_DIR)) {
          const sp = path.join(SUBBOT_DIR, carpeta)
          if (fs.statSync(sp).isDirectory()) {
            keysBorradas += await limpiarKeys(sp)
            subbotsCleaned++
          }
        }
      }
      detalle = `> 🤖 *Sub-bots limpiados:* ${subbotsCleaned}\n`
               + `> 🔑 *Keys borradas (total):* ${keysBorradas} archivos\n`
               + `> _Todos los creds.json conservados._`

    } else {
      keysBorradas = await limpiarKeys(path.resolve('./sessions/main'))
      detalle = `> 🔑 *Keys corruptas borradas:* ${keysBorradas} archivos\n`
               + `> _La sesión principal (creds.json) se mantuvo intacta._`
    }

    const txt = `*╔═══⌦ ✦ 🧹 CACHÉ LIMPIO ✦ ⌫═══╗*\n\n`
              + `> 🗑️ *Temporales borrados:* ${tmpBorrados} archivos\n`
              + detalle + `\n`
              + `*╚══⌦ ${config.footer} ⌫══╝*`

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    m.reply(txt)

  } catch (e) {
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    m.reply(`*⌬┤ ❌ ├⌬ ERROR AL LIMPIAR.*\n> ${e.message}`)
  }
}

handler.help    = ['ds [número|all]', 'clearcache [número|all]']
handler.tags    = ['owner']
handler.command = ['ds', 'clearcache', 'limpiarcache', 'borrartmp']
handler.ownerOnly = true

export default handler
