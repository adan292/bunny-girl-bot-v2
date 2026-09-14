const partidas = new Map()

const diag = [
  { max: 0,   text: '*Diagnóstico:* 100% Monosexual. Estás firmemente de un solo lado (totalmente hétero o totalmente gay/lesbiana). No hay confusión acá. 🚶‍♂️🚶‍♀️' },
  { max: 20,  text: '*Diagnóstico:* Curiosidad leve. Sabés reconocer la belleza en cualquier género, pero a la hora de enamorarte o ir a la cama, tirás para un solo lado. 👍' },
  { max: 45,  text: '*Diagnóstico:* Flexibilidad activada. Mayormente te gusta un género, pero hubo un par de excepciones que te dejaron pensando. 👀🍷' },
  { max: 65,  text: '*Diagnóstico:* El Bi-Cycle te tiene de hijo. Una semana sos 100% hétero y a la siguiente te replanteás toda tu vida. Síndrome del impostor bisexual. ⚖️🚴' },
  { max: 85,  text: '*Diagnóstico:* Oficialmente de los dos bandos. No podés sentarte derecho, hacés pistolitas con las manos y sufrís de pánico al ver a una pareja linda. 💜💙' },
  { max: 100, text: '*Diagnóstico:* 100% BISEXUAL SUPREMO. Amante del caos. Te enamorás de la persona, del alma y del físico sin importar nada. Sos el terror de las decisiones. 👑🔥🌈' }
]

const preguntasHombre = [
  { q: "1. Ves a una pareja por la calle donde ambos son hermosos. ¿Qué pensás?", opts: [{ text: "Miro a la chica y pienso 'qué suertudo el pibe'.", val: 0 }, { text: "Miro a los dos y digo 'fua, qué facheros son'.", val: 5 }, { text: "Entro en crisis porque no sé a cuál de los dos le daría primero.", val: 10 }] },
  { q: "2. ¿Alguna vez experimentaste el famoso 'Bi-Cycle'?", opts: [{ text: "No, mis gustos no cambian nunca.", val: 0 }, { text: "A veces tengo épocas donde miro un poco más a los chicos.", val: 5 }, { text: "Sí, un día soy Ricky Martin y al otro Romeo Santos.", val: 10 }] },
  { q: "3. ¿Te pondrías ropa considerada 'andrógina' o femenina?", opts: [{ text: "Ni loco, soy 100% masculino.", val: 0 }, { text: "Depende, capaz pintarme las uñas o anillos.", val: 5 }, { text: "Me pongo una falda si me combina con el outfit.", val: 10 }] },
  { q: "4. Estás con tus amigos más facheros. Vos:", opts: [{ text: "Los trato de bros, punto.", val: 0 }, { text: "Admito que tienen facha, sin miedo.", val: 5 }, { text: "Les daría un beso de buenas noches a mis compas.", val: 10 }] },
  { q: "5. ¿Cuál fue tu crush famoso de la infancia?", opts: [{ text: "Megan Fox, obvio.", val: 0 }, { text: "Brad Pitt y Angelina Jolie a la vez.", val: 5 }, { text: "Ryan Reynolds, sin pensarlo dos veces.", val: 10 }] },
  { q: "6. ¿Cómo te sentás habitualmente?", opts: [{ text: "Normal, recto o abierto.", val: 0 }, { text: "Medio cruzado a veces.", val: 5 }, { text: "Me es físicamente imposible sentarme derecho como un adulto normal.", val: 10 }] },
  { q: "7. ¿Alguna vez tuviste un 'pánico gay/hetero' repentino?", opts: [{ text: "Nunca, soy un libro abierto y claro.", val: 0 }, { text: "A veces me pregunto si no seré 100% de un lado.", val: 5 }, { text: "Todos los días dudo de qué me gusta realmente.", val: 10 }] },
  { q: "8. Si pudieras tener un trío, sería:", opts: [{ text: "Yo y dos chicas, el sueño.", val: 0 }, { text: "Yo y dos hombres, si me pinta.", val: 5 }, { text: "Mixto. Un poco de todo, como en el buffet.", val: 10 }] },
  { q: "9. ¿Qué hacés con las manos cuando estás nervioso o posás para fotos?", opts: [{ text: "Las meto en los bolsillos o me cruzo de brazos.", val: 0 }, { text: "Hablo un poco con las manos.", val: 5 }, { text: "Hago pistolitas 👉👈 o el signo de la paz ✌️ todo el tiempo.", val: 10 }] },
  { q: "10. ¿Cómo usás los puños de la camisa?", opts: [{ text: "Normales, cerrados.", val: 0 }, { text: "Arremangados hasta el codo.", val: 5 }, { text: "Arremangados justo a la mitad del antebrazo mostrando estética.", val: 10 }] },
  { q: "11. Si pudieras elegir un porcentaje de atracción en tu vida, ¿cuál es?", opts: [{ text: "100% mujeres o 100% hombres.", val: 0 }, { text: "80/20. Tiro mucho más para un lado.", val: 5 }, { text: "50/50 y cambia drásticamente cada semana.", val: 10 }] },
  { q: "12. Ves al protagonista masculino de una película de acción:", opts: [{ text: "Pienso 'ojalá tener ese físico'.", val: 0 }, { text: "Admiro su carisma y estilo.", val: 5 }, { text: "Me pregunto a qué sabrán sus labios.", val: 10 }] },
  { q: "13. Sobre 'salir del clóset':", opts: [{ text: "Soy hétero, no necesito eso.", val: 0 }, { text: "Mis amigos íntimos saben que fluyo.", val: 5 }, { text: "Literalmente salgo y vuelvo a entrar al clóset de la confusión cada mes.", val: 10 }] },
  { q: "14. En una fiesta, con un par de tragos de más:", opts: [{ text: "Trato de encarar chicas solamente.", val: 0 }, { text: "Bailo con mis amigos y me río.", val: 5 }, { text: "Beso a cualquier cosa linda que respire y me sonría.", val: 10 }] },
  { q: "15. ¿Qué música domina tu playlist?", opts: [{ text: "Trap, Reggaeton o Rock pesado.", val: 0 }, { text: "Pop comercial o Indie tranqui.", val: 5 }, { text: "The Neighbourhood, Arctic Monkeys o Frank Ocean.", val: 10 }] },
  { q: "16. ¿Qué chiste interno te define mejor?", opts: [{ text: "No tengo uno específico.", val: 0 }, { text: "Chistes de borrachos o tíos.", val: 5 }, { text: "'No sé sentarme ni tomar decisiones en la vida'.", val: 10 }] },
  { q: "17. Tu estética visual preferida en redes:", opts: [{ text: "Fotos normales, asados o mi auto.", val: 0 }, { text: "Ropa aesthetic urbana.", val: 5 }, { text: "Eboy, ranas, hongos o luces de neón moradas/rosas.", val: 10 }] },
  { q: "18. ¿Qué tipo de lentes de sol usás?", opts: [{ text: "Ray-Ban clásicos o ninguno.", val: 0 }, { text: "Gafas deportivas o de colores.", val: 5 }, { text: "Lentes con marco metálico finito, tipo retro.", val: 10 }] },
  { q: "19. Sobre los villanos de las películas (Disney/Marvel):", opts: [{ text: "Los odio, quiero que gane el héroe.", val: 0 }, { text: "Son divertidos a veces.", val: 5 }, { text: "Tienen una energía bisexual increíble y me atraen.", val: 10 }] },
  { q: "20. La de fuego: ¿Con quién pasarías la noche?", opts: [{ text: "Con la mujer de mis sueños (o el hombre si sos gay).", val: 0 }, { text: "Principalmente uno, pero acepto un comodín.", val: 5 }, { text: "Si hay química, me da exactamente igual lo que haya abajo.", val: 10 }] }
]

const preguntasMujer = [
  { q: "1. Ves a una pareja donde ambos son hermosos. ¿Qué pensás?", opts: [{ text: "Miro al chico y pienso 'qué lindo que es'.", val: 0 }, { text: "Miro a los dos y digo 'hacen re linda pareja'.", val: 5 }, { text: "Entro en pánico porque no sé a cuál quiero más.", val: 10 }] },
  { q: "2. ¿Te pasó preguntarte '¿Quiero SER ella o quiero ESTAR con ella?'", opts: [{ text: "No, siempre sé que solo envidio su ropa o pelo.", val: 0 }, { text: "A veces admiro tanto a una mujer que me confundo un segundo.", val: 5 }, { text: "Esa pregunta atormenta mi cabeza el 90% del tiempo.", val: 10 }] },
  { q: "3. Tu tipo de pantalón favorito es:", opts: [{ text: "Calzas o jeans ajustados.", val: 0 }, { text: "Jeans mom o rectos.", val: 5 }, { text: "Cargo pants, corduroy o cualquier pantalón arremangado abajo.", val: 10 }] },
  { q: "4. Respecto a tu cabello:", opts: [{ text: "Lo llevo largo y natural.", val: 0 }, { text: "Me lo tiño o corto normal.", val: 5 }, { text: "Tuve un bob, un mullet o me lo teñí a medias en crisis.", val: 10 }] },
  { q: "5. Tu crush animado de la infancia fue:", opts: [{ text: "El Príncipe Eric o Aladdin.", val: 0 }, { text: "Kim Possible o Mulan.", val: 5 }, { text: "Shego de Kim Possible... definitivamente.", val: 10 }] },
  { q: "6. Cuando tenés que saludar a alguien y te ponés incómoda:", opts: [{ text: "Doy un beso en la mejilla o la mano.", val: 0 }, { text: "Abrazo medio rápido.", val: 5 }, { text: "Hago la seña de la paz ✌️ y me río nerviosa.", val: 10 }] },
  { q: "7. Sobre tus amistades femeninas cercanas:", opts: [{ text: "Las quiero como hermanas, punto.", val: 0 }, { text: "Somos muy unidas y cariñosas.", val: 5 }, { text: "A veces hay tanta tensión que no sé si somos amigas o qué.", val: 10 }] },
  { q: "8. Tu artista musical de confort es:", opts: [{ text: "Taylor Swift, Ariana o Tini.", val: 0 }, { text: "Dua Lipa o Doja Cat.", val: 5 }, { text: "Clairo, The Neighbourhood (Sweater Weather) o Girl in Red.", val: 10 }] },
  { q: "9. ¿Cómo usás tus anillos?", opts: [{ text: "Ninguno o solo uno de oro.", val: 0 }, { text: "Varios anillos finitos y delicados.", val: 5 }, { text: "Múltiples anillos gruesos de plata en varios dedos.", val: 10 }] },
  { q: "10. Tu calzado del día a día:", opts: [{ text: "Zapatos altos, sandalias o zapatillas blancas impecables.", val: 0 }, { text: "Zapatillas deportivas comunes.", val: 5 }, { text: "Vans, Converse gastadas o Doc Martens.", val: 10 }] },
  { q: "11. ¿Cuál es tu dinámica con 'chicos lindos' vs 'chicas lindas'?", opts: [{ text: "Los chicos me atraen, las chicas son amigas.", val: 0 }, { text: "Me caen bien todos, pero busco novio.", val: 5 }, { text: "Los chicos me gustan en teoría, pero las chicas me dan pánico real.", val: 10 }] },
  { q: "12. ¿Cómo te sentás cuando estás relajada?", opts: [{ text: "Derechita o piernas cruzadas femeninas.", val: 0 }, { text: "Normal, como caiga.", val: 5 }, { text: "Como si no tuviera huesos o rodillas al pecho.", val: 10 }] },
  { q: "13. Tu tipo de humor en internet es:", opts: [{ text: "Memes de Facebook o normales.", val: 0 }, { text: "Tik Toks de baile o comedia.", val: 5 }, { text: "Humor roto, irónico y chistes sobre no poder elegir nada.", val: 10 }] },
  { q: "14. Si te dan a elegir entre un 'chico skater alt' o una 'chica alt/gótica':", opts: [{ text: "El chico skater toda la vida.", val: 0 }, { text: "Ninguno, me gustan más 'normales'.", val: 5 }, { text: "Cualquiera de los dos tiene el poder de arruinarme la vida y lo acepto.", val: 10 }] },
  { q: "15. En un libro o película, te enamorás de:", opts: [{ text: "El héroe valiente.", val: 0 }, { text: "La protagonista fuerte.", val: 5 }, { text: "El villano incomprendido de moral gris... o la villana sádica.", val: 10 }] },
  { q: "16. ¿Cómo es tu estilo de ropa en la semana?", opts: [{ text: "Siempre combinada y femenina.", val: 0 }, { text: "Ropa deportiva cómoda o tomboy.", val: 5 }, { text: "Me visto como Adam Sandler un día y como un hada al siguiente.", val: 10 }] },
  { q: "17. ¿Gatos o Perros?", opts: [{ text: "Perros 100%.", val: 0 }, { text: "Gatos 100%.", val: 5 }, { text: "Soy bisexual... me gustan ambos y no me hagas elegir.", val: 10 }] },
  { q: "18. Sobre morderse el labio o mover las manos:", opts: [{ text: "No tengo esos tics.", val: 0 }, { text: "A veces cuando dudo de algo.", val: 5 }, { text: "Literalmente no sé estar quieta, siempre hago pistolitas o me muerdo el labio.", val: 10 }] },
  { q: "19. ¿Qué opinás de la estética de los vampiros?", opts: [{ text: "Me dan miedo, no me gustan.", val: 0 }, { text: "Son interesantes en las películas.", val: 5 }, { text: "Crepúsculo y The Vampire Diaries me hicieron dudar de toda mi existencia.", val: 10 }] },
  { q: "20. La de fuego: ¿Qué te importa más en una persona para salir con ella?", opts: [{ text: "Que sea un buen hombre y masculino.", val: 0 }, { text: "Su personalidad, pero me tira más lo que ya conozco.", val: 5 }, { text: "Me enamoro del alma y de la persona, no importa lo que haya en los pantalones.", val: 10 }] }
]

function generarBarra(paso, total) {
  const llenos = Math.round((paso / total) * 10)
  return `[${'■'.repeat(llenos)}${'□'.repeat(10 - llenos)}] ${paso}/${total}`
}

async function enviarPregunta(sender, chat, conn) {
  const sesion = partidas.get(sender)
  const lista = sesion.genero === 'hombre' ? preguntasHombre : preguntasMujer
  const preg = lista[sesion.paso]
  
  let texto = `*💜 TEST BISEXUAL: ¿DE QUÉ LADO ESTÁS? 💙*\n> Progreso: ${generarBarra(sesion.paso, lista.length)}\n\n*${preg.q}*\n\n`
  preg.opts.forEach((o, i) => { texto += `*[ ${i + 1} ]* ➣ ${o.text}\n` })
  texto += '\n_Respondé con 1, 2 o 3 sin prefijo. Escribí "cancelar" para salir._'
  
  await conn.sendMessage(chat, { text: texto })
}

const handler = async (m, ctx) => {
  const { conn } = ctx
  const sender = m.sender
  const chatId = m.chat

  if (partidas.has(sender)) return m.reply('*[ ⚠️ ] Ya tenés un test en curso. Respondé o escribí "cancelar".*')
  
  partidas.set(sender, { 
    genero: null, paso: 0, puntaje: 0, calculando: false, chatId,
    timer: setTimeout(() => {
      partidas.delete(sender)
      conn.sendMessage(chatId, { text: `*[ ⏰ ] @${m.pushName || sender.split('@')[0]}, el test se canceló por inactividad.*`, mentions: [sender] })
    }, 60000) 
  })

  await conn.sendMessage(chatId, { text: `*💜 TEST DE BISEXUALIDAD 💙*\n\nAntes de empezar, decime tu género para adaptar las 20 preguntas:\n\n*[ 1 ]* ➣ Soy Varón 👨\n*[ 2 ]* ➣ Soy Mujer 👩\n\n_Respondé con 1 o 2 sin usar prefijo._` }, { quoted: m })
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
    clearTimeout(sesion.timer)
    partidas.delete(sender)
    return conn.sendMessage(m.chat, { text: '*[ 🛑 ] Test cancelado. Huiste de la verdad.*' }, { quoted: m })
  }

  const num = parseInt(txt)
  if (isNaN(num)) return

  if (!sesion.genero) {
    if (num === 1 || num === 2) {
      sesion.genero = num === 1 ? 'hombre' : 'mujer'
      clearTimeout(sesion.timer)
      sesion.timer = setTimeout(() => { partidas.delete(sender); conn.sendMessage(m.chat, { text: `*[ ⏰ ] El test se canceló por inactividad.*` }) }, 60000)
      return await enviarPregunta(sender, m.chat, conn)
    }
    return
  }

  const lista = sesion.genero === 'hombre' ? preguntasHombre : preguntasMujer
  if (num < 1 || num > lista[sesion.paso].opts.length) return 

  clearTimeout(sesion.timer)
  sesion.puntaje += lista[sesion.paso].opts[num - 1].val
  sesion.paso++

  if (sesion.paso >= lista.length) {
    sesion.calculando = true
    const porcentaje = Math.round((sesion.puntaje / (lista.length * 10)) * 100)

    await conn.sendMessage(m.chat, { text: '*[ ⏳ ] Analizando tu bi-panic y calculando el porcentaje...*\n_Tardará unos segundos en revelar el veredicto._' }, { quoted: m })

    setTimeout(async () => {
      const diagnostic = diag.find(d => porcentaje <= d.max).text
      const msg = `*💜 EL VEREDICTO BISEXUAL 💙*\n\n> 📊 *TU PORCENTAJE ES: ${porcentaje}%*\n\n${diagnostic}`
      await conn.sendMessage(m.chat, { text: msg })
      partidas.delete(sender)
    }, 5000)
  } else {
    sesion.timer = setTimeout(() => { partidas.delete(sender); conn.sendMessage(m.chat, { text: `*[ ⏰ ] El test se canceló por inactividad.*` }) }, 60000)
    await enviarPregunta(sender, m.chat, conn)
  }
}

handler.help = ['testbisexual']
handler.tags = ['fun']
handler.command = ['testbisexual', 'soybisexual', 'soybi']

export default handler