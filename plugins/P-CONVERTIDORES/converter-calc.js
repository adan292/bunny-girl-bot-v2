const MATH_FUNCS  = { sqrt:Math.sqrt,cbrt:Math.cbrt,abs:Math.abs,ceil:Math.ceil,floor:Math.floor,round:Math.round,log:Math.log,log2:Math.log2,log10:Math.log10,sin:Math.sin,cos:Math.cos,tan:Math.tan,asin:Math.asin,acos:Math.acos,atan:Math.atan,sinh:Math.sinh,cosh:Math.cosh,tanh:Math.tanh,exp:Math.exp,pow:Math.pow,max:Math.max,min:Math.min,sign:Math.sign,trunc:Math.trunc,hypot:Math.hypot,factorial:n=>{if(n<0||n>170)return NaN;let r=1;for(let i=2;i<=n;i++)r*=i;return r} }
const MATH_CONSTS = { PI:Math.PI,E:Math.E,LN2:Math.LN2,LN10:Math.LN10,SQRT2:Math.SQRT2 }

function calcular(expr) {
  let e = expr.trim().replace(/\^/g,'**').replace(/(\d+)!/g,'factorial($1)').replace(/(\d+)\s*%\s*(\d+)/g,'($1/100*$2)').replace(/\bpi\b/gi,'PI').replace(/\be\b/g,'E')
  if (!/^[\d+\-*/().,\s%^!a-zA-Z_]+$/.test(e)) return null
  const fn  = new Function(...Object.keys(MATH_FUNCS),...Object.keys(MATH_CONSTS),`"use strict";return (${e})`)
  const res = fn(...Object.values(MATH_FUNCS),...Object.values(MATH_CONSTS))
  if (!isFinite(res)) return null
  return +parseFloat(res.toPrecision(12))
}

function buildPasos(expr) {
  const s=[]
  if (/[a-zA-Z]/.test(expr))   s.push(`> ① Funciones identificadas`)
  if (/\*\*|\^/.test(expr))    s.push(`> ② Potencias calculadas`)
  if (/\(/.test(expr))         s.push(`> ③ Paréntesis resueltos`)
  if (/%/.test(expr))          s.push(`> ④ Porcentajes expandidos`)
  s.push(`> ⑤ Operaciones: × ÷ antes que + −`)
  return s.join('\n')
}

const handler = async (m, { text, usedPrefix, command }) => {
  if (!text) return m.reply(`*⌬┤ ✙ ├⌬ USO:* ${usedPrefix}${command} <expresión>`)
  try {
    const res = calcular(text)
    if (res === null) return m.reply(`*⌬┤ ✙ ├⌬ EXPRESIÓN INVÁLIDA.*\n> Revisá la expresión ingresada.`)
    await m.reply(`*⌬┤ 🧮 ├⌬ CALCULADORA*\n\n≡ 📝 *Expresión:* \`${text}\`\n≡ ✅ *Resultado:* \`${res}\`\n\n≡ 📊 *Pasos:*\n${buildPasos(text)}`)
  } catch {
    m.reply(`*⌬┤ ❌ ├⌬ ERROR.*`)
  }
}

handler.help = ['calc <expresion>']
handler.command = ['calc', 'calcular', 'calcularpt', 'calculator']
handler.tags = ['convertidores']

export default handler