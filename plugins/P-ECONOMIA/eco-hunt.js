import User from '../../lib/database/models/zen-users.js'
import config from '../../config.js'

const items = {
  trash: [
    { n: "🪵 Rama seca", h: "Escuchaste un crujido y disparaste a la madera por error." },
    { n: "🪨 Piedra común", h: "Te tropezaste con ella y casi te rompes un pie rastreando." },
    { n: "🦴 Hueso viejo", h: "Los lobos llegaron antes que tú a este festín." },
    { n: "🧤 Sombrero roto", h: "A otro cazador no le fue tan bien en este bosque." },
    { n: "🕸️ Telaraña", h: "Terminaste con la cara llena de seda pegajosa y sin presa." },
    { n: "🍃 Hojas muertas", h: "El viento te engañó haciéndote creer que algo se movía." },
    { n: "🍄 Hongo podrido", h: "Huele tan mal que espantó a todas las presas cercanas." },
    { n: "🧵 Cuerda cortada", h: "Una trampa vieja que ya no sirve para nada." },
    { n: "🎒 Mochila rota", h: "Solo contenía moho y hormigas hambrientas." },
    { n: "🧂 Sal derramada", h: "Mala suerte para tu jornada de caza hoy." },
    { n: "👟 Zapato viejo", h: "Es de la talla equivocada y huele a pantano podrido." },
    { n: "🐚 Caracol de tierra", h: "Demasiado lento para ser una presa digna de ti." },
    { n: "🪵 Tronco pequeño", h: "Tus flechas quedaron clavadas en él por un mal cálculo." },
    { n: "🦗 Grillo muerto", h: "Ni siquiera sirve para hacer una sopa de supervivencia." },
    { n: "🧶 Ovillo de lana", h: "Debe habérsele caído a alguna abuela exploradora." },
    { n: "🧩 Pieza de puzzle", h: "Es la esquina de un rompecabezas de 5000 piezas." },
    { n: "🦴 Cráneo de rata", h: "Un trofeo bastante patético para un cazador." },
    { n: "🧦 Calcetín", h: "El bosque se tragó al dueño y solo dejó esta prenda." },
    { n: "🧥 Retazo de tela", h: "Parece parte de una capa de superhéroe fallido." },
    { n: "📦 Caja vacía", h: "Un paquete abandonado hasta en los bosques más profundos." },
    { n: "🔨 Martillo roto", h: "Se le salió la cabeza al intentar clavar una estaca." },
    { n: "🧹 Escoba vieja", h: "De alguna bruja que olvidó dónde estacionó." },
    { n: "🧺 Canasta rota", h: "Caperucita tuvo un encuentro feo por estos rumbos." },
    { n: "🕯️ Vela usada", h: "Alguien estuvo haciendo rituales prohibidos anoche." },
    { n: "📉 Papel arrugado", h: "Es una multa por cazar sin la licencia correspondiente." },
    { n: "🪁 Barrilete roto", h: "Se enredó en la copa de un pino muy alto." },
    { n: "🪒 Navaja oxidada", h: "No sirve ni para pelar una naranja de monte." },
    { n: "🔩 Perno", h: "De alguna maquinaria pesada que pasó por aquí." },
    { n: "⛓️ Cadena rota", h: "Alguna bestia peligrosa logró liberarse hace poco." },
    { n: "🧱 Ladrillo rojo", h: "Los tres cerditos no terminaron su casa aquí." },
    { n: "🛶 Remo roto", h: "Útil si estuvieras en un río, pero estás en un monte." },
    { n: "🏹 Flecha quebrada", h: "Tu puntería hoy es realmente lamentable." },
    { n: "🎪 Tela de carpa", h: "Un campamento que terminó en un desastre natural." },
    { n: "🪵 Corcho", h: "Alguien celebró algo y dejó el rastro." },
    { n: "🏺 Tiesto de barro", h: "Fragmentos de una vasija sin importancia." },
    { n: "🧪 Frasco vacío", h: "Tenía una poción de invisibilidad, pero se agotó." },
    { n: "🧬 Pluma sucia", h: "De un pájaro que ni siquiera vale la pena nombrar." },
    { n: "🥚 Cáscara de huevo", h: "Llegaste tarde al nacimiento de algo pequeño." },
    { n: "🧤 Bufanda vieja", h: "El frío del invierno se la quitó a alguien." },
    { n: "🧵 Hilo cortado", h: "El hilo de Ariadna no funcionó en este laberinto." },
    { n: "🍄 Seta venenosa", h: "Si la hubieras comido, no estarías contando esto." },
    { n: "🦴 Diente de lobo", h: "Lo encontraste en el suelo, el dueño lo perdió." },
    { n: "🍃 Hierba seca", h: "Solo sirve para intentar encender una fogata." },
    { n: "🪵 Corteza", h: "Se desprendió de un roble centenario." },
    { n: "🪨 Guijarro", h: "Una piedra pequeña que se metió en tu bota." },
    { n: "🧤 Pañuelo sucio", h: "Lleno de mocos y tierra de pantano." },
    { n: "🏺 Fragmento de vasija", h: "No es arqueología, es basura de ayer." },
    { n: "🧺 Mimbre roto", h: "De una cesta que ya no puede cargar nada." },
    { n: "👟 Suela gastada", h: "Pertenece a un explorador que caminó mucho." },
    { n: "🖇️ Gancho oxidado", h: "Para colgar cosas que ya no existen." }
  ],
  common: [
    { n: "🐇 Conejo", h: "Fue rápido, pero tú fuiste mucho más certero." },
    { n: "🐇 Liebre", h: "Sus saltos no pudieron salvarla de tu mira." },
    { n: "🦆 Pato", h: "Estaba nadando tranquilo hasta que apareciste." },
    { n: "🦃 Pavo salvaje", h: "Será una cena excelente para todo el equipo." },
    { n: "🦌 Venado", h: "Un animal noble que cayó tras una larga persecución." },
    { n: "🐗 Jabalí", h: "Casi te embiste con sus colmillos, pero lo lograste." },
    { n: "🦊 Zorro", h: "Su astucia no fue suficiente contra tu experiencia." },
    { n: "🦝 Mapache", h: "Intentaba robar tu mochila cuando lo atrapaste." },
    { n: "🦔 Erizo", h: "Se hizo una bola de pinchos, pero no sirvió." },
    { n: "🐿️ Ardilla", h: "Estaba guardando nueces para el invierno." },
    { n: "🐀 Rata de monte", h: "Grande, fea y ahora parte de tu inventario." },
    { n: "🐦 Codorniz", h: "Salió volando de golpe y la bajaste con un tiro." },
    { n: "🐍 Serpiente", h: "Un reptil común que se arrastraba por la maleza." },
    { n: "🦨 Zorrillo", h: "¡Cuidado! Casi te rocía con su olor nauseabundo." },
    { n: "🐃 Búfalo joven", h: "Un animal fuerte que te dio una buena batalla." },
    { n: "🐗 Puercoespín", h: "Te bastó usar guantes para poder cargarlo." },
    { n: "🦡 Tejón", h: "Un animal pequeño pero muy agresivo." },
    { n: "🦦 Nutria", h: "Estaba jugando en el arroyo cuando la viste." },
    { n: "🐒 Mono pequeño", h: "Bajó del árbol por curiosidad y perdió." },
    { n: "🦌 Gacela", h: "La presa más rápida de la llanura ahora es tuya." },
    { n: "🐐 Cabra montés", h: "Escalaste media montaña para poder cazarla." },
    { n: "🐏 Carnero", h: "Sus cuernos son impresionantes y muy duros." },
    { n: "🐎 Caballo salvaje", h: "Un ejemplar libre que ahora será vendido." },
    { n: "🐄 Vaca perdida", h: "Parece que se escapó de una granja cercana." },
    { n: "🐕 Perro callejero", h: "Lamentable, pero en la supervivencia todo vale." },
    { n: "🐈 Gato montés", h: "Un felino pequeño pero muy feroz." },
    { n: "🦅 Halcón joven", h: "Acechaba desde el aire, pero bajó demasiado." },
    { n: "🦉 Búho nocturno", h: "Sus ojos grandes no vieron venir tu ataque." },
    { n: "🦜 Loro colorido", h: "Sus gritos alertaron a todo el bosque." },
    { n: "🦢 Cisne", h: "Un animal elegante capturado en un descuido." },
    { n: "🦩 Flamenco", h: "Sus patas largas no le permitieron correr." },
    { n: "🐗 Cerdo salvaje", h: "Mucho más sucio y agresivo que uno de granja." },
    { n: "🐕 Coyote", h: "Aullaba a la luna hasta que lo interrumpiste." },
    { n: "🐺 Lobo joven", h: "Se separó de la manada y fue su error fatal." },
    { n: "🐦 Perdiz", h: "Se camufla bien, pero tu vista es de águila." },
    { n: "🐦 Paloma", h: "La presa más fácil de todo el bosque." },
    { n: "🐀 Topo", h: "Lo sacaste de su madriguera con un poco de humo." },
    { n: "🦥 Perezoso", h: "Fue la caza más lenta de toda tu vida." },
    { n: "🐨 Koala", h: "Estaba durmiendo en un eucalipto y ni se enteró." },
    { n: "🦘 Cangrejo", h: "Sus patadas son peligrosas, pero lo esquivaste." },
    { n: "🦦 Visón", h: "Su piel es muy suave y tiene un valor decente." },
    { n: "🦊 Zorro ártico", h: "Su pelaje blanco destaca en la nieve." },
    { n: "🐦 Faisán", h: "Un ave con plumas hermosas y carne deliciosa." },
    { n: "🦆 Ganso", h: "Te persiguió para picarte, pero tú tenías un arma." },
    { n: "🦔 Puercoespín real", h: "Mucho más grande que uno común." },
    { n: "🐿️ Marmota", h: "Salió a ver el sol y se encontró contigo." },
    { n: "🦝 Coatí", h: "Un animal curioso que andaba buscando comida." },
    { n: "🐒 Tití", h: "El mono más pequeño de la selva ahora es tu trofeo." },
    { n: "🦨 Hurón", h: "Rápido y escurridizo, casi se te escapa." },
    { n: "🦎 Lagartija", h: "Muy pequeña, pero cuenta como captura." }
  ],
  rare: [
    { n: "🐆 Leopardo", h: "Te acechaba desde una rama alta, fuiste más rápido." },
    { n: "🐅 Tigre", h: "El gran felino de rayas negras cayó ante tu valor." },
    { n: "🐻 Oso Pardo", h: "Una bestia enorme que rugió antes de caer." },
    { n: "🐺 Lobo Alfa", h: "Has derrotado al líder absoluto de la manada." },
    { n: "🐆 Pantera", h: "Un fantasma negro que no pudo esconderse de ti." },
    { n: "🐊 Cocodrilo", h: "Lo sacaste del pantano tras una lucha feroz." },
    { n: "🐍 Cobra Real", h: "Un error y su veneno te habría matado." },
    { n: "🦏 Rinoceronte", h: "Su cuerno vale una fortuna en el mercado negro." },
    { n: "🦅 Águila Real", h: "La reina de los cielos ha sido derribada." },
    { n: "🦁 León", h: "El rey de la selva ha encontrado a su nuevo amo." },
    { n: "🦒 Jirafa", h: "Un gigante de cuello largo que fue difícil de abatir." },
    { n: "🐘 Elefante", h: "Una presa colosal que requirió mucha munición." },
    { n: "🦓 Cebra", h: "Sus rayas ahora decorarán tu sala de trofeos." },
    { n: "🐆 Guepardo", h: "Atrapaste al animal terrestre más rápido del mundo." },
    { n: "🐻 Oso Polar", h: "Viajaste al ártico para conseguir este ejemplar." },
    { n: "🐅 Tigre Bengala", h: "Una variante rara y muy peligrosa de tigre." },
    { n: "🐆 Leopardo Nieves", h: "Vive en las cumbres más altas y frías." },
    { n: "🐊 Caimán Negro", h: "Más grande y agresivo que cualquier cocodrilo." },
    { n: "🐍 Pitón", h: "Intentó asfixiarte, pero fuiste más fuerte." },
    { n: "🦛 Hipopótamo", h: "El animal más peligroso no pudo contigo." },
    { n: "🦍 Gorila", h: "Un espalda plateada que defendió a su familia." },
    { n: "🦧 Orangután", h: "Muy inteligente, casi logra engañarte." },
    { n: "🐃 Búfalo africano", h: "Conocido como la 'peste negra', un trofeo de élite." },
    { n: "🦎 Dragón Komodo", h: "Su saliva es letal, suerte que no te tocó." },
    { n: "🐆 Jaguar", h: "El depredador máximo de las selvas americanas." },
    { n: "🐺 Lobo Ártico", h: "Su pelaje blanco es puro como la nieve." },
    { n: "🦅 Cóndor Andes", h: "Vuela tan alto que casi toca el espacio." },
    { n: "🦚 Pavo Real", h: "Sus plumas son una obra de arte de la naturaleza." },
    { n: "🦌 Ciervo Real", h: "Sus astas tienen más de 20 puntas." },
    { n: "🐂 Toro Bravo", h: "Una deidad de lidia que no se rindió fácilmente." },
    { n: "🐗 Gran Jabalí", h: "Un ejemplar de 300 kilos de puro músculo." },
    { n: "🦌 Alce Gigante", h: "Sus astas son tan anchas como una mesa." },
    { n: "🐅 Tigre Albino", h: "Una mutación genética extremadamente rara." },
    { n: "🐘 Mamut Pequeño", h: "Parece que algunos sobrevivieron en secreto." },
    { n: "🦏 Rinoceronte Negro", h: "Mucho más raro y valioso que el blanco." },
    { n: "🦁 León Blanco", h: "Una deidad para las tribus, ahora es tuya." },
    { n: "🐊 Aligátor", h: "Un monstruo que gobernaba las alcantarillas." },
    { n: "🦉 Gran Búho Real", h: "La rapaz nocturna más grande que existe." },
    { n: "🦅 Águila Imperial", h: "Símbolo de imperios antiguos, abatida por ti." },
    { n: "🦎 Iguana Gigante", h: "Parece un pequeño dinosaurio moderno." },
    { n: "🐃 Bisonte", h: "La bestia imponente de las praderas americanas." },
    { n: "🐻 Oso Negro", h: "Más pequeño que el pardo pero mucho más ágil." },
    { n: "🐺 Lobo de Crin", h: "Un cánido de patas largas y aspecto extraño." },
    { n: "🐆 Lince", h: "Tus orejas con pinceles lo delataron en la nieve." },
    { n: "🐍 Anaconda", h: "La serpiente más pesada del mundo está en tu saco." },
    { n: "🦏 Rinoceronte Blanco", h: "Un tanque biológico que lograste detener." },
    { n: "🦍 Espalda Plateada", h: "El macho dominante de todo el bosque." },
    { n: "🐘 Elefante Africano", h: "El rey de los terrestres ha caído ante ti." },
    { n: "🐅 Tigre Siberiano", h: "El felino más grande que existe actualmente." },
    { n: "🐆 Puma", h: "El león de montaña que acechaba en los cañones." }
  ],
  special: [
    { n: "🐲 Dragón", h: "Has matado a la bestia legendaria que escupe fuego." },
    { n: "🦄 Unicornio", h: "Una captura mágica que te hará sentir algo de culpa." },
    { n: "🔥 Fénix", h: "Murió y renació en tus manos, ahora tienes su esencia." },
    { n: "🦖 T-Rex", h: "Has viajado en el tiempo para cazar al rey dinosaurio." },
    { n: "🦁 León de Nemea", h: "Su piel es invulnerable a las flechas comunes." },
    { n: "🦌 Ciervo Dorado", h: "Brilla tanto que ilumina todo el inventario." },
    { n: "🐎 Pegaso", h: "Un caballo alado que solo los héroes pueden ver." },
    { n: "🔱 Quimera", h: "Tres cabezas, tres veces más difícil de cazar." },
    { n: "🦅 Grifo", h: "Mitad águila, mitad león, totalmente legendario." },
    { n: "🐺 Fenrir", h: "El lobo destinado a devorar el mundo ha sido capturado." },
    { n: "🐉 Hydra", h: "Le cortaste las 9 cabezas con una precisión asombrosa." },
    { n: "🐎 Centauro", h: "Un guerrero mitad hombre que cayó en combate." },
    { n: "🔥 Cerbero", h: "El perro que guarda el infierno ahora te obedece." },
    { n: "🦁 Esfinge", h: "Resolviste su acertijo y luego la cazaste." },
    { n: "🐲 Wyvern", h: "Un pariente del dragón, pero mucho más agresivo." },
    { n: "🦌 Kirin", h: "Un animal místico oriental rodeado de relámpagos." },
    { n: "🦁 Mantícora", h: "Cuidado con su cola de escorpión, es letal." },
    { n: "🐂 Minotauro", h: "Lo encontraste en el centro del laberinto del bot." },
    { n: "🐎 Bicornio", h: "Lo opuesto al unicornio, se alimenta de malas vibras." },
    { n: "🕊️ Ave Roc", h: "Es tan grande que puede cargar con un elefante." },
    { n: "🐍 Basilisco", h: "Su mirada petrifica, pero usaste un espejo." },
    { n: "🐺 Licántropo", h: "Un hombre lobo que volvió a ser humano al morir." },
    { n: "🦍 Bigfoot", h: "Finalmente tienes la prueba de que Pies Grandes existe." },
    { n: "🦎 Monstruo del Lago", h: "Nessi salió a la superficie y no regresó jamás." },
    { n: "👹 Oni", h: "Un demonio japonés de gran fuerza y cuernos rojos." },
    { n: "🔱 Behemoth", h: "La bestia terrestre más grande mencionada en la biblia." },
    { n: "🐲 Bahamut", h: "El rey absoluto de todos los dragones cayó." },
    { n: "🐲 Shenlong", h: `Te daría las esferas, pero prefirió darte ${config.CURRENCY_NAME}.` },
    { n: "🦖 Espinosaurio", h: "Más grande y peligroso que el mismísimo T-Rex." },
    { n: "🦄 Alicornio", h: "Un unicornio con alas, la pureza máxima." },
    { n: "🦅 Fénix Azul", h: "Controla el hielo eterno en lugar del fuego." },
    { n: "🦁 Quimera Real", h: "La versión más poderosa de este monstruo híbrido." },
    { n: "🐉 Dragón Negro", h: "Sus escamas son tan duras como la obsidiana." },
    { n: "🐲 Dragón de Hielo", h: "Congela a sus enemigos con un solo soplido." },
    { n: "🦌 Espíritu Bosque", h: "El protector de la naturaleza se ha rendido." },
    { n: "🦊 Kitsune", h: "Un zorro de 9 colas con poderes mágicos infinitos." },
    { n: "🐅 Tigre Celestial", h: "Bajó de las estrellas para pelear contigo." },
    { n: "🦁 León Alado", h: "El guardián de los templos antiguos de Babilonia." },
    { n: "🗡️ Hoja del Destino", h: "Una espada clavada en una piedra que sacaste." },
    { n: "👑 Corona del Rey", h: "Perteneció al primer cazador que existió jamás." },
    { n: "🐲 Tiamat", h: "La madre de todos los dragones ha sido derrotada." },
    { n: "🐺 Amarok", h: "El lobo gigante que acecha a los cazadores solitarios." },
    { n: "🦅 Simurgh", h: "Un ave tan vieja que ha visto el fin del mundo." },
    { n: "🐉 Jörmungandr", h: "La serpiente que rodea el mundo fue cazada aquí." },
    { n: "🔥 Efreet", h: "Un genio de fuego que salió de un volcán activo." },
    { n: "🐎 Sleipnir", h: "El caballo místico de ocho patas de Odín." },
    { n: "👹 Tengu", h: "Un cuervo humanoide maestro de las artes marciales." },
    { n: "🔱 Leviatán", h: "La bestia de los abismos ahora está en tu colección." },
    { n: "🐲 Dragón Dorado", h: "Hecho de oro puro, es la captura más brillante." },
    { n: "🛐 Deidad Bosque", h: "Has cazado a un dios. Las consecuencias serán eternas." }
  ]
}

const handler = async (m, { userDb }) => {
  if (!userDb) return
  const cooldown = 600000 
  const now = Date.now()
  const remaining = cooldown - (now - (userDb.lastHunt || 0))

  if (remaining > 0) {
    return m.reply(`*⌬┤ ⏳ ├⌬ PIES CANSADOS.*\n\n> Tiempo restante: *${Math.floor(remaining / 60000)}m ${Math.floor((remaining % 60000) / 1000)}s*.`)
  }

  const bow = userDb.inventory.bow
  const dur = userDb.inventory.bowDurability
  let pSpecial = 0.03, pRare = 0.12, pCommon = 0.60, pTrash = 0.25

  if (bow === 'normal' && dur > 0) { pTrash = 0.05; pCommon = 0.82 }
  else if (bow === 'rare' && dur > 0) { pRare = 0.27; pTrash = 0.15 }
  else if (bow === 'mythic' && dur > 0) { pSpecial = 0.10; pRare = 0.30; pTrash = 0.05 }

  const ch = Math.random()
  let r = ch < pSpecial ? 'special' : ch < pSpecial + pRare ? 'rare' : ch < pSpecial + pRare + pCommon ? 'common' : 'trash'
  const update = { $inc: {}, $set: { lastHunt: now } }

  if (bow !== 'none' && dur > 0) {
    userDb.inventory.bowDurability -= 1
    update.$inc['inventory.bowDurability'] = -1
    if (userDb.inventory.bowDurability <= 0) {
      userDb.inventory.bow = 'none'
      update.$set['inventory.bow'] = 'none'
    }
  }

  const item = items[r][Math.floor(Math.random() * items[r].length)]
  let v = (r === 'special' ? 3000 : r === 'rare' ? 850 : r === 'common' ? 250 : 20) + (userDb.level * 25)
  let k = r === 'special' ? (Math.floor(Math.random() * 3) + 2) : 0

  userDb.zenCoins += v; userDb.kogen += k; userDb.lastHunt = now
  userDb.bestiary = userDb.bestiary || {}
  userDb.bestiary[item.n] = (userDb.bestiary[item.n] || 0) + 1

  update.$inc.zenCoins = v
  if (k > 0) update.$inc.kogen = k
  update.$inc[`bestiary.${item.n}`] = 1

  await User.updateOne({ jid: m.sender }, update)

  const labels = { trash: 'BASURA 🪵', common: 'COMÚN 🏹', rare: 'RARO 🛡️', special: 'MÍTICO 🔱' }
  let txt = `*⌬┤ 🏹 ├⌬ CAZA FINALIZADA*\n\n`
      + `> 🏆 *Rareza:* ${labels[r]}\n`
      + `> 🐾 *Presa:* ${item.n}\n`
      + `> 💰 *Venta:* ${v} ${config.CURRENCY_NAME}\n`
  if (k) txt += `> ✨ *Extra:* +${k} ${config.PREMIUM_NAME}${k > 1 ? 's' : ''}\n`
  txt += `> 📉 *Arco:* ${userDb.inventory.bowDurability} usos.\n\n`
  txt += `> 📖 *Dato:* ${item.h}\n\n`

  if (r === 'rare' || r === 'special') {
    txt += `> 💡 _¡Guardá este ejemplar! Podés venderlo por una fortuna en *!contratos* si el mercado está abierto._`
  }

  m.reply(txt)
}

handler.help = ['cazar']
handler.tags = ['eco']
handler.command = ['hunt', 'cazar']
handler.register = true
export default handler