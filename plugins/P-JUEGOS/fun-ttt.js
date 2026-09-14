import User from '../../lib/database/models/zen-users.js'
import config from '../../config.js'

const partidas = new Map()

const TABLERO_VACIO = [' ',' ',' ',' ',' ',' ',' ',' ',' ']
const POS_MAP       = { '1':0,'2':1,'3':2,'4':3,'5':4,'6':5,'7':6,'8':7,'9':8 }
const COMBOS        = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]
const NUM_EMOJI     = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣']
const MAX_APUESTA   = 100_000

const ALIAS_DIF = {
  facil: 'facil', easy: 'facil',
  medio: 'medio', medium: 'medio',
  dificil: 'dificil', hard: 'dificil',
  imposible: 'imposible', impossible: 'imposible'
}
const DIF_LABEL = {
  facil:    '🟢 FÁCIL',
  medio:    '🟡 MEDIO',
  dificil:  '🔴 DIFÍCIL',
  imposible:'⚫ IMPOSIBLE'
}
const DIF_CONFIG = {
  facil:    { premio: 0,     kogen: 0,  desc: 'La IA comete errores frecuentes' },
  medio:    { premio: 0,     kogen: 0,  desc: 'Equilibrado, puede fallar' },
  dificil:  { premio: 2500,  kogen: 0,  desc: 'Casi imposible ganarle' },
  imposible:{ premio: 10000, kogen: 10, desc: 'La IA nunca pierde' },
}

function dibujarTablero(t) {
  const c = t.map((v, i) => v === ' ' ? NUM_EMOJI[i] : v)
  return (
    `┌─────────────┐\n` +
    `│ ${c[0]} │ ${c[1]} │ ${c[2]} │\n` +
    `│─────────────│\n` +
    `│ ${c[3]} │ ${c[4]} │ ${c[5]} │\n` +
    `│─────────────│\n` +
    `│ ${c[6]} │ ${c[7]} │ ${c[8]} │\n` +
    `└─────────────┘`
  )
}

function verificarGanador(t) {
  for (const [a,b,c] of COMBOS)
    if (t[a] !== ' ' && t[a] === t[b] && t[b] === t[c]) return t[a]
  return null
}

function tableroLleno(t) { return t.every(c => c !== ' ') }

function minimax(tab, esIA, prof = 0, alfa = -Infinity, beta = Infinity) {
  const gan = verificarGanador(tab)
  if (gan === '✖') return -10 + prof
  if (gan === '⭕') return  10 - prof
  if (tableroLleno(tab)) return 0

  if (esIA) {
    let mejor = -Infinity
    for (let i = 0; i < 9; i++) {
      if (tab[i] !== ' ') continue
      const c = [...tab]; c[i] = '⭕'
      mejor = Math.max(mejor, minimax(c, false, prof + 1, alfa, beta))
      alfa = Math.max(alfa, mejor)
      if (beta <= alfa) break
    }
    return mejor
  } else {
    let mejor = Infinity
    for (let i = 0; i < 9; i++) {
      if (tab[i] !== ' ') continue
      const c = [...tab]; c[i] = '✖'
      mejor = Math.min(mejor, minimax(c, true, prof + 1, alfa, beta))
      beta = Math.min(beta, mejor)
      if (beta <= alfa) break
    }
    return mejor
  }
}

function ganarSi(t, ficha) {
  const libres = t.map((v, i) => v === ' ' ? i : -1).filter(i => i !== -1)
  for (const i of libres) {
    const c = [...t]; c[i] = ficha
    if (verificarGanador(c) === ficha) return i
  }
  return -1
}

function movIA(t, dif = 'imposible') {
  const libres = t.map((v, i) => v === ' ' ? i : -1).filter(i => i !== -1)
  if (!libres.length) return -1

  const rand     = () => libres[Math.floor(Math.random() * libres.length)]
  const centro   = 4
  const esquinas = [0, 2, 6, 8].filter(i => t[i] === ' ')
  const lados    = [1, 3, 5, 7].filter(i => t[i] === ' ')

  if (dif === 'facil') {
    if (Math.random() < 0.75) return rand()
    const bloqueo = ganarSi(t, '✖')
    if (bloqueo !== -1 && Math.random() < 0.50) return bloqueo
    return rand()
  }

  if (dif === 'medio') {
    const ganar = ganarSi(t, '⭕')
    if (ganar !== -1) return ganar
    const bloqueo = ganarSi(t, '✖')
    if (bloqueo !== -1 && Math.random() < 0.60) return bloqueo
    if (Math.random() < 0.50) {
      if (t[centro] === ' ') return centro
      if (esquinas.length) return esquinas[Math.floor(Math.random() * esquinas.length)]
    }
    return rand()
  }

  if (dif === 'dificil') {
    const ganar = ganarSi(t, '⭕')
    if (ganar !== -1) return ganar
    const bloqueo = ganarSi(t, '✖')
    if (bloqueo !== -1) return bloqueo
    if (Math.random() < 0.10) return rand()
    if (t[centro] === ' ') return centro
    if (esquinas.length) return esquinas[Math.floor(Math.random() * esquinas.length)]
    if (lados.length) return lados[Math.floor(Math.random() * lados.length)]
    return rand()
  }

  const ganar = ganarSi(t, '⭕')
  if (ganar !== -1) return ganar
  const bloqueo = ganarSi(t, '✖')
  if (bloqueo !== -1) return bloqueo

  let mejorP = -Infinity
  let mejorI = libres[0]
  for (const i of libres) {
    const c = [...t]; c[i] = '⭕'
    const p = minimax(c, false)
    if (p > mejorP) { mejorP = p; mejorI = i }
  }
  return mejorI
}

function nombreCorto(jid) { return jid.split('@')[0] }

async function actualizarStats(jid, campo, valor) {
  await User.updateOne({ jid }, { $inc: { [campo]: valor } })
}

const handler = async (m, ctx) => {
  const { conn, args, command, userDb } = ctx
  const chatId = m.chat
  const sender = m.sender
  const nombre = m.pushName || nombreCorto(sender)
  const S      = config.CURRENCY_SYMBOL

  if (command === 'ttt' || command === 'tictactoe') {

    if (partidas.has(chatId)) {
      const p = partidas.get(chatId)
      return conn.sendMessage(chatId, {
        text: `*⌬┤ ⚠️ ├⌬ YA HAY UNA PARTIDA ACTIVA.*\n> Terminala con *!rendirse* o esperá a que termine.\n\n${dibujarTablero(p.tablero)}`,
        mentions: [p.jugador1, p.jugador2].filter(Boolean)
      }, { quoted: m })
    }

    const arg0 = (args[0] || '').toLowerCase()

    if (!arg0) {
      return m.reply(
        `*⌬┤ ❌⭕ ├⌬ TIC TAC TOE.*\n\n` +
        `> *!ttt ia <dificultad>* — vs IA (No permite apostar)\n` +
        `> *!ttt @usuario [apuesta]* — vs jugador (PvP)\n\n` +
        `*Dificultades vs IA:*\n` +
        `> 🟢 *facil* — La IA comete errores\n` +
        `> 🟡 *medio* — Equilibrado\n` +
        `> 🔴 *dificil* — Muy difícil + premio *2,500 ${S}*\n` +
        `> ⚫ *imposible* — Nunca pierde + premio *10,000 ${S}* y *10 Kōgen* ✦\n\n` +
        `> 💰 Apuesta máxima PvP: *100,000 ${S}*`
      )
    }

    const esIA = ['ia', 'ai', 'bot'].includes(arg0)
    if (esIA) {
      const difKey = ALIAS_DIF[(args[1] || '').toLowerCase()]
      if (!difKey) {
        return m.reply(
          `*⌬┤ 🤖 ├⌬ ELEGÍ LA DIFICULTAD.*\n\n` +
          `> *!ttt ia facil* 🟢\n> *!ttt ia medio* 🟡\n> *!ttt ia dificil* 🔴 (+2,500 ${S})\n> *!ttt ia imposible* ⚫ (+10,000 ${S} y 10 Kōgen ✦)`
        )
      }

      partidas.set(chatId, {
        tablero: [...TABLERO_VACIO],
        jugador1: sender,
        jugador2: null,
        turno: sender,
        vsIA: true,
        fichaJ1: '✖',
        fichaIA: '⭕',
        apuesta: 0,
        dif: difKey,
        movs: 0
      })

      const dc = DIF_CONFIG[difKey]
      let cap = `*⌬┤ ❌⭕ ├⌬ TIC TAC TOE vs IA — ${DIF_LABEL[difKey]}.*\n\n`
      cap += `> Vos: *✖* │ IA: *⭕*\n`
      cap += `> ${dc.desc}\n`
      if (dc.premio > 0 || dc.kogen > 0) {
        cap += `> 🏆 Premio si ganás: `
        if (dc.premio > 0) cap += `*+${dc.premio.toLocaleString('es-AR')} ${S}*`
        if (dc.kogen > 0)  cap += ` + *${dc.kogen} Kōgen ✦*`
        cap += `\n`
      }
      cap += `\n> Jugá enviando un número del *1* al *9* sin prefijo\n\n${dibujarTablero([...TABLERO_VACIO])}`

      return m.reply(cap)
    }

    const rival = m.mentionedJid?.[0] ||
                  (m.quoted?.sender && m.quoted.sender !== sender ? m.quoted.sender : null)

    if (!rival || rival === sender)
      return m.reply(`*⌬┤ ❌⭕ ├⌬ TIC TAC TOE.*\n> Mencioná a un rival: *!ttt @usuario [apuesta]*`)

    const apuesta = parseInt(args[1]) || 0

    if (apuesta > 0) {
      if (!userDb?.registered)
        return m.reply(`*⌬┤ 🔒 ├⌬ NO REGISTRADO.*\n> Debés registrarte para apostar.`)
      if (apuesta > MAX_APUESTA)
        return m.reply(`*⌬┤ ⚠️ ├⌬ APUESTA EXCESIVA.*\n> El máximo es *100,000 ${S}*.`)
      if ((userDb.zenCoins || 0) < apuesta)
        return m.reply(`*⌬┤ 💸 ├⌬ SIN FONDOS.*\n> Tenés *${userDb.zenCoins || 0} ${S}* y apostás *${apuesta} ${S}*.`)
      await User.updateOne({ jid: sender }, { $inc: { zenCoins: -apuesta } })
    }

    partidas.set(chatId, {
      tablero: [...TABLERO_VACIO],
      jugador1: sender,
      jugador2: rival,
      turno: sender,
      vsIA: false,
      fichaJ1: '✖',
      fichaJ2: '⭕',
      apuesta,
      esperando: true,
      movs: 0
    })

    let txtReto = `*⌬┤ ❌⭕ ├⌬ RETO TIC TAC TOE.*\n\n`
    txtReto += `> @${nombreCorto(sender)} *✖* retó a @${nombreCorto(rival)} *⭕*\n`
    if (apuesta > 0)
      txtReto += `> 💰 Apuesta: *${apuesta} ${S}* c/u — ganador lleva *${apuesta * 2} ${S}*\n`
    txtReto += `\n> @${nombreCorto(rival)}, respondé con *!aceptar* o *!rechazar*`

    return conn.sendMessage(chatId, {
      text: txtReto,
      mentions: [sender, rival]
    }, { quoted: m })
  }

  if (['aceptar','accept'].includes(command) || ['rechazar','decline'].includes(command)) {
    const esAceptar = ['aceptar','accept'].includes(command)

    if (!partidas.has(chatId))
      return m.reply(`*⌬┤ ✙ ├⌬ SIN PARTIDA.*\n> No hay ningún reto pendiente.`)

    const p = partidas.get(chatId)
    if (!p.esperando || p.jugador2 !== sender)
      return m.reply(`*⌬┤ ✙ ├⌬ NO ES TU RETO.*\n> Este reto no es para vos.`)

    if (!esAceptar) {
      if (p.apuesta > 0)
        await User.updateOne({ jid: p.jugador1 }, { $inc: { zenCoins: p.apuesta } })
      partidas.delete(chatId)
      let txt = `*⌬┤ ❌ ├⌬ RETO RECHAZADO.*\n> @${nombre} rechazó la partida.`
      if (p.apuesta > 0) txt += `\n> Se devolvieron *${p.apuesta} ${S}* a @${nombreCorto(p.jugador1)}.`
      return conn.sendMessage(chatId, { text: txt, mentions: [p.jugador1, sender] }, { quoted: m })
    }

    if (p.apuesta > 0) {
      const j2Db = await User.findOne({ jid: sender })
      if (!j2Db?.registered) {
        await User.updateOne({ jid: p.jugador1 }, { $inc: { zenCoins: p.apuesta } })
        partidas.delete(chatId)
        return m.reply(`*⌬┤ 🔒 ├⌬ NO REGISTRADO.*\n> Necesitás estar registrado para apostar. Partida cancelada.`)
      }
      if ((j2Db.zenCoins || 0) < p.apuesta) {
        await User.updateOne({ jid: p.jugador1 }, { $inc: { zenCoins: p.apuesta } })
        partidas.delete(chatId)
        return conn.sendMessage(chatId, {
          text: `*⌬┤ 💸 ├⌬ SIN FONDOS.*\n> @${nombre} no tiene *${p.apuesta} ${S}* para aceptar. Partida cancelada.`,
          mentions: [sender]
        }, { quoted: m })
      }
      await User.updateOne({ jid: sender }, { $inc: { zenCoins: -p.apuesta } })
    }

    p.esperando = false
    partidas.set(chatId, p)

    let txt = `*⌬┤ ✅ ├⌬ PARTIDA INICIADA.*\n\n`
    txt += `> @${nombreCorto(p.jugador1)} *✖* vs @${nombre} *⭕*\n`
    if (p.apuesta > 0)
      txt += `> 💰 Premio total: *${p.apuesta * 2} ${S}* al ganador\n`
    txt += `\n> Turno de @${nombreCorto(p.jugador1)} — enviá un número del *1* al *9*\n\n`
    txt += dibujarTablero(p.tablero)

    return conn.sendMessage(chatId, { text: txt, mentions: [p.jugador1, sender] }, { quoted: m })
  }

  if (['rendirse','surrender','desistir'].includes(command)) {
    if (!partidas.has(chatId))
      return m.reply(`*⌬┤ ✙ ├⌬ SIN PARTIDA.*\n> No hay partida activa.`)

    const p = partidas.get(chatId)
    if (p.jugador1 !== sender && p.jugador2 !== sender)
      return m.reply(`*⌬┤ ✙ ├⌬ NO PARTICIPÁS.*\n> No sos parte de esta partida.`)

    const rival = p.vsIA ? null : (sender === p.jugador1 ? p.jugador2 : p.jugador1)

    if (p.apuesta > 0 && !p.esperando) {
      if (p.vsIA) {
        await actualizarStats(sender, 'tttLosses', 1)
      } else if (rival) {
        await User.updateOne({ jid: rival }, { $inc: { zenCoins: p.apuesta * 2, tttWins: 1 } })
        await actualizarStats(sender, 'tttLosses', 1)
      }
    } else if (p.apuesta > 0 && p.esperando) {
      await User.updateOne({ jid: p.jugador1 }, { $inc: { zenCoins: p.apuesta } })
    }

    partidas.delete(chatId)

    let txt = `*⌬┤ 🏳️ ├⌬ RENDICIÓN.*\n> @${nombre} se rindió.`
    if (rival && p.apuesta > 0)
      txt += `\n> @${nombreCorto(rival)} gana *+${p.apuesta * 2} ${S}* 🎉`
    else if (rival)
      txt += `\n> Victoria para @${nombreCorto(rival)}.`

    return conn.sendMessage(chatId, {
      text: txt,
      mentions: [sender, rival].filter(Boolean)
    }, { quoted: m })
  }

  if (command === 'tttstats') {
    const jid    = m.mentionedJid?.[0] || sender
    const u      = await User.findOne({ jid }).lean()
    const wins   = u?.tttWins   || 0
    const losses = u?.tttLosses || 0
    const draws  = u?.tttDraws  || 0
    const total  = wins + losses + draws
    const pct    = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0'

    return conn.sendMessage(chatId, {
      text: `*⌬┤ 📊 ├⌬ STATS TTT — @${nombreCorto(jid)}*\n\n> 🏆 Victorias: *${wins}*\n> ❌ Derrotas:  *${losses}*\n> 🤝 Empates:   *${draws}*\n> 📈 Win rate:  *${pct}%*`,
      mentions: [jid]
    }, { quoted: m })
  }

  if (command === 'tttranking' || command === 'tttrank') {
    const todos = await User.find(
      { $or: [{ tttWins: { $gt: 0 } }, { tttLosses: { $gt: 0 } }] },
      { jid: 1, name: 1, tttWins: 1, tttLosses: 1, tttDraws: 1 }
    ).sort({ tttWins: -1 }).limit(10).lean()

    if (!todos.length)
      return m.reply(`*⌬┤ 📋 ├⌬ RANKING TTT.*\n> Nadie ha jugado aún.`)

    const MEDALS = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟']
    const lineas = todos.map((u, i) => {
      const n = u.name || nombreCorto(u.jid)
      return `${MEDALS[i]} *${n}* — 🏆${u.tttWins||0} ❌${u.tttLosses||0} 🤝${u.tttDraws||0}`
    }).join('\n')

    return conn.sendMessage(chatId, {
      text: `*⌬┤ 🏆 ├⌬ RANKING GLOBAL TTT.*\n\n${lineas}`,
      mentions: todos.map(u => u.jid)
    }, { quoted: m })
  }
}

handler.all = async (m, ctx) => {
  const { conn } = ctx
  const chatId = m.chat
  const sender = m.sender
  const nombre = m.pushName || nombreCorto(sender)
  const S = config.CURRENCY_SYMBOL

  if (!partidas.has(chatId)) return
  const p = partidas.get(chatId)

  const body = (m.body || '').trim()
  if (!/^[1-9]$/.test(body)) return 

  if (p.jugador1 !== sender && p.jugador2 !== sender) return 
  if (p.esperando) return 
  if (p.turno !== sender) return m.reply(`*⌬┤ ⛔ ├⌬ NO ES TU TURNO.*`)

  const pos = POS_MAP[body]
  if (p.tablero[pos] !== ' ')
    return m.reply(`*⌬┤ ✙ ├⌬ CASILLA OCUPADA.*\n> Elegí otra posición.`)

  const fichaActual = p.vsIA
    ? p.fichaJ1
    : (sender === p.jugador1 ? p.fichaJ1 : p.fichaJ2)

  p.tablero[pos] = fichaActual
  p.movs++

  const ganadorJ = verificarGanador(p.tablero)
  if (ganadorJ) {
    partidas.delete(chatId)

    const dc        = DIF_CONFIG[p.dif || 'facil']
    const premioIA  = p.vsIA ? dc.premio : 0
    const kogenIA   = p.vsIA ? dc.kogen  : 0
    const premioPvP = (!p.vsIA && p.apuesta > 0) ? p.apuesta * 2 : 0

    await actualizarStats(sender, 'tttWins', 1)
    if (premioIA > 0 || premioPvP > 0 || kogenIA > 0)
      await User.updateOne({ jid: sender }, { $inc: { zenCoins: premioIA + premioPvP, kogen: kogenIA } })

    if (!p.vsIA) {
      const perdedor = sender === p.jugador1 ? p.jugador2 : p.jugador1
      await actualizarStats(perdedor, 'tttLosses', 1)
    }

    let txt = `*⌬┤ 🏆 ├⌬ ¡GANASTE!*\n> @${nombre} ganó con *${ganadorJ}* en ${p.movs} movidas\n`
    if (premioIA > 0 || premioPvP > 0)
      txt += `> 💰 *+${premioIA || premioPvP} ${S}* acreditados\n`
    if (kogenIA > 0)
      txt += `> ✦ *+${kogenIA} Kōgen* ganados 🎉\n`
    txt += `\n${dibujarTablero(p.tablero)}`

    return conn.sendMessage(chatId, { text: txt, mentions: [sender] }, { quoted: m })
  }

  if (tableroLleno(p.tablero)) {
    partidas.delete(chatId)
    await actualizarStats(sender, 'tttDraws', 1)

    if (p.apuesta > 0) {
      await User.updateOne({ jid: p.jugador1 }, { $inc: { zenCoins: p.apuesta } })
      if (!p.vsIA && p.jugador2)
        await User.updateOne({ jid: p.jugador2 }, { $inc: { zenCoins: p.apuesta } })
    }

    let txt = `*⌬┤ 🤝 ├⌬ EMPATE.*\n> Nadie pudo ganar esta vez.`
    if (p.apuesta > 0) txt += `\n> Se devuelven las apuestas.`
    txt += `\n\n${dibujarTablero(p.tablero)}`

    return conn.sendMessage(chatId, {
      text: txt,
      mentions: [p.jugador1, p.jugador2].filter(Boolean)
    }, { quoted: m })
  }

  if (p.vsIA) {
    const posIA = movIA(p.tablero, p.dif)
    p.tablero[posIA] = p.fichaIA
    p.movs++

    const ganIA = verificarGanador(p.tablero)
    if (ganIA) {
      partidas.delete(chatId)
      await actualizarStats(sender, 'tttLosses', 1)

      let txt = `*⌬┤ 🤖 ├⌬ LA IA GANÓ.*\n> Jugó en *${posIA + 1}* y ganó.\n`
      txt += `\n${dibujarTablero(p.tablero)}`

      return conn.sendMessage(chatId, { text: txt, mentions: [sender] }, { quoted: m })
    }

    if (tableroLleno(p.tablero)) {
      partidas.delete(chatId)
      await actualizarStats(sender, 'tttDraws', 1)

      let txt = `*⌬┤ 🤝 ├⌬ EMPATE.*\n> Nadie ganó.`
      txt += `\n\n${dibujarTablero(p.tablero)}`

      return conn.sendMessage(chatId, { text: txt, mentions: [sender] }, { quoted: m })
    }

    partidas.set(chatId, p)
    return conn.sendMessage(chatId, {
      text: `*⌬┤ 🤖 ├⌬ IA JUGÓ EN ${posIA + 1}.*\n\n${dibujarTablero(p.tablero)}\n\n> @${nombre} jugá enviando un número del *1* al *9*`,
      mentions: [sender]
    }, { quoted: m })
  }

  const rivalJid = sender === p.jugador1 ? p.jugador2 : p.jugador1
  p.turno = rivalJid
  partidas.set(chatId, p)

  return conn.sendMessage(chatId, {
    text: `*⌬┤ ▶️ ├⌬ TURNO DE @${nombreCorto(rivalJid)}.*\n\n${dibujarTablero(p.tablero)}\n\n> @${nombreCorto(rivalJid)} jugá enviando un número del *1* al *9*`,
    mentions: [rivalJid]
  }, { quoted: m })
}

handler.help    = ['ttt ia <dif>', 'ttt @usuario [apuesta]']
handler.tags    = ['fun']
handler.command = [
  'ttt', 'tictactoe',
  'rendirse','surrender','desistir',
  'aceptar','accept',
  'rechazar','decline',
  'tttstats',
  'tttranking','tttrank'
]

export default handler