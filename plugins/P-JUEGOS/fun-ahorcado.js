import { palabras } from '../../lib/games/palabras.js'
import User from '../../lib/database/models/zen-users.js'
import config from '../../config.js'

const partidas = new Map()
const VIDAS_MAX  = 6
const PREMIO_BASE = 500

const HORCA = [
  `  +---+\n  |   |\n      |\n      |\n      |\n      |\n=========`,
  `  +---+\n  |   |\n  O   |\n      |\n      |\n      |\n=========`,
  `  +---+\n  |   |\n  O   |\n  |   |\n      |\n      |\n=========`,
  `  +---+\n  |   |\n  O   |\n /|   |\n      |\n      |\n=========`,
  `  +---+\n  |   |\n  O   |\n /|\\  |\n      |\n      |\n=========`,
  `  +---+\n  |   |\n  O   |\n /|\\  |\n /    |\n      |\n=========`,
  `  +---+\n  |   |\n  O   |\n /|\\  |\n / \\  |\n      |\n=========`
]

function nombreCorto(jid) { return jid.split('@')[0] }

function elegirPalabra() {
  const entrada = palabras[Math.floor(Math.random() * palabras.length)]
  if (typeof entrada === 'string') return { palabra: entrada.toLowerCase(), categoria: null }
  return { palabra: entrada.palabra.toLowerCase(), categoria: entrada.categoria || null }
}

function esPalabraCompleta(p) {
  return p.palabra.split('').every(l => l === ' ' || p.descubiertas.has(l))
}

function calcularPremio(vidasRestantes, bonus = false) {
  const porVida  = 150
  const bonusAdi = 400
  return PREMIO_BASE + (vidasRestantes * porVida) + (bonus ? bonusAdi : 0)
}

function dibujarEstado(p) {
  const progreso     = p.palabra.split('').map(l => l === ' ' ? '  ' : (p.descubiertas.has(l) ? l : '_')).join(' ')
  const letrasUsadas = [...p.usadas].sort().join(' ') || '—'
  const vidasEmoji   = '❤️'.repeat(p.vidas) + '🖤'.repeat(VIDAS_MAX - p.vidas)
  return `\`\`\`\n${HORCA[VIDAS_MAX - p.vidas]}\`\`\`\n> ${vidasEmoji}\n> \`${progreso}\`\n> Letras usadas: \`${letrasUsadas}\``
}

function letrasRestantes(p) {
  return p.palabra.split('').filter(l => l !== ' ' && !p.descubiertas.has(l))
}

const handler = async (m, ctx) => {
  const { conn, command, text, userDb } = ctx
  const chatId = m.chat
  const sender = m.sender
  const S      = config.CURRENCY_SYMBOL

  if (['ahorcado', 'ah', 'hangman', 'forca'].includes(command)) {
    if (partidas.has(chatId)) {
      const p = partidas.get(chatId)
      return conn.sendMessage(chatId, {
        text: `*⌬┤ ⚠️ ├⌬ YA HAY UNA PARTIDA ACTIVA.*\n> Jugador: @${nombreCorto(p.jugador)}\n> Enviá una letra sin prefijo, usa *!adivinar <palabra>*, *!pista* o *!rendirme*\n\n${dibujarEstado(p)}`,
        mentions: [p.jugador]
      }, { quoted: m })
    }

    const { palabra, categoria } = elegirPalabra()
    const p = {
      jugador:      sender,
      palabra,
      categoria,
      descubiertas: new Set(),
      usadas:       new Set(),
      vidas:        VIDAS_MAX,
      pistas:       0,
      inicio:       Date.now()
    }
    partidas.set(chatId, p)

    const premioMax = calcularPremio(VIDAS_MAX)
    let cap = `*⌬┤ 🪢 ├⌬ AHORCADO.*\n\n`
    if (categoria) cap += `> 📂 Categoría: *${categoria}*\n`
    cap += `> 🔤 Palabra de *${palabra.length}* letra${palabra.length !== 1 ? 's' : ''}\n`
    cap += `> 🏆 Premio máximo: *${premioMax} ${S}* (más vidas = más premio)\n`
    cap += `> 💡 Usá *!pista* para revelar una letra (−1 vida)\n\n`
    cap += `${dibujarEstado(p)}\n\n`
    cap += `> Enviá una letra directamente │ *!adivinar <palabra>* │ *!rendirme*`

    return m.reply(cap)
  }

  if (command === 'pista') {
    if (!partidas.has(chatId)) return m.reply(`*⌬┤ ✙ ├⌬ SIN PARTIDA.*\n> Iniciá con *!ahorcado*`)
    const p = partidas.get(chatId)
    if (p.jugador !== sender) return m.reply(`*⌬┤ ✙ ├⌬ NO ES TU PARTIDA.*\n> Esta partida le pertenece a @${nombreCorto(p.jugador)}.`, { mentions: [p.jugador] })
    if (p.vidas <= 1) return m.reply(`*⌬┤ ✙ ├⌬ SIN VIDAS SUFICIENTES.*\n> Necesitás al menos *2 vidas* para pedir pista.`)

    const restantes = letrasRestantes(p)
    if (!restantes.length) return m.reply(`*⌬┤ ✙ ├⌬ YA CASI LO TENÉS.*\n> No quedan letras por revelar.`)

    const letraRevelada = restantes[Math.floor(Math.random() * restantes.length)]
    p.descubiertas.add(letraRevelada)
    p.usadas.add(letraRevelada)
    p.vidas--
    p.pistas++

    if (esPalabraCompleta(p)) {
      partidas.delete(chatId)
      const premio = calcularPremio(p.vidas)
      await User.updateOne({ jid: sender }, { $inc: { zenCoins: premio, ahWins: 1, ahEarned: premio } })
      return conn.sendMessage(chatId, {
        text: `*⌬┤ 🏆 ├⌬ ¡COMPLETASTE LA PALABRA CON PISTA!*\n> Palabra: *${p.palabra.toUpperCase()}*\n> 💰 *+${premio} ${S}* acreditados\n\n${dibujarEstado(p)}`,
        mentions: [sender]
      }, { quoted: m })
    }

    partidas.set(chatId, p)
    return conn.sendMessage(chatId, {
      text: `*⌬┤ 💡 ├⌬ PISTA: la letra *${letraRevelada.toUpperCase()}* fue revelada. (−1 vida)*\n\n${dibujarEstado(p)}\n\n> Enviá una letra │ *!adivinar <palabra>* │ *!rendirme*`,
      mentions: [sender]
    }, { quoted: m })
  }

  if (['adivinar', 'adi', 'guess'].includes(command)) {
    if (!partidas.has(chatId)) return m.reply(`*⌬┤ ✙ ├⌬ SIN PARTIDA.*\n> Iniciá con *!ahorcado*`)
    const p = partidas.get(chatId)
    if (p.jugador !== sender) return
    if (!text?.trim()) return m.reply(`*⌬┤ ✙ ├⌬ USO.*\n> *!adivinar <palabra>*`)

    const intento = text.toLowerCase().trim()

    if (intento === p.palabra) {
      partidas.delete(chatId)
      const premio = calcularPremio(p.vidas, true)
      await User.updateOne({ jid: sender }, { $inc: { zenCoins: premio, ahWins: 1, ahEarned: premio } })
      return conn.sendMessage(chatId, {
        text: `*⌬┤ 🏆 ├⌬ ¡ADIVINASTE DE UNA!*\n> Palabra: *${p.palabra.toUpperCase()}*\n> 💰 *+${premio} ${S}* acreditados (incluye bono)\n\n${dibujarEstado(p)}`,
        mentions: [sender]
      }, { quoted: m })
    }

    p.vidas -= 2
    if (p.vidas < 0) p.vidas = 0

    if (p.vidas === 0) {
      partidas.delete(chatId)
      await User.updateOne({ jid: sender }, { $inc: { ahLosses: 1 } })
      return conn.sendMessage(chatId, {
        text: `*⌬┤ 💀 ├⌬ INCORRECTO Y SIN VIDAS.*\n> La palabra era: *${p.palabra.toUpperCase()}*\n\n${dibujarEstado(p)}`,
        mentions: [sender]
      }, { quoted: m })
    }

    partidas.set(chatId, p)
    return conn.sendMessage(chatId, {
      text: `*⌬┤ ❌ ├⌬ INCORRECTO. −2 vidas.*\n\n${dibujarEstado(p)}\n\n> Enviá una letra │ *!adivinar <palabra>* │ *!rendirme*`,
      mentions: [sender]
    }, { quoted: m })
  }

  if (['rendirme', 'giveup'].includes(command)) {
    if (!partidas.has(chatId)) return m.reply(`*⌬┤ ✙ ├⌬ SIN PARTIDA.*`)
    const p = partidas.get(chatId)
    if (p.jugador !== sender) return
    partidas.delete(chatId)
    await User.updateOne({ jid: sender }, { $inc: { ahLosses: 1 } })
    return conn.sendMessage(chatId, {
      text: `*⌬┤ 🏳️ ├⌬ TE RENDISTE.*\n> La palabra era: *${p.palabra.toUpperCase()}*`,
      mentions: [sender]
    }, { quoted: m })
  }

  // Comandos de estadísticas
  if (['ahstats', 'hangmanstats'].includes(command)) {
    const jid    = m.mentionedJid?.[0] || sender
    const u      = await User.findOne({ jid }).lean()
    const wins   = u?.ahWins   || 0
    const losses = u?.ahLosses || 0
    const ganado = u?.ahEarned || 0
    const total  = wins + losses
    const pct    = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0'

    return conn.sendMessage(chatId, {
      text: `*⌬┤ 📊 ├⌬ STATS AHORCADO — @${nombreCorto(jid)}*\n\n> 🏆 Victorias: *${wins}*\n> 💀 Derrotas:  *${losses}*\n> 📈 Win rate:  *${pct}%*\n> 💰 Ganado:    *+${ganado} ${S}*`,
      mentions: [jid]
    }, { quoted: m })
  }

  if (['ahranking', 'ahrank', 'hangmanrank'].includes(command)) {
    const todos = await User.find(
      { $or: [{ ahWins: { $gt: 0 } }, { ahLosses: { $gt: 0 } }] },
      { jid: 1, name: 1, ahWins: 1, ahLosses: 1, ahEarned: 1 }
    ).sort({ ahWins: -1 }).limit(10).lean()

    if (!todos.length) return m.reply(`*⌬┤ 📋 ├⌬ RANKING AHORCADO.*\n> Nadie ha jugado aún.`)

    const MEDALS = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟']
    const lineas = todos.map((u, i) => {
      const n = u.name || nombreCorto(u.jid)
      return `${MEDALS[i]} *${n}* — 🏆${u.ahWins||0} 💀${u.ahLosses||0} │ *+${u.ahEarned||0} ${S}*`
    }).join('\n')

    return conn.sendMessage(chatId, {
      text: `*⌬┤ 🏆 ├⌬ RANKING GLOBAL AHORCADO.*\n\n${lineas}`,
      mentions: todos.map(u => u.jid)
    }, { quoted: m })
  }
}

// CAPTURA SIN PREFIJO
handler.all = async (m, ctx) => {
  const { conn } = ctx
  const chatId = m.chat
  const sender = m.sender
  const S = config.CURRENCY_SYMBOL

  if (!partidas.has(chatId)) return
  const p = partidas.get(chatId)
  if (p.jugador !== sender) return

  const letra = (m.body || '').trim().toLowerCase()
  if (!/^\p{L}$/u.test(letra)) return // Si no es una sola letra, ignorar silenciosamente

  if (p.usadas.has(letra)) return m.reply(`*⌬┤ ✙ ├⌬ YA USADA.*\n> Ya enviaste la letra *${letra.toUpperCase()}*`)

  p.usadas.add(letra)

  if (p.palabra.includes(letra)) {
    p.descubiertas.add(letra)

    if (esPalabraCompleta(p)) {
      partidas.delete(chatId)
      const premio = calcularPremio(p.vidas)
      await User.updateOne({ jid: sender }, { $inc: { zenCoins: premio, ahWins: 1, ahEarned: premio } })
      return conn.sendMessage(chatId, {
        text: `*⌬┤ 🏆 ├⌬ ¡GANASTE!*\n> La palabra era: *${p.palabra.toUpperCase()}*\n> 💰 *+${premio} ${S}* acreditados\n\n${dibujarEstado(p)}`,
        mentions: [sender]
      }, { quoted: m })
    }

    partidas.set(chatId, p)
    return conn.sendMessage(chatId, {
      text: `*⌬┤ ✅ ├⌬*${letra.toUpperCase()}* está en la palabra.*\n\n${dibujarEstado(p)}\n\n> Enviá una letra │ *!adivinar <palabra>* │ *!rendirme*`,
      mentions: [sender]
    }, { quoted: m })

  } else {
    p.vidas--

    if (p.vidas === 0) {
      partidas.delete(chatId)
      await User.updateOne({ jid: sender }, { $inc: { ahLosses: 1 } })
      return conn.sendMessage(chatId, {
        text: `*⌬┤ 💀 ├⌬ PERDISTE.*\n> La palabra era: *${p.palabra.toUpperCase()}*\n\n${dibujarEstado(p)}`,
        mentions: [sender]
      }, { quoted: m })
    }

    partidas.set(chatId, p)
    return conn.sendMessage(chatId, {
      text: `*⌬┤ ❌ ├⌬*${letra.toUpperCase()}* no está en la palabra.*\n\n${dibujarEstado(p)}\n\n> Enviá una letra │ *!adivinar <palabra>* │ *!rendirme*`,
      mentions: [sender]
    }, { quoted: m })
  }
}

handler.help    = ['ahorcado']
handler.tags    = ['fun']
handler.command = [
  'ahorcado', 'ah', 'hangman', 'forca',
  'adivinar', 'adi', 'guess',
  'pista',
  'rendirme', 'giveup',
  'ahstats', 'hangmanstats',
  'ahranking', 'ahrank', 'hangmanrank'
]

export default handler