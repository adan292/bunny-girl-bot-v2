import * as baileysMod from '@whiskeysockets/baileys'
import config from '../../config.js'
import { plugins } from '../../handler.js'
import { sendSmart } from '../../lib/serializer.js'

const pkg = baileysMod.default && Object.keys(baileysMod).length === 1 ? baileysMod.default : baileysMod
const { prepareWAMessageMedia, generateWAMessageFromContent } = pkg

const START_TIME = Date.now()

const IMAGENES = [
  'https://i.ibb.co/ZzDLjShT/6-Pdo7j-Jq-fond-decran-Gojo-Sotaru-49.jpg',
  'https://i.ibb.co/gstbvMx/wp11845569.jpg',
  'https://i.ibb.co/TB83V4cy/thumbbig-1334857.jpg',
  'https://i.ibb.co/VWS1C2Jj/gojo-satoru-holding-his-face-iyrluirbzvncz77a.jpg',
  'https://i.ibb.co/whMxn3nF/Rty-Ri9-Rc-fond-decran-Gojo-Sotaru-63.jpg',
  'https://i.ibb.co/fdbrgzL0/15227.png',
  'https://i.ibb.co/k2SG88q1/8x-Ot-Gb6d-fond-decran-Gojo-Sotaru-10.jpg',
  'https://i.ibb.co/yBM2Wtpb/blue-pantone-gojo-satoru-h0033v4edcsam2oh.jpg',
  'https://i.ibb.co/mC7YVhFB/wp12768651.png',
  'https://i.ibb.co/Tqt5zJH4/i5r8-Yxs-X-fond-decran-Gojo-Sotaru-86.jpg',
  'https://i.ibb.co/7tBQ76xm/8atm-A40e-fond-decran-Gojo-Sotaru-61.jpg',
  'https://i.ibb.co/3H4LG6M/J89n-Ccx9-fond-decran-Gojo-Sotaru-60.jpg',
  'https://i.ibb.co/cKVSfbhm/9r0c-T9-TF-fond-decran-Gojo-Sotaru-36.jpg',
  'https://i.ibb.co/PvvRJ4Mz/RUAC325575-CQ7-ABKCXBSKR3-Q5-Q.jpg',
  'https://i.ibb.co/5D2Jb6G/170112-anime-gojo-satoru-satoru-gojo-jujutsu-kaisen-arte-animado-x750.jpg',
  'https://i.ibb.co/0pjjK2Bn/IMG-20260512-WA0010.jpg',
  'https://i.ibb.co/V052PRsB/IMG-20260512-WA0005.jpg',
  'https://i.ibb.co/v6KG7n4X/IMG-20260512-WA0001.jpg',
  'https://i.ibb.co/zhcv1W2Q/IMG-20260512-WA0004.jpg',
  'https://i.ibb.co/hFVLh9f1/IMG-20260512-WA0003.jpg'
]

const ETIQUETAS = {
  info:         'ℹ️ Información',
  owner:        '👑 Owner / Dueño',
  rpg:          '⚔️ Rol y Aventura',
  eco:          '💰 Economía',
  registro:     '👤 Registro',
  juegos:       '🎮 Minijuegos',
  fun:          '🎉 Diversión',
  group:        '👥 Gestión de Grupos',
  tools:        '🔧 Herramientas',
  descargas:    '📥 Descargas',
  busquedas:    '🔍 Búsquedas',
  convertidores:'🔄 Convertidores',
  anime:        '🎌 Anime / Otaku',
  nsfw:         '🔞 Contenido +18',
  jadibot:      '🤖 Sub-Bots',
  otros:        '📦 Otros Comandos'
}

const getTime = () => {
  const t = Math.floor((Date.now() - START_TIME) / 1000)
  const d = Math.floor(t / 86400), h = Math.floor((t / 3600) % 24), min = Math.floor((t / 60) % 60), s = t % 60
  return `${d > 0 ? d + 'd ' : ''}${h > 0 ? h + 'h ' : ''}${min > 0 ? min + 'm ' : ''}${s}s`
}

function getCategorias(isOwner, groupDb) {
  const categorias = {}
  let total = 0
  for (const p of Object.values(plugins)) {
    if (!p || !p.help) continue
    if ((p.owner || p.ownerOnly) && !isOwner) continue

    const tagRaw = Array.isArray(p.tags) ? p.tags[0] : (p.tags || 'otros')
    const tag = tagRaw.toLowerCase()

    if (groupDb && groupDb.disabledCategories?.includes(tag)) continue

    const cmdsReales = Array.isArray(p.command) ? p.command : [p.command]
    if (groupDb && cmdsReales.every(c => groupDb.disabledCmds?.includes(c))) continue

    if (!categorias[tag]) categorias[tag] = []
    const cmds = Array.isArray(p.help) ? p.help : [p.help]
    for (const cmd of cmds) { categorias[tag].push(cmd); total++ }
  }
  return { categorias, total }
}

function getOrdenActivo(isOwner, groupDb) {
  const { categorias, total } = getCategorias(isOwner, groupDb)
  const ordenFinal = Object.keys(categorias)
  return { categorias, total, ordenFinal }
}

const getContextInfo = (conn, m) => ({
  mentionedJid: [m.sender],
  forwardingScore: 999,
  isForwarded: true,
  forwardedNewsletterMessageInfo: {
    newsletterJid: global.newsletterJid || '120363403631501323@newsletter',
    newsletterName: `${conn.botname || config.botName} - ${config.ownerName}`,
    serverMessageId: Math.floor(Math.random() * 999) + 1,
  }
})

async function enviarSubmenu(conn, m, tag, isOwner, usedPrefix, groupDb, userDb) {
  const { categorias } = getOrdenActivo(isOwner, groupDb)
  const comandos = categorias[tag]
  if (!comandos?.length) return m.reply(`*⌬┤ ❌ ├⌬ Sin comandos activos en esta categoría.*`)

  const nombreCat = ETIQUETAS[tag] || ETIQUETAS.otros
  const prefix = usedPrefix || config.prefix.source.replace(/[\^\[\]\\]/g, '')[0] || '.'
  const linkCanal = config.groupLink || 'https://whatsapp.com'
  const linea = '─────────────────'
  const currentBotName = conn.botname || config.botName

  let caption = ''
  caption += `┌${linea}\n`
  caption += `└┐  *${nombreCat.toUpperCase()}*\n`
  caption += `┌┤\n`
  for (const cmd of comandos) caption += `││  ${prefix}${cmd}\n`
  caption += `│└──⊷\n`
  caption += `└${linea}`

  const imageUrl = conn.menuImage || IMAGENES[Math.floor(Math.random() * IMAGENES.length)]

  if (conn.noButtons || userDb?.noButtons) {
    return conn.sendMessage(m.chat, {
      image: { url: imageUrl },
      caption
    }, { quoted: m })
  }

  const media = await prepareWAMessageMedia({ image: { url: imageUrl } }, { upload: conn.waUploadToServer })

  const msg = generateWAMessageFromContent(m.chat, {
    viewOnceMessage: {
      message: {
        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
        interactiveMessage: {
          body: { text: caption },
          footer: { text: `© ${new Date().getFullYear()} ${currentBotName}` },
          header: {
            hasMediaAttachment: true,
            imageMessage: media.imageMessage
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({ display_text: '🔙 Volver al Menú', id: `${prefix}menu` })
              },
              {
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({ display_text: '📢 Sigue el Canal', url: linkCanal, merchant_url: linkCanal })
              }
            ]
          },
          contextInfo: getContextInfo(conn, m)
        }
      }
    }
  }, { quoted: m })

  await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
}

const handler = async (m, { conn, usedPrefix, isOwner, command, groupDb, userDb }) => {
  const { categorias, total, ordenFinal } = getOrdenActivo(isOwner, groupDb)

  const numMatch = command.match(/^menu(\d+)$/)
  if (numMatch) {
    const idx = parseInt(numMatch[1]) - 1
    const tag = ordenFinal[idx]
    if (tag) return enviarSubmenu(conn, m, tag, isOwner, usedPrefix, groupDb, userDb)
    return m.reply(`*⌬┤ ❌ ├⌬ Categoría no encontrada o desactivada.*`)
  }

  const nombreUsuario = m.pushName || 'Usuario'
  const prefix = usedPrefix || config.prefix.source.replace(/[\^\[\]\\]/g, '')[0] || '.'
  const currentBotName = conn.botname || config.botName

  const rows = ordenFinal.map((tag, i) => {
    const nombreCat = ETIQUETAS[tag] || ETIQUETAS.otros
    const n = categorias[tag]?.length || 0
    return {
      header: nombreCat.toUpperCase(),
      title: 'Ver comandos',
      description: `${n} comandos · Escribe ${prefix}menu${i + 1}`,
      id: `menu_cat_${tag}`
    }
  })

  const imageUrl = conn.menuImage || IMAGENES[Math.floor(Math.random() * IMAGENES.length)]

  if (conn.noButtons || userDb?.noButtons) {
    const cats = ordenFinal.map((tag, i) => `> *${i + 1}.* ${ETIQUETAS[tag] || tag} — ${categorias[tag]?.length || 0} cmds · \`${prefix}menu${i + 1}\``).join('\n')
    const textoNoBtn = `*╔═══⌦ ✦ 🤖 ${currentBotName} ✦ ⌫═══╗*

> 👋 *Hola, ${nombreUsuario}*

*⌬┤ 📊 ESTADÍSTICAS ├⌬*
▢ 👑 *Creador:* ${config.ownerName}
▢ ⚙️ *Prefijo:* [ *${prefix}* ]
▢ ⏱️ *Activo:* ${getTime()}
▢ 📦 *Comandos:* ${total}

> Escribí el comando de la categoría que querés ver.
*╚══⌦ ${config.footer} ⌫══╝*

${cats}`
    return conn.sendMessage(m.chat, {
      image: { url: imageUrl },
      caption: textoNoBtn
    }, { quoted: m })
  }

  const textoMenu = `*╔═══⌦ ✦ 🤖 ${currentBotName} ✦ ⌫═══╗*

> 👋 *Hola, ${nombreUsuario}*

*⌬┤ 📊 ESTADÍSTICAS ├⌬*
▢ 👑 *Creador:* ${config.ownerName}
▢ ⚙️ *Prefijo:* [ *${prefix}* ]
▢ ⏱️ *Activo:* ${getTime()}
▢ 📦 *Comandos:* ${total}

> Tocá el botón de abajo para ver la lista de comandos.
*╚══⌦ ${config.footer} ⌫══╝*`

  const media = await prepareWAMessageMedia({ image: { url: imageUrl } }, { upload: conn.waUploadToServer })

  const msg = generateWAMessageFromContent(m.chat, {
    viewOnceMessage: {
      message: {
        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
        interactiveMessage: {
          body: { text: textoMenu },
          footer: { text: `© ${new Date().getFullYear()} ${currentBotName}` },
          header: {
            hasMediaAttachment: true,
            imageMessage: media.imageMessage
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: 'single_select',
                buttonParamsJson: JSON.stringify({
                  title: '📁 SELECCIONAR MENÚ',
                  sections: [{ title: '🌟 CATEGORÍAS DISPONIBLES', rows }]
                })
              },
              {
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                  display_text: '📢 Únete al Canal',
                  url: config.groupLink || 'https://whatsapp.com',
                  merchant_url: config.groupLink || 'https://whatsapp.com'
                })
              }
            ]
          },
          contextInfo: getContextInfo(conn, m)
        }
      }
    }
  }, { quoted: m })

  await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
}

handler.all = async (m, { conn, isOwner, usedPrefix, groupDb, userDb }) => {
  if (m.responseId && m.responseId.startsWith('menu_cat_')) {
    const tag = m.responseId.replace('menu_cat_', '')
    await enviarSubmenu(conn, m, tag, isOwner, usedPrefix, groupDb, userDb)
  }
}

handler.help = ['menu']
handler.tags = ['info']
handler.command = [
  'menu', 'help', 'ayuda', 'menú',
  ...Array.from({ length: 20 }, (_, i) => `menu${i + 1}`)
]

export default handler
