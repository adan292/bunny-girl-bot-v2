const RESPUESTAS = [
  '✅ Sí, definitivamente.',
  '✅ Todo apunta a que sí.',
  '✅ Sin dudas.',
  '✅ Podés contar con ello.',
  '🌀 Es difícil saberlo ahora.',
  '🌀 Preguntá de nuevo más tarde.',
  '🌀 Mejor no te lo digo ahora.',
  '🌀 No me es posible predecirlo.',
  '❌ No cuentes con ello.',
  '❌ Mi respuesta es no.',
  '❌ Las perspectivas no son buenas.',
  '❌ Muy dudoso.'
]

const handler = async (m, ctx) => {
  const { text, usedPrefix, command } = ctx

  if (!text) return m.reply(`*⌬┤ ✙ ├⌬ FALTA LA PREGUNTA.*\n> Haceme una pregunta.\n> Ejemplo: *${usedPrefix}${command} ¿Voy a tener suerte hoy?*`)

  const resp = RESPUESTAS[Math.floor(Math.random() * RESPUESTAS.length)]
  m.reply(`*⌬┤ 🎱 ├⌬ 8-BALL.*\n> ❓ ${text}\n> ${resp}`)
}

handler.help = ['8ball <pregunta>']
handler.tags = ['fun']
handler.command = ['8ball', 'bola8', 'prediccion']

export default handler