import User from '../../lib/database/models/zen-users.js'
import config from '../../config.js'

const items = [
  { id: 'p_normal',  n: '⚒️ Pico Normal',     v: 4000,  cat: 'normal',    lim: 8, dur: 10, sec: 'tools', desc: 'Mejora tus probabilidades al minar.' },
  { id: 'p_rare',    n: '✨ Pico Raro',        v: 12000, cat: 'rare',      lim: 5, dur: 5,  sec: 'tools', desc: 'Más chances de minerales raros.' },
  { id: 'p_mythic',  n: '🌌 Pico Mítico',      v: 35000, cat: 'mythic',    lim: 2, dur: 3,  sec: 'tools', desc: 'Desbloquea minerales míticos.' },

  { id: 'h_normal',  n: '🏹 Arco Madera',      v: 3500,  cat: 'normal',    lim: 8, dur: 8,  sec: 'tools', desc: 'Mejora tus cacerías básicas.' },
  { id: 'h_rare',    n: '🏹 Arco Compuesto',   v: 11000, cat: 'rare',      lim: 5, dur: 5,  sec: 'tools', desc: 'Presas más valiosas al cazar.' },
  { id: 'h_mythic',  n: '🏹 Arco Artemis',     v: 30000, cat: 'mythic',    lim: 2, dur: 2,  sec: 'tools', desc: 'La élite de la cacería.' },

  { id: 'f_normal',  n: '🪱 Carnada Gusano',   v: 2500,  cat: 'normal',    lim: 8, dur: 15, sec: 'tools', desc: 'Pesca básica mejorada.' },
  { id: 'f_rare',    n: '✨ Carnada Dorada',    v: 9000,  cat: 'rare',      lim: 5, dur: 8,  sec: 'tools', desc: 'Atrae peces raros.' },
  { id: 'f_mythic',  n: '🌌 Esencia Kraken',   v: 22000, cat: 'mythic',    lim: 2, dur: 4,  sec: 'tools', desc: 'Pesca criaturas legendarias.' },

  { id: 'sword_normal',    n: '⚔️ Espada de Honor',     v: 3000,   cat: 'sword',    lim: 5, sec: 'swords', dur: 1, buff: 1.15, desc: '+15% daño en duelos · 1 uso' },
  { id: 'sword_rare',      n: '🗡️ Espada Encantada',    v: 9500,   cat: 'sword',    lim: 4, sec: 'swords', dur: 2, buff: 1.30, desc: '+30% daño en duelos · 2 usos' },
  { id: 'sword_mythic',    n: '🌌 Espada del Vacío',    v: 28000,  cat: 'sword',    lim: 2, sec: 'swords', dur: 3, buff: 1.50, desc: '+50% daño en duelos · 3 usos' },
  { id: 'sword_legendary', n: '🔥 Excalibur Reforjada', v: 120000,  cat: 'legendary',lim: 1, sec: 'swords', dur: 5, buff: 1.80, desc: '+80% daño en duelos · 5 usos' },

  { id: 'potion_normal', n: '🧪 Poción de Vida',     v: 2500,  cat: 'potion', lim: 5, sec: 'potions', buff: 200, desc: '+200 PV en tu próximo duelo' },
  { id: 'potion_rare',   n: '💉 Elixir Mayor',       v: 7000,  cat: 'potion', lim: 4, sec: 'potions', buff: 350, desc: '+350 PV en tu próximo duelo' },
  { id: 'potion_mythic', n: '🌟 Néctar Divino',      v: 18000, cat: 'potion', lim: 2, sec: 'potions', buff: 600, desc: '+600 PV en tu próximo duelo' },

  { id: 'shield_normal', n: '🛡️ Escudo Energía',   v: 1500,  cat: 'shield', lim: 6, sec: 'shields', desc: 'Bloquea 1 intento de robo' },
  { id: 'shield_rare',   n: '🔰 Escudo Reforzado',  v: 4500,  cat: 'shield', lim: 4, sec: 'shields', desc: 'Bloquea 1 robo + devuelve 5% al ladrón' },
  { id: 'shield_mythic', n: '✨ Aegis Arcano',      v: 13000, cat: 'shield', lim: 2, sec: 'shields', desc: 'Bloquea 1 robo + devuelve 15% al ladrón' },

  { id: 'amulet_fortune', n: '🍀 Amuleto de Fortuna',   v: 40000, cat: 'amulet', lim: 1, sec: 'amulets', desc: '+10% ganancias en trabajo y crimen' },
  { id: 'amulet_thief',   n: '🥷 Amuleto del Ladrón',   v: 45000, cat: 'amulet', lim: 1, sec: 'amulets', desc: '+10% éxito al robar' },
  { id: 'amulet_miner',   n: '⛏️ Amuleto del Minero',   v: 45000, cat: 'amulet', lim: 1, sec: 'amulets', desc: '+10% probabilidad de objetos raros al minar' },
  { id: 'amulet_gambler', n: '🎲 Amuleto del Tahúr',    v: 50000, cat: 'amulet', lim: 1, sec: 'amulets', desc: '+5% probabilidad de ganar en ruleta/slots' },

  { id: 'suit', n: '👔 Capa de Magnate',  v: 5000, cat: 'suit', lim: 5, sec: 'cosmetics', desc: 'Permite usar !trabajar con bono x2 (1/día)' },
  { id: 'mask', n: '👺 Máscara Hacker',   v: 7500, cat: 'mask', lim: 5, sec: 'cosmetics', desc: 'Garantiza éxito en el próximo crimen (1/día)' },

  { id: 'title_cazador',   n: '🏷️ Título: "El Cazador"',     v: 6000,  cat: 'cosmetic', lim: 3, sec: 'titles', desc: 'Mostrá tu título en !mochila y !perfil' },
  { id: 'title_magnate',   n: '🏷️ Título: "Magnate"',        v: 15000, cat: 'cosmetic', lim: 3, sec: 'titles', desc: 'Para los más ricos del servidor' },
  { id: 'title_legendario',n: '🏷️ Título: "Leyenda Viva"',   v: 50000, cat: 'cosmetic', lim: 1, sec: 'titles', desc: 'Solo para los más dedicados' },
  { id: 'title_sombra',    n: '🏷️ Título: "Sombra"',         v: 20000, cat: 'cosmetic', lim: 2, sec: 'titles', desc: 'Para los maestros del sigilo' },

  { id: 'relic_corona', n: '👑 Corona del Vacío',      v: 150000, cat: 'legendary', lim: 1, sec: 'relics', desc: 'Reliquia coleccionable · badge exclusivo' },
  { id: 'relic_orbe',   n: '🔮 Orbe de los Ancestros', v: 90000,  cat: 'legendary', lim: 1, sec: 'relics', desc: 'Reliquia coleccionable · badge exclusivo' },
  { id: 'relic_fenix',  n: '🐦‍🔥 Pluma de Fénix',       v: 120000, cat: 'legendary', lim: 1, sec: 'relics', desc: 'Reliquia coleccionable · badge exclusivo' },
]

const SECCIONES = [
  { key: 'tools',     titulo: '⚒️ HERRAMIENTAS' },
  { key: 'swords',    titulo: '⚔️ ARMERÍA — ESPADAS' },
  { key: 'potions',   titulo: '🧪 ARMERÍA — POCIONES' },
  { key: 'shields',   titulo: '🛡️ ARMERÍA — ESCUDOS' },
  { key: 'amulets',   titulo: '🔱 AMULETOS' },
  { key: 'cosmetics', titulo: '✨ BUFFS COSMÉTICOS' },
  { key: 'titles',    titulo: '🏷️ TÍTULOS' },
  { key: 'relics',    titulo: '💎 RELIQUIAS MÍTICAS' },
]

const handler = async (m, { text, usedPrefix, command, userDb }) => {
  if (!userDb) return

  if (!text) {
    let txt = `*╔═══⌦ ✦ 🛒 ZEN-SHOP ✦ ⌫═══╗*\n`

    let n = 1
    for (const sec of SECCIONES) {
      const secItems = items.filter(it => it.sec === sec.key)
      if (!secItems.length) continue
      txt += `\n*┄┄┄┄ ${sec.titulo} ┄┄┄┄*\n`
      for (const item of secItems) {
        const currentPurchases = userDb.dailyStats[`buy_${item.cat}`] || 0
        txt += `*${n}.* ${item.n} [${currentPurchases}/${item.lim}]\n`
        txt += `   💰 ${item.v.toLocaleString('es-AR')} ${config.CURRENCY_NAME}`
        if (item.desc) txt += ` — _${item.desc}_`
        txt += `\n`
        n++
      }
    }

    txt += `\n*Uso:* ${usedPrefix + command} <número>`
    return m.reply(txt + `\n*╚══⌦ ${config.footer} ⌫══╝*`)
  }

  const i = parseInt(text) - 1
  const item = items[i]
  if (!item) return m.reply('*⌬┤ ⚠️ · Ítem inválido.*')

  const currentCount = userDb.dailyStats[`buy_${item.cat}`] || 0
  if (currentCount >= item.lim) {
    return m.reply(`*⌬┤ 🚫 ├⌬ LÍMITE ALCANZADO.*\n> Ya compraste demasiados de esta categoría hoy (${item.lim}/${item.lim}).`)
  }

  if (userDb.zenCoins < item.v) return m.reply('*⌬┤ ❌ · FONDOS INSUFICIENTES.*')

  if (['suit', 'mask'].includes(item.id) && userDb.inventory[item.id]) {
    return m.reply('*⌬┤ ⚠️ · Ya tienes este objeto equipado. Úsalo primero.*')
  }
  if (item.sec === 'amulets' && userDb.inventory.amulet !== 'none') {
    return m.reply(`*⌬┤ ⚠️ · Ya tenés un amuleto equipado (${userDb.inventory.amulet}). Reemplazalo comprando otro tipo o consultá !inventario.*`)
  }
  if (item.sec === 'titles' && userDb.inventory.titles?.includes(item.id)) {
    return m.reply('*⌬┤ ⚠️ · Ya tenés este título desbloqueado.*')
  }
  if (item.sec === 'relics' && userDb.inventory.badges?.includes(item.id)) {
    return m.reply('*⌬┤ ⚠️ · Ya posees esta reliquia.*')
  }

  const update = { $inc: { zenCoins: -item.v, [`dailyStats.buy_${item.cat}`]: 1 }, $set: {} }
  userDb.zenCoins -= item.v
  userDb.dailyStats[`buy_${item.cat}`] = (userDb.dailyStats[`buy_${item.cat}`] || 0) + 1

  if (item.id.startsWith('p_')) {
    const pType = item.id.split('_')[1]
    update.$set['inventory.pickaxe'] = pType
    update.$set['inventory.pickaxeDurability'] = item.dur
    userDb.inventory.pickaxe = pType; userDb.inventory.pickaxeDurability = item.dur

  } else if (item.id.startsWith('h_')) {
    const hType = item.id.split('_')[1]
    update.$set['inventory.bow'] = hType
    update.$set['inventory.bowDurability'] = item.dur
    userDb.inventory.bow = hType; userDb.inventory.bowDurability = item.dur

  } else if (item.id.startsWith('f_')) {
    const fType = item.id.split('_')[1]
    update.$set['inventory.bait'] = fType
    update.$set['inventory.baitDurability'] = item.dur
    userDb.inventory.bait = fType; userDb.inventory.baitDurability = item.dur

  } else if (item.id.startsWith('sword_')) {
    const tier = item.id.split('_')[1]
    update.$set['inventory.swordTier'] = tier
    update.$set['inventory.swordUses'] = item.dur
    userDb.inventory.swordTier = tier; userDb.inventory.swordUses = item.dur
    update.$set['inventory.sword'] = 1
    userDb.inventory.sword = 1

  } else if (item.id.startsWith('potion_')) {
    const tier = item.id.split('_')[1]
    update.$inc[`inventory.potionStock.${tier}`] = 1
    if (!userDb.inventory.potionStock) userDb.inventory.potionStock = {}
    userDb.inventory.potionStock[tier] = (userDb.inventory.potionStock[tier] || 0) + 1
    update.$inc['inventory.potion'] = 1
    userDb.inventory.potion = (userDb.inventory.potion || 0) + 1

  } else if (item.id.startsWith('shield_')) {
    const tier = item.id.split('_')[1]
    update.$inc[`inventory.shieldStock.${tier}`] = 1
    if (!userDb.inventory.shieldStock) userDb.inventory.shieldStock = {}
    userDb.inventory.shieldStock[tier] = (userDb.inventory.shieldStock[tier] || 0) + 1
    update.$inc['inventory.shield'] = 1
    userDb.inventory.shield = (userDb.inventory.shield || 0) + 1

  } else if (item.id.startsWith('amulet_')) {
    const tipo = item.id.split('_')[1]
    update.$set['inventory.amulet'] = tipo
    userDb.inventory.amulet = tipo

  } else if (['suit', 'mask'].includes(item.id)) {
    update.$set[`inventory.${item.id}`] = true
    userDb.inventory[item.id] = true

  } else if (item.id.startsWith('title_')) {
    update.$push = { 'inventory.titles': item.id }
    if (!userDb.inventory.titles) userDb.inventory.titles = []
    userDb.inventory.titles.push(item.id)
    if (!userDb.inventory.title) {
      update.$set['inventory.title'] = item.id
      userDb.inventory.title = item.id
    }

  } else if (item.id.startsWith('relic_')) {
    update.$push = { 'inventory.badges': item.id }
    if (!userDb.inventory.badges) userDb.inventory.badges = []
    userDb.inventory.badges.push(item.id)

  } else {
    update.$inc[`inventory.${item.id}`] = 1
    userDb.inventory[item.id] = (userDb.inventory[item.id] || 0) + 1
  }

  if (Object.keys(update.$set).length === 0) delete update.$set
  await User.updateOne({ jid: m.sender }, update)

  m.reply(`*⌬┤ ✅ ├⌬ COMPRA EXITOSA*\n> Has adquirido: *${item.n}*\n> _Balance diario: ${userDb.dailyStats[`buy_${item.cat}`]}/${item.lim}_`)
}

handler.help = ['shop', 'tienda', 'buy']
handler.tags = ['eco']
handler.command = ['shop', 'tienda', 'buy']
handler.register = true
export default handler
