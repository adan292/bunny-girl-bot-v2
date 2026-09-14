import User from '../../lib/database/models/zen-users.js'
import config from '../../config.js'

const DIFICULTADES = {
  facil:     { nombre: 'FÁCIL',     tiempo: 30, premio: 50,  ops: ['+','-'],               rango: [1, 20],   decimales: false },
  medio:     { nombre: 'MEDIO',     tiempo: 25, premio: 600, ops: ['+','-','*'],           rango: [1, 50],   decimales: false },
  dificil:   { nombre: 'DIFÍCIL',   tiempo: 25, premio: 175, ops: ['+','-','*','/'],       rango: [50, 500], decimales: true  },
  imposible: { nombre: 'IMPOSIBLE', tiempo: 25, premio: 1500,ops: ['+','-','*','/','^','%'], rango: [100, 999],decimales: true  },
}

const ALIAS_DIF = {
  facil: 'facil', fácil: 'facil', easy: 'facil',
  medio: 'medio', medium: 'medio',
  dificil: 'dificil', difícil: 'dificil', hard: 'dificil',
  imposible: 'imposible', impossible: 'imposible', impossivel: 'imposible',
}

const partidas = new Map()
const respondiendo = new Set()

function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }

function generarOperacion(dif) {
  const cfg = DIFICULTADES[dif]
  const op  = cfg.ops[Math.floor(Math.random() * cfg.ops.length)]
  const [min, max] = cfg.rango
  let a = rnd(min, max)
  let b = rnd(min, max)
  let expr, result

  switch (op) {
    case '+':
      if (dif === 'facil')     { a = rnd(10, 50);    b = rnd(10, 50)    }
      if (dif === 'medio')     { a = rnd(50, 500);   b = rnd(50, 500)   }
      if (dif === 'dificil')   { a = rnd(500, 5000); b = rnd(500, 5000) }
      if (dif === 'imposible') { a = rnd(1000, 99999); b = rnd(1000, 99999) }
      expr = `${a} + ${b}`; result = a + b; break
    case '-':
      if (dif === 'facil')     { a = rnd(20, 100);   b = rnd(5, a)      }
      if (dif === 'medio')     { a = rnd(100, 1000); b = rnd(50, a)     }
      if (dif === 'dificil')   { a = rnd(1000, 9999); b = rnd(100, a)   }
      if (dif === 'imposible') { a = rnd(5000, 99999); b = rnd(1000, a) }
      if (a < b) [a, b] = [b, a]
      expr = `${a} - ${b}`; result = a - b; break
    case '*':
      if (dif === 'facil')     { a = rnd(2, 20);   b = rnd(2, 10)  }
      if (dif === 'medio')     { a = rnd(5, 50);   b = rnd(2, 15)  }
      if (dif === 'dificil')   { a = rnd(50, 500); b = rnd(15, 50) }
      if (dif === 'imposible') { a = rnd(100, 999); b = rnd(25, 99) }
      expr = `${a} × ${b}`; result = a * b; break
    case '/':
      if (dif === 'dificil')   { b = rnd(7, 25);  a = b * rnd(5, 30)  }
      if (dif === 'imposible') { b = rnd(11, 49); a = b * rnd(7, 50)  }
      expr = `${a} ÷ ${b}`; result = a / b; break
    case '^':
      if (dif === 'imposible') { a = rnd(10, 35); b = rnd(3, 6) }
      else                     { a = rnd(5, 20);  b = rnd(2, 4) }
      expr = `${a} ^ ${b}`; result = Math.pow(a, b); break
    case '%':
      b = rnd(dif === 'imposible' ? 20 : 7, dif === 'imposible' ? 97 : 30)
      do { a = rnd(min, max) } while (a % b === 0)
      expr = `${a} % ${b}`; result = a % b; break
  }

  result = cfg.decimales ? Math.round(result * 100) / 100 : Math.round(result)
  return { expr, result }
}

const handler = async (m, ctx) => {
  const { conn, command, text, usedPrefix } = ctx
  const sender = m.sender
  const chatId = m.chat
  const S = config.CURRENCY_SYMBOL

  if (['math','matematica','matematicas','mates','calculo','calcular'].includes(command)) {
    if (!text) return m.reply(`*⌬┤ ✙ ├⌬ USO.*\n> *${usedPrefix}math <dificultad>*\n> Dificuldades: *facil | medio | dificil | imposible*`)
    const difKey = ALIAS_DIF[text.trim().toLowerCase()]
    if (!difKey) return m.reply(`*⌬┤ ✙ ├⌬ DIFICULTAD INVÁLIDA.*\n> Usá: *facil | medio | dificil | imposible*`)
    if (partidas.has(chatId)) return m.reply(`*⌬┤ ⚠️ ├⌬ YA HAY UNA PREGUNTA ACTIVA.*\n> Respondé o esperá que expire.`)

    const cfg = DIFICULTADES[difKey]
    const { expr, result } = generarOperacion(difKey)

    const timer = setTimeout(async () => {
      if (!partidas.has(chatId)) return
      const p = partidas.get(chatId)
      partidas.delete(chatId)
      await conn.sendMessage(chatId, { text: `*⌬┤ ⏰ ├⌬ TIEMPO AGOTADO.*\n> La respuesta correcta era *${p.respuesta}*` })
    }, cfg.tiempo * 1000)

    partidas.set(chatId, { respuesta: result, premio: cfg.premio, timer, iniciador: sender, dif: difKey })

    return conn.sendMessage(chatId, {
      text: `*⌬┤ 🧮 ├⌬ MATH — ${cfg.nombre}*\n\n> ¿Cuánto es *${expr}*?\n\n> ⏱️ Tenés *${cfg.tiempo}s* para responder sin prefijo.\n> 💰 Premio: *${cfg.premio} ${S}*`,
      mentions: [sender],
    }, { quoted: m })
  }

  if (['mathstats','matestats','matematicasstats'].includes(command)) {
    const jid = m.mentionedJid?.[0] || sender
    const u = await User.findOne({ jid }).lean()
    const wins = u?.mathWins || 0
    const losses = u?.mathLosses || 0
    const ganadas = u?.mathEarned || 0
    const facil = u?.mathFacil || 0
    const medio = u?.mathMedio || 0
    const dificil = u?.mathDificil || 0
    const imposible = u?.mathImposible || 0

    const total = wins + losses
    const pct = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0'
    
    return conn.sendMessage(chatId, {
      text: `*⌬┤ 📊 ├⌬ MATH STATS — @${jid.split('@')[0]}*\n> ✅ Correctas:   *${wins}*\n> ❌ Incorrectas: *${losses}*\n> 📈 Precisión:   *${pct}%*\n> 💰 Ganado:      *+${ganadas} ${S}*\n\n> 🟢 Fácil:       *${facil}*\n> 🟡 Medio:       *${medio}*\n> 🔴 Difícil:     *${dificil}*\n> ⚫ Imposible:   *${imposible}*`,
      mentions: [jid],
    }, { quoted: m })
  }

  if (['mathranking','mathrank','materanking','materank'].includes(command)) {
    const todos = await User.find(
      { $or: [{ mathWins: { $gt: 0 } }, { mathLosses: { $gt: 0 } }] },
      { jid: 1, name: 1, mathWins: 1, mathLosses: 1, mathEarned: 1 }
    ).sort({ mathWins: -1, mathLosses: 1 }).limit(10).lean()
      
    if (!todos.length) return m.reply(`*⌬┤ 📋 ├⌬ MATH RANKING.*\n> Nadie ha jugado aún.`)
    const MEDALS = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟']
    const texto = todos.map((u, i) => `${MEDALS[i]} *${u.name || u.jid.split('@')[0]}* — ✅${u.mathWins||0} ❌${u.mathLosses||0} │ *+${u.mathEarned||0} ${S}*`).join('\n')
    
    return conn.sendMessage(chatId, { text: `*⌬┤ 🏆 ├⌬ RANKING GLOBAL MATH.*\n\n${texto}`, mentions: todos.map(u => u.jid) }, { quoted: m })
  }
}

handler.all = async (m, ctx) => {
  const { conn } = ctx
  const sender = m.sender
  const chatId = m.chat
  const S = config.CURRENCY_SYMBOL

  if (!partidas.has(chatId)) return

  const texto = (m.body || '').trim()
  if (!texto || isNaN(Number(texto))) return

  const p = partidas.get(chatId)
  const respUsuario = Math.round(Number(texto) * 100) / 100
  const respCorrecta = p.respuesta

  if (respondiendo.has(sender)) return
  respondiendo.add(sender)
  setTimeout(() => respondiendo.delete(sender), 1500)
  
  const nombre = m.pushName || sender.split('@')[0]

  if (respUsuario === respCorrecta) {
    clearTimeout(p.timer)
    partidas.delete(chatId)
    
    const difKey = p.dif
    const campoDif = `math${difKey.charAt(0).toUpperCase() + difKey.slice(1)}`

    await User.updateOne({ jid: sender }, {
      $inc: {
        zenCoins: p.premio,
        mathWins: 1,
        mathEarned: p.premio,
        [campoDif]: 1
      }
    })
    
    return conn.sendMessage(chatId, {
      text: `*⌬┤ ✅ ├⌬ ¡CORRECTO!*\n> @${nombre} respondió *${respCorrecta}* ✔️\n> 💰 Ganás *+${p.premio} ${S}*`,
      mentions: [sender],
    }, { quoted: m })
  } else {
    await User.updateOne({ jid: sender }, { $inc: { mathLosses: 1 } })
    return conn.sendMessage(chatId, { text: `*⌬┤ ❌ ├⌬ INCORRECTO.*\n> Seguí intentando...` }, { quoted: m })
  }
}

handler.help = ['math <facil|medio|dificil|imposible>']
handler.tags = ['fun']
handler.command = ['math', 'matematica', 'matematicas', 'mates', 'calculo', 'calcular', 'mathstats', 'matestats', 'matematicasstats', 'mathranking', 'mathrank', 'materanking', 'materank']

export default handler