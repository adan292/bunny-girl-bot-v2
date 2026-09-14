const partidas = new Map()

const diagnosticos = [
  { max: 0,   text: '*Diagnóstico:* 100% Heterosexual. Macho alfa. Tu sangre es a base de asado, fútbol y herramientas. Estás a salvo. 🛡️🍺' },
  { max: 15,  text: '*Diagnóstico:* Heterosexual Premium. Estás seguro de tu sexualidad, te cuidás y no tenés masculinidad frágil. 🧢🧴' },
  { max: 35,  text: '*Diagnóstico:* Heteroflexible. En público sos re macho, pero a solas cantás pop. Con unos tragos, la barrera se rompe. 👀🍷' },
  { max: 55,  text: '*Diagnóstico:* Bisexual en pánico. 50/50. Te hacés el que "no le ponés etiquetas", pero sabés lo que querés. Disfrutá. ⚖️🔥' },
  { max: 75,  text: '*Diagnóstico:* Clóset de cristal. Todos se dan cuenta menos vos. Vivís para el chisme, la estética y el drama. Asumilo. 💅🚪' },
  { max: 90,  text: '*Diagnóstico:* Oficialmente del bando. De hétero solo te queda el DNI. Ya cruzaste la línea y respirás purpurina. 🏳️‍🌈✨' },
  { max: 99,  text: '*Diagnóstico:* Ícono Pop Inalcanzable. Diva máxima. Caminás rápido, juzgás en silencio. Sos la madrina del grupo. 🦄💃' },
  { max: 100, text: '*Diagnóstico:* 100% TRAGASABLES. El CEO de la homosexualidad. Fuiste a la yugular en todas. Nivel Dios. 👑💅🌈' }
]

const preguntas = [
  { q: "1. ¿Alguna vez miraste a un chico y pensaste 'es muy lindo'?", opts: [{ text: "Nunca.", val: 0 }, { text: "Sí, objetivamente tiene facha.", val: 5 }, { text: "Sí, lo miré más de lo que debería.", val: 10 }] },
  { q: "2. ¿Cómo te sentás normalmente?", opts: [{ text: "Piernas abiertas, ocupando espacio.", val: 0 }, { text: "Normal, una pierna cruzada sobre la rodilla.", val: 5 }, { text: "Pierna cruzada finamente o en poses indescriptibles.", val: 10 }] },
  { q: "3. ¿Qué bebida pedís en un bar?", opts: [{ text: "Cerveza o Fernet oscuro.", val: 0 }, { text: "Vodka o Gin Tonic.", val: 5 }, { text: "Daikiri, Mojito o cualquier trago dulce con sombrillita.", val: 10 }] },
  { q: "4. Tu ropa interior preferida es...", opts: [{ text: "Bóxers sueltos o viejos.", val: 0 }, { text: "Bóxers ajustados.", val: 5 }, { text: "Slips, suspensorios o tangas.", val: 10 }] },
  { q: "5. Tu ídolo musical se acerca a...", opts: [{ text: "Una banda de rock o un rapero duro.", val: 0 }, { text: "Un cantante pop tipo Bruno Mars o The Weeknd.", val: 5 }, { text: "Lady Gaga, Ariana Grande o Britney Spears.", val: 10 }] },
  { q: "6. ¿Cómo es tu forma de caminar?", opts: [{ text: "Arrastrando los pies o relajado.", val: 0 }, { text: "A paso firme y normal.", val: 5 }, { text: "Caminata rápida de pasarela, como si llegara tarde a un desfile.", val: 10 }] },
  { q: "7. ¿Cuál es tu rutina de cuidado facial?", opts: [{ text: "Me lavo la cara con el mismo jabón del cuerpo.", val: 0 }, { text: "Uso una crema hidratante de vez en cuando.", val: 5 }, { text: "Skincare de 10 pasos coreano, exfoliante y serum.", val: 10 }] },
  { q: "8. En el gimnasio vos...", opts: [{ text: "Levanto pesas pesadas y grito.", val: 0 }, { text: "Hago un poco de todo y me voy.", val: 5 }, { text: "Hago puro glúteo y miro a los demás de reojo.", val: 10 }] },
  { q: "9. ¿Cuál es tu película favorita para un domingo?", opts: [{ text: "Acción, guerra o autos (Rápido y Furioso).", val: 0 }, { text: "Una comedia normal o Marvel.", val: 5 }, { text: "Mean Girls, El Diablo Viste a la Moda o un musical.", val: 10 }] },
  { q: "10. ¿Cómo bailás en una fiesta?", opts: [{ text: "Paso básico de lado a lado con el vaso en la mano.", val: 0 }, { text: "Me muevo bastante bien, con ritmo.", val: 5 }, { text: "Me sé la coreografía exacta de Dua Lipa y bajo hasta el piso.", val: 10 }] },
  { q: "11. Hay una cucaracha voladora en tu cuarto:", opts: [{ text: "La piso descalzo.", val: 0 }, { text: "Busco insecticida rápido.", val: 5 }, { text: "Pego un grito agudo, me subo a la silla y llamo a alguien.", val: 10 }] },
  { q: "12. ¿Qué emojis usás más?", opts: [{ text: "👍 o 😂.", val: 0 }, { text: "Caritas normales y fueguitos.", val: 5 }, { text: "✨ 💅 👁️👄👁️ 🌈.", val: 10 }] },
  { q: "13. ¿Qué deporte te gusta más?", opts: [{ text: "Fútbol, Rugby o Boxeo.", val: 0 }, { text: "Tenis, Natación o Vóley.", val: 5 }, { text: "Gimnasia rítmica, Patinaje o Baile.", val: 10 }] },
  { q: "14. Tus grupos de amigos son...", opts: [{ text: "Puros vagos, los pibes.", val: 0 }, { text: "Mitad hombres, mitad mujeres.", val: 5 }, { text: "Puras chicas y yo soy el único hombre.", val: 10 }] },
  { q: "15. Cuando te emocionás mucho...", opts: [{ text: "Grito un '¡Vamos!' fuerte.", val: 0 }, { text: "Me río y aplaudo.", val: 5 }, { text: "Llego a notas agudas que rompen vidrios.", val: 10 }] },
  { q: "16. ¿Cómo sostenés una taza o vaso pequeño?", opts: [{ text: "Con toda la mano apretada.", val: 0 }, { text: "Con varios dedos normal.", val: 5 }, { text: "Meñique levantado, siempre con clase.", val: 10 }] },
  { q: "17. Tu historial de búsqueda de YouTube tiene...", opts: [{ text: "Resúmenes de fútbol o videojuegos.", val: 0 }, { text: "Música, podcasts o tutoriales.", val: 5 }, { text: "Chismes, moda o 'Tom Holland sin camisa'.", val: 10 }] },
  { q: "18. ¿Cómo te imaginás a futuro?", opts: [{ text: "Casado con una supermodelo.", val: 0 }, { text: "Soltero o con alguien tranquilo.", val: 5 }, { text: "Casado con un Sugar Daddy en Europa.", val: 10 }] },
  { q: "19. Si menciono 'RuPaul', vos decís:", opts: [{ text: "¿Quién es ese?", val: 0 }, { text: "Me suena de nombre.", val: 5 }, { text: "Sashay Away, reina.", val: 10 }] },
  { q: "20. La de fuego: ¿Por 1 millón de dólares te acostarías con un varón?", opts: [{ text: "No hay plata que me haga hacerlo.", val: 0 }, { text: "Cierro los ojos y que sea rápido.", val: 5 }, { text: "Lo hago hasta gratis.", val: 10 }] }
]

function generarBarra(paso, total) {
  const llenos = Math.round((paso / total) * 10)
  return `[${'■'.repeat(llenos)}${'□'.repeat(10 - llenos)}] ${paso}/${total}`
}

async function enviarPregunta(sender, chatId, conn) {
  const sesion = partidas.get(sender)
  const preg = preguntas[sesion.paso]
  let texto = `*🏳️‍🌈 TEST DEFINITIVO: ¿DE QUÉ LADO ESTÁS? 🏳️‍🌈*\n> Progreso: ${generarBarra(sesion.paso, preguntas.length)}\n\n*${preg.q}*\n\n`
  preg.opts.forEach((o, i) => { texto += `*[ ${i + 1} ]* ➣ ${o.text}\n` })
  texto += '\n> _Respondé con 1, 2 o 3 sin prefijo. Para salir escribí "cancelar"_'
  await conn.sendMessage(chatId, { text: texto })
}

const handler = async (m, ctx) => {
  const { conn } = ctx
  const sender = m.sender
  const chatId = m.chat

  if (partidas.has(sender)) return m.reply(`*⌬┤ ⚠️ ├⌬ YA TENÉS UN TEST ACTIVO.*`)

  partidas.set(sender, { 
    estado: 'lobby', paso: 0, puntaje: 0, chatId, calculando: false,
    timer: setTimeout(() => { partidas.delete(sender); conn.sendMessage(chatId, { text: `*⌬┤ ⏰ ├⌬ TIEMPO AGOTADO.*` }) }, 60000) 
  })

  await conn.sendMessage(chatId, { text: `*🏳️‍🌈 TEST DE ORIENTACIÓN: LA VERDAD ABSOLUTA 🏳️‍🌈*\n\n> Estás a punto de someterte al test definitivo de orientación. Serán *20 preguntas directas*.\n\n*¿Estás listo?*\n\n*[ 1 ]* ➣ Sí, iniciar el test 🔥\n*[ 2 ]* ➣ No (Cancelar) 🏃‍♂️\n\n> _Respondé con 1 o 2 sin prefijo_` }, { quoted: m })
}

handler.all = async (m, ctx) => {
  const { conn } = ctx
  const sender = m.sender
  
  if (!partidas.has(sender)) return
  const sesion = partidas.get(sender)
  if (sesion.chatId !== m.chat || sesion.calculando) return

  const txt = (m.body || '').trim().toLowerCase()
  if (!txt) return

  if (['cancelar', 'salir', 'cancel'].includes(txt)) {
    clearTimeout(sesion.timer); partidas.delete(sender)
    return conn.sendMessage(m.chat, { text: `*⌬┤ 🛑 ├⌬ TEST CANCELADO.*\n> Huiste de la verdad.` }, { quoted: m })
  }

  const num = parseInt(txt)
  if (isNaN(num)) return 

  if (sesion.estado === 'lobby') {
    if (num === 2) { clearTimeout(sesion.timer); partidas.delete(sender); return conn.sendMessage(m.chat, { text: `*⌬┤ 🛑 ├⌬ TEST CANCELADO.*` }) }
    if (num === 1) {
      sesion.estado = 'jugando'
      clearTimeout(sesion.timer)
      sesion.timer = setTimeout(() => { partidas.delete(sender); conn.sendMessage(m.chat, { text: `*⌬┤ ⏰ ├⌬ TIEMPO AGOTADO.*` }) }, 60000)
      return await enviarPregunta(sender, m.chat, conn)
    }
    return
  }

  if (num < 1 || num > 3) return 

  clearTimeout(sesion.timer)
  sesion.puntaje += preguntas[sesion.paso].opts[num - 1].val
  sesion.paso++

  if (sesion.paso >= preguntas.length) {
    sesion.calculando = true
    const porcentaje = Math.round((sesion.puntaje / 200) * 100)

    await conn.sendMessage(m.chat, { text: `*⌬┤ ⏳ ├⌬ PROCESANDO RESPUESTAS...*\n> Calculando tu nivel de 💅...` }, { quoted: m })

    setTimeout(async () => {
      const diagTexto = diagnosticos.find(d => porcentaje <= d.max).text
      await conn.sendMessage(m.chat, { text: `*🏳️‍🌈 EL VEREDICTO DE LA VERDAD 🏳️‍🌈*\n\n> 📊 *TU PORCENTAJE ES: ${porcentaje}%*\n\n${diagTexto}` })
      partidas.delete(sender)
    }, 5000)

  } else {
    sesion.timer = setTimeout(() => { partidas.delete(sender); conn.sendMessage(m.chat, { text: `*⌬┤ ⏰ ├⌬ TIEMPO AGOTADO.*` }) }, 60000)
    await enviarPregunta(sender, m.chat, conn)
  }
}

handler.help = ['testgay']
handler.tags = ['fun']
handler.command = ['soygay', 'testgay']

export default handler