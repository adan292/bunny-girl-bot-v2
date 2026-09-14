import User from '../../lib/database/models/zen-users.js'
import config from '../../config.js'

const items = {
  trash: [
    { n: "👞 Bota vieja", h: "Estaba llena de lodo y pequeños cangrejos ermitaños." },
    { n: "🥫 Lata oxidada", h: "Un desecho contaminante de un viejo barco carguero." },
    { n: "🧴 Botella vacía", h: "Esperabas un mensaje, pero solo había agua salada." },
    { n: "📦 Cartón mojado", h: "Se deshizo apenas intentaste subirlo a tu bote." },
    { n: "🧤 Guante de goma", h: "Parece que a un pescador se le resbaló hace meses aquí." },
    { n: "🗞️ Diario de 1990", h: "Las noticias ya no se entienden por el efecto del agua." },
    { n: "🚲 Rueda pinchada", h: "Alguien decidió que el río era un taller mecánico sucio." },
    { n: "🐚 Concha vacía", h: "Es bonita, pero no tiene nada de valor real dentro." },
    { n: "🌿 Alga pegajosa", h: "Se enredó en tu línea y casi rompe tu caña de pescar." },
    { n: "🪵 Rama podrida", h: "La corriente del río la trajo desde muy lejos al sur." },
    { n: "Cap Gorra sucia", h: "Tiene el logo de un equipo que ya no existe hoy." },
    { n: "🧼 Jabón gastado", h: "Al menos el anzuelo quedó un poco limpio tras sacarlo." },
    { n: "🍽️ Plato roto", h: "Restos de una cena romántica que terminó muy mal." },
    { n: "🔋 Pila sulfatada", h: "¡Cuidado! Esto contamina mucho el ecosistema del agua." },
    { n: "🧸 Peluche sin ojo", h: "Da un poco de miedo verlo bajo la luz de la luna llena." },
    { n: "🩴 Chancla sola", h: "La eterna compañera de los ríos más sucios del país." },
    { n: "🚬 Paquete cigarrillos", h: "Totalmente empapado e inservible para cualquier uso." },
    { n: "🥡 Envase plástico", h: "Basura moderna que asfixia a los pobres peces de aquí." },
    { n: "📎 Clip gigante", h: "Quién sabe cómo terminó este objeto en el fondo marino." },
    { n: "🔑 Llave doblada", h: "La puerta que abría ya debe haber desaparecido hace siglos." },
    { n: "🔩 Tornillo enorme", h: "Probablemente pertenecía a un muelle antiguo ya caído." },
    { n: "🎧 Auricular roto", h: "Solo se puede escuchar el silencio del vasto océano." },
    { n: "🕯️ Vela derretida", h: "Daba luz en las noches de tormenta en alta mar." },
    { n: "🩹 Curita usada", h: "Qué asco, alguien se lastimó y la tiró al agua sin más." },
    { n: "🎾 Pelota de tenis", h: "Un perro debió perderla jugando en la orilla del río." },
    { n: "🦴 Hueso de pollo", h: "Alguien almorzó en un bote y tiró las sobras al pez." },
    { n: "🥤 Sorbete", h: "El enemigo número uno de las tortugas marinas del mundo." },
    { n: "🥨 Bolsa de snacks", h: "Solo contiene aire y un poco de agua salada ahora." },
    { n: "🦷 Diente plástico", h: "Pertenecía a algún juguete de niño perdido en la playa." },
    { n: "🪒 Maquinita vieja", h: "Tan oxidada que no cortaría ni un solo pelo hoy." },
    { n: "🎈 Globo desinflado", h: "Restos de una fiesta que terminó en el fondo del mar." },
    { n: "🧦 Calcetín solo", h: "Nunca encontrarás el par en el fondo oscuro del río." },
    { n: "🍬 Papel caramelo", h: "Brilla con el sol, pero es solo basura inútil." },
    { n: "🧱 Ladrillo roto", h: "De alguna construcción cercana a la costa que colapsó." },
    { n: "🔌 Cable pelado", h: "Un peligro eléctrico sumergido para los buceadores." },
    { n: "💡 Foco quemado", h: "Ya no iluminará más el fondo oscuro del océano azul." },
    { n: "🖋️ Lapicera", h: "No sirve para escribir tu bitácora de pesca en el bot." },
    { n: "🧩 Pieza de puzzle", h: "Falta justamente esta para completar el paisaje final." },
    { n: "🍄 Hongo extraño", h: "Creció sobre un tronco sumergido durante años hoy." },
    { n: "🎟️ Ticket de cine", h: "La película debió ser muy aburrida para tirarlo aquí." },
    { n: "💊 Blister vacío", h: "Alguien necesitaba medicina con mucha urgencia hoy." },
    { n: "🧵 Carrete de hilo", h: "Enredado con tu propia línea de pesca al sacarlo." },
    { n: "📉 Gráfico impreso", h: "Parece que a un economista le fue muy mal este año." },
    { n: "🏺 Trozo cerámica", h: "No es arqueología, parece de un jarrón barato roto." },
    { n: "🧺 Mimbre viejo", h: "De una canasta de picnic abandonada en la arena." },
    { n: "👟 Suela zapato", h: "Caminó mucho antes de terminar en este lugar húmedo." },
    { n: "🔗 Eslabón cadena", h: "Muy pesado para lo poco que vale realmente esto." },
    { n: "📦 Cinta embalar", h: "Pegajosa y muy molesta de quitar del anzuelo hoy." },
    { n: "📍 Alfiler oxidado", h: "Casi te pinchas al intentar sacarlo de la red." },
    { n: "🧧 Sobre vacío", h: "No contenía dinero de suerte, solo agua sucia." }
  ],
  common: [
    { n: "🐟 Sardina", h: "Un pez pequeño pero muy nutritivo para el bot." },
    { n: "🐟 Trucha", h: "Peleó bastante antes de salir finalmente a la luz." },
    { n: "🐟 Merluza", h: "Ideal para un buen filete frito en el almuerzo." },
    { n: "🐟 Carpa", h: "Un pez robusto que habita en aguas muy calmas." },
    { n: "🐟 Arenque", h: "Se mueve en grandes cardúmenes por el mar azul." },
    { n: "🐟 Caballa", h: "Sus escamas brillan con un tono azulado muy lindo." },
    { n: "🐟 Tilapia", h: "Muy común en las granjas acuícolas de la zona." },
    { n: "🐟 Pejerrey", h: "Un clásico indiscutible de la pesca deportiva hoy." },
    { n: "🐟 Lisa", h: "Saltó varias veces antes de ser capturada por ti." },
    { n: "🐟 Bagre", h: "Cuidado con sus bigotes y sus espinas afiladas." },
    { n: "🐟 Corvina", h: "Un pez de mar muy valorado en la cocina." },
    { n: "🦀 Cangrejo", h: "Intentó pellizcar tu dedo al salir del agua hoy." },
    { n: "🦐 Camarón", h: "Pequeño pero delicioso, ideal para un buen ceviche." },
    { n: "🦑 Calamar", h: "Lanzó un gran chorro de tinta antes de rendirse." },
    { n: "🐙 Pulpo pequeño", h: "Se aferró al anzuelo con todas sus ventosas fuertes." },
    { n: "🐟 Salmón", h: "Nadaba contracorriente hasta que lo atrapaste tú." },
    { n: "🐟 Mojarra", h: "El pez más común de todas las lagunas locales." },
    { n: "🐟 Dorado", h: "El tigre de los ríos, su color es simplemente magnífico." },
    { n: "🐟 Surubí", h: "Un gigante de agua dulce con manchas únicas." },
    { n: "🐟 Robalo", h: "Le gusta esconderse entre las rocas costeras siempre." },
    { n: "🐟 Lenguado", h: "Tan plano que se camufla perfecto con la arena." },
    { n: "🐟 Anchoa", h: "Pequeña y salada, perfecta para una pizza casera." },
    { n: "🐟 Bacalao", h: "Un pez de aguas frías muy resistant al clima." },
    { n: "🐟 Atún pequeño", h: "Muy veloz, casi corta tu línea de pesca hoy." },
    { n: "🐟 Besugo", h: "Sus ojos grandes te miran con mucha sorpresa hoy." },
    { n: "🐟 Bonito", h: "Un pariente del atún con carne muy sabrosa y roja." },
    { n: "🐟 Mero", h: "Vive en cuevas profundas bajo el arrecife de coral." },
    { n: "🐟 Pargo", h: "Un pez rojo muy común en las aguas del Caribe." },
    { n: "🐟 Congrio", h: "Parece una serpiente, pero es un pez de roca." },
    { n: "🐟 Raya pequeña", h: "Se desliza por el fondo como un fantasma gris." },
    { n: "🐟 Pez Espada", h: "Su pico aún no es tan peligroso por ser joven." },
    { n: "🐟 Carite", h: "Muy buscado por su velocidad extrema y buen sabor." },
    { n: "🐟 Jurel", h: "Un luchador incansable de las aguas de mar abierto." },
    { n: "🐟 Sierra", h: "Sus dientes son pequeños pero muy afilados hoy." },
    { n: "🐟 Bagre canal", h: "Habita en las zonas más profundas del río ancho." },
    { n: "🐟 Carpa espejo", h: "Sus escamas parecen monedas de oro brillantes." },
    { n: "🐟 Trucha arcoíris", h: "Luce todos los colores del espectro solar hoy." },
    { n: "🐟 Perca", h: "Un pez muy voraz que come de todo en el río." },
    { n: "🐟 Lucioperca", h: "Mitad lucio, mitad perca, todo un reto pescarlo." },
    { n: "🐟 Barbo", h: "Le gusta hurgar en el fondo de los ríos lentos." },
    { n: "🐟 Brema", h: "Un pez de cuerpo alto y muy comprimido hoy." },
    { n: "🐟 Tenca", h: "Muy resistente a la falta de oxígeno en el agua." },
    { n: "🐟 Alburno", h: "Pequeño y plateado, brilla bajo el sol fuerte." },
    { n: "🐟 Gobio", h: "Un pez diminuto que vive entre los guijarros." },
    { n: "🐟 Cacho", h: "Muy común en los ríos de agua fría de Europa." },
    { n: "🐟 Madrilla", h: "Se mueve rápido en las corrientes muy fuertes." },
    { n: "🐟 Bermejuela", h: "Sus aletas tienen un tono rojizo muy llamativo." },
    { n: "🐟 Jarabugo", h: "Un pez raro de ver, pero común en esta zona." },
    { n: "🐟 Pardilla", h: "De color oscuro, se esconde muy bien del bot." },
    { n: "🐟 Calandino", h: "Pequeño habitante de las charcas y arroyos." }
  ],
  rare: [
    { n: "🐠 Pez Payaso", h: "Nemo decidió morder el anzuelo equivocado hoy." },
    { n: "🐠 Pez Cirujano", h: "Dory se perdió y terminó en tu red de pesca." },
    { n: "🐠 Pez Ángel", h: "Su elegancia destaca sobre todos los demás peces." },
    { n: "🐡 Pez Globo", h: "Se infló tanto que casi no cabe en el balde hoy." },
    { n: "🦈 Tiburón Bebé", h: "Doo doo doo... una captura muy peligrosa hoy." },
    { n: "🦈 Pez Martillo", h: "Su cabeza tiene una forma realmente extraña hoy." },
    { n: "🦞 Langosta Real", h: "Un manjar que solo los ricos pueden pagar siempre." },
    { n: "🐟 Salmón Plata", h: "Brilla como un espejo bajo la luz solar del día." },
    { n: "🐟 Atún Aleta Azul", h: "Un coloso del mar, muy difícil de pescar realmente." },
    { n: "🐍 Anguila", h: "Te dio un calambre que te dejó los pelos de punta." },
    { n: "🐠 Pez Mariposa", h: "Sus colores parecen pintados a mano por un artista." },
    { n: "🐠 Pez Loro", h: "Se alimenta de coral y tiene colores muy vibrantes." },
    { n: "🐠 Pez Mandarín", h: "Dicen que es el pez más bello de todo el mundo." },
    { n: "🦀 Cangrejo Gigante", h: "Sus pinzas podrían romper un remo de madera hoy." },
    { n: "🦑 Calamar Cristal", h: "Es casi transparente, se ve a través de su cuerpo." },
    { n: "🐙 Pulpo Anillos", h: "Hermoso pero letal, suerte que no lo tocaste hoy." },
    { n: "🦈 Tiburón Tigre", h: "Tiene rayas en el lomo y un apetito voraz hoy." },
    { n: "🦈 Tiburón Mako", h: "El pez más rápido del océano cayó en tu trampa hoy." },
    { n: "🐟 Esturión", h: "Un pez prehistórico que produce el mejor caviar." },
    { n: "🐟 Gran Pez Sol", h: "Es enorme, redondo y muy, muy pesado de subir." },
    { n: "🐠 Pez Disco", h: "El rey del acuario, pero en estado salvaje aquí." },
    { n: "🐠 Pez León", h: "Sus espinas son venenosas, tuviste suerte hoy." },
    { n: "🐟 Pez Vela", h: "Su aleta dorsal parece una vela de un gran barco." },
    { n: "🐟 Marlin Negro", h: "Saltó fuera del agua como un misil teledirigido." },
    { n: "🐟 Siluro Gigante", h: "Un monstruo de río que puede comerse un pato hoy." },
    { n: "🐟 Pez Tigre", h: "Sus dientes parecen cuchillos de un carnicero real." },
    { n: "🐟 Arapaima", h: "El pez más grande del Amazonas está en tus manos." },
    { n: "🐟 Pez Gato", h: "Pesa más que tú, fue una batalla épica ganada." },
    { n: "🐟 Salmón Real", h: "La joya indiscutible de los ríos de Alaska hoy." },
    { n: "🐟 Trucha de Oro", h: "Un pez que brilla como el metal precioso bajo sol." },
    { n: "🐠 Pez Betta", h: "Mucho más agresivo que los que venden en tiendas." },
    { n: "🐡 Pez Cofre", h: "Su cuerpo es una caja rígida y cuadrada muy rara." },
    { n: "🐍 Morena", h: "Salió de una grieta y mordió el anzuelo de golpe." },
    { n: "🐚 Caracol Fuego", h: "Su concha parece lava incandescente submarina hoy." },
    { n: "💎 Perla Blanca", h: "La encontraste dentro de una ostra muy vieja hoy." },
    { n: "🔱 Tridente Hierro", h: "Un arma antigua perdida en un naufragio pirata." },
    { n: "🏺 Ánfora Romana", h: "Contenía vino que se volvió vinagre hace siglos." },
    { n: "⚓ Ancla Bronce", h: "De un barco que nunca llegó a puerto por tormenta." },
    { n: "📦 Cofre Pequeño", h: "Contiene monedas de plata oxidadas y lodo hoy." },
    { n: "🗺️ Mapa Mojado", h: "Indica una X que ya fue borrada por el mar azul." },
    { n: "🐠 Pez Halcón", h: "Acecha a sus presas desde los corales del fondo." },
    { n: "🐠 Ballesta", h: "Sus patrones parecen una obra de arte abstracto." },
    { n: "🐡 Pez Erizo", h: "Lleno de púas afiladas y muy venenosas al tacto." },
    { n: "🦀 Centollo Real", h: "Vive en las profundidades más gélidas del océano." },
    { n: "🦑 Sepia Gigante", h: "Cambia de color constantemente frente a tus ojos." },
    { n: "🐙 Pulpo Mimético", h: "Se hizo pasar por una piedra, pero lo viste hoy." },
    { n: "🦈 Tiburón Zorro", h: "Su cola es tan larga como su propio cuerpo hoy." },
    { n: "🐟 Pez Napoleón", h: "Tiene una protuberancia enorme en la frente hoy." },
    { n: "🐠 Pez Gatillo", h: "Puede bloquear sus aletas para no ser comido hoy." },
    { n: "🐚 Ostra Perla", h: "Dentro brilla la promesa de una joya muy cara." }
  ],
  special: [
    { n: "🐳 Ballena Azul", h: "El animal más grande del planeta te bendijo hoy." },
    { n: "🦈 Tiburón Blanco", h: "El gran depredador del océano ha sido vencido hoy." },
    { n: "🦑 Kraken", h: "Sobreviviste al ataque del monstruo de las leyendas." },
    { n: "🔱 Tridente Poseidón", h: "Ahora tienes el poder de controlar las mareas hoy." },
    { n: "💎 Perla Negra", h: "Una joya tan rara que solo existe una en mil años." },
    { n: "👑 Corona Atlante", h: "Has sido nombrado rey de los siete mares del bot." },
    { n: "🐳 Ballena Jorobada", h: "Su canto se escuchó por todo el servidor hoy." },
    { n: "🐋 Orca asesina", h: "La inteligencia de este animal es muy aterradora." },
    { n: "🦈 Megalodón", h: "Se creía extinto, pero lo pescaste tú finalmente." },
    { n: "🦑 Calamar Colosal", h: "Sus ojos son del tamaño de platos de comida hoy." },
    { n: "🧞 Genio Lámpara", h: "Te concedería deseos, pero prefiere darte dinero." },
    { n: "🚢 Tesoro Español", h: "Doblones de oro de un galeón hundido hace siglos." },
    { n: "💎 Diamante Marino", h: "Brilla con una luz azul sobrenatural bajo el agua." },
    { n: "🐋 Cachalote Blanco", h: "Moby Dick finalmente ha sido encontrada por ti." },
    { n: "🐢 Tortuga Ancestral", h: "Tiene más de 500 años y conoce secretos ocultos." },
    { n: "🐉 Dragón Marino", h: "Una criatura mítica que escupe agua hirviendo hoy." },
    { n: "🧜‍♀️ Arpa Sirena", h: "Toca una música que hechiza a quien la escucha hoy." },
    { n: "👑 Corona Coral", h: "El símbolo de mando de la nobleza marina real." },
    { n: "🛡️ Escudo Escamas", h: "Impenetrable para cualquier arma común del bot." },
    { n: "🗡️ Daga Atlantis", h: "Hecha de un metal que no existe en la tierra hoy." },
    { n: "🌀 Remolino", h: "Un desastre natural contenido en un frasco raro." },
    { n: "💠 Cristal Océano", h: "Dicen que contiene la memoria de todo el mar." },
    { n: "🌟 Estrella Cósmica", h: "Cayó del cielo directamente a tu red de pesca." },
    { n: "🦀 Cangrejo Diamante", h: `Su caparazón vale una fortuna absoluta en ${config.CURRENCY_NAME}.` },
    { n: "🐙 Hydra de Agua", h: "Cortas una cabeza y crecen dos más al instante." },
    { n: "🐋 Leviatán Bebé", h: "Un príncipe de las tinieblas marinas más puras." },
    { n: "🐟 Pez Oro Macizo", h: "No es carne, es oro puro con forma de pez hoy." },
    { n: "🐡 Pez Galáctico", h: "Contiene un universo entero dentro de su panza." },
    { n: "🦈 Tiburón Basalto", h: "Hecho de roca volcánica submarina muy pesada." },
    { n: "🐚 Concha Verdad", h: "Si la escuchas, te dirá el futuro incierto del bot." },
    { n: "🏺 Vaso de Hermes", h: "Permite viajar por el mar a velocidad luz hoy." },
    { n: "📦 Gran Cofre Pirata", h: "Lleno hasta el tope de joyas, rubíes y diamantes." },
    { n: "⚜️ Emblema Sagrado", h: "Una reliquia de una civilización perdida bajo mar." },
    { n: "🔱 Lanza Neptuno", h: "Puede crear terremotos con un solo golpe fuerte." },
    { n: "🏮 Linterna Abismo", h: "Ilumina incluso la oscuridad más profunda hoy." },
    { n: "🌌 Fragmento Meteorito", h: "Vino del espacio y aterrizó en el agua del río." },
    { n: "🗿 Ídolo Sumergido", h: "Una estatua de oro de un dios antiguo y olvidado." },
    { n: "🧬 ADN Prehistórico", h: "Podrías clonar a un monstruo marino con esto hoy." },
    { n: "🕋 Cubo Destino", h: "Un objeto que desafía las leyes de la física hoy." },
    { n: "👑 Corona Perlas", h: "Perteneció a una reina de la antigüedad sumergida." },
    { n: "🦈 Guardián Abismo", h: "El protector de las fosas más profundas del mar." },
    { n: "🐋 Cetáceo Plateado", h: "Su piel es de mercurio líquido muy brillante hoy." },
    { n: "🦈 Tiburón Cristal", h: "Frágil pero increíblemente valioso para vender." },
    { n: "🐚 Caracol Infinito", h: "Su espiral nunca termina, es un objeto hipnótico." },
    { n: "💠 Corazón Océano", h: "El diamante más famoso de la historia mundial hoy." },
    { n: "🔱 Tridente Sagrado", h: "Forjado por los mismos dioses del Olimpo griego." },
    { n: "🔱 Cetro Mareas", h: "Controla la luna y su efecto en el mar profundo." },
    { n: "🐙 Kraken Rey", h: "El monarca absoluto de las pesadillas navales hoy." },
    { n: "🐳 Ballena Galáctica", h: "Sus manchas parecen constelaciones reales de noche." },
    { n: "🌊 Esencia Poseidón", h: "Un frasco con el poder puro del dios del mar." }
  ]
}

const handler = async (m, { userDb }) => {
  if (!userDb) return
  const cooldown = 600000 
  const now = Date.now()
  const remaining = cooldown - (now - (userDb.lastFish || 0))

  if (remaining > 0) {
    return m.reply(`*⌬┤ ⏳ ├⌬ REDES MOJADAS.*\n\n> Tus redes están secándose.\n> Esperá: *${Math.floor(remaining / 60000)}m ${Math.floor((remaining % 60000) / 1000)}s*.`)
  }

  const bait = userDb.inventory.bait
  const dur = userDb.inventory.baitDurability
  let pSpecial = 0.03, pRare = 0.15, pCommon = 0.57, pTrash = 0.25

  if (bait === 'normal' && dur > 0) { pTrash = 0.02; pCommon = 0.83 }
  else if (bait === 'rare' && dur > 0) { pRare = 0.33; pTrash = 0.15 }
  else if (bait === 'mythic' && dur > 0) { pSpecial = 0.10; pRare = 0.35; pTrash = 0.02 }

  const ch = Math.random()
  let r = ch < pSpecial ? 'special' : ch < pSpecial + pRare ? 'rare' : ch < pSpecial + pRare + pCommon ? 'common' : 'trash'
  const update = { $inc: {}, $set: { lastFish: now } }

  if (bait !== 'none' && dur > 0) {
    userDb.inventory.baitDurability -= 1
    update.$inc['inventory.baitDurability'] = -1
    if (userDb.inventory.baitDurability <= 0) {
      userDb.inventory.bait = 'none'
      update.$set['inventory.bait'] = 'none'
    }
  }

  const pool = items[r]
  const item = pool[Math.floor(Math.random() * pool.length)]
  let v = (r === 'special' ? 2800 : r === 'rare' ? 750 : r === 'common' ? 220 : 15) + (userDb.level * 20)
  let k = r === 'special' ? (Math.floor(Math.random() * 3) + 2) : 0

  userDb.zenCoins += v; userDb.kogen += k; userDb.lastFish = now
  userDb.aquarium = userDb.aquarium || {}
  userDb.aquarium[item.n] = (userDb.aquarium[item.n] || 0) + 1

  update.$inc.zenCoins = v
  if (k > 0) update.$inc.kogen = k
  update.$inc[`aquarium.${item.n}`] = 1

  await User.updateOne({ jid: m.sender }, update)

  const labels = { trash: 'BASURA 🗑️', common: 'COMÚN 🐟', rare: 'RARO ✨', special: 'ÉPICO 🌌' }
  let txt = `*⌬┤ 🎣 ├⌬ PESCA FINALIZADA*\n\n`
      + `> 🏆 *Rareza:* ${labels[r]}\n`
      + `> 💎 *Objeto:* ${item.n}\n`
      + `> 💰 *Valor:* ${v} ${config.CURRENCY_NAME}\n`
  if (k) txt += `> ✨ *Extra:* +${k} ${config.PREMIUM_NAME}${k > 1 ? 's' : ''}\n`
  txt += `> 📉 *Carnada:* ${userDb.inventory.baitDurability || 0} usos.\n\n`
  txt += `> 📖 *Dato:* ${item.h}\n\n`

  if (r === 'rare' || r === 'special') {
    txt += `> 💡 _¡Guardá este ejemplar! Podés venderlo por una fortuna en *!contratos* si el mercado está abierto._`
  }

  m.reply(txt)
}

handler.help = ['pescar']
handler.tags = ['eco']
handler.command = ['fish', 'pescar']
handler.register = true
export default handler