import fs from 'fs/promises'
import { existsSync, mkdirSync } from 'fs'
import path from 'path'
import pino from 'pino'
import NodeCache from 'node-cache'
import * as baileysMod from '@whiskeysockets/baileys'
import { handler } from '../handler.js'
import { msgRetryCache } from './caches.js'
import config from '../config.js'

const pkg = baileysMod.default && Object.keys(baileysMod).length === 1 ? baileysMod.default : baileysMod
const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = pkg

export const subBots = new Map()

const SUBBOT_DIR = './sessions/subbots'
if (!existsSync(SUBBOT_DIR)) mkdirSync(SUBBOT_DIR, { recursive: true })

const META_FILE = './sessions/subbots_meta.json'

export async function getSubBotMeta() {
  try {
    if (existsSync(META_FILE)) {
      const data = await fs.readFile(META_FILE, 'utf-8')
      return JSON.parse(data)
    }
  } catch (e) {}
  return {}
}

export async function saveSubBotMeta(data) {
  await fs.writeFile(META_FILE, JSON.stringify(data, null, 2))
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

const msgRetryCounterCache = new NodeCache({ stdTTL: 180, checkperiod: 30 })

export async function startSubBot(mainBot, numero, m = null) {
  const limite = config.limiteSubbots || 30
  if (!subBots.has(numero) && subBots.size >= limite) {
    if (m) await m.reply(`*『 ❌ 』LÍMITE ALCANZADO.*\n> No se pueden conectar más de ${limite} sub-bots en este servidor.`)
    return
  }

  const sessionPath = path.join(SUBBOT_DIR, numero)
  if (!existsSync(sessionPath)) await fs.mkdir(sessionPath, { recursive: true })

  const pausedFile = path.join(sessionPath, '.paused')
  if (existsSync(pausedFile)) {
    if (!m) return
    await fs.unlink(pausedFile).catch(() => {})
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
  const { version } = await fetchLatestBaileysVersion()
  const logger = pino({ level: 'silent' })

  const subBot = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    syncFullHistory: false,
    markOnlineOnConnect: false,
    browser: ["Ubuntu", "Chrome", "20.0.04"],
    msgRetryCounterCache,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    getMessage: async (key) => {
      const msg = msgRetryCache.get(key.id)
      return msg || undefined
    }
  })

  const numNormal = numero.replace(/\D/g, '')
  subBot.isSubBot       = true
  subBot.ownerNumber    = numNormal
  subBot.mainBotNumber  = mainBot.user?.id?.split(':')[0].split('@')[0] || ''
  subBot.welcomeSent    = false
  subBot.connecLogSent  = false

  const meta = await getSubBotMeta()
  if (meta[numero]) {
    if (meta[numero].name)      subBot.botname   = meta[numero].name
    if (meta[numero].menuImage) subBot.menuImage = meta[numero].menuImage
  }

  subBots.set(numero, subBot)

  if (!subBot.authState.creds.registered && m) {
    await fs.writeFile(path.join(sessionPath, '.just_logged'), 'true').catch(() => {})

    const solicitarCodigo = async (intentos = 0) => {
      try {
        await sleep(3500)
        const rawCode = await subBot.requestPairingCode(numero)
        const code = rawCode?.match(/.{1,4}/g)?.join('-') || rawCode

        const text = `*┏━━•❈ 🤖 SUB-BOT ❈•━━┓*\n\n`
                   + `> ✦ *Paso 1:* Ve a WhatsApp > Dispositivos vinculados.\n`
                   + `> ✦ *Paso 2:* Toca "Vincular con número de teléfono".\n`
                   + `> ✦ *Paso 3:* Escribe el código que aparece abajo.\n\n`
                   + `*┗━━━━•❅•°•❈•°•❅•━━━━┛*`

        await m.reply(text)
        await sleep(1000)
        await m.reply(`${code}`)
      } catch (err) {
        if (intentos < 3) {
          await sleep(2000)
          await solicitarCodigo(intentos + 1)
        } else {
          await m.reply(`*『 ❌ 』ERROR.*\n> No se pudo generar el código tras varios intentos. Reintentá en unos minutos.`)
          await deleteSubBot(numero).catch(() => {})
        }
      }
    }

    await solicitarCodigo()
  }

  subBot.ev.on('creds.update', saveCreds)

  subBot.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update

    if (connection === 'open') {
      if (!subBot.connecLogSent) {
        subBot.connecLogSent = true
        console.log(`[🤖 SUB-BOT] Conectado: +${numero}`)
      }

      const justLoggedFile = path.join(SUBBOT_DIR, numero, '.just_logged')
      if (existsSync(justLoggedFile) && !subBot.welcomeSent) {
        subBot.welcomeSent = true
        await fs.unlink(justLoggedFile).catch(() => {})

        const txt = `*『 ✅ 』SUB-BOT ACTIVO*\n> Tu sesión ha sido iniciada correctamente. El bot está operando 24/7 en tu número.`
        await subBot.sendMessage(`${numero}@s.whatsapp.net`, { text: txt }).catch(() => {})

        if (m && m.chat.endsWith('@g.us')) {
          await m.reply(`*『 ✅ 』CONEXIÓN EXITOSA*\n> @${numero}, tu sub-bot ya está activo. Te envié un mensaje al privado.`, { mentions: [`${numero}@s.whatsapp.net`] })
        } else if (m) {
          await m.reply(`*『 ✅ 』CONEXIÓN EXITOSA*\n> Tu sub-bot ya está operando.`)
        }
      }
    }

    if (connection === 'close') {
      subBot.connecLogSent = false
      const code = lastDisconnect?.error?.output?.statusCode

      if (code === DisconnectReason.loggedOut || code === 401) {
        console.log(`[🤖 SUB-BOT] Sesión cerrada: +${numero}`)
        await deleteSubBot(numero)
        if (m) await m.reply(`*『 ⚠️ 』SESIÓN CERRADA*\n> La sesión del sub-bot (+${numero}) fue cerrada desde WhatsApp.`)
      } else {
        if (!subBot.authState.creds.registered) {
          await deleteSubBot(numero)
          if (m) await m.reply(`*『 ⏳ 』TIEMPO AGOTADO*\n> No pusiste el código a tiempo. Volvé a usar el comando.`)
          return
        }

        if (existsSync(path.join(SUBBOT_DIR, numero, '.paused'))) return

        if (existsSync(path.join(SUBBOT_DIR, numero))) {
          setTimeout(() => startSubBot(mainBot, numero), 5000)
        }
      }
    }
  })

  subBot.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    for (const msg of messages) {
      if (msg.message) {
        msgRetryCache.set(msg.key.id, msg.message)
      }
      if (!msg?.message || msg.key.remoteJid === 'status@broadcast') continue
      await handler(subBot, msg).catch(() => {})
    }
  })
}

export async function pauseSubBot(numero) {
  const subBot = subBots.get(numero)
  if (subBot) {
    try { subBot.ws.close() } catch (e) {}
    subBots.delete(numero)
  }
  const sessionPath = path.join(SUBBOT_DIR, numero)
  if (existsSync(sessionPath)) {
    await fs.writeFile(path.join(sessionPath, '.paused'), 'true').catch(() => {})
  }
}

export async function deleteSubBot(numero) {
  await pauseSubBot(numero)
  const sessionPath = path.join(SUBBOT_DIR, numero)
  if (existsSync(sessionPath)) {
    await fs.rm(sessionPath, { recursive: true, force: true }).catch(() => {})
  }
}

export async function autoStartSubBots(mainBot) {
  if (!existsSync(SUBBOT_DIR)) return
  const carpetas = await fs.readdir(SUBBOT_DIR)

  const validSessions = []
  for (const carpeta of carpetas) {
    if (existsSync(path.join(SUBBOT_DIR, carpeta, 'creds.json'))) {
      validSessions.push(carpeta)
    }
  }

  if (validSessions.length > 0) {
    console.log(`\n📦 INICIANDO ${validSessions.length} SUB-BOTS...`)
    for (const numero of validSessions) {
      if (subBots.size >= (config.limiteSubbots || 30)) break
      if (existsSync(path.join(SUBBOT_DIR, numero, '.paused'))) continue
      await startSubBot(mainBot, numero)
      await sleep(1500)
    }
  }
}