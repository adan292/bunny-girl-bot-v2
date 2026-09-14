import User from '../../lib/database/models/zen-users.js'
import config from '../../config.js'

const items = {
    trash: [
        { n: "🪨 Piedra sucia", h: "Picas y picas pero solo sale lodo seco y tierra." },
        { n: "🪱 Gusano de tierra", h: "Salió huyendo cuando rompiste su pequeña casa." },
        { n: "🥫 Lata de refresco", h: "Alguien la enterró aquí hace décadas, es chatarra." },
        { n: "🦴 Hueso de pollo", h: "Tu pico golpeó algo duro, pero era basura vieja." },
        { n: "🧤 Casco roto", h: "Perteneció a un minero que no tuvo suerte aquí." },
        { n: "🩹 Curita usada", h: "Qué asco, alguien se lastimó y la tiró en la mina." },
        { n: "🧶 Hilo de pescar", h: "Enredado en una estalactita. ¿Quién pesca en una mina?" },
        { n: "📦 Caja de cartón", h: "Estaba húmeda y vacía. Solo ocupa espacio útil." },
        { n: "👟 Zapato sin suela", h: "Un solo zapato. El par debe estar en el centro hoy." },
        { n: "🖇️ Clip oxidado", h: "Tan pequeño que casi ni lo ves entre la tierra gris." },
        { n: "🧶 Lana enredada", h: "Un desastre textil en medio de la excavación hoy." },
        { n: "🧼 Jabón gastado", h: "Al menos el pico quedó limpio tras el impacto hoy." },
        { n: "🍽️ Plato roto", h: "Restos de un almuerzo minero que terminó mal hoy." },
        { n: "🔋 Pila sulfatada", h: "¡Cuidado! Esto contamina mucho el suelo de la mina." },
        { n: "🧸 Peluche sin ojo", h: "Da un poco de miedo verlo bajo la linterna hoy." },
        { n: "🩴 Chancla sola", h: "La eterna compañera de los lugares abandonados hoy." },
        { n: "🚬 Colilla", h: "Alguien estuvo fumando donde no debía hace tiempo." },
        { n: "🥡 Envase comida", h: "Basura que algún minero flojo dejó tirada aquí." },
        { n: "🔑 Llave doblada", h: "Ya no sirve para abrir ninguna puerta de este mundo." },
        { n: "🔩 Tornillo", h: "Probablemente de un soporte de madera muy antiguo." },
        { n: "🎧 Auricular roto", h: "Ya no suena nada por aquí más que el pico hoy." },
        { n: "🕯️ Vela derretida", h: "Daba luz antes de que inventaran las linternas hoy." },
        { n: "🩹 Curita", h: "Restos de un accidente menor en la excavación ayer." },
        { n: "🎾 Pelota tenis", h: "Cómo llegó esto aquí es el misterio del siglo hoy." },
        { n: "🥤 Sorbete", h: "Plástico inútil en medio de la piedra natural hoy." },
        { n: "🥨 Bolsa snacks", h: "Solo tiene aire y polvo de piedra dentro ahora." },
        { n: "🦷 Diente plástico", h: "De algún juguete antiguo enterrado en el lodo hoy." },
        { n: "🪒 Maquinita vieja", h: "Muy oxidada para cualquier uso de aseo personal." },
        { n: "🧵 Hilo dental", h: "Higiene bucal en medio de la nada subterránea hoy." },
        { n: "🎈 Globo desinflado", h: "Restos de una fiesta minera que salió muy mal hoy." },
        { n: "🧦 Calcetín solo", h: "Sigue perdido el otro, probablemente para siempre hoy." },
        { n: "🍬 Papel caramelo", h: "Basura brillante que te engañó por un segundo hoy." },
        { n: "🧱 Ladrillo roto", h: "De una pared que colapsó hace muchos años atrás." },
        { n: "🔌 Cable pelado", h: "Un peligro latente en medio de la humedad minera." },
        { n: "💡 Foco quemado", h: "Ya no iluminará más los túneles oscuros del bot." },
        { n: "🖋️ Lapicera", h: "Sin tinta y con la punta rota por el peso hoy." },
        { n: "🧵 Carrete vacío", h: "Alguien usó todo el hilo y dejó la basura aquí." },
        { n: "🧩 Pieza puzzle", h: "Falta una para completar el mapa del tesoro hoy." },
        { n: "🍄 Hongo extraño", h: "Creció en la oscuridad total de la cueva profunda." },
        { n: "🎟️ Ticket usado", h: "Alguien entró a una atracción que ya no existe hoy." },
        { n: "💊 Blister vacío", h: "Medicina para el dolor de espalda tras picar hoy." },
        { n: "🧵 Hilo cortado", h: "No sirve para nada más que para estorbar el pico." },
        { n: "📉 Gráfico impreso", h: "Parece que la economía de la mina colapsó hoy." },
        { n: "🏺 Trozo cerámica", h: "No tiene valor histórico, es solo un desecho hoy." },
        { n: "🧺 Mimbre viejo", h: "De una canasta que se pudrió por la humedad hoy." },
        { n: "👟 Suela gastada", h: "Pertenece a un minero que caminó kilómetros hoy." },
        { n: "🔗 Eslabón cadena", h: "Muy pesado y oxidado para ser de utilidad hoy." },
        { n: "📦 Cinta embalar", h: "Se pegó a tu bota y fue difícil de quitar hoy." },
        { n: "📍 Alfiler oxidado", h: "Casi te pinchas al remover la tierra suelta hoy." },
        { n: "🧧 Sobre vacío", h: "No contenía ninguna carta de amor, solo lodo hoy." }
    ],
    common: [
        { n: "🪨 Hierro Puro", h: "Encontraste una veta sólida de metal básico útil." },
        { n: "🪨 Carbón Mineral", h: "Ideal para encender la fragua o regalar hoy." },
        { n: "🪨 Cobre Brillante", h: "Sus reflejos naranjas delatan su gran ubicación hoy." },
        { n: "🪨 Cuarzo Blanco", h: "Un cristal básico que decora cualquier estantería." },
        { n: "🪨 Piedra Caliza", h: "Útil para la construcción, aunque pesa bastante hoy." },
        { n: "🪨 Granito Gris", h: "Duro como tu cabeza. Se vende bien para casas hoy." },
        { n: "🧪 Azufre Amarillo", h: "Huele a huevo podrido, pero los alquimistas pagan." },
        { n: "🪨 Grafito Oscuro", h: "Perfecto para fabricar lápices o lubricar máquinas." },
        { n: "🧱 Arcilla Roja", h: "Blanda y moldeable. Los alfareros te la comprarán." },
        { n: "🪨 Pizarra Fina", h: "Se rompe en láminas perfectas. Muy buscada hoy." },
        { n: "🪨 Talco Natural", h: "Suave al tacto, se desmorona entre tus dedos hoy." },
        { n: "🪨 Arena Sílice", h: "Para fabricar vidrio de alta calidad en el futuro." },
        { n: "🪨 Sal Gema", h: "Pura y cristalina, sacada directo de la pared hoy." },
        { n: "🪨 Feldespato", h: "Un mineral muy común pero con un brillo lindo hoy." },
        { n: "🪨 Mica Plateada", h: "Se desprende en capas brillantes como papel hoy." },
        { n: "🪨 Pirita", h: "El oro de los tontos. Brilla mucho pero vale poco." },
        { n: "🪨 Magnetita", h: "Tu pico se quedó pegado por el magnetismo hoy." },
        { n: "🪨 Fluorita", h: "Tiene colores verdes y violetas muy llamativos hoy." },
        { n: "🪨 Baritina", h: "Muy pesada para su tamaño, pero valiosa hoy." },
        { n: "🪨 Yeso Blanco", h: "Blando y fácil de extraer de la roca madre hoy." },
        { n: "🪨 Calcita", h: "Cristales romboédricos que brillan con la luz hoy." },
        { n: "🪨 Dolomita", h: "Similar a la caliza pero con un toque diferente hoy." },
        { n: "🪨 Siderita", h: "Un mineral de hierro con un color pardo lindo hoy." },
        { n: "🪨 Malaquita", h: "Verde intenso, aunque este trozo es muy común hoy." },
        { n: "🪨 Azurita", h: "Azul profundo, se encuentra junto al cobre siempre." },
        { n: "🪨 Hematita", h: "Deja un rastro rojo en tus manos al tocarla hoy." },
        { n: "🪨 Goethita", h: "Un óxido de hierro con formas muy extrañas hoy." },
        { n: "🪨 Limonita", h: "De color amarillento, mancha toda tu ropa hoy." },
        { n: "🪨 Bauxita", h: "La fuente principal del aluminio en el mundo hoy." },
        { n: "🪨 Serpentina", h: "Parece piel de serpiente por sus manchas verdes." },
        { n: "🪨 Talco", h: "El mineral más blando que existe, se raya fácil." },
        { n: "🪨 Galena", h: "Brillo metálico plomizo, muy pesada y cuadrada." },
        { n: "🪨 Blenda", h: "Principal mena de zinc, con brillo resinoso hoy." },
        { n: "🪨 Casiterita", h: "De aquí sale el estaño para las latas de comida." },
        { n: "🪨 Wolframita", h: "Muy densa, se usa para filamentos de bombillas." },
        { n: "🪨 Cromita", h: "Un mineral negro y brillante muy resistente hoy." },
        { n: "🪨 Ilmenita", h: "De aquí se extrae el titanio para naves hoy." },
        { n: "🪨 Rutilo", h: "Cristales alargados que parecen agujas de oro hoy." },
        { n: "🪨 apatita", h: "De color verde mar, muy bonita para decorar hoy." },
        { n: "🪨 Turmalina", h: "Negra y prismática, muy común en esta veta hoy." },
        { n: "🪨 Granate", h: "Pequeños cristales rojos incrustados en la roca." },
        { n: "🪨 Olivino", h: "Verde oliva, típico de rocas volcánicas profundas." },
        { n: "🪨 Augita", h: "Un mineral oscuro y común en la corteza terrestre." },
        { n: "🪨 Hornblenda", h: "Negra y brillante, forma parte del granito duro." },
        { n: "🪨 Ortosa", h: "De color rosado, muy común en las montañas hoy." },
        { n: "🪨 Albita", h: "Blanca y pura, un feldespato muy abundante hoy." },
        { n: "🪨 Anortita", h: "Grisácea y dura, forma grandes bloques de roca." },
        { n: "🪨 Moscovita", h: "Mica blanca que parece vidrio transparente hoy." },
        { n: "🪨 Biotita", h: "Mica negra que brilla intensamente bajo el sol hoy." },
        { n: "🪨 Clorita", h: "Verde y escamosa, se forma por alteración hoy." }
    ],
    rare: [
        { n: "🥈 Plata Fina", h: "Un resplandor blanco iluminó la cueva oscura hoy." },
        { n: "🥇 Oro de 24k", h: "¡Brilla como el sol! Eres muy afortunado hoy." },
        { n: "💠 Diamante Bruto", h: "Tuviste que picar mucho para este pequeño cristal." },
        { n: "🏮 Rubí Rojo", h: "Rojo intenso como el fuego de la tierra misma." },
        { n: "🔹 Zafiro Azul", h: "Parece un pedazo de cielo atrapado en la roca gris." },
        { n: "💚 Esmeralda", h: "Verde intenso. Los aldeanos estarían celosos hoy." },
        { n: "🟣 Ametista", h: "Una geoda hermosa con puntas color púrpura real." },
        { n: "⬛ Obsidiana", h: "Vidrio volcánico negro. Corta más que un bisturí." },
        { n: "🔩 Titanio", h: "Ligero y ultra fuerte. Metal de grado aeroespacial." },
        { n: "⚪ Platino", h: "Más raro que el oro y mucho más difícil de fundir." },
        { n: "💎 Ópalo", h: "Muestra todos los colores del arcoíris al moverlo." },
        { n: "💎 Topacio", h: "De un color amarillo dorado muy elegante y caro." },
        { n: "💎 Turquesa", h: "Azul verdoso, muy valorada por las tribus antiguas." },
        { n: "💎 Jade", h: "Piedra sagrada en oriente, dura y muy valiosa hoy." },
        { n: "💎 Aguamarina", h: "Clara como el agua de un manantial de montaña hoy." },
        { n: "💎 Ámbar", h: "Resina fósil con un insecto atrapado hace millones." },
        { n: "💎 Lapislázuli", h: "Azul intenso con motas doradas de pirita real." },
        { n: "💎 Malaquita", h: "Con bandas verdes concéntricas muy hermosas hoy." },
        { n: "💎 Rodocrosita", h: "La rosa del inca, de un color rosado único hoy." },
        { n: "💎 Pirita Cubo", h: "Cristales perfectamente cúbicos hechos por la tierra." },
        { n: "💎 Bismuto", h: "Cristales irisados con formas geométricas locas hoy." },
        { n: "💎 Labradorita", h: "Luce destellos azules y verdes mágicos al sol hoy." },
        { n: "💎 Ojo de Tigre", h: "Refleja la luz como el ojo de un gran felino hoy." },
        { n: "💎 Cornalina", h: "De un color naranja fuego muy energético y vivo." },
        { n: "💎 Ágata", h: "Una piedra con bandas de colores increíbles hoy." },
        { n: "💎 Citrino", h: "Cuarzo amarillo que atrae la abundancia al bot." },
        { n: "💎 Morganita", h: "Berilo rosa, muy delicado y extremadamente raro." },
        { n: "💎 Heliodoro", h: "Berilo amarillo, brilla como el mismo dios sol." },
        { n: "💎 Alejandrita", h: "Cambia de color según la luz, verde o roja hoy." },
        { n: "💎 Espinela", h: "Confundida con el rubí, pero igual de valiosa hoy." },
        { n: "💎 Peridoto", h: "Gema verde que viene de las entrañas del volcán." },
        { n: "💎 Tanzanita", h: "Solo se encuentra en un lugar del mundo entero." },
        { n: "💎 Turmalina Paraíba", h: "De un azul neón eléctrico que parece brillar solo." },
        { n: "💎 Berilo Rojo", h: "Más raro que el diamante, una captura de élite hoy." },
        { n: "💎 Benitoíta", h: "Gema azul de California, muy escasa en las minas." },
        { n: "💎 Grandidierita", h: "De un verde azulado profundo y muy costosa hoy." },
        { n: "💎 Taaffeíta", h: "Tan rara que solo hay un puñado en todo el globo." },
        { n: "💎 Jeremejevita", h: "Cristales azules muy pequeños y difíciles de ver hoy." },
        { n: "💎 Musgravita", h: "Un mineral pariente de la taaffeíta, ultra raro hoy." },
        { n: "💎 Painita", h: "Durante años fue el mineral más raro de la tierra." },
        { n: "💎 Poudretteita", h: "De color rosa pálido, casi imposible de encontrar hoy." },
        { n: "💎 Serendibita", h: "Negra o azul, con una composición química compleja." },
        { n: "💎 Hibonita", h: "Mineral que se encuentra en meteoritos muy antiguos." },
        { n: "💎 Larimar", h: "Piedra de color azul mar que solo sale en el Caribe." },
        { n: "💎 Sugilita", h: "De color violeta intenso, muy buscada por coleccionistas." },
        { n: "💎 Charoita", h: "Con patrones púrpuras que parecen remolinos de seda." },
        { n: "💎 Amonita", h: "Fósil irisado que brilla como una gema preciosa hoy." },
        { n: "💎 Moldavita", h: "Vidrio verde formado por el impacto de un meteorito." },
        { n: "💎 Tektita", h: "Roca negra espacial fundida por el calor del choque." },
        { n: "💎 Perla de Cueva", h: "Formada por el goteo de agua durante milenios hoy." }
    ],
    special: [
        { n: `✨ Cristal de ${config.PREMIUM_NAME}`, h: "Energía pura cristalizada en tus manos hoy.", k: 3 },
        { n: "🌌 Vibranium", h: "El metal vibra al ritmo de tu corazón latiente.", k: 5 },
        { n: "☄️ Meteorito", h: "Vino del espacio para ser picado por ti hoy.", k: 4 },
        { n: "🛐 Reliquia Divina", h: "Un objeto sagrado olvidado por el tiempo aquí.", k: 8 },
        { n: "💎 Corazón Montaña", h: "La gema más grande jamás vista en esta cueva.", k: 10 },
        { n: "🛡️ Beskar", h: "Este es el camino. Metal mandaloriano puro y duro.", k: 6 },
        { n: "⚡ Piedra Trueno", h: "Suelta chispas constantemente. Casi te quemas hoy.", k: 4 },
        { n: "🔥 Magma Cristal", h: "Quema incluso a través de tus guantes mineros hoy.", k: 5 },
        { n: "🌀 Fragmento Vacío", h: "Un mineral que parece tragar la luz alrededor hoy.", k: 7 },
        { n: "🌟 Polvo Estrellas", h: "Brilla con una intensidad que ciega a los demás.", k: 6 },
        { n: "🔱 Lanza Poseidón", h: "Encontrada en una veta submarina de la mina hoy.", k: 9 },
        { n: "👑 Diadema Antigua", h: "Hecha de un material que ya no existe en la tierra.", k: 8 },
        { n: "🏺 Elixir Eterno", h: "Un frasco de oro con un líquido que brilla solo.", k: 7 },
        { n: "📦 Arca Perdida", h: "Contiene secretos ocultos que no debes revelar aún.", k: 12 },
        { n: "💎 Diamante Negro", h: "La gema más oscura y poderosa de toda la cueva.", k: 9 },
        { n: "🗡️ Daga Sagrada", h: "Su hoja nunca pierde el filo, ni contra la roca.", k: 7 },
        { n: "📜 Pergamino Luz", h: `Contiene la ubicación de la próxima mina de ${config.PREMIUM_NAME}s.`, k: 5 },
        { n: "🌑 Roca Lunar", h: "Traída por un antiguo meteorito que chocó aquí.", k: 6 },
        { n: "🤖 Chip Ancestral", h: "Tecnología de una civilización que vivió debajo.", k: 8 },
        { n: "🧬 ADN Mutante", h: "Una muestra biológica atrapada en el cristal puro.", k: 10 },
        { n: "⚛️ Núcleo Energía", h: "Podría alimentar a toda tu ciudad por cien años hoy.", k: 15 },
        { n: "👺 Máscara Oro", h: "Representa a un demonio de la riqueza profunda.", k: 7 },
        { n: "📿 Rosario Almas", h: "Cada cuenta es una gema de un valor incalculable.", k: 9 },
        { n: "🗝️ Llave Maestra", h: "Abre cualquier sección bloqueada de la economía.", k: 10 },
        { n: "🕯️ Llama Eterna", h: "Un cristal que emite calor y luz infinita hoy.", k: 6 },
        { n: "🧿 Ojo del Destino", h: "Una gema que parece observarte mientras picas hoy.", k: 8 },
        { n: "🪐 Fragmento Saturno", h: "Roca de los anillos del planeta caída en la tierra.", k: 11 },
        { n: "🧊 Hielo Infinito", h: "Un mineral que nunca se derrite, ni ante el fuego.", k: 7 },
        { n: "🍃 Esencia Vida", h: "Hace que las gemas broten de la roca como plantas.", k: 9 },
        { n: "🔮 Orbe Sabiduría", h: "Te da conocimientos prohibidos sobre la minería.", k: 10 },
        { n: "🔱 Tridente Hades", h: "Extraído de las cercanías del núcleo terrestre hoy.", k: 13 },
        { n: "💎 Gema del Infinito", h: "Solo una, pero su poder es devastador para todos.", k: 20 },
        { n: "🧪 Antimateria", h: "Mantenla lejos de cualquier cosa o explotará todo.", k: 14 },
        { n: "🌟 Supernova", h: "El resto de una estrella muerta concentrado hoy.", k: 12 },
        { n: "🐉 Escama Dragón", h: "Dura como el diamante y roja como el fuego puro.", k: 8 },
        { n: "🦄 Cuerno Alado", h: "Resto místico de una criatura de los sueños hoy.", k: 9 },
        { n: "🔥 Fénix Dorado", h: "Una estatua que late con un corazón de fuego hoy.", k: 11 },
        { n: "🗡️ Excalibur Rota", h: "La espada del rey, esperando ser forjada de nuevo.", k: 10 },
        { n: "🕋 Cubo Sagrado", h: "Contiene la geometría perfecta del universo entero.", k: 13 },
        { n: "💎 Prisma Astral", h: "Descompone la luz en colores que no existen hoy.", k: 10 },
        { n: "🧬 Código Fuente", h: "El mismísimo código base hecho piedra hoy.", k: 25 },
        { n: "👑 Corona Deidad", h: "Solo el usuario más nivelado debería portarla hoy.", k: 15 },
        { n: "🛰️ Satélite Caído", h: "Tecnología espacial enterrada por el tiempo hoy.", k: 9 },
        { n: `🔋 Batería de ${config.PREMIUM_NAME}`, h: "Carga infinita para tus herramientas divinas.", k: 12 },
        { n: "🌀 Agujero Gusano", h: "Un pequeño portal atrapado en una esfera de cristal.", k: 14 },
        { n: "🌟 Luz del Alba", h: "Una gema que marca el inicio de una nueva era hoy.", k: 10 },
        { n: "🗡️ Muramasa", h: "La espada maldita, sedienta de minerales raros hoy.", k: 11 },
        { n: "🛡️ Aegis", h: "El escudo de los dioses, convertido en veta minera.", k: 13 },
        { n: "🔱 Cetro Real", h: "Perteneció al primer dueño de estas tierras hoy.", k: 12 },
        { n: "🛐 Altar Oro", h: "Toda una estructura de oro macizo bajo la tierra.", k: 30 }
    ]
}

const handler = async (m, { userDb }) => {
    if (!userDb) return
    const cooldown = 900000 
    const now = Date.now()
    const remaining = cooldown - (now - (userDb.lastMine || 0))

    if (remaining > 0) {
        return m.reply(`*⌬┤ ⏳ ├⌬ MINA AGOTADA.*\n\n> Tu pico está desafilado.\n> Esperá: *${Math.floor(remaining / 60000)}m ${Math.floor((remaining % 60000) / 1000)}s*.`)
    }

    const pick = userDb.inventory.pickaxe
    const dur = userDb.inventory.pickaxeDurability
    let pSpecial = 0.03, pRare = 0.12, pCommon = 0.60, pTrash = 0.25

    if (pick === 'normal' && dur > 0) { pTrash = 0.05; pCommon = 0.80 }
    else if (pick === 'rare' && dur > 0) { pRare = 0.20; pTrash = 0.15 }
    else if (pick === 'mythic' && dur > 0) { pSpecial = 0.10; pRare = 0.25; pTrash = 0.05 }

    if (userDb.inventory?.amulet === 'miner') {
        const bonus = 0.10
        pRare += bonus * 0.7
        pSpecial += bonus * 0.3
        pTrash = Math.max(0, pTrash - bonus)
    }

    const ch = Math.random()
    let r = ch < pSpecial ? 'special' : ch < pSpecial + pRare ? 'rare' : ch < pSpecial + pRare + pCommon ? 'common' : 'trash'
    const update = { $inc: {}, $set: { lastMine: now } }

    if (pick !== 'none' && dur > 0) {
        userDb.inventory.pickaxeDurability -= 1
        update.$inc['inventory.pickaxeDurability'] = -1
        if (userDb.inventory.pickaxeDurability <= 0) {
            userDb.inventory.pickaxe = 'none'
            update.$set['inventory.pickaxe'] = 'none'
        }
    }

    const pool = items[r]
    const item = pool[Math.floor(Math.random() * pool.length)]
    
    let v = (r === 'special' ? 2500 : r === 'rare' ? 800 : r === 'common' ? 200 : 20) + (userDb.level * 30)
    let k = item.k || 0

    userDb.zenCoins += v; userDb.kogen += k; userDb.lastMine = now
    update.$inc.zenCoins = v
    if (k > 0) update.$inc.kogen = k

    await User.updateOne({ jid: m.sender }, update)

    const labels = { trash: 'BASURA 🪨', common: 'COMÚN ⚒️', rare: 'RARO ✨', special: 'MÍTICO 🌌' }
    let txt = `*⌬┤ ⛏️ ├⌬ MINERÍA FINALIZADA*\n\n`
            + `> 🏆 *Rareza:* ${labels[r]}\n`
            + `> 💎 *Mineral:* ${item.n}\n`
            + `> 💰 *Venta:* ${v} ${config.CURRENCY_NAME}\n`
    if (k) txt += `> ✨ *Extra:* +${k} ${config.PREMIUM_NAME}${k > 1 ? 's' : ''}\n`
    if (userDb.inventory?.amulet === 'miner') txt += `> ⛏️ *Amuleto del Minero:* activo (+10% raros/míticos)\n`
    txt += `> 📉 *Pico:* ${userDb.inventory.pickaxeDurability} usos.\n\n`
    txt += `> 📖 *Historia:* ${item.h}`
    
    m.reply(txt)
}

handler.help = ['minar']
handler.tags = ['eco']
handler.command = ['mine', 'minar']
handler.register = true
export default handler