import { CATEGORIAS, getPorCategoria } from '../../lib/games/trivia-preguntas.js'
import User from '../../lib/database/models/zen-users.js'
import config from '../../config.js'

const TRIVIA_IMG = 'https://i.ibb.co/XrkqY11m/15dbf94b93aa43c8.jpg'

const partidas = new Map()
const TIEMPO_MAX = 30_000
const PREMIO_POR_ACIERTO = 60
const BONUS_RACHA = [0, 0, 0, 30, 70, 120, 200, 300, 450, 650, 900]
const CATS_LIST = Object.keys(CATEGORIAS)

function getNombreCat(cat) {
  const info = CATEGORIAS[cat]
  if (!info) return cat
  return `${info.emoji} ${info.nombre.es}`
}

function preguntaAleatoriaCat(cat, usadas = new Set()) {
  const pool = getPorCategoria(cat)
  const disponibles = pool.map((_, i) => i).filter(i => !usadas.has(i))
  if (!disponibles.length) return null
  const i = disponibles[Math.floor(Math.random() * disponibles.length)]
  usadas.add(i)
  return { idx: i, item: pool[i] }
}

function premioPorRacha(racha) {
  return PREMIO_POR_ACIERTO + BONUS_RACHA[Math.min(racha, BONUS_RACHA.length - 1)]
}

function buildTextoPartida(p, preguntaObj) {
  const S = config.CURRENCY_SYMBOL
  const sig = premioPorRacha(p.racha + 1)
  const rachEmoji = p.racha >= 5 ? '🔥' : p.racha >= 3 ? '⚡' : '✨'
  const catNombre = getNombreCat(p.cat)
  
  return `*⌬┤ 🧠 ├⌬ TRIVIA ${CATEGORIAS[p.cat]?.emoji || '🧠'} ${catNombre} — Racha ${rachEmoji} ${p.racha}*\n\n_${preguntaObj.pregunta}_\n\n` +
         preguntaObj.opciones.map(o => `> ${o}`).join('\n') + `\n\n> 💰 Acumulado: *${p.acumulado} ${S}*\n> ➕ Esta vale: *+${sig} ${S}*\n> ⏱️ *30 segundos* — respondé *a, b, c* o *d* sin prefijo\n> 💼 *!cobrar* para cobrar │ *!tvstats* tus stats`
}

function iniciarTimer(conn, chatId, idx, item, jugador) {
  return setTimeout(async () => {
    if (!partidas.has(chatId)) return
    const p = partidas.get(chatId)
    if (p.idxActual !== idx) return
    partidas.delete(chatId)
    
    await User.updateOne({ jid: jugador }, { $inc: { tvLosses: 1, tvLost: p.acumulado } })
    
    const opCorrecta = item.opciones.find(o => o.toUpperCase().startsWith(item.respuesta)) || item.respuesta
    let txt = `*⌬┤ ⏱️ ├⌬ TIEMPO AGOTADO.*\n> La respuesta era: *${opCorrecta}*`
    if (p.acumulado > 0) txt += `\n> 💸 Perdiste *${p.acumulado} ${config.CURRENCY_SYMBOL}* acumulados`
    
    try { await conn.sendMessage(chatId, { text: txt, mentions: [jugador] }) } catch {}
  }, TIEMPO_MAX)
}

const handler = async (m, ctx) => {
  const { conn, command, args, userDb } = ctx
  const chatId = m.chat
  const sender = m.sender
  const S = config.CURRENCY_SYMBOL

  if (command === 'trivia' || command === 'tv') {
    if (partidas.has(chatId)) {
      const p = partidas.get(chatId)
      return conn.sendMessage(chatId, {
        text: `*⌬┤ ⚠️ ├⌬ YA HAY UNA TRIVIA ACTIVA.*\n\n${buildTextoPartida(p, p.preguntaActual)}`,
        mentions: [p.jugador]
      }, { quoted: m })
    }

    if (!userDb?.registered) return m.reply(`*⌬┤ ✙ ├⌬ NO REGISTRADO.*\n> Necesitás estar registrado para jugar trivia.`)

    const arg = (args[0] || '').toLowerCase().trim()
    if (!arg) {
      const catLines = CATS_LIST.map((cat, i) => `> ${CATEGORIAS[cat].emoji} *${i + 1}.* ${CATEGORIAS[cat].nombre.es}`).join('\n')
      return conn.sendMessage(chatId, {
        image: { url: TRIVIA_IMG },
        caption: `*⌬┤ 🧠 ├⌬ TRIVIA — ELEGÍ UNA CATEGORÍA*\n\n${catLines}\n\n> Respondé con *!trivia <número>* — Ej: *!trivia 1*`,
        mentions: [sender]
      }, { quoted: m })
    }

    let catKey = null
    const numArg = parseInt(arg)
    if (!isNaN(numArg) && numArg >= 1 && numArg <= CATS_LIST.length) {
      catKey = CATS_LIST[numArg - 1]
    } else {
      catKey = CATS_LIST.find(k => k.startsWith(arg) || CATEGORIAS[k].nombre.es.toLowerCase().startsWith(arg)) || null
    }

    if (!catKey) return m.reply(`*⌬┤ ✙ ├⌬ CATEGORÍA INVÁLIDA.*\n> Usá *!trivia* para ver las categorías.`)

    const p = {
      jugador: sender, cat: catKey,
      racha: 0, acumulado: 0,
      usadas: new Set(),
      preguntaActual: null, idxActual: -1, timer: null,
    }
    
    const result = preguntaAleatoriaCat(catKey, p.usadas)
    if (!result) return m.reply(`*⌬┤ ✙ ├⌬ CATEGORÍA INVÁLIDA.*\n> Usá *!trivia* para ver las categorías.`)
    
    p.preguntaActual = result.item
    p.idxActual = result.idx
    p.timer = iniciarTimer(conn, chatId, result.idx, result.item, sender)
    partidas.set(chatId, p)

    return conn.sendMessage(chatId, {
      image: { url: TRIVIA_IMG },
      caption: buildTextoPartida(p, result.item),
      mentions: [sender]
    }, { quoted: m })
  }

  if (command === 'cobrar' || command === 'claim') {
    if (!partidas.has(chatId)) return m.reply(`*⌬┤ ✙ ├⌬ SIN TRIVIA.*\n> No hay partida activa.`)
    const p = partidas.get(chatId)
    if (p.jugador !== sender) return
    if (p.acumulado === 0) return m.reply(`*⌬┤ ✙ ├⌬ SIN ACUMULADO.*\n> Respondé al menos una pregunta primero.`)
    
    clearTimeout(p.timer)
    partidas.delete(chatId)
    
    await User.updateOne({ jid: sender }, { $inc: { tvWins: 1, tvEarned: p.acumulado, zenCoins: p.acumulado } })
    
    return conn.sendMessage(chatId, {
      text: `*⌬┤ 💰 ├⌬ ¡COBRADO!*\n> @${sender.split('@')[0]} cobró *${p.acumulado} ${S}*\n> Racha final: *${p.racha}* preguntas seguidas`,
      mentions: [sender]
    }, { quoted: m })
  }

  if (command === 'tvstats') {
    const jid = m.mentionedJid?.[0] || sender
    const u = await User.findOne({ jid }).lean()
    
    const wins = u?.tvWins || 0
    const losses = u?.tvLosses || 0
    const maxRacha = u?.tvMaxRacha || 0
    const ganado = u?.tvEarned || 0
    const perdido = u?.tvLost || 0

    const total = wins + losses
    const pct = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0'
    const cs = u?.tvCatStats || {}
    const favCat = Object.entries(cs).sort((a, b) => (b[1].wins || 0) - (a[1].wins || 0))[0]
    const favNombre = favCat ? getNombreCat(favCat[0]) : '—'
    
    return conn.sendMessage(chatId, {
      text: `*⌬┤ 📊 ├⌬ STATS TRIVIA — @${jid.split('@')[0]}*\n> 💰 Cobros:       *${wins}*\n> 💀 Derrotas:     *${losses}*\n> 📈 Cobro rate:   *${pct}%*\n> 🏅 Mejor racha:  *${maxRacha}*\n> 💰 Ganado:       *+${ganado} ${S}*\n> 💸 Perdido:      *-${perdido} ${S}*\n> 🎯 Cat. favorita: *${favNombre}*`,
      mentions: [jid]
    }, { quoted: m })
  }

  if (command === 'tvranking' || command === 'tvrank') {
    const todos = await User.find(
      { tvMaxRacha: { $gt: 0 } },
      { jid: 1, name: 1, tvMaxRacha: 1, tvEarned: 1, tvWins: 1 }
    ).sort({ tvMaxRacha: -1, tvEarned: -1 }).limit(10).lean()
      
    if (!todos.length) return m.reply(`*⌬┤ 📋 ├⌬ RANKING TRIVIA.*\n> Nadie ha jugado aún.`)
    const MEDALS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']
    const lineas = todos.map((u, i) => `${MEDALS[i]} *${u.name || u.jid.split('@')[0]}* — 🏅${u.tvMaxRacha} preguntas │ *+${u.tvEarned||0} ${S}*`).join('\n')
    
    return conn.sendMessage(chatId, {
      text: `*⌬┤ 🏆 ├⌬ RANKING GLOBAL TRIVIA.*\n> _Ordenado por mejor racha_\n\n${lineas}`,
      mentions: todos.map(u => u.jid)
    }, { quoted: m })
  }
}

handler.all = async (m, ctx) => {
  const { conn } = ctx
  const chatId = m.chat
  const sender = m.sender
  const S = config.CURRENCY_SYMBOL

  if (!partidas.has(chatId)) return
  const p = partidas.get(chatId)
  if (p.jugador !== sender) return

  const respuesta = (m.body || '').trim().toUpperCase()
  if (!['A', 'B', 'C', 'D'].includes(respuesta)) return

  const correcta = p.preguntaActual.respuesta.toUpperCase()

  if (respuesta !== correcta) {
    clearTimeout(p.timer)
    partidas.delete(chatId)
    
    const incQuery = { tvLosses: 1, tvLost: p.acumulado }
    incQuery[`tvCatStats.${p.cat}.losses`] = 1
    await User.updateOne({ jid: sender }, { $inc: incQuery })
    
    const opCorrecta = p.preguntaActual.opciones.find(o => o.toUpperCase().startsWith(correcta)) || correcta
    return conn.sendMessage(chatId, {
      text: `*⌬┤ ❌ ├⌬ INCORRECTO.*\n> La correcta era: *${opCorrecta}*\n> 💸 Perdiste *${p.acumulado} ${S}* acumulados\n> Racha perdida: *${p.racha}*`,
      mentions: [sender]
    }, { quoted: m })
  }

  clearTimeout(p.timer)
  const premio = premioPorRacha(p.racha + 1)
  p.racha++
  p.acumulado += premio
  
  const incQuery = {}
  incQuery[`tvCatStats.${p.cat}.wins`] = 1

  const u = await User.findOne({ jid: sender }).lean()
  const currentMax = u?.tvMaxRacha || 0
  const updateDoc = { $inc: incQuery }
  if (p.racha > currentMax) updateDoc.$set = { tvMaxRacha: p.racha }
  
  await User.updateOne({ jid: sender }, updateDoc)

  const opCorrecta = p.preguntaActual.opciones.find(o => o.toUpperCase().startsWith(correcta)) || correcta
  const emojiTit = p.racha >= 5 ? '🔥' : p.racha >= 3 ? '⚡' : '✅'
  const siguiente = preguntaAleatoriaCat(p.cat, p.usadas)

  if (!siguiente) {
    partidas.delete(chatId)
    await User.updateOne({ jid: sender }, { $inc: { zenCoins: p.acumulado, tvWins: 1, tvEarned: p.acumulado } })
    return conn.sendMessage(chatId, {
      text: `*⌬┤ ${emojiTit} ├⌬ CORRECTO — ${opCorrecta}*\n> *+${premio} ${S}* │ Acumulado: *${p.acumulado} ${S}*\n> Racha: *${p.racha}*\n\n*⌬┤ 🎉 ├⌬ ¡COMPLETASTE LA CATEGORÍA!*\n> Respondiste todas las preguntas de *${getNombreCat(p.cat)}*.\n> Iniciá otra con *!trivia*`,
      mentions: [sender]
    }, { quoted: m })
  }

  p.preguntaActual = siguiente.item
  p.idxActual = siguiente.idx
  p.timer = iniciarTimer(conn, chatId, siguiente.idx, siguiente.item, sender)
  partidas.set(chatId, p)

  return conn.sendMessage(chatId, {
    text: `*⌬┤ ${emojiTit} ├⌬ CORRECTO — ${opCorrecta}*\n> *+${premio} ${S}* │ Acumulado: *${p.acumulado} ${S}*\n> Racha: *${p.racha}*\n\n*⌬┤ 🧠 ├⌬ SIGUIENTE PREGUNTA*\n\n_${siguiente.item.pregunta}_\n\n` + siguiente.item.opciones.map(o => `> ${o}`).join('\n') + `\n\n> 💰 Acumulado: *${p.acumulado} ${S}*\n> ➕ Esta vale: *+${premioPorRacha(p.racha + 1)} ${S}*\n> ⏱️ *30 segundos* — respondé *a, b, c* o *d* sin prefijo\n> 💼 *!cobrar* para cobrar │ *!tvstats* tus stats`,
    mentions: [sender]
  }, { quoted: m })
}

handler.help = ['trivia [categoría]']
handler.tags = ['fun']
handler.command = ['trivia', 'tv', 'cobrar', 'claim', 'tvstats', 'tvranking', 'tvrank']

export default handler