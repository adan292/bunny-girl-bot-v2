import 'dotenv/config'
import * as baileysMod from '@whiskeysockets/baileys'
import pino from 'pino'
import fs from 'fs'
import { readdir, stat, unlink } from 'fs/promises'
import readline from 'readline'
import chalk from 'chalk'
import config from './config.js'
import { connectDB } from './lib/database/db.js'
import { handler, loadPlugins, setupWatchers, plugins } from './handler.js'
import { groupCache, msgRetryCache } from './lib/caches.js'
import { autoStartSubBots } from './lib/jadibot.js'

const pkg = baileysMod.default && Object.keys(baileysMod).length === 1 ? baileysMod.default : baileysMod
const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = pkg

const SESSION_PATH = './sessions/main'
const TMP_PATH = './tmp'

if (!fs.existsSync(SESSION_PATH)) fs.mkdirSync(SESSION_PATH, { recursive: true })
if (!fs.existsSync(TMP_PATH)) fs.mkdirSync(TMP_PATH, { recursive: true })

setInterval(async () => {
  if (!fs.existsSync(TMP_PATH)) return
  try {
    const files = await readdir(TMP_PATH)
    for (const f of files) {
      const fp = `${TMP_PATH}/${f}`
      try {
        const stats = await stat(fp)
        if (Date.now() - stats.mtimeMs > 3_600_000) await unlink(fp)
      } catch {}
    }
  } catch {}
}, 3_600_000)

let retryCount = 0
function calcDelay() {
  return Math.min(5000 * 2 ** retryCount + Math.random() * 2000, 120_000)
}

async function startBot() {
  await connectDB()

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH)
  const { version } = await fetchLatestBaileysVersion()
  const logger = pino({ level: 'silent' })

  const conn = makeWASocket({
    version,
    logger,
    printQRInTerminal: !config.usePairingCode,
    browser: ['Windows', 'Chrome', '124.0.6367.82'],
    keepAliveIntervalMs: 60000,
    connectTimeoutMs: 60000,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
    forceSyncHistoryMessage: false,
    shouldSyncHistoryMessage: () => false,
    getMessage: async (key) => {
      const msg = msgRetryCache.get(key.id)
      return msg || undefined
    }
  })

  if (config.usePairingCode && !conn.authState.creds.registered) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    const numero = await new Promise(res =>
      rl.question(chalk.bold.yellowBright('\nINGRESA TU NÚMERO DE TELÉFONO (sin +): '), ans => { rl.close(); res(ans.replace(/\D/g, '')) })
    )
    setTimeout(async () => {
      try {
        const raw = await conn.requestPairingCode(numero)
        const code = raw?.match(/.{1,4}/g)?.join('-') ?? raw
        console.log(`\n${chalk.bold.yellowBright('CÓDIGO:')} ${chalk.bold.bgGreen.white(` ${code} `)}\n`)
      } catch (e) {
        console.error(chalk.bold.bgRed.white(' [PAIRING ERROR] '), chalk.bold.redBright(e.message))
        process.exit(1)
      }
    }, 3000)
  }

  conn.ev.on('creds.update', saveCreds)

  conn.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode
      if (code === DisconnectReason.loggedOut || code === 401) {
        conn.ev.removeAllListeners()
        conn.ws.close()
        setTimeout(() => {
          fs.rmSync(SESSION_PATH, { recursive: true, force: true })
          process.exit(1)
        }, 1000)
        return
      }
      if (code === 405 || code === 429 || retryCount >= 10) return process.exit(1)
      if (code === 408 || code === 503) return setTimeout(startBot, 2000)
      retryCount++
      const delay = calcDelay()
      console.log(chalk.bold.yellowBright(`  ↻ RECONECTANDO EN ${Math.round(delay/1000)}s...`))
      setTimeout(startBot, delay)
    }

    if (connection === 'open') {
      retryCount = 0
      console.log(chalk.bold.bgGreen.white('\n ✅ BOT CONECTADO Y LISTO! \n'))

      const groups = await conn.groupFetchAllParticipating().catch(() => ({}))
      for (const id in groups) {
        groupCache.set(id, groups[id])
      }

      await loadPlugins()
      await autoStartSubBots(conn)
      if (process.env.NODE_ENV === 'development') {
        setupWatchers()
      }
    }
  })

  conn.ev.on('messages.upsert', async ({ messages, type }) => {
    for (const m of messages) {
      if (m.message) {
        msgRetryCache.set(m.key.id, m.message)
      }
      if (type !== 'notify' && type !== 'append') continue
      if (!m?.message || m.key.remoteJid === 'status@broadcast') continue

      try { await conn.readMessages([m.key]) } catch (_) {}

      await handler(conn, m).catch(e =>
        console.error(chalk.bold.bgRed.white(' [HANDLER] '), chalk.bold.redBright(e?.stack || e?.message || e))
      )
    }
  })

  conn.ev.on('group-participants.update', async (update) => {
    try {
      const { id, action } = update
      if (id) {
        groupCache.del(id)
        conn.groupMetadata(id).then(meta => { if (meta?.id) groupCache.set(id, meta) }).catch(() => {})
      }

      console.log(chalk.bold.blueBright(`[EVENTO] Participantes ${action} en: ${id}`))

      const welcomePlugin = plugins['welcome.js']
      if (welcomePlugin?.manejarParticipantes) {
        await welcomePlugin.manejarParticipantes(conn, update)
      }
    } catch (e) {
      console.error(chalk.bold.bgRed.white(' [GROUP-UPDATE ERROR] '), chalk.bold.redBright(e.stack || e.message))
    }
  })
}

const shutdown = () => process.exit(0)
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
process.on('unhandledRejection', e => console.error(chalk.bold.bgRed.white(' [unhandledRejection] '), chalk.bold.redBright(e?.stack || e?.message || e)))
process.on('uncaughtException', e => console.error(chalk.bold.bgRed.white(' [uncaughtException] '), chalk.bold.redBright(e?.stack || e?.message || e)))

startBot()
