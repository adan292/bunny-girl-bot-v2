import User from '../../lib/database/models/zen-users.js'

const handler = async (m, { conn, isOwner }) => {
  if (!isOwner) return

  try {
    await User.updateMany({}, {
      $set: {
        registered: false,
        everRegistered: false,
        name: '',
        age: 0,
        serial: '',
        zenCoins: 0,
        bankBalance: 0,
        bankExpiry: 0,
        kogen: 0,
        level: 0,
        xp: 0,
        'inventory.pickaxe': 'none',
        'inventory.pickaxeDurability': 0,
        'inventory.bow': 'none',
        'inventory.bowDurability': 0,
        'inventory.bait': 'none',
        'inventory.baitDurability': 0,
        'inventory.sword': 0,
        'inventory.potion': 0,
        'inventory.shield': 0,
        'inventory.suit': false,
        'inventory.mask': false,
        'dailyStats.workCount': 0,
        'dailyStats.mineCount': 0,
        'dailyStats.crimeCount': 0,
        'dailyStats.suitUsed': false,
        'dailyStats.maskUsed': false,
        'dailyStats.buy_mythic': 0,
        'dailyStats.buy_rare': 0,
        'dailyStats.buy_normal': 0,
        'dailyStats.buy_sword': 0,
        'dailyStats.buy_potion': 0,
        'dailyStats.buy_shield': 0,
        'dailyStats.buy_suit': 0,
        'dailyStats.buy_mask': 0,
        lastDaily: 0,
        lastWork: 0,
        lastMine: 0,
        lastRob: 0,
        lastHunt: 0,
        lastFish: 0
      }
    })

    m.reply('*⌬┤ 🏦 · ECONOMÍA Y REGISTROS RESETEADOS.*\n\n> Todos los balances, inventarios y niveles han vuelto a cero.\n> **Todos los usuarios han sido desregistrados y deberán usar .reg nuevamente.**')

  } catch (e) {
    console.error(e)
    m.reply('*⌬┤ ❌ · ERROR AL RESETEAR LA ECONOMÍA.*')
  }
}

handler.help = ['reseteco']
handler.tags = ['owner']
handler.command = ['reseteco', 'resetareconomia', 'hardreset']
handler.ownerOnly = true

export default handler