const SIGNOS = ['♑ Capricornio', '♒ Acuario', '♓ Piscis', '♈ Aries', '♉ Tauro', '♊ Géminis', '♋ Cáncer', '♌ Leo', '♍ Virgo', '♎ Libra', '♏ Escorpio', '♐ Sagitario']
const ZODIACO_CHINO = ['🐀 Rata', '🐂 Buey', '🐅 Tigre', '🐇 Conejo', '🐉 Dragón', '🐍 Serpiente', '🐎 Caballo', '🐐 Cabra', '🐒 Mono', '🐓 Gallo', '🐕 Perro', '🐖 Cerdo']

function obtenerSigno(dia, mes) {
  if ((mes === 1 && dia <= 19) || (mes === 12 && dia >= 22)) return 0
  if ((mes === 1 && dia >= 20) || (mes === 2 && dia <= 18)) return 1
  if ((mes === 2 && dia >= 19) || (mes === 3 && dia <= 20)) return 2
  if ((mes === 3 && dia >= 21) || (mes === 4 && dia <= 19)) return 3
  if ((mes === 4 && dia >= 20) || (mes === 5 && dia <= 20)) return 4
  if ((mes === 5 && dia >= 21) || (mes === 6 && dia <= 20)) return 5
  if ((mes === 6 && dia >= 21) || (mes === 7 && dia <= 22)) return 6
  if ((mes === 7 && dia >= 23) || (mes === 8 && dia <= 22)) return 7
  if ((mes === 8 && dia >= 23) || (mes === 9 && dia <= 22)) return 8
  if ((mes === 9 && dia >= 23) || (mes === 10 && dia <= 22)) return 9
  if ((mes === 10 && dia >= 23) || (mes === 11 && dia <= 21)) return 10
  if ((mes === 11 && dia >= 22) || (mes === 12 && dia <= 21)) return 11
  return 0
}

function obtenerGeneracion(anio) {
  if (anio <= 1945) return '📻 Silent Generation'
  if (anio >= 1946 && anio <= 1964) return '📺 Baby Boomer'
  if (anio >= 1965 && anio <= 1980) return '📼 Generación X'
  if (anio >= 1981 && anio <= 1996) return '💿 Millennial'
  if (anio >= 1997 && anio <= 2012) return '📱 Generación Z'
  return '🤖 Generación Alpha'
}

const TRIVIA = {
  1990: { p: ['Home Alone', 'Ghost', 'Edward Scissorhands'], c: ['Vogue', 'Nothing Compares 2 U'], f: ['Emma Watson', 'The Weeknd', 'Margot Robbie'] },
  1991: { p: ['Terminator 2', 'Beauty and the Beast', 'The Silence of the Lambs'], c: ['Smells Like Teen Spirit', 'Losing My Religion'], f: ['Ed Sheeran', 'Travis Scott', 'Dylan O\'Brien'] },
  1992: { p: ['Aladdin', 'Reservoir Dogs', 'Basic Instinct'], c: ['I Will Always Love You', 'Baby Got Back'], f: ['Selena Gomez', 'Miley Cyrus', 'Taylor Lautner'] },
  1993: { p: ['Jurassic Park', 'Schindler\'s List', 'The Nightmare Before Christmas'], c: ['I Will Always Love You', 'What Is Love'], f: ['Ariana Grande', 'Zayn Malik', 'Rosalía'] },
  1994: { p: ['The Lion King', 'Pulp Fiction', 'Forrest Gump'], c: ['All I Want for Christmas Is You', 'Creep'], f: ['Justin Bieber', 'Harry Styles', 'Bad Bunny'] },
  1995: { p: ['Toy Story', 'Se7en', 'Jumanji'], c: ['Gangsta\'s Paradise', 'Wonderwall'], f: ['Timothée Chalamet', 'Dua Lipa', 'Kendall Jenner'] },
  1996: { p: ['Matilda', 'Scream', 'Mission: Impossible'], c: ['Wannabe', 'Macarena'], f: ['Tom Holland', 'Zendaya', 'Lil Peep'] },
  1997: { p: ['Titanic', 'Men in Black', 'Hercules'], c: ['Barbie Girl', 'My Heart Will Go On'], f: ['Jungkook (BTS)', 'Kylie Jenner', 'Tini Stoessel'] },
  1998: { p: ['Mulan', 'The Truman Show', 'A Bug\'s Life'], c: ['Baby One More Time', 'I Don\'t Want to Miss a Thing'], f: ['Shawn Mendes', 'MrBeast', 'Jaden Smith'] },
  1999: { p: ['The Matrix', 'Fight Club', 'The Sixth Sense'], c: ['I Want It That Way', 'Californication'], f: ['Sabrina Carpenter', 'Peso Pluma', 'Cameron Boyce'] },
  2000: { p: ['Gladiator', 'X-Men', 'Cast Away'], c: ['Bye Bye Bye', 'Oops!... I Did It Again'], f: ['Halle Bailey', 'Lil Pump', 'María Becerra'] },
  2001: { p: ['Harry Potter', 'Shrek', 'Monsters, Inc.'], c: ['Chop Suey!', 'How You Remind Me'], f: ['Billie Eilish', 'Emma Chamberlain', 'Caleb McLaughlin'] },
  2002: { p: ['Spider-Man', 'Ice Age', 'Catch Me If You Can'], c: ['Complicated', 'The Scientist'], f: ['Jenna Ortega', 'Finn Wolfhard', 'Sadie Sink'] },
  2003: { p: ['Finding Nemo', 'Kill Bill', 'Pirates of the Caribbean'], c: ['Seven Nation Army', 'Crazy in Love'], f: ['Olivia Rodrigo', 'The Kid LAROI', 'Tate McRae'] },
  2004: { p: ['Mean Girls', 'The Incredibles', 'Shrek 2'], c: ['Toxic', 'Yeah!', 'Mr. Brightside'], f: ['Millie Bobby Brown', 'Noah Schnapp', 'Charli D\'Amelio'] },
  2005: { p: ['Madagascar', 'Batman Begins', 'War of the Worlds'], c: ['Feel Good Inc.', 'Fix You'], f: ['Xochitl Gomez', 'IShowSpeed'] },
  2006: { p: ['Cars', 'The Devil Wears Prada', 'Casino Royale'], c: ['Hips Don\'t Lie', 'Crazy'], f: ['Mckenna Grace', 'Jaden Walton'] },
  2007: { p: ['Ratatouille', 'Superbad', 'Transformers'], c: ['Umbrella', 'Stronger'], f: ['Ariana Greenblatt', 'Cailey Fleming'] },
  2008: { p: ['Iron Man', 'Wall-E', 'Twilight'], c: ['Viva La Vida', 'I\'m Yours', 'Single Ladies'], f: ['Iain Armitage', 'Jackson Robert Scott'] },
  2009: { p: ['Avatar', 'Up', 'Coraline'], c: ['Bad Romance', 'Poker Face', 'I Gotta Feeling'], f: ['Walker Scobell', 'Julia Butters'] },
  2010: { p: ['Despicable Me', 'Toy Story 3', 'Tangled'], c: ['Rolling in the Deep', 'Baby', 'Tik Tok'], f: ['Lexi Rabe', 'Brooklynn Prince'] },
  2011: { p: ['Rio', 'Thor', 'Harry Potter 8'], c: ['Someone Like You', 'Party Rock Anthem'], f: ['Mia Talerico', 'Jeremy Maguire'] },
  2012: { p: ['The Avengers', 'Brave', 'The Hunger Games'], c: ['Somebody That I Used to Know', 'Call Me Maybe'], f: ['Ariana Greenblatt', 'Alan Kim'] },
  2013: { p: ['Frozen', 'Iron Man 3', 'Despicable Me 2'], c: ['Royals', 'Get Lucky'], f: ['Prince George'] },
  2014: { p: ['Big Hero 6', 'Guardians of the Galaxy', 'Interstellar'], c: ['Happy', 'Uptown Funk'], f: ['Thylane Blondeau'] },
  2015: { p: ['Inside Out', 'Minions', 'Jurassic World'], c: ['See You Again', 'Uptown Funk'], f: ['Princess Charlotte'] }
}

const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)]

const handler = async (m, ctx) => {
  const { conn, args, usedPrefix, command } = ctx
  const sender = m.sender
  const username = m.pushName || sender.split('@')[0]

  if (!args[0]) return m.reply(`*⌬┤ ✙ ├⌬ USO.*\n> Ingresá tu fecha de nacimiento.\n> Ejemplo: *${usedPrefix}${command} 15/08/2004*`)

  const fechaRegex = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/
  const match = args[0].match(fechaRegex)
  if (!match) return m.reply(`*⌬┤ ❌ ├⌬ FECHA INVÁLIDA.*\n> Asegurate de usar el formato DD/MM/AAAA.\n> Ejemplo: *24/12/2001*`)

  const dia = parseInt(match[1])
  const mes = parseInt(match[2])
  const anio = parseInt(match[3])

  if (dia < 1 || dia > 31 || mes < 1 || mes > 12) return m.reply(`*⌬┤ ❌ ├⌬ FECHA INVÁLIDA.*\n> Asegurate de usar el formato DD/MM/AAAA.\n> Ejemplo: *24/12/2001*`)

  const fechaNacimiento = new Date(anio, mes - 1, dia)
  const hoy = new Date()

  if (fechaNacimiento > hoy) return m.reply(`*⌬┤ 🤨 ├⌬ VIAJERO DEL TIEMPO.*\n> Esa fecha está en el futuro. Ingresá tu fecha real.`)
  if (anio < 1900) return m.reply(`*⌬┤ 🦖 ├⌬ MODO FÓSIL.*\n> Nadie vive tantos años. Ingresá un año válido.`)

  let edad = hoy.getFullYear() - fechaNacimiento.getFullYear()
  const mesDiff = hoy.getMonth() - fechaNacimiento.getMonth()
  if (mesDiff < 0 || (mesDiff === 0 && hoy.getDate() < fechaNacimiento.getDate())) edad--

  const difT = hoy.getTime() - fechaNacimiento.getTime()
  const diasVividos = Math.floor(difT / (1000 * 3600 * 24))
  const horasVividas = Math.floor(difT / (1000 * 3600))

  const proxCumple = new Date(hoy.getFullYear(), mes - 1, dia)
  if (proxCumple < hoy) proxCumple.setFullYear(hoy.getFullYear() + 1)
  const diasFaltantes = Math.ceil((proxCumple.getTime() - hoy.getTime()) / (1000 * 3600 * 24))

  const signoZodiacal = SIGNOS[obtenerSigno(dia, mes)]
  const idxChino = (anio - 4) % 12 >= 0 ? (anio - 4) % 12 : 12 + ((anio - 4) % 12)
  const signoChino = ZODIACO_CHINO[idxChino]

  let peli, famoso, cancion
  if (TRIVIA[anio]) {
    peli = rnd(TRIVIA[anio].p)
    cancion = rnd(TRIVIA[anio].c)
    famoso = rnd(TRIVIA[anio].f)
  } else if (anio > 2015) {
    peli = 'Aún no se graba (Será en 4D 🕶️)'
    cancion = 'Aún no se compone (Será puro autotune 🤖)'
    famoso = 'Un nene que ahora mismo está llorando 👶'
  } else {
    peli = 'Desconocida (Eran en blanco y negro 🎞️)'
    cancion = 'Desconocida (La música se tocaba en vivo 🎻)'
    famoso = 'Alguien que ya debe tener bisnietos 👴'
  }

  const textoFinal = `*⌬┤ 🎂 ├⌬ TU LÍNEA DE TIEMPO*\n> 👤 Usuario: @${username}\n> 📅 Fecha: *${dia.toString().padStart(2, '0')}/${mes.toString().padStart(2, '0')}/${anio}*\n\n*Estadísticas Vitales:*\n> ⏳ Edad: *${edad} años*\n> 🗓️ Días vividos: *${diasVividos.toLocaleString('es-ES')}*\n> ⏱️ Horas vividas: *${horasVividas.toLocaleString('es-ES')}*\n> 🎉 Próximo cumple: *en ${diasFaltantes} días*\n\n*Identidad:*\n> 🌌 Signo: *${signoZodiacal}*\n> 🐉 Horóscopo Chino: *${signoChino}*\n> 🧬 Generación: *${obtenerGeneracion(anio)}*\n\n*Trivia Random de ${anio}:*\n> 🎬 Peli hit: *${peli}*\n> 🎵 Canción top: *${cancion}*\n> 🌟 Nació: *${famoso}*`

  await conn.sendMessage(m.chat, { text: textoFinal, mentions: [sender] }, { quoted: m })
}

handler.help = ['edad <DD/MM/AAAA>']
handler.tags = ['fun']
handler.command = ['edad', 'age', 'idade', 'nacimiento', 'cumpleaños']

export default handler