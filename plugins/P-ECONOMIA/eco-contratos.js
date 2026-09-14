import User from '../../lib/database/models/zen-users.js'
import config from '../../config.js'

const TARGETS = {
  common: [
    "🐇 Conejo", "🐇 Liebre", "🦆 Pato", "🦃 Pavo salvaje", "🦌 Venado", "🐗 Jabalí", "🦊 Zorro", "🦝 Mapache", "🦔 Erizo", "🐿️ Ardilla",
    "🐀 Rata de monte", "🐦 Codorniz", "🐍 Serpiente", "🦨 Zorrillo", "🐃 Búfalo joven", "🐗 Puercoespín", "🦡 Tejón", "🦦 Nutria", "🐒 Mono pequeño", "🦌 Gacela",
    "🐐 Cabra montés", "🐏 Carnero", "🐎 Caballo salvaje", "🐄 Vaca perdida", "🐕 Perro callejero", "🐈 Gato montés", "🦅 Halcón joven", "🦉 Búho nocturno", "🦜 Loro colorido", "🦢 Cisne",
    "🦩 Flamenco", "🐗 Cerdo salvaje", "🐕 Coyote", "🐺 Lobo joven", "🐦 Perdiz", "🐦 Paloma", "🐀 Topo", "🦥 Perezoso", "🐨 Koala", "🦘 Cangrejo",
    "🦦 Visón", "🦊 Zorro ártico", "🐦 Faisán", "🦆 Ganso", "🦔 Puercoespín real", "🐿️ Marmota", "🦝 Coatí", "🐒 Tití", "🦨 Hurón", "🦎 Lagartija",
    "🐟 Sardina", "🐟 Trucha", "🐟 Merluza", "🐟 Carpa", "🐟 Arenque", "🐟 Caballa", "🐟 Tilapia", "🐟 Pejerrey", "🐟 Lisa", "🐟 Bagre",
    "🐟 Corvina", "🦀 Cangrejo", "🦐 Camarón", "🦑 Calamar", "🐙 Pulpo pequeño", "🐟 Salmón", "🐟 Mojarra", "🐟 Dorado", "🐟 Surubí", "🐟 Robalo",
    "🐟 Lenguado", "🐟 Anchoa", "🐟 Bacalao", "🐟 Atún pequeño", "🐟 Besugo", "🐟 Bonito", "🐟 Mero", "🐟 Pargo", "🐟 Congrio", "🐟 Raya pequeña",
    "🐟 Pez Espada", "🐟 Carite", "🐟 Jurel", "🐟 Sierra", "🐟 Bagre canal", "🐟 Carpa espejo", "🐟 Trucha arcoíris", "🐟 Perca", "🐟 Lucioperca", "🐟 Barbo",
    "🐟 Brema", "🐟 Tenca", "🐟 Alburno", "🐟 Gobio", "🐟 Cacho", "🐟 Madrilla", "🐟 Bermejuela", "🐟 Jarabugo", "🐟 Pardilla", "🐟 Calandino"
  ],
  rare: [
    "🐆 Leopardo", "🐅 Tigre", "🐻 Oso Pardo", "🐺 Lobo Alfa", "🐆 Pantera", "🐊 Cocodrilo", "🐍 Cobra Real", "🦏 Rinoceronte", "🦅 Águila Real", "🦁 León",
    "🦒 Jirafa", "🐘 Elefante", "🦓 Cebra", "🐆 Guepardo", "🐻 Oso Polar", "🐅 Tigre Bengala", "🐆 Leopardo Nieves", "🐊 Caimán Negro", "🐍 Pitón", "🦛 Hipopótamo",
    "🦍 Gorila", "🦧 Orangután", "🐃 Búfalo africano", "🦎 Dragón Komodo", "🐆 Jaguar", "🐺 Lobo Ártico", "🦅 Cóndor Andes", "🦚 Pavo Real", "🦌 Ciervo Real", "🐂 Toro Bravo",
    "🐗 Gran Jabalí", "🦌 Alce Gigante", "🐅 Tigre Albino", "🐘 Mamut Pequeño", "🦏 Rinoceronte Negro", "🦁 León Blanco", "🐊 Aligátor", "🦉 Gran Búho Real", "🦅 Águila Imperial", "🦎 Iguana Gigante",
    "🐃 Bisonte", "🐻 Oso Negro", "🐺 Lobo de Crin", "🐆 Lince", "🐍 Anaconda", "🦏 Rinoceronte Blanco", "🦍 Espalda Plateada", "🐘 Elefante African", "🐅 Tigre Siberiano", "🐆 Puma",
    "🐠 Pez Payaso", "🐠 Pez Cirujano", "🐠 Pez Ángel", "🐡 Pez Globo", "🦈 Tiburón Bebé", "🦈 Pez Martillo", "🦞 Langosta Real", "🐟 Salmón Plata", "🐟 Atún Aleta Azul", "🐍 Anguila",
    "🐠 Pez Mariposa", "🐠 Pez Loro", "🐠 Pez Mandarín", "🦀 Cangrejo Gigante", "🦑 Calamar Cristal", "🐙 Pulpo Anillos", "🦈 Tiburón Tigre", "🦈 Tiburón Mako", "🐟 Esturión", "🐟 Gran Pez Sol",
    "🐠 Pez Disco", "🐠 Pez León", "🐟 Pez Vela", "🐟 Marlin Negro", "🐟 Siluro Gigante", "🐟 Pez Tigre", "🐟 Arapaima", "🐟 Pez Gato", "🐟 Salmón Real", "🐟 Trucha de Oro",
    "🐠 Pez Betta", "🐡 Pez Cofre", "🐍 Morena", "🐚 Caracol Fuego", "💎 Perla Blanca", "🔱 Tridente Hierro", "🏺 Ánfora Romana", "⚓ Ancla Bronce", "📦 Cofre Pequeño", "🗺️ Mapa Mojado",
    "🐠 Pez Halcón", "🐠 Ballesta", "🐡 Pez Erizo", "🦀 Centollo Real", "🦑 Sepia Gigante", "🐙 Pulpo Mimético", "🦈 Tiburón Zorro", "🐟 Pez Napoleón", "🐠 Pez Gatillo", "🐚 Ostra Perla"
  ],
  special: [
    "🐲 Dragón", "🦄 Unicornio", "🔥 Fénix", "🦖 T-Rex", "🦁 León de Nemea", "🦌 Ciervo Dorado", "🐎 Pegaso", "🔱 Quimera", "🦅 Grifo", "🐺 Fenrir",
    "🐉 Hydra", "🐎 Centauro", "🔥 Cerbero", "🦁 Esfinge", "🐲 Wyvern", "🦌 Kirin", "🦁 Mantícora", "🐂 Minotauro", "🐎 Bicornio", "🕊️ Ave Roc",
    "🐍 Basilisco", "🐺 Licántropo", "🦍 Bigfoot", "🦎 Monstruo del Lago", "👹 Oni", "🔱 Behemoth", "🐲 Bahamut", "🐲 Shenlong", "🦖 Espinosaurio", "🦄 Alicornio",
    "🦅 Fénix Azul", "🦁 Quimera Real", "🐉 Dragón Negro", "🐲 Dragón de Hielo", "🦌 Espíritu Bosque", "🦊 Kitsune", "🐅 Tigre Celestial", "🦁 León Alado", "🗡️ Hoja del Destino", "👑 Corona del Rey",
    "🐲 Tiamat", "🐺 Amarok", "🦅 Simurgh", "🐉 Jörmungandr", "🔥 Efreet", "🐎 Sleipnir", "👹 Tengu", "🔱 Leviatán", "🐲 Dragón Dorado", "🛐 Deidad Bosque",
    "🐳 Ballena Azul", "🦈 Tiburón Blanco", "🦑 Kraken", "🔱 Tridente Poseidón", "💎 Perla Negra", "👑 Corona Atlante", "🐳 Ballena Jorobada", "🐋 Orca asesina", "🦈 Megalodón", "🦑 Calamar Colosal",
    "🧞 Genio Lámpara", "🚢 Tesoro Español", "💎 Diamante Marino", "🐋 Cachalote Blanco", "🐢 Tortuga Ancestral", "🐉 Dragón Marino", "🧜‍♀️ Arpa Sirena", "👑 Corona Coral", "🛡️ Escudo Escamas", "🗡️ Daga Atlantis",
    "🌀 Remolino", "💠 Cristal Océano", "🌟 Estrella Cósmica", "🦀 Cangrejo Diamante", "🐙 Hydra de Agua", "🐋 Leviatán Bebé", "🐟 Pez Oro Macizo", "🐡 Pez Galáctico", "🦈 Tiburón Basalto", "🐚 Concha Verdad",
    "🏺 Vaso de Hermes", "📦 Gran Cofre Pirata", "⚜️ Emblema Sagrado", "🔱 Lanza Neptuno", "🏮 Linterna Abismo", "🌌 Fragmento Meteorito", "🗿 Ídolo Sumergido", "🧬 ADN Prehistórico", "🕋 Cubo Destino", "👑 Corona Perlas",
    "🦈 Guardián Abismo", "🐋 Cetáceo Plateado", "🦈 Tiburón Cristal", "🐚 Caracol Infinito", "💠 Corazón Océano", "🔱 Tridente Sagrado", "🔱 Cetro Mareas", "🐙 Kraken Rey", "🐳 Ballena Galáctica", "🌊 Esencia Poseidón"
  ]
}

const MOTIVOS_CLAUSURA = [
  `🚨 *MERCADO CLAUSURADO:* La policía del servidor está patrullando los muelles de transacciones. El contrabandista se ha escondido.`,
  `😴 *COMERCIANTE DURMIENDO:* El contrabandista consumió demasiado elixir y se durmió. Volverá a abrir en la próxima hora.`,
  `📦 *PREPARANDO TRASLADO:* El mercado está cargando el cargamento en el submarino sigiloso para despacharlo a la deep web. Volvemos la próxima hora.`
]

const normalizeToTag = (name) => {
  return name
    .replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

function seededRandom(seed) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash)
  }
  return () => {
    const x = Math.sin(hash++) * 10000
    return x - Math.floor(x)
  }
}

const getMarketStatus = () => {
  const now = new Date()
  const seed = now.toDateString() + now.getHours()
  const rng = seededRandom(seed)
  const open = rng() > 0.25
  const reason = open ? "" : MOTIVOS_CLAUSURA[Math.floor(rng() * MOTIVOS_CLAUSURA.length)]
  return { open, reason }
}

const getDailyContracts = (jid) => {
  const todayStr = new Date().toDateString()
  const seed = jid + todayStr
  const rng = seededRandom(seed)

  const selectItem = (arr) => arr[Math.floor(rng() * arr.length)]

  return [
    {
      id: 1,
      type: 'Básico',
      emoji: '🟢',
      item: selectItem(TARGETS.common),
      amount: Math.floor(rng() * 4) + 2,
      rewardZc: Math.floor(rng() * 1500) + 1000,
      rewardKg: 0
    },
    {
      id: 2,
      type: 'Avanzado',
      emoji: '🟣',
      item: selectItem(TARGETS.rare),
      amount: Math.floor(rng() * 2) + 1,
      rewardZc: Math.floor(rng() * 4000) + 3000,
      rewardKg: Math.floor(rng() * 2) + 1
    },
    {
      id: 3,
      type: 'Mítico',
      emoji: '🔥',
      item: selectItem(TARGETS.special),
      amount: 1,
      rewardZc: Math.floor(rng() * 15000) + 15000,
      rewardKg: Math.floor(rng() * 5) + 4
    }
  ]
}

const handler = async (m, { text, userDb }) => {
  if (!userDb) return

  const market = getMarketStatus()
  if (!market.open) {
    let closedTxt = `*╔═══⌦ ✦ 🚨 MERCADO NEGRO CERRADO ✦ ⌫═══╗*\n\n`
                  + `> ${market.reason}\n\n`
                  + `> 💡 _El mercado cambia su estado de apertura de forma global cada 1 hora. ¡Intenta de nuevo más tarde!_\n`
                  + `*╚══⌦ ${config.footer} ⌫══╝*`
    return m.reply(closedTxt)
  }

  const todayStr = new Date().toDateString()
  const contracts = getDailyContracts(m.sender)

  userDb.farmMisiones = userDb.farmMisiones || {}
  userDb.farmMisiones.completedKogenContracts = userDb.farmMisiones.completedKogenContracts || {}
  const completedToday = userDb.farmMisiones.completedKogenContracts[todayStr] || []

  if (!text) {
    let txt = `*╔═══⌦ ✦ 📜 CONTRATOS DIARIOS ✦ ⌫═══╗*\n\n`
    txt += `> 👤 *Usuario:* @${m.sender.split('@')[0]}\n`
    txt += `> 📅 *Fecha:* ${todayStr}\n\n`
    txt += `_Entrega los especímenes solicitados para cobrar jugosas recompensas de ${config.PREMIUM_NAME} y ${config.CURRENCY_NAME}._\n\n`

    contracts.forEach(c => {
      const isCompleted = completedToday.includes(c.id)
      const tag = normalizeToTag(c.item)
      txt += `*${c.id}. ${c.emoji} Contrato ${c.type}* ${isCompleted ? '[COMPLETADO ✅]' : ''}\n`
      txt += `   📦 *Requisito:* x${c.amount} ${c.item} \`[${tag}]\`\n`
      txt += `   💰 *Paga:* ${c.rewardZc.toLocaleString('es-AR')} ${config.CURRENCY_SYMBOL}`
      if (c.rewardKg > 0) txt += ` + ${c.rewardKg} ${config.PREMIUM_SYMBOL}`
      txt += `\n\n`
    })

    txt += `> _Para entregar y cobrar usa: !contrato entregar <número>_`
    txt += `\n*╚══⌦ ${config.footer} ⌫══╝*`
    return m.reply(txt, { mentions: [m.sender] })
  }

  const parts = text.trim().split(/\s+/)
  const action = parts[0].toLowerCase()
  const num = parseInt(parts[1])

  if (action !== 'entregar' || isNaN(num) || num < 1 || num > 3) {
    return m.reply('*⌬┤ ⚠️ · Uso correcto:* !contrato entregar <1, 2 o 3>')
  }

  if (completedToday.includes(num)) {
    return m.reply('*⌬┤ 🚫 ├⌬ CONTRATO YA COMPLETADO.*\n> Ya cobraste este contrato el día de hoy.')
  }

  const contract = contracts[num - 1]
  userDb.bestiary = userDb.bestiary || {}
  userDb.aquarium = userDb.aquarium || {}

  const hasInBestiary = (userDb.bestiary[contract.item] || 0) >= contract.amount
  const hasInAquarium = (userDb.aquarium[contract.item] || 0) >= contract.amount

  if (!hasInBestiary && !hasInAquarium) {
    return m.reply(`*⌬┤ ❌ · ESPECÍMENES INSUFICIENTES.*\n> No poseés x${contract.amount} de *"${contract.item}"* \`[${normalizeToTag(contract.item)}]\` en tu Bestiario o Pecera para entregar.`)
  }

  const update = { $inc: {}, $set: {}, $unset: {} }

  if (hasInBestiary) {
    const newCount = userDb.bestiary[contract.item] - contract.amount
    if (newCount <= 0) {
      delete userDb.bestiary[contract.item]
      update.$unset[`bestiary.${contract.item}`] = 1
    } else {
      userDb.bestiary[contract.item] = newCount
      update.$inc[`bestiary.${contract.item}`] = -contract.amount
    }
  } else {
    const newCount = userDb.aquarium[contract.item] - contract.amount
    if (newCount <= 0) {
      delete userDb.aquarium[contract.item]
      update.$unset[`aquarium.${contract.item}`] = 1
    } else {
      userDb.aquarium[contract.item] = newCount
      update.$inc[`aquarium.${contract.item}`] = -contract.amount
    }
  }

  completedToday.push(num)
  userDb.farmMisiones.completedKogenContracts[todayStr] = completedToday
  update.$set[`farmMisiones.completedKogenContracts.${todayStr}`] = completedToday

  userDb.zenCoins = (userDb.zenCoins || 0) + contract.rewardZc
  userDb.kogen = (userDb.kogen || 0) + contract.rewardKg

  update.$inc.zenCoins = contract.rewardZc
  if (contract.rewardKg > 0) update.$inc.kogen = contract.rewardKg

  if (Object.keys(update.$unset).length === 0) delete update.$unset
  if (Object.keys(update.$inc).length === 0) delete update.$inc
  if (Object.keys(update.$set).length === 0) delete update.$set

  await User.updateOne({ jid: m.sender }, update)

  let successTxt = `*╔═══⌦ ✦ ✅ CONTRATO COBRADO ✦ ⌫═══╗*\n\n`
                 + `> 🟢 *¡Entrega realizada correctamente!*\n`
                 + `> 📦 *Entregado:* x${contract.amount} de ${contract.item} \`[${normalizeToTag(contract.item)}]\`\n\n`
                 + `*⌬┤ RECOMPENSAS RECIBIDAS ├⌬*\n`
                 + `> ⌬ *${config.CURRENCY_NAME} ganados:* +${contract.rewardZc.toLocaleString('es-AR')} ${config.CURRENCY_SYMBOL}\n`
  if (contract.rewardKg > 0) {
    successTxt += `> ✦ *${config.PREMIUM_NAME} ganados:* +${contract.rewardKg} ${config.PREMIUM_SYMBOL}\n`
  }
  successTxt += `\n*╚══⌦ ${config.footer} ⌫══╝*`

  m.reply(successTxt)
}

handler.help = ['contrato', 'contrato entregar <número>']
handler.tags = ['eco']
handler.command = ['contrato', 'contratos', 'deliver', 'entrega']
handler.register = true

export default handler