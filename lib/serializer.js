import fs from 'fs'
import chalk from 'chalk'
import * as baileysMod from '@whiskeysockets/baileys'
import { getChatQueue } from './queue.js'
import { groupCache } from './caches.js'
import config from '../config.js'

const pkg = baileysMod.default && Object.keys(baileysMod).length === 1 ? baileysMod.default : baileysMod
const {
  jidDecode, jidNormalizedUser, getContentType,
  downloadContentFromMessage, generateWAMessageFromContent, generateWAMessage
} = pkg

export const getZenContext = () => ({
  forwardedNewsletterMessageInfo: {
    newsletterJid: config.newsletterJid,
    newsletterName: `${config.botName} - ${config.ownerName}`,
    serverMessageId: Math.floor(Math.random() * 999) + 1,
  }
})

const decodeJid = (jid) => {
  if (!jid) return jid
  if (/:\d+@/gi.test(jid)) {
    const d = jidDecode(jid)
    return d?.user && d?.server ? `${d.user}@${d.server}` : jid
  }
  return jid
}

const getRealJid = (conn, jid, m) => {
  let target = jid || (m?.key?.participant || m?.key?.remoteJid || m?.participant || conn.user?.id)
  if (!target) return ''
  if (!target.endsWith('@lid')) return jidNormalizedUser(target)
  const sender = m?.key?.participant || m?.key?.remoteJid || m?.participant
  if (target === sender) {
    if (m?.key?.remoteJidAlt?.includes('@s.whatsapp.net')) return jidNormalizedUser(m.key.remoteJidAlt)
    if (m?.key?.participantAlt?.includes('@s.whatsapp.net')) return jidNormalizedUser(m.key.participantAlt)
  }
  const chatId = m?.key?.remoteJid || m?.chat
  if (chatId?.endsWith('@g.us')) {
    const metadata = groupCache.get(chatId)
    if (metadata) {
      const participant = (metadata.participants || []).find(p => p.id === target)
      if (participant?.phoneNumber) {
        const number = participant.phoneNumber
        return jidNormalizedUser(number.includes('@') ? number : `${number}@s.whatsapp.net`)
      }
    }
  }
  return jidNormalizedUser(target)
}

function getBodyAndResponseId(m) {
  if (!m?.message) return { body: '', responseId: '' }
  const msgObj = m.message
  const type = Object.keys(msgObj).find(t => t !== 'messageContextInfo') || Object.keys(msgObj)[0]

  let body =
    type === 'conversation'               ? msgObj.conversation :
    type === 'imageMessage'               ? msgObj.imageMessage?.caption :
    type === 'videoMessage'               ? msgObj.videoMessage?.caption :
    type === 'extendedTextMessage'        ? msgObj.extendedTextMessage?.text :
    type === 'buttonsResponseMessage'     ? msgObj.buttonsResponseMessage?.selectedButtonId :
    type === 'templateButtonReplyMessage' ? msgObj.templateButtonReplyMessage?.selectedId :
    type === 'listResponseMessage'        ? msgObj.listResponseMessage?.singleSelectReply?.selectedRowId :
    type === 'messageContextInfo'         ?
      (msgObj.buttonsResponseMessage?.selectedButtonId ||
       msgObj.listResponseMessage?.singleSelectReply?.selectedRowId) : ''

  const fallback =
    msgObj?.conversation ||
    msgObj?.imageMessage?.caption ||
    msgObj?.videoMessage?.caption ||
    msgObj?.extendedTextMessage?.text ||
    msgObj?.viewOnceMessageV2?.message?.imageMessage?.caption ||
    msgObj?.viewOnceMessageV2?.message?.videoMessage?.caption ||
    msgObj?.viewOnceMessage?.message?.videoMessage?.caption ||
    msgObj?.viewOnceMessage?.message?.imageMessage?.caption ||
    msgObj?.documentWithCaptionMessage?.message?.documentMessage?.caption ||
    msgObj?.buttonsMessage?.imageMessage?.caption || ''

  if (!body) body = fallback

  let interactiveId = ''
  try {
    const nativeFlow = msgObj.interactiveResponseMessage?.nativeFlowResponseMessage
    if (nativeFlow?.paramsJson) interactiveId = JSON.parse(nativeFlow.paramsJson).id || ''
  } catch {}

  const responseId =
    interactiveId ||
    msgObj.templateButtonReplyMessage?.selectedId ||
    msgObj.buttonsResponseMessage?.selectedButtonId ||
    msgObj.listResponseMessage?.singleSelectReply?.selectedRowId || ''

  return { body: responseId || body || '', responseId }
}

const setHidden = (obj, prop, val) =>
  Object.defineProperty(obj, prop, { value: val, enumerable: false, writable: true, configurable: true })

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

const typingDelay = (text = '') => {
  const base = Math.min(String(text).length * 25, 4000)
  return Math.max(600, base + Math.floor(Math.random() * 800))
}

const withTyping = (conn, chat, text, task) => async () => {
  try {
    await conn.sendPresenceUpdate('composing', chat)
    await sleep(typingDelay(text))
    await conn.sendPresenceUpdate('paused', chat)
  } catch (_) {}
  return task()
}

export function serializarM(conn, m) {
  if (!m?.message) return null
  if (!conn.decodeJid) conn.decodeJid = decodeJid

  m.id        = m.key.id
  m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16
  m.chat      = decodeJid(m.key.remoteJid)
  m.fromMe    = m.key.fromMe
  m.isGroup   = m.chat.endsWith('@g.us')

  let rawSender = m.key.fromMe
    ? conn.user.id
    : (m.isGroup ? m.key.participant : m.key.remoteJid)

  if (!m.key.fromMe) {
    if (m.key.participantAlt?.includes('@s.whatsapp.net')) rawSender = m.key.participantAlt
    else if (m.key.remoteJidAlt?.includes('@s.whatsapp.net')) rawSender = m.key.remoteJidAlt
  }

  m.author   = jidNormalizedUser(rawSender || '')
  m.sender   = getRealJid(conn, m.author, m)
  m.pushName = m.pushName || 'Usuario'
  if (m.isGroup) m.participant = m.sender

  m.mtype = getContentType(m.message)
  m.msg = m.mtype === 'viewOnceMessage'
    ? m.message[m.mtype].message[getContentType(m.message[m.mtype].message)]
    : m.message[m.mtype]

  if (m.mtype === 'protocolMessage' && m.msg?.key) {
    m.msg.key.remoteJid   = m.msg.key.remoteJid || m.chat
    m.msg.key.participant = m.msg.key.participant || m.msg.key.remoteJid || m.sender
    m.msg.key.fromMe = conn.decodeJid(m.msg.key.participant) === conn.decodeJid(conn.user.id)
    if (m.msg.key.fromMe && m.msg.key.remoteJid === conn.decodeJid(conn.user.id))
      m.msg.key.remoteJid = m.sender
  }

  m.mentionedJid = m.msg?.contextInfo?.mentionedJid || []
  m.isPollVote   = m.mtype === 'pollUpdateMessage'

  const { body, responseId } = getBodyAndResponseId(m)
  m.body       = body
  m.responseId = responseId

  m.quoted = null
  if (m.msg?.contextInfo?.quotedMessage) {
    const ctx  = m.msg.contextInfo
    let qType  = getContentType(ctx.quotedMessage)
    let qMsg   = ctx.quotedMessage[qType]
    if (qType === 'productMessage') { qType = getContentType(qMsg); qMsg = qMsg[qType] }

    let qSender = ctx.participant
    if (ctx.participantAlt?.includes('@s.whatsapp.net')) qSender = ctx.participantAlt

    m.quoted = {
      id:          ctx.stanzaId,
      chat:        ctx.remoteJid || m.chat,
      mtype:       qType,
      type:        qType,
      msg:         qMsg,
      message:     ctx.quotedMessage,
      isBaileys:   ctx.stanzaId?.startsWith('BAE5') && ctx.stanzaId.length === 16,
      author:      jidNormalizedUser(ctx.participant || ctx.remoteJid || ''),
      sender:      qSender ? jidNormalizedUser(qSender) : null,
      fromMe:      false,
      body:        qMsg?.text || qMsg?.caption || ctx.quotedMessage?.conversation || qMsg?.contentText || '',
      mentionedJid: ctx.mentionedJid || [],
    }
    m.quoted.fromMe = m.quoted.sender === conn.decodeJid(conn.user.id)

    setHidden(m.quoted, 'download', async (filepath = null) => {
      const stream = await downloadContentFromMessage(m.quoted.msg, m.quoted.mtype.replace('Message', ''))
      if (filepath) {
        const ws = fs.createWriteStream(filepath)
        for await (const chunk of stream) ws.write(chunk)
        ws.end(); return filepath
      }
      const chunks = []
      for await (const chunk of stream) chunks.push(chunk)
      return Buffer.concat(chunks)
    })

    setHidden(m.quoted, 'delete', () =>
      getChatQueue(m.quoted.chat).add(() =>
        conn.sendMessage(m.quoted.chat, {
          delete: { remoteJid: m.quoted.chat, fromMe: m.quoted.fromMe, id: m.quoted.id, participant: m.quoted.sender }
        })
      )
    )
  }

  setHidden(m, 'download', async (filepath = null) => {
    if (!m.msg?.url && !m.msg?.directPath) return null
    const stream = await downloadContentFromMessage(m.msg, m.mtype.replace('Message', ''))
    if (filepath) {
      const ws = fs.createWriteStream(filepath)
      for await (const chunk of stream) ws.write(chunk)
      ws.end(); return filepath
    }
    const chunks = []
    for await (const chunk of stream) chunks.push(chunk)
    return Buffer.concat(chunks)
  })

  setHidden(m, 'reply', (text, opts = {}) =>
    getChatQueue(m.chat).add(
      withTyping(conn, m.chat, text, () =>
        conn.sendMessage(m.chat, { text: String(text), contextInfo: getZenContext(), ...opts }, { quoted: m })
      )
    )
  )

  setHidden(m, 'replyImg', (img, caption = '', opts = {}) =>
    getChatQueue(m.chat).add(() =>
      conn.sendMessage(m.chat, { image: img, caption, contextInfo: getZenContext(), ...opts }, { quoted: m })
    )
  )

  setHidden(m, 'replyVideo', (vid, caption = '', gif = false, opts = {}) =>
    getChatQueue(m.chat).add(() =>
      conn.sendMessage(m.chat, { video: vid, caption, gifPlayback: gif, contextInfo: getZenContext(), ...opts }, { quoted: m })
    )
  )

  setHidden(m, 'replyAudio', (audio, ptt = false, opts = {}) =>
    getChatQueue(m.chat).add(() =>
      conn.sendMessage(m.chat, { audio, ptt, mimetype: 'audio/mpeg', contextInfo: getZenContext(), ...opts }, { quoted: m })
    )
  )

  setHidden(m, 'replyDoc', (doc, mimetype, fileName, caption = '', opts = {}) =>
    getChatQueue(m.chat).add(() =>
      conn.sendMessage(m.chat, { document: doc, mimetype, fileName, caption, contextInfo: getZenContext(), ...opts }, { quoted: m })
    )
  )

  setHidden(m, 'replySticker', (sticker, opts = {}) =>
    getChatQueue(m.chat).add(() =>
      conn.sendMessage(m.chat, { sticker, contextInfo: getZenContext(), ...opts }, { quoted: m })
    )
  )

  setHidden(m, 'react', (emoji) =>
    getChatQueue(m.chat).add(() =>
      conn.sendMessage(m.chat, { react: { text: emoji, key: m.key } })
    )
  )

  setHidden(m, 'edit', (text, key) =>
    getChatQueue(m.chat).add(() =>
      conn.sendMessage(m.chat, { text: String(text), edit: key })
    )
  )

  setHidden(m, 'delete', (key) =>
    getChatQueue(m.chat).add(() =>
      conn.sendMessage(m.chat, { delete: key })
    )
  )

  setHidden(m, 'sendPoll', (question, options, selectableCount = 1) =>
    getChatQueue(m.chat).add(() =>
      conn.sendMessage(m.chat, { poll: { name: question, values: options, selectableCount } }, { quoted: m })
    )
  )

  setHidden(m, 'sendAlbum', (urls, options = {}) =>
    getChatQueue(m.chat).add(async () => {
      try {
        if (!Array.isArray(urls) || urls.length === 0) return null
        const album = generateWAMessageFromContent(m.chat, {
          albumMessage: {
            expectedImageCount: urls.length,
            contextInfo: {
              stanzaId: m.key.id,
              participant: m.key.participant || m.key.remoteJid,
              quotedMessage: m.message,
            }
          }
        }, {})
        await conn.relayMessage(m.chat, album.message, { messageId: album.key.id })
        await Promise.all(urls.map(async (url, i) => {
          const msg = await generateWAMessage(m.chat, {
            image: typeof url === 'string' ? { url } : url,
            ...(i === 0 && options.caption ? { caption: options.caption } : {})
          }, { upload: conn.waUploadToServer })
          if (!msg.message) return
          msg.message.messageContextInfo = {
            messageAssociation: { associationType: 1, parentMessageKey: album.key }
          }
          return conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
        }))
        return true
      } catch (e) {
        console.error(chalk.bold.redBright('[ALBUM ERROR]'), e.message)
        return null
      }
    })
  )

  return m
}

export async function sendSmart(conn, m, payload, opts = {}, userDb = null) {
  const noButtons = conn?.noButtons === true || userDb?.noButtons === true

  if (!noButtons) {
    return conn.sendMessage(m.chat, payload, { quoted: m, ...opts })
  }

  const lines  = []
  const opciones = []

  const texto = payload.caption || payload.text || ''
  if (texto) lines.push(texto)

  let num = 1
  const btns = payload.buttons || []

  for (const btn of btns) {
    // nativeFlowMessage style: { name, buttonParamsJson }
    if (btn.name && btn.buttonParamsJson) {
      try {
        const p = JSON.parse(btn.buttonParamsJson)
        if (p.id) {
          lines.push(`\n> *${num}.* ${p.display_text || p.id}`)
          opciones.push({ label: p.display_text || p.id, cmd: p.id })
          num++
        } else if (p.url) {
          lines.push(`\n> 🔗 ${p.display_text}: ${p.url}`)
        }
      } catch {}
      continue
    }

    // listMessage style: { text, sections: [{ title, rows }] }
    if (btn.sections) {
      for (const sec of btn.sections) {
        if (sec.title) lines.push(`\n*${sec.title}*`)
        for (const row of (sec.rows || [])) {
          const label = row.title || row.id || ''
          const desc  = row.description ? ` — _${row.description}_` : ''
          lines.push(`> *${num}.* ${label}${desc}`)
          opciones.push({ label, cmd: row.id || '' })
          num++
        }
      }
      continue
    }

    // buttonsMessage style clásico: { buttonId, buttonText }
    if (btn.buttonId || btn.buttonText) {
      const label = btn.buttonText?.displayText || btn.buttonId || ''
      const id    = btn.buttonId || ''
      lines.push(`> *${num}.* ${label}`)
      opciones.push({ label, cmd: id })
      num++
    }
  }

  if (opciones.length > 0) {
    lines.push(`\n> _Respondé este mensaje con el número de tu elección._`)
  }

  if (payload.footer) lines.push(`\n_${payload.footer}_`)

  const textoFinal = lines.join('\n')

  let sent
  if (payload.image) {
    sent = await conn.sendMessage(m.chat, { image: payload.image, caption: textoFinal }, { quoted: m, ...opts })
  } else {
    sent = await conn.sendMessage(m.chat, { text: textoFinal }, { quoted: m, ...opts })
  }

  if (opciones.length > 0 && sent?.key?.id) {
    const sessionKey = `${m.chat}|${m.sender}|${sent.key.id}`
    selectionSessions.set(sessionKey, { options: opciones, ts: Date.now() })
  }

  return sent
}

export const selectionSessions = new Map()

const SESSION_TTL = 5 * 60 * 1000

setInterval(() => {
  const now = Date.now()
  for (const [key, val] of selectionSessions.entries()) {
    if (now - val.ts > SESSION_TTL) selectionSessions.delete(key)
  }
}, 60_000)
