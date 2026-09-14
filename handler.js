import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'
import chalk from 'chalk'
import config from './config.js'
import User from './lib/database/models/zen-users.js'
import GroupDb from './lib/database/models/zen-groups.js'
import { spamCache, warnCache, groupCache, userCache, groupDbCache, getMsgCache, globalXpCache } from './lib/caches.js'
import { serializarM, selectionSessions } from './lib/serializer.js'
import { checkDailyReset, checkLevelUp } from './lib/rpgManager.js'

const BOT_START_TIME = Math.floor(Date.now() / 1000)

export const plugins = {}
const cmdMap = new Map()
const regexCmds = []
const watchDebounce = new Map()
const PLUGINS_DIR = path.resolve('./plugins')

function getPlatform(id) {
  if (!id) return '❓ Desconocido'
  if (id.startsWith('BAE5') && id.length === 16) return '🤖 Bot (Baileys)'
  if (id.length === 16) return '💻 Web / Desktop'
  if (id.startsWith('3EB0') && id.length === 12) return '💻 WhatsApp Web'
  if (id.startsWith('3A') && (id.length === 28 || id.length === 32)) return '🍏 iOS (iPhone)'
  if (id.startsWith('3E') && id.length === 22) return '🤖 Android'
  return '📱 Android (Heurístico)'
}

function getMsgType(m) {
  if (!m?.mtype) return '❓ Desconocido'
  if (m.mtype === 'conversation' || m.mtype === 'extendedTextMessage') return 'Texto 📝'
  if (m.mtype === 'imageMessage') return 'Imagen 🖼️'
  if (m.mtype === 'videoMessage') return m.msg?.gifPlayback ? 'GIF 🎞️' : 'Video 🎥'
  if (m.mtype === 'audioMessage') return m.msg?.ptt ? 'Nota de Voz 🎙️' : 'Audio 🎵'
  if (m.mtype === 'documentMessage') return 'Documento 📄'
  if (m.mtype === 'stickerMessage') return 'Sticker 🏷️'
  if (m.mtype === 'buttonsResponseMessage' || m.mtype === 'templateButtonReplyMessage' || m.mtype === 'listResponseMessage') return 'Respuesta de Botón 🔘'
  if (m.mtype === 'pollCreationMessage' || m.mtype === 'pollUpdateMessage') return 'Encuesta 📊'
  if (m.mtype === 'interactiveResponseMessage') return 'Respuesta Interactiva 📱'
  return m.mtype.replace('Message', '')
}

function rebuildIndex() {
  cmdMap.clear()
  regexCmds.length = 0
  for (const plugin of Object.values(plugins)) {
    if (!plugin?.command) continue
    if (plugin.command instanceof RegExp) {
      regexCmds.push({ regex: plugin.command, plugin })
    } else if (Array.isArray(plugin.command)) {
      plugin.command.forEach(c => cmdMap.set(c, plugin))
    } else {
      cmdMap.set(plugin.command, plugin)
    }
  }
}

function getFilesRecursively(dir) {
  let results = []
  const list = fs.readdirSync(dir, { withFileTypes: true })
  for (const item of list) {
    const fullPath = path.join(dir, item.name)
    if (item.isDirectory()) results = results.concat(getFilesRecursively(fullPath))
    else if (item.isFile() && item.name.endsWith('.js')) results.push(fullPath)
  }
  return results
}

export async function loadPlugin(relPath, silent = false) {
  try {
    const full = path.join(PLUGINS_DIR, relPath)
    if (!fs.existsSync(full)) { delete plugins[relPath]; rebuildIndex(); return }
    const url = process.env.NODE_ENV === 'production'
      ? pathToFileURL(full).href
      : pathToFileURL(full).href + `?v=${Date.now()}`

    const mod = await import(url)
    const plugin = mod.default ?? mod

    if (plugin && (plugin.command || plugin.all || plugin.before || typeof plugin === 'function')) {
      if (mod.manejarParticipantes) plugin.manejarParticipantes = mod.manejarParticipantes
      plugins[relPath] = plugin
      rebuildIndex()
      if (!silent) console.log(chalk.bold.cyanBright(`[PLUGIN] Cargado: ${relPath}`))
    } else {
      delete plugins[relPath]; rebuildIndex()
    }
  } catch (e) {
    console.error(chalk.bold.bgRed.white(` [PLUGIN ERROR] ${relPath} `), chalk.bold.redBright(e.stack || e.message))
  }
}

export async function loadPlugins() {
  if (!fs.existsSync(PLUGINS_DIR)) fs.mkdirSync(PLUGINS_DIR, { recursive: true })
  const files = getFilesRecursively(PLUGINS_DIR)
  console.log(chalk.bold.blueBright(`\n📦 CARGANDO ${files.length} PLUGINS...`))
  for (const fullPath of files) {
    const relPath = path.relative(PLUGINS_DIR, fullPath).replace(/\\/g, '/')
    await loadPlugin(relPath, true)
  }
  console.log(chalk.bold.greenBright('✅ PLUGINS LISTOS.\n'))
}

export function setupWatchers() {
  if (process.env.NODE_ENV === 'production') return

  fs.watch(PLUGINS_DIR, { recursive: true }, (event, filename) => {
    if (!filename?.endsWith('.js')) return
    const relPath = filename.replace(/\\/g, '/')
    const full = path.join(PLUGINS_DIR, relPath)
    if (watchDebounce.has(full)) clearTimeout(watchDebounce.get(full))
    watchDebounce.set(full, setTimeout(async () => {
      watchDebounce.delete(full)
      if (!fs.existsSync(full)) {
        delete plugins[relPath]; rebuildIndex()
        console.log(chalk.bold.redBright(`[PLUGIN] Eliminado: ${relPath}`))
        return
      }
      await loadPlugin(relPath, false)
    }, 1000))
  })
}

const extraerNum = (jid = '') => (typeof jid === 'string' ? jid : '').split('@')[0].split(':')[0].replace(/\D/g, '')

const normalizarNum = (n = '') => {
  if (!n) return ''
  if (n.startsWith('549')) n = '54' + n.slice(3)
  if (n.startsWith('521')) n = '52' + n.slice(3)
  return n
}

const sonIguales = (jid1, jid2) => {
  if (!jid1 || !jid2) return false
  return jid1.split('@')[0].split(':')[0] === jid2.split('@')[0].split(':')[0]
}

const compararNumeros = (owners, numB) => {
  let b = extraerNum(numB)
  if (b.startsWith('549')) b = '54' + b.slice(3)
  if (b.startsWith('521')) b = '52' + b.slice(3)
  const lista = Array.isArray(owners) ? owners : [owners]
  return lista.some(o => {
    let a = extraerNum(o)
    if (a.startsWith('549')) a = '54' + a.slice(3)
    if (a.startsWith('521')) a = '52' + a.slice(3)
    return a === b && a !== ''
  })
}

function isSpamming(num, isSubBot = false) {
  const cfg = (isSubBot && config.antiSpamSubBot?.enabled)
    ? config.antiSpamSubBot
    : config.antiSpam
  if (!cfg.enabled) return false
  const now = Date.now()
  const data = spamCache.get(num) || { count: 0, first: now, blockedUntil: 0 }
  if (now < data.blockedUntil) return true
  if (now - data.first > cfg.ventanaMs) { data.count = 1; data.first = now; data.blockedUntil = 0 }
  else data.count++
  if (data.count > cfg.maxCmds) {
    data.blockedUntil = now + cfg.muteMs
    spamCache.set(num, data)
    return true
  }
  spamCache.set(num, data)
  return false
}

function getAdminStatus(participants, jidList) {
  if (!participants?.length || !jidList?.length) return false
  const numbersToMatch = jidList.filter(Boolean).map(j => extraerNum(j))
  
  const p = participants.find(p => {
    const pIdNum = p.id ? extraerNum(p.id) : ''
    const pLidNum = p.lid ? extraerNum(p.lid) : ''
    const pTelNum = p.phoneNumber ? String(p.phoneNumber).replace(/\D/g, '') : ''
    
    return numbersToMatch.some(num => num === pIdNum || num === pLidNum || num === pTelNum)
  })
  
  return p ? (p.admin === 'admin' || p.admin === 'superadmin' || p.isCommunityAdmin === true) : false
}

const DAILY_RESET_MS = 86400000

export async function handler(conn, rawM) {
  let m
  try {
    m = serializarM(conn, rawM)
    if (!m) return
  } catch (e) {
    console.error(chalk.bold.bgRed.white(' [SERIALIZE ERROR] '), chalk.bold.redBright(e.stack || e.message))
    return
  }

  if (m.isBaileys) return
  if (!m.messageTimestamp || m.messageTimestamp < BOT_START_TIME) return

  const myBotId = conn.user?.id?.split(':')[0] || 'default'
  const botMsgCache = getMsgCache(myBotId)

  if (botMsgCache.has(m.id)) return
  botMsgCache.set(m.id, true)

  let senderUser = m.author || m.sender

  if (senderUser.endsWith('@lid') && m.isGroup) {
    try {
      let meta = groupCache.get(m.chat)
      if (!meta?.participants) {
        meta = await conn.groupMetadata(m.chat).catch(() => null)
        if (meta?.id) groupCache.set(m.chat, meta)
      }
      if (meta?.participants) {
        const p = meta.participants.find(p => p.id === senderUser)
        if (p?.phoneNumber) {
          const num = String(p.phoneNumber).replace(/\D/g, '')
          senderUser = `${num}@s.whatsapp.net`
        } else if (p?.lid === senderUser && p?.id?.includes('@s.whatsapp.net')) {
          senderUser = p.id
        }
      }
    } catch {}
  }

  const numSender = extraerNum(senderUser)
  const esOwner = compararNumeros(config.ownerNumber, numSender)
  const userTag = senderUser.split('@')[0].split(':')[0]
  const botNum = (conn.user?.id || '').split('@')[0].split(':')[0].replace(/\D/g, '')

  let userDb = userCache.get(senderUser) || userCache.get(numSender)
  if (!userDb) {
    userDb = await User.findOne({ jid: { $regex: `^${numSender}@` } })
    if (userDb) {
      userCache.set(userDb.jid, userDb)
      userCache.set(numSender, userDb)
    }
  }

  if (userDb?.registered) {
    const needsReset = (Date.now() - (userDb.dailyStats?.lastReset || 0)) > DAILY_RESET_MS
    const needsBankExpiry = userDb.bankBalance > 0 && userDb.bankExpiry > 0 && Date.now() > userDb.bankExpiry

    if (needsReset || needsBankExpiry) {
      const updatedDb = await checkDailyReset(userDb.jid)
      if (updatedDb) {
        userDb = updatedDb
        userCache.set(userDb.jid, userDb)
        userCache.set(numSender, userDb)
      }
    }
  }

  let participants = [], grupoMeta = {}, esAdmin = false, esBotAdmin = false, groupDb = null

  if (m.isGroup) {
    grupoMeta = groupCache.get(m.chat)
    if (!grupoMeta?.participants) {
      grupoMeta = await conn.groupMetadata(m.chat).catch(() => null) || {}
      if (grupoMeta.id) groupCache.set(m.chat, grupoMeta)
    }
    participants = grupoMeta.participants || []

    const senderIds = [m.sender, m.author, m.key?.participant, m.participant].filter(Boolean)
    esAdmin = getAdminStatus(participants, senderIds)

    const botIds = [conn.user?.id, conn.user?.lid].filter(Boolean)
    esBotAdmin = getAdminStatus(participants, botIds)

    groupDb = groupDbCache.get(m.chat)
    if (!groupDb) {
      groupDb = await GroupDb.findOne({ id: m.chat }) || new GroupDb({ id: m.chat })
      groupDbCache.set(m.chat, groupDb)
    }
  }

  m.isOwner = esOwner
  m.isAdmin = esAdmin
  m.isBotAdmin = esBotAdmin

  const prefixMatch = m.body.match(config.prefix)
  const esCmd = !!prefixMatch && m.body.indexOf(prefixMatch[0]) === 0
  const prefixUsado = esCmd ? prefixMatch[0] : ''

  if (m.isGroup && groupDb) {
    const cmdUsado = esCmd ? m.body.slice(prefixUsado.length).trim().split(/\s+/)[0].toLowerCase() : ''
    const isBypass = ['zendespierta', 'zenduerme', 'bot', 'boton', 'botoff', 'setprimary', 'principal', 'onlyadmin', 'soloadmin', 'adminonly'].includes(cmdUsado)

    const myNumber = normalizarNum(extraerNum(conn.user.id))
    const isMainBot = !conn.isSubBot
    const isPrimary = !!groupDb.primaryBot && groupDb.primaryBot === myNumber
    const esSubBotDueno = conn.isSubBot && numSender === conn.ownerNumber

    if (!isBypass) {
      if (groupDb.primaryBot) {
        if (!isPrimary) return
      } else {
        if (!isMainBot) {
          if (groupDb.disabledBots?.includes(myNumber) || groupDb.disabledBots?.includes('todos')) return
        }
        if (isMainBot && groupDb.mainBotSleeping) return
      }
      if (groupDb.onlyadmin && !esAdmin && !esOwner && !esSubBotDueno) return
    }
  }

  const ctx = {
    conn, args: [], text: '', command: '', usedPrefix: prefixUsado,
    participants, groupMetadata: grupoMeta, groupDb,
    isOwner: esOwner, isAdmin: esAdmin, isBotAdmin: esBotAdmin,
    config, userDb
  }

  const interactiveNative =
    m.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson ||
    m.message?.viewOnceMessageV2?.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson ||
    m.message?.viewOnceMessage?.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson

  const esBotonRespuesta = !!(
    m.message?.buttonsResponseMessage?.selectedButtonId ||
    m.message?.templateButtonReplyMessage?.selectedId ||
    m.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
    interactiveNative ||
    m.responseId
  )

  let esSeleccionNumerica = false
  if (!esCmd && !esBotonRespuesta) {
    const numVal = parseInt(m.body.trim())
    if (!isNaN(numVal) && m.msg?.contextInfo?.stanzaId) {
      const refId = m.msg.contextInfo.stanzaId
      const sessionKey = `${m.chat}|${m.sender}|${refId}`
      const session = selectionSessions.get(sessionKey)
      if (session && numVal >= 1 && numVal <= session.options.length) {
        const chosen = session.options[numVal - 1]
        selectionSessions.delete(sessionKey)
        m.body = chosen.cmd
        m.responseId = chosen.cmd
        esSeleccionNumerica = true
      }
    }
  }

  for (const [nombre, plug] of Object.entries(plugins)) {
    if (typeof plug.all === 'function') {
      try { await plug.all.call(conn, m, ctx) }
      catch (e) { console.error(chalk.bold.bgRed.white(` [ALL:${nombre}] `), chalk.bold.redBright(e.stack || e.message)) }
    }
    if (typeof plug.before === 'function' && plug.alwaysBefore) {
      try { await plug.before(m, ctx) }
      catch (e) { console.error(chalk.bold.bgRed.white(` [BEFORE:${nombre}] `), chalk.bold.redBright(e.stack || e.message)) }
    }
  }

  if (!esCmd && !esBotonRespuesta && !esSeleccionNumerica) return

  if (m.isGroup) conn.readMessages([m.key]).catch(() => {})
  const sinPrefix = esCmd ? m.body.slice(prefixUsado.length).trim() : m.body.trim()
  let [cmd, ...args] = sinPrefix.split(/\s+/)
  cmd = (cmd || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  let plugin = cmdMap.get(cmd)
  if (!plugin) {
    const rx = regexCmds.find(c => c.regex.test(cmd))
    if (rx) plugin = rx.plugin
  }
  if (!plugin) return

  if (plugin.register && !plugin.noRegister && !userDb?.registered) {
    return m.reply(`*『 🔒 』USUARIO NO REGISTRADO.*\n\n> Para usar este comando y el sistema de economía, debés registrarte.\n\n> *Uso:* ${prefixUsado}reg nombre.edad`)
  }

  if (!esOwner && isSpamming(numSender, !!conn.isSubBot)) {
    if (!warnCache.has(senderUser)) {
      warnCache.set(senderUser, true)
      await m.reply(`*『 ⏳ 』ANTI SPAM.*\n> @${userTag}, estás enviando comandos muy rápido. Esperá unos segundos.`)
    }
    return
  }

  if (config.MODE === 'private' && !esOwner) {
    if (!warnCache.has(senderUser)) {
      warnCache.set(senderUser, true)
      await m.reply(`*『 ⚠️ 』MODO PRIVADO.*\n> @${userTag}, el bot está en modo privado.`)
    }
    return
  }

  if (m.isGroup) {
    if (groupDb && !esOwner && !esAdmin) {
      const pTag = (Array.isArray(plugin.tags) ? plugin.tags[0] : (plugin.tags || 'otros')).toLowerCase()
      if (groupDb.disabledCategories?.includes(pTag) || groupDb.disabledCmds?.includes(cmd)) {
        return m.reply(`*『 🚫 』BLOQUEADO.*\n> Este comando o categoría fue desactivado por los administradores de este grupo.`)
      }
    }

    let necesitaRecarga = false
    if (plugin.adminOnly && !esAdmin && !esOwner) necesitaRecarga = true
    if (plugin.botAdminOnly && !esBotAdmin) necesitaRecarga = true

    if (necesitaRecarga) {
      const freshMeta = await conn.groupMetadata(m.chat).catch(() => null)
      if (freshMeta && freshMeta.participants) {
        groupCache.set(m.chat, freshMeta)
        participants = freshMeta.participants

        if (plugin.adminOnly && !esOwner) {
          const senderIds = [m.sender, m.author, m.key?.participant, m.participant].filter(Boolean)
          esAdmin = getAdminStatus(participants, senderIds)
        }
        if (plugin.botAdminOnly) {
          const botIds = [conn.user?.id, conn.user?.lid].filter(Boolean)
          esBotAdmin = getAdminStatus(participants, botIds)
        }
      }
    }
  }

  if (plugin.ownerOnly && !esOwner) return m.reply(`*『 👑 』SOLO OWNER.*\n> @${userTag}, este comando es exclusivo del dueño del bot.`)

  if (!conn.isSubBot && botNum && numSender === botNum) {
    const tags = (Array.isArray(plugin.tags) ? plugin.tags : [plugin.tags]).map(t => (t || '').toLowerCase())
    if (tags.includes('eco')) return
  }

  if (plugin.groupOnly && !m.isGroup) return m.reply(`*『 👥 』SOLO GRUPOS.*\n> @${userTag}, este comando solo funciona en grupos.`)
  if (plugin.adminOnly && !esAdmin && !esOwner) return m.reply(`*『 👤 』SOLO ADMINS.*\n> @${userTag}, necesitás ser admin para usar este comando.`)
  if (plugin.botAdminOnly && !esBotAdmin) return m.reply(`*『 🤖 』BOT SIN PERMISOS.*\n> @${userTag}, hacé al bot administrador para usar esto.`)

  if (plugin.nsfw) {
    if (m.isGroup && !groupDb?.nsfw) return m.reply(`*『 🔞 』NSFW DESACTIVADO.*\n> Los administradores no han habilitado el contenido +18 en este grupo.\n> Usen *${prefixUsado}nsfw on* para activarlo.`)
    if (userDb?.age < 18) return m.reply(`*『 🚷 』ACCESO DENEGADO.*\n> Eres menor de edad (*${userDb.age} años*). Este comando es +18.\n> Si te equivocaste en tu registro, usa *${prefixUsado}cambiaredad <edad>*.`)
  }

  const text = args.join(' ')
  if (plugin.expectedArgs && !text) {
    return m.reply(plugin.expectedArgs.replace(/\{p\}/g, prefixUsado).replace(/\{cmd\}/g, cmd))
  }

  const nombreChat = (m.isGroup && grupoMeta?.subject) ? grupoMeta.subject : m.chat.split('@')[0]
  const hora = new Date().toLocaleTimeString('es', { hour12: false })

  const platform = getPlatform(m.id)
  const msgType = getMsgType(m)

  console.log(`\n${chalk.bold.magentaBright('╭━━━ ❬')} ${chalk.bold.cyanBright(hora)} ${chalk.bold.magentaBright('❭ ━━━ ✧')}`)
  console.log(`${chalk.bold.magentaBright('┃')} ${chalk.bold.white('💬 Chat :')} ${m.isGroup ? chalk.bold.cyanBright('👥 Grupo') : chalk.bold.blueBright('👤 Privado')} ${chalk.dim(`(${nombreChat})`)}`)
  console.log(`${chalk.bold.magentaBright('┃')} ${chalk.bold.white('👤 User :')} ${chalk.bold.yellowBright(m.pushName)} ${chalk.bold.greenBright(`(+${numSender})`)}${esOwner ? chalk.bold.redBright(' [👑 OWNER]') : ''}`)
  console.log(`${chalk.bold.magentaBright('┃')} ${chalk.bold.white('📱 Platf:')} ${chalk.bold.cyanBright(platform)}`)
  console.log(`${chalk.bold.magentaBright('┃')} ${chalk.bold.white('📦 Tipo :')} ${chalk.bold.greenBright(msgType)}`)
  console.log(`${chalk.bold.magentaBright('┃')} ${chalk.bold.white('🚀 Cmd  :')} ${chalk.bold.whiteBright(m.body.substring(0, 60))}`)
  console.log(`${chalk.bold.magentaBright('╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ✧')}\n`)

  ctx.args = args
  ctx.text = text
  ctx.command = cmd

  try {
    if (typeof plugin.before === 'function') {
      if (await plugin.before(m, ctx)) return
    }
    if (typeof plugin.execute === 'function') {
      await plugin.execute(m, ctx)
    } else if (typeof plugin === 'function') {
      await plugin(m, ctx)
    }
    if (typeof plugin.after === 'function') await plugin.after(m, ctx)

    if (userDb) {
      if (!globalXpCache.has(m.id)) {
        globalXpCache.set(m.id, true)
        const dbActualizada = await checkLevelUp(m, conn, userDb)
        if (dbActualizada) { userCache.set(dbActualizada.jid, dbActualizada); userCache.set(numSender, dbActualizada) }
      }
    }

    if (plugin.kogen) await m.reply(`✦ Utilizaste *${plugin.kogen} Kōgen*`)

  } catch (e) {
    console.error(chalk.bold.bgRed.white(` [ERROR: ${cmd}] `), chalk.bold.redBright(e.stack || e.message))
    await m.reply(`*❌ Ocurrió un error inesperado.*`).catch(() => {})
  }
}