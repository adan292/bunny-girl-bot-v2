import axios from 'axios'

const DEFAULT_PIC_1 = 'https://cdn.popcat.xyz/avatar.png'
const DEFAULT_PIC_2 = 'https://cdn.popcat.xyz/popcat.png'

const rnd = arr => arr[Math.floor(Math.random() * arr.length)]

const COMPAT = [
  { min: 90, texto: `¡Alma gemela confirmada! 💍` },
  { min: 75, texto: `Alta química... ¡casi explosiva! 🔥` },
  { min: 60, texto: `Hay potencial, falta la última chispa 😏` },
  { min: 45, texto: `Algo hay ahí... pero muy escondido 🤔` },
  { min: 30, texto: `Amigos con derechos... o solo amigos 😅` },
  { min: 10, texto: `Muy poco amor por acá 💨` },
  { min:  0, texto: `Mejor como amigos... o ni eso 😂` }
]

const LOADING = [
  `💭 Buscando almas gemelas en el grupo...`,
  `🔮 Consultando al universo... ¿quién ama en secreto?`,
  `❤️ Cupido está disparando flechas... ¡cuidado!`,
  `⏳ Analizando miraditas, likes ocultos y chats privados...`,
  `✨ Activando modo shippeo máximo...`,
  `😏 Revisando quién se sonroja cuando el otro escribe...`,
  `💔 Preparando corazones rotos por si sale 0%...`,
  `🌹 Calculando vibraciones románticas del grupo...`,
  `🎯 El algoritmo del amor está trabajando...`,
  `🪄 Agitando la varita del shippeo...`
]

const FRASES = [
  `💞 *¡PAREJA DEL DÍA DETECTADA!* 💞\n@{user1} ❤️ @{user2}\nCompatibilidad: *{p}%* — {compat}\n\n> Se aman en secreto... o no tanto 🤫`,
  `❤️ *El algoritmo del amor habló:*\n@{user1} + @{user2} = *{p}% de amor*\n{compat}\n\n> ¿Cuándo la cita? El grupo espera el chisme 🔥`,
  `✨ *Shippeo oficial del grupo:*\n@{user1} ❤️ @{user2}\nNivel de compatibilidad: *{p}%*\n{compat}\n\n> Cupido ya está celebrando 🎉`,
  `😍 *¡BOMBA ROMÁNTICA!*\n@{user1} y @{user2} tienen *{p}%* de química\n{compat}\n\n> ¿Quién confiesa primero? 👀`,
  `💔 O... 💞\n@{user1} ❤️ @{user2} → *{p}%*\n{compat}\n\n> El grupo ya está shippeando fuerte 😏`,
  `🌹 *El universo los juntó:*\n@{user1} 💕 @{user2}\nCompatibilidad cósmica: *{p}%*\n{compat}\n\n> Nadie puede luchar contra el destino ✨`,
  `🎯 *Match del día:*\n@{user1} 🤝 @{user2}\n*{p}%* de posibilidades de que sea real\n{compat}\n\n> El grupo ya lo sabe... y vos también 😏`
]

const SHIP_TEXT = [
  `En el amor`, `Almas gemelas`, `Para siempre`,
  `Inevitable`, `Shippeo oficial`, `Destino`,
  `Cupido dijo sí`, `No hay escape`, `El grupo sabe`
]

function getCompat(porcentaje) {
  return (COMPAT.find(c => porcentaje >= c.min) ?? COMPAT[COMPAT.length - 1]).texto
}

const handler = async (m, ctx) => {
  const { conn, groupMetadata } = ctx

  const participantes = groupMetadata.participants
    .filter(p => !p.id.includes('broadcast') && p.id !== conn.user?.jid)
    .map(p => p.id)

  if (participantes.length < 2)
    return m.reply(`*⌬┤ ⚠️ ├⌬ POCOS MIEMBROS.*\n> No hay suficientes miembros para formar una pareja.`)

  const loadingMsg = await conn.sendMessage(m.chat, {
    text: `*⌬┤ ⏳ ├⌬ ${rnd(LOADING)}*`
  }, { quoted: m })

  try {
    const shuffled      = [...participantes].sort(() => Math.random() - 0.5)
    const [jid1, jid2]  = shuffled
    const name1         = jid1.split('@')[0]
    const name2         = jid2.split('@')[0]

    let pic1, pic2
    try { pic1 = await conn.profilePictureUrl(jid1, 'image') } catch { pic1 = DEFAULT_PIC_1 }
    try { pic2 = await conn.profilePictureUrl(jid2, 'image') } catch { pic2 = DEFAULT_PIC_2 }

    let imageBuffer = null
    let porcentaje  = 0

    try {
      const res = await axios.get(
        `https://api.popcat.xyz/v2/ship?user1=${encodeURIComponent(pic1)}&user2=${encodeURIComponent(pic2)}`,
        { responseType: 'arraybuffer', timeout: 10000 }
      )
      if (res.status === 200) {
        imageBuffer = Buffer.from(res.data)
        porcentaje  = res.headers['ship-percentage']
          ? parseInt(res.headers['ship-percentage'])
          : Math.floor(Math.random() * 101)
      }
    } catch {}

    if (!imageBuffer) {
      porcentaje = Math.floor(Math.random() * 101)
      const res  = await axios.get(
        `https://api.delirius.store/canvas/ship` +
        `?image1=${encodeURIComponent(pic1)}&name1=${encodeURIComponent(name1)}` +
        `&image2=${encodeURIComponent(pic2)}&name2=${encodeURIComponent(name2)}` +
        `&percentage=${porcentaje}&text=${encodeURIComponent(rnd(SHIP_TEXT))}`,
        { responseType: 'arraybuffer', timeout: 10000 }
      )
      imageBuffer = Buffer.from(res.data)
    }

    const caption = rnd(FRASES)
      .replace(/{user1}/g, name1)
      .replace(/{user2}/g, name2)
      .replace(/{p}/g, String(porcentaje))
      .replace(/{compat}/g, getCompat(porcentaje))

    await conn.sendMessage(m.chat, { image: imageBuffer, caption, mentions: [jid1, jid2] }, { quoted: m })
    await conn.sendMessage(m.chat, { delete: loadingMsg.key })

  } catch {
    await conn.sendMessage(m.chat, { delete: loadingMsg.key }).catch(() => {})
    m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> Ocurrió un fallo al generar la pareja. Intentá de nuevo.`)
  }
}

handler.help = ['parejas']
handler.tags = ['fun']
handler.command = ['parejas', 'formarparejas', 'ship']
handler.group = true

export default handler