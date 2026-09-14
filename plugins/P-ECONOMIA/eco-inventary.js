import config from '../../config.js'

const TIER_LABEL = {
  none: '❌ Ninguno',
  normal: '⚪ Normal',
  rare: '🟣 Raro',
  mythic: '🟠 Mítico',
  legendary: '🌟 Legendario'
}

const AMULET_LABEL = {
  none: '❌ Ninguno',
  fortune: '🍀 Amuleto de Fortuna (+10% trabajo/crimen)',
  thief: '🥷 Amuleto del Ladrón (+10% robo)',
  miner: '⛏️ Amuleto del Minero (+10% objetos raros)',
  gambler: '🎲 Amuleto del Tahúr (+5% apuestas)'
}

const TITLE_LABEL = {
  title_cazador: '🏷️ El Cazador',
  title_magnate: '🏷️ Magnate',
  title_legendario: '🏷️ Leyenda Viva',
  title_sombra: '🏷️ Sombra'
}

const BADGE_LABEL = {
  relic_corona: '👑 Corona del Vacío',
  relic_orbe: '🔮 Orbe de los Ancestros',
  relic_fenix: '🐦‍🔥 Pluma de Fénix'
}

const getTier = (tier) => TIER_LABEL[tier] || '❌ Ninguno'

const handler = async (m, { conn, userDb }) => {
  if (!userDb) return
  const inv = userDb.inventory

  const pfp = await conn.profilePictureUrl(m.sender, 'image').catch(() => 'https://i.ibb.co/nNkgRQjK/images-4.jpg')

  const potionStock = inv.potionStock instanceof Map ? Object.fromEntries(inv.potionStock) : (inv.potionStock || {})
  const shieldStock = inv.shieldStock instanceof Map ? Object.fromEntries(inv.shieldStock) : (inv.shieldStock || {})

  const potionLine = ['normal', 'rare', 'mythic']
    .map(t => potionStock[t] > 0 ? `${TIER_LABEL[t].split(' ')[0]}${potionStock[t]}` : null)
    .filter(Boolean)
    .join(' │ ') || '—'

  const shieldLine = ['normal', 'rare', 'mythic']
    .map(t => shieldStock[t] > 0 ? `${TIER_LABEL[t].split(' ')[0]}${shieldStock[t]}` : null)
    .filter(Boolean)
    .join(' │ ') || '—'

  const tituloEquipado = inv.title ? (TITLE_LABEL[inv.title] || inv.title) : '❌ Ninguno'
  const titulosDesbloqueados = (inv.titles || []).length
  const badges = (inv.badges || []).map(b => BADGE_LABEL[b] || b)

  let txt = `*╔═══⌦ ✦ 🎒 MI MOCHILA ✦ ⌫═══╗*\n\n`
          + `> 👤 *Usuario:* @${m.sender.split('@')[0]}\n`
          + `> ${config.PREMIUM_SYMBOL} *${config.PREMIUM_NAME}:* ${userDb.kogen} ${config.PREMIUM_SYMBOL}\n`
          + `> 🏷️ *Título:* ${tituloEquipado}${titulosDesbloqueados > 1 ? ` _(+${titulosDesbloqueados - 1} más desbloqueados)_` : ''}\n\n`

          + `*⌬┤ ⚒️ HERRAMIENTAS ├⌬*\n`
          + `> ⛏️ *Pico:* ${getTier(inv.pickaxe)} (${inv.pickaxeDurability} usos)\n`
          + `> 🏹 *Arco:* ${getTier(inv.bow)} (${inv.bowDurability} usos)\n`
          + `> 🎣 *Caña:* ${getTier(inv.bait)} (${inv.baitDurability} usos)\n\n`

          + `*⌬┤ ⚔️ ARMERÍA ├⌬*\n`
          + `> 🗡️ *Espada equipada:* ${getTier(inv.swordTier)}${inv.swordUses > 0 ? ` (${inv.swordUses} usos)` : ''}\n`
          + `> 🧪 *Pociones:* ${potionLine}\n`
          + `> 🛡️ *Escudos:* ${shieldLine}\n\n`

          + `*⌬┤ 🔱 AMULETO ├⌬*\n`
          + `> ${AMULET_LABEL[inv.amulet] || AMULET_LABEL.none}\n\n`

          + `*⌬┤ ✨ BUFFS PERMANENTES ├⌬*\n`
          + `> 👔 *Capa Magnate:* ${inv.suit ? '✅ Activa' : '❌ No posee'}\n`
          + `> 👺 *Máscara Hacker:* ${inv.mask ? '✅ Activa' : '❌ No posee'}\n\n`

  if (badges.length) {
    txt += `*⌬┤ 💎 RELIQUIAS ├⌬*\n`
         + badges.map(b => `> ${b}`).join('\n') + `\n\n`
  }

  txt += `*⌬┤ 🏦 ESTADO BANCARIO ├⌬*\n`
       + `> 🛡️ *Protección:* ${userDb.bankExpiry > Date.now() ? 'Asegurado ✅' : 'Expuesto ⚠️'}\n`
       + `> 💳 *Saldo:* ${userDb.bankBalance} ${config.CURRENCY_SYMBOL}\n\n`
       + `*╚══⌦ ${config.footer} ⌫══╝*`

  await conn.sendMessage(m.chat, { image: { url: pfp }, caption: txt, mentions: [m.sender] }, { quoted: m })
}

handler.help = ['mochila']
handler.tags = ['eco']
handler.command = ['inv', 'mochila', 'inventario']
handler.register = true
export default handler
