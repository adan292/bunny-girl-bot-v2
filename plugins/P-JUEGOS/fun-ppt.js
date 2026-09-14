import User from '../../lib/database/models/zen-users.js'
import config from '../../config.js'

const TIEMPO_RETO = 30_000
const timersReto = new Map() 
const partidas = new Map()

const MOVES = { piedra: 'piedra', papel: 'papel', tijera: 'tijera', rock: 'piedra', paper: 'papel', scissors: 'tijera' }
const EMOJIS = { piedra: '✊ Piedra', papel: '✋ Papel', tijera: '✌️ Tijera' }
const IA_MOVES = ['piedra', 'papel', 'tijera']

function ganador(a, b) {
  if (a === b) return 'empate'
  if ((a === 'piedra' && b === 'tijera') || (a === 'papel' && b === 'piedra') || (a === 'tijera' && b === 'papel')) return 'a'
  return 'b'
}

async function procesarAceptacionPPT(chatId, sender, m, conn, accion) {
  if (!partidas.has(chatId)) return
  const p = partidas.get(chatId)
  if (!p || !p.esperando || p.jugador2 !== sender) return

  const nombre = m.pushName || sender.split('@')[0]
  const S = config.CURRENCY_SYMBOL

  if (accion === 'rechazar') {
    clearTimeout(timersReto.get(chatId))
    timersReto.delete(chatId)
    if (p.apuesta > 0) await User.updateOne({ jid: p.jugador1 }, { $inc: { zenCoins: p.apuesta } })
    partidas.delete(chatId)
    
    let txt = `*⌬┤ ❌ ├⌬ RETO RECHAZADO.*\n> @${nombre} rechazó la partida.`
    if (p.apuesta > 0) txt += `\n> Se devolvieron *${p.apuesta} ${S}* a @${p.jugador1.split('@')[0]}`
    return conn.sendMessage(chatId, { text: txt, mentions: [p.jugador1, sender] }, { quoted: m })
  }

  if (accion === 'aceptar') {
    clearTimeout(timersReto.get(chatId))
    timersReto.delete(chatId)
    
    if (p.apuesta > 0) {
      const u2 = await User.findOne({ jid: sender }).lean()
      if (!u2 || (u2.zenCoins || 0) < p.apuesta) {
        if (p.apuesta > 0) await User.updateOne({ jid: p.jugador1 }, { $inc: { zenCoins: p.apuesta } })
        partidas.delete(chatId)
        return conn.sendMessage(chatId, {
          text: `*⌬┤ ✙ ├⌬ SIN FONDOS.*\n> @${nombre} no tiene *${p.apuesta} ${S}* para aceptar. Partida cancelada.`,
          mentions: [sender],
        }, { quoted: m })
      }
      await User.updateOne({ jid: sender }, { $inc: { zenCoins: -p.apuesta } })
    }

    p.esperando = false
    p.eleccion1 = null
    p.eleccion2 = null
    partidas.set(chatId, p)

    let txt = `*⌬┤ ✅ ├⌬ PARTIDA INICIADA.*\n> @${p.jugador1.split('@')[0]} vs @${sender.split('@')[0]}\n> Envíen su elección acá mismo sin prefijo o al privado del bot.`
    if (p.apuesta > 0) txt += `\n> Apuesta: *${p.apuesta} ${S}* c/u — el ganador se lleva *${p.apuesta * 2} ${S}*`

    await conn.sendMessage(chatId, { text: txt, mentions: [p.jugador1, sender] }, { quoted: m })
    return
  }
}

async function resolverPvP(groupChat, p, partidaChatId, conn) {
  partidas.delete(partidaChatId || groupChat)
  const res = ganador(p.eleccion1, p.eleccion2)
  const j1n = p.jugador1.split('@')[0]
  const j2n = p.jugador2.split('@')[0]
  const S = config.CURRENCY_SYMBOL

  let icon, txtRes, extra = ''

  if (res === 'empate') {
    icon = '🤝'
    txtRes = '¡Empate! Se devuelven las apuestas. 🤝'
    await User.updateOne({ jid: p.jugador1 }, { $inc: { pptDraws: 1 } })
    await User.updateOne({ jid: p.jugador2 }, { $inc: { pptDraws: 1 } })
    
    if (p.apuesta > 0) {
      await User.updateOne({ jid: p.jugador1 }, { $inc: { zenCoins: p.apuesta } })
      await User.updateOne({ jid: p.jugador2 }, { $inc: { zenCoins: p.apuesta } })
      extra = `\n> Se devuelven *${p.apuesta} ${S}* a cada uno`
    }
  } else {
    const ganadorJid = res === 'a' ? p.jugador1 : p.jugador2
    const perdedorJid = res === 'a' ? p.jugador2 : p.jugador1
    icon = '🏆'
    txtRes = `¡@${ganadorJid.split('@')[0]} ganó! 🏆`
    
    await User.updateOne({ jid: ganadorJid }, { $inc: { pptWins: 1, pptEarned: p.apuesta > 0 ? p.apuesta * 2 : 0, zenCoins: p.apuesta > 0 ? p.apuesta * 2 : 0 } })
    await User.updateOne({ jid: perdedorJid }, { $inc: { pptLosses: 1 } })
    
    if (p.apuesta > 0) {
      extra = `\n> 💰 *+${p.apuesta * 2} ${S}* para @${ganadorJid.split('@')[0]}`
    }
  }

  const out = `*⌬┤ ${icon} ├⌬ PPT — RESULTADO.*\n> @${j1n}: *${EMOJIS[p.eleccion1]}* │ @${j2n}: *${EMOJIS[p.eleccion2]}*\n> ${txtRes}${extra}`
  await conn.sendMessage(groupChat, { text: out, mentions: [p.jugador1, p.jugador2] })
}

const handler = async (m, ctx) => {
  const { conn, command, args, userDb } = ctx
  const sender = m.sender
  const chatId = m.chat
  const nombre = m.pushName || sender.split('@')[0]
  const S = config.CURRENCY_SYMBOL

  if (['ppt','rps','jkp','piedrapapeltijera'].includes(command)) {
    const arg0 = (args[0] || '').toLowerCase()
    
    if (!arg0) return m.reply(`*⌬┤ ✙ ├⌬ USO.*\n> *!ppt ia* — vs IA (Sin apuestas)\n> *!ppt @usuario [apuesta]* — vs jugador`)

    const isIA = ['ia','ai','bot'].includes(arg0)

    if (isIA) {
      if (partidas.has(chatId)) return m.reply(`*⌬┤ ⚠️ ├⌬ YA HAY UNA PARTIDA ACTIVA.*\n> Terminá la actual primero.`)
      partidas.set(chatId, { vsIA: true, jugador1: sender, apuesta: 0, esperando: false })
      return conn.sendMessage(chatId, { text: `*⌬┤ ✊✋✌️ ├⌬ PPT VS IA.*\n> Elegí tu jugada sin usar prefijo:\n> *piedra* | *papel* | *tijera*`, mentions: [sender] }, { quoted: m })
    }

    const rival = m.mentionedJid?.[0] || (m.quoted && m.quoted.sender !== sender ? m.quoted.sender : null)
    if (!rival) return m.reply(`*⌬┤ ✙ ├⌬ USO.*\n> *!ppt ia* — vs IA\n> *!ppt @usuario [apuesta]* — vs jugador`)

    const apuesta = parseInt(args.find(a => /^\d+$/.test(a)) || '0')

    if (apuesta > 0) {
      if (!userDb?.registered) return m.reply(`*⌬┤ ✙ ├⌬ NO REGISTRADO.*\n> Necesitás estar registrado para apostar.`)
      if ((userDb.zenCoins || 0) < apuesta) return m.reply(`*⌬┤ ✙ ├⌬ SIN FONDOS.*\n> Tenés *${userDb.zenCoins || 0} ${S}* y apostás *${apuesta} ${S}*`)
    }

    if (partidas.has(chatId)) return m.reply(`*⌬┤ ⚠️ ├⌬ YA HAY UNA PARTIDA ACTIVA.*\n> Terminá la actual primero.`)

    if (apuesta > 0) await User.updateOne({ jid: sender }, { $inc: { zenCoins: -apuesta } })

    partidas.set(chatId, { vsIA: false, jugador1: sender, jugador2: rival, apuesta, esperando: true, eleccion1: null, eleccion2: null, groupChat: chatId })

    const timerHandle = setTimeout(async () => {
      const p = partidas.get(chatId)
      if (!p || !p.esperando) return 
      partidas.delete(chatId)
      timersReto.delete(chatId)
      
      if (p.apuesta > 0) await User.updateOne({ jid: p.jugador1 }, { $inc: { zenCoins: p.apuesta } })
      
      const devTxt = p.apuesta > 0 ? `\n> 💰 Se devolvieron *${p.apuesta} ${S}* a @${p.jugador1.split('@')[0]}` : ''
      try {
        await conn.sendMessage(chatId, {
          text: `*⌬┤ ⏱️ ├⌬ TIEMPO AGOTADO.*\n> @${rival.split('@')[0]} no respondió el reto de @${p.jugador1.split('@')[0]}. Partida cancelada.${devTxt}`,
          mentions: [p.jugador1, rival],
        })
      } catch {}
    }, TIEMPO_RETO)

    timersReto.set(chatId, timerHandle)

    let txt = `*⌬┤ ✊✋✌️ ├⌬ RETO PPT.*\n> @${nombre} retó a @${rival.split('@')[0]}`
    if (apuesta > 0) txt += `\n> Apuesta: *${apuesta} ${S}* c/u — el ganador se lleva *${apuesta * 2} ${S}*`
    txt += `\n> @${rival.split('@')[0]}, escribí *!aceptar* o *!rechazar*.\n> ⏱️ *${TIEMPO_RETO / 1000}s* para aceptar o se cancela.`

    return conn.sendMessage(chatId, { text: txt, mentions: [sender, rival] }, { quoted: m })
  }

  if (['aceptar', 'accept', 'aceitar'].includes(command)) {
    await procesarAceptacionPPT(chatId, sender, m, conn, 'aceptar')
  }

  if (['rechazar', 'decline', 'recusar'].includes(command)) {
    await procesarAceptacionPPT(chatId, sender, m, conn, 'rechazar')
  }

  if (['pptstats','rpsstats','jkpstats'].includes(command)) {
    const jid = m.mentionedJid?.[0] || sender
    const u = await User.findOne({ jid }).lean()
    const wins = u?.pptWins || 0
    const losses = u?.pptLosses || 0
    const draws = u?.pptDraws || 0
    const ganadas = u?.pptEarned || 0

    const total = wins + losses + draws
    const pct = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0'
    return conn.sendMessage(chatId, {
      text: `*⌬┤ 📊 ├⌬ PPT STATS — @${jid.split('@')[0]}*\n> 🏆 Victorias:  *${wins}*\n> ❌ Derrotas:   *${losses}*\n> 🤝 Empates:    *${draws}*\n> 📈 Win rate:   *${pct}%*\n> 💰 Ganado:     *+${ganadas} ${S}*`,
      mentions: [jid],
    }, { quoted: m })
  }

  if (['pptranking','pptrank','rpsranking','rpsrank','jkpranking','jkprank'].includes(command)) {
    const todos = await User.find(
      { $or: [{ pptWins: { $gt: 0 } }, { pptLosses: { $gt: 0 } }] },
      { jid: 1, name: 1, pptWins: 1, pptLosses: 1, pptDraws: 1, pptEarned: 1 }
    ).sort({ pptWins: -1, pptLosses: 1 }).limit(10).lean()
      
    if (!todos.length) return m.reply(`*⌬┤ 📋 ├⌬ PPT RANKING.*\n> Nadie ha jugado aún.`)
    const MEDALS = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟']
    const texto = todos.map((u, i) => `${MEDALS[i]} *${u.name || u.jid.split('@')[0]}* — 🏆${u.pptWins||0} ❌${u.pptLosses||0} 🤝${u.pptDraws||0} │ *+${u.pptEarned||0} ${S}*`).join('\n')
    
    return conn.sendMessage(chatId, { text: `*⌬┤ 🏆 ├⌬ RANKING GLOBAL PPT.*\n\n${texto}`, mentions: todos.map(u => u.jid) }, { quoted: m })
  }
}

handler.all = async (m, ctx) => {
  const { conn } = ctx
  const sender = m.sender
  const chatId = m.chat
  const texto = (m.body || '').trim().toLowerCase()
  const S = config.CURRENCY_SYMBOL

  let partidaChatId = chatId
  let p = partidas.get(chatId)
  
  if (!p) {
    for (const [cid, partida] of partidas.entries()) {
      if (!partida.vsIA && !partida.esperando && (partida.jugador1 === sender || partida.jugador2 === sender)) {
        partidaChatId = cid
        p = partida
        break
      }
    }
  }
  
  if (!p) return

  if (p.vsIA) {
    if (sender !== p.jugador1) return
    const mov = MOVES[texto]
    if (!mov) return

    const iaMove = IA_MOVES[Math.floor(Math.random() * 3)]
    const res = ganador(mov, iaMove)
    
    partidas.delete(partidaChatId)

    let icon, txt
    if (res === 'empate') {
      icon = '🤝'; txt = '¡Empate! 🤝'
      await User.updateOne({ jid: sender }, { $inc: { pptDraws: 1 } })
    } else if (res === 'a') {
      icon = '🏆'; txt = '¡Ganaste! 🏆'
      await User.updateOne({ jid: sender }, { $inc: { pptWins: 1 } })
    } else {
      icon = '❌'; txt = 'Perdiste 😞'
      await User.updateOne({ jid: sender }, { $inc: { pptLosses: 1 } })
    }

    let out = `*⌬┤ ${icon} ├⌬ PPT — VS IA.*\n> Vos: *${EMOJIS[mov]}* │ IA: *${EMOJIS[iaMove]}*\n> ${txt}`

    return conn.sendMessage(partidaChatId, { text: out, mentions: [sender] }, { quoted: m })
  }

  if (!p.vsIA && !p.esperando) {
    if (sender !== p.jugador1 && sender !== p.jugador2) return
    const mov = MOVES[texto]
    if (!mov) return

    if (sender === p.jugador1 && !p.eleccion1) {
      p.eleccion1 = mov
      partidas.set(partidaChatId, p)
      await conn.sendMessage(sender, { text: `*⌬┤ ✅ ├⌬ ELECCIÓN REGISTRADA.*\n> Esperando al rival...` })
      if (p.eleccion2) await resolverPvP(p.groupChat, p, partidaChatId, conn)
      return
    }

    if (sender === p.jugador2 && !p.eleccion2) {
      p.eleccion2 = mov
      partidas.set(partidaChatId, p)
      await conn.sendMessage(sender, { text: `*⌬┤ ✅ ├⌬ ELECCIÓN REGISTRADA.*\n> Esperando al rival...` })
      if (p.eleccion1) await resolverPvP(p.groupChat, p, partidaChatId, conn)
      return
    }
  }
}

handler.help = ['ppt ia', 'ppt @usuario [apuesta]']
handler.tags = ['fun']
handler.command = ['ppt', 'rps', 'jkp', 'piedrapapeltijera', 'pptstats', 'pptranking', 'pptrank', 'rpsranking', 'rpsrank', 'jkpranking', 'jkprank', 'aceptar', 'accept', 'aceitar', 'rechazar', 'decline', 'recusar']

export default handler