const partidas = new Map()

const diagnosticos = [
  { max: 0,   text: '*Diagnóstico:* 100% Heterosexual. Reina de los varones. No hay rastros de tijeras en tu ADN. Estás a salvo. 🛡️👨' },
  { max: 15,  text: '*Diagnóstico:* Heterosexual Premium. Admirás la belleza femenina, pero a la hora de la verdad, buscás un hombre. 💅✨' },
  { max: 35,  text: '*Diagnóstico:* Bi-curiosa en negación. A veces te cruzás con una chica de pelo corto y te olvidás de cómo respirar. 👀🍷' },
  { max: 55,  text: '*Diagnóstico:* Bisexual en crisis. Te gustan los chicos pero las mujeres te intimidan y te dejan sin palabras. ⚖️🔥' },
  { max: 75,  text: '*Diagnóstico:* Clóset de cristal. Todos tus amigos ya lo saben. Escuchás a Girl in Red y vestís oversize. Salí de ahí. 🚪✂️' },
  { max: 90,  text: '*Diagnóstico:* Oficialmente del bando. Sos torta, leñadora, dueña de 3 gatos y tu ex es tu mejor amiga. 🏳️‍🌈🐾' },
  { max: 99,  text: '*Diagnóstico:* Leyenda Sáfica Inalcanzable. Tenés un mosquetón en las llaves y te mudás a las dos semanas con tu novia. 🚚💍' },
  { max: 100, text: '*Diagnóstico:* 100% TIJERETA SUPREMA. CEO del lesbianismo. Entrás a un lugar y la heterosexualidad femenina colapsa. 👑✂️🌈' }
]

const preguntas = [
  { q: "1. ¿Alguna vez miraste a una chica y pensaste 'ojalá me mirara'?", opts: [{ text: "Nunca, solo me atraen los hombres.", val: 0 }, { text: "Sí, como admiración estética.", val: 5 }, { text: "Sí, imaginando toda una vida juntas.", val: 10 }] },
  { q: "2. Tu calzado favorito para salir es...", opts: [{ text: "Tacos o sandalias finas.", val: 0 }, { text: "Zapatillas urbanas normales.", val: 5 }, { text: "Borcegos, Doc Martens o Vans gastadas.", val: 10 }] },
  { q: "3. ¿Cómo tenés las uñas normalmente?", opts: [{ text: "Largas, esculpidas y pintadas.", val: 0 }, { text: "Corta normal o francesitas.", val: 5 }, { text: "Muy cortas y súper prolijas... por las dudas.", val: 10 }] },
  { q: "4. En una primera cita vos...", opts: [{ text: "Espero que él pague todo.", val: 0 }, { text: "Dividimos mitad y mitad.", val: 5 }, { text: "Le abro la puerta, le pago la cena y la acompaño a casa.", val: 10 }] },
  { q: "5. ¿Qué mascotas preferís?", opts: [{ text: "Un perro grande y guardián.", val: 0 }, { text: "Un perro chiquito o un gato.", val: 5 }, { text: "Tres gatos rescatados, una iguana y un hurón.", val: 10 }] },
  { q: "6. Tu música más escuchada en Spotify es...", opts: [{ text: "Reggaeton, Trap o Pop comercial.", val: 0 }, { text: "Indie Pop o Rock.", val: 5 }, { text: "Girl in Red, Clairo, Hayley Kiyoko o Billie Eilish.", val: 10 }] },
  { q: "7. ¿Cuándo creés que es el momento para mudarse en pareja?", opts: [{ text: "Después de un par de años juntos.", val: 0 }, { text: "A los 6 meses más o menos.", val: 5 }, { text: "A la segunda semana de conocerla alquilamos el camión de mudanza.", val: 10 }] },
  { q: "8. ¿Qué accesorio no te puede faltar?", opts: [{ text: "Collar de perlas o aros delicados.", val: 0 }, { text: "Un reloj bonito.", val: 5 }, { text: "Muchos anillos gruesos de plata y un mosquetón para las llaves.", val: 10 }] },
  { q: "9. ¿Cómo definirías tu estilo de ropa ideal?", opts: [{ text: "Vestidos ajustados, polleras y tops.", val: 0 }, { text: "Jeans, remeras básicas y camperas.", val: 5 }, { text: "Camisas a cuadros, oversize y estética Adam Sandler.", val: 10 }] },
  { q: "10. El vehículo de tus sueños es:", opts: [{ text: "Un auto deportivo descapotable.", val: 0 }, { text: "Un auto de ciudad, chico y lindo.", val: 5 }, { text: "Una camioneta Subaru Forester.", val: 10 }] },
  { q: "11. De niña, tu personaje ficticio favorito era:", opts: [{ text: "Alguna princesa Disney.", val: 0 }, { text: "Mulan o Mérida.", val: 5 }, { text: "Marceline de Hora de Aventura o Shego.", val: 10 }] },
  { q: "12. Se rompe algo en casa. ¿Qué hacés?", opts: [{ text: "Llamo a un hombre para que lo arregle.", val: 0 }, { text: "Intento arreglarlo con cinta o un cuchillo.", val: 5 }, { text: "Saco mi caja de herramientas completa y lo soluciono.", val: 10 }] },
  { q: "13. ¿Qué deporte te atrae más?", opts: [{ text: "Patinaje artístico, baile o ninguno.", val: 0 }, { text: "Gimnasio o running.", val: 5 }, { text: "Fútbol femenino, Softbol o Roller Derby.", val: 10 }] },
  { q: "14. ¿Cómo son tus grupos de amigas?", opts: [{ text: "Todas chicas hetero que hablan de chicos.", val: 0 }, { text: "Mixto, de todo un poco.", val: 5 }, { text: "Literalmente mi grupo de amigas son mis ex novias.", val: 10 }] },
  { q: "15. ¿Cómo te sentás en una silla?", opts: [{ text: "Derechita y con las piernas cruzadas.", val: 0 }, { text: "Normal, relajada.", val: 5 }, { text: "Despatarrada, con una pierna arriba o como si no tuviera huesos.", val: 10 }] },
  { q: "16. Tu relación con la astrología:", opts: [{ text: "No creo en esas pavadas.", val: 0 }, { text: "Sé mi signo solar y leo el horóscopo a veces.", val: 5 }, { text: "Sé mi carta astral completa, la tuya y la de mis gatos.", val: 10 }] },
  { q: "17. ¿Qué corte de pelo te tienta hacerte?", opts: [{ text: "Dejármelo larguísimo y lacio.", val: 0 }, { text: "Un corte por los hombros o flequillo.", val: 5 }, { text: "Un mullet, wolf cut o raparme los costados.", val: 10 }] },
  { q: "18. ¿Qué onda con los tatuajes?", opts: [{ text: "No me gustan, o tengo uno muy chiquito.", val: 0 }, { text: "Tengo un par de frases lindas.", val: 5 }, { text: "Tengo un bosque entero en el brazo o tatuajes stick and poke.", val: 10 }] },
  { q: "19. Sobre el cuidado de las plantas:", opts: [{ text: "Se me mueren hasta los cactus.", val: 0 }, { text: "Tengo un par de suculentas que sobreviven.", val: 5 }, { text: "Soy madre de 40 plantas de interior y les hablo.", val: 10 }] },
  { q: "20. La de fuego: ¿Por 1 millón de dólares, te acostarías con una chica hermosa?", opts: [{ text: "Ni por todo el oro, soy hétero.", val: 0 }, { text: "Cierro los ojos y cobro el millón.", val: 5 }, { text: "Yo PAGARÍA un millón para hacerlo.", val: 10 }] }
]

function generarBarra(paso, total) {
  const llenos = Math.round((paso / total) * 10)
  return `[${'■'.repeat(llenos)}${'□'.repeat(10 - llenos)}] ${paso}/${total}`
}

async function enviarPregunta(sender, chatId, conn) {
  const sesion = partidas.get(sender)
  const preg = preguntas[sesion.paso]
  let texto = `*👩‍❤️‍💋‍👩 TEST DEFINITIVO: ¿DE QUÉ LADO ESTÁS? 👩‍❤️‍💋‍👩*\n> Progreso: ${generarBarra(sesion.paso, preguntas.length)}\n\n*${preg.q}*\n\n`
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

  await conn.sendMessage(chatId, { text: `*👩‍❤️‍💋‍👩 TEST DE ORIENTACIÓN: LA VERDAD ABSOLUTA 👩‍❤️‍💋‍👩*\n\n> Estás a punto de someterte al test sáfico definitivo. Serán *20 preguntas directas*.\n\n*¿Estás lista?*\n\n*[ 1 ]* ➣ Sí, iniciar el test 🔥\n*[ 2 ]* ➣ No (Cancelar) 🏃‍♀️\n\n> _Respondé con 1 o 2 sin prefijo_` }, { quoted: m })
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
    return conn.sendMessage(m.chat, { text: `*⌬┤ 🛑 ├⌬ TEST CANCELADO.*\n> No quisiste ver la verdad.` }, { quoted: m })
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

    await conn.sendMessage(m.chat, { text: `*⌬┤ ⏳ ├⌬ PROCESANDO RESPUESTAS...*\n> Calculando tu nivel de ✂️...` }, { quoted: m })

    setTimeout(async () => {
      const diagTexto = diagnosticos.find(d => porcentaje <= d.max).text
      await conn.sendMessage(m.chat, { text: `*👩‍❤️‍💋‍👩 EL VEREDICTO DE LA VERDAD 👩‍❤️‍💋‍👩*\n\n> 📊 *TU PORCENTAJE ES: ${porcentaje}%*\n\n${diagTexto}` })
      partidas.delete(sender)
    }, 5000)

  } else {
    sesion.timer = setTimeout(() => { partidas.delete(sender); conn.sendMessage(m.chat, { text: `*⌬┤ ⏰ ├⌬ TIEMPO AGOTADO.*` }) }, 60000)
    await enviarPregunta(sender, m.chat, conn)
  }
}

handler.help = ['testlesbiana']
handler.tags = ['fun']
handler.command = ['soylesbiana', 'testlesbiana', 'tortatest']

export default handler