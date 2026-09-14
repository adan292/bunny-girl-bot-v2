export const USER_DEFAULTS = {
  jid: '',
  name: '',
  age: 0,
  level: 0,
  xp: 0,
  zenCoins: 100,
  bankBalance: 0,
  bankExpiry: 0,
  kogen: 15,
  registered: false,
  everRegistered: false,
  noButtons: false,
  serial: '',
  warnTox: 0,
  warns: {},
  farmerXP: 0,
  farmerLogros: [],
  farm: {},
  farmerStats: {},
  farmMisiones: {},
  farmInventario: {},
  farmProtecciones: {},
  shopStock: {},
  social: {
    bio: '', nickname: '', country: '', song: '',
    color: '', food: '', zodiac: '', birthday: ''
  },
  inventory: {
    pickaxe: 'none', pickaxeDurability: 0,
    bow: 'none', bowDurability: 0,
    bait: 'none', baitDurability: 0,
    sword: 0, swordTier: 'none', swordUses: 0,
    potion: 0, potionTier: 'none', potionStock: {},
    shield: 0, shieldStock: {},
    amulet: 'none',
    suit: false, mask: false,
    title: '', titles: [], badges: []
  },
  bestiary: {},
  aquarium: {},
  dailyStats: {
    lastReset: 0, workCount: 0, mineCount: 0, crimeCount: 0,
    rouletteCount: 0, suitUsed: false, maskUsed: false,
    buy_mythic: 0, buy_rare: 0, buy_normal: 0, buy_legendary: 0,
    buy_sword: 0, buy_potion: 0, buy_shield: 0, buy_suit: 0,
    buy_mask: 0, buy_amulet: 0, buy_cosmetic: 0, transferToday: 0
  },
  cooldowns: {
    daily: 0, work: 0, mine: 0, rob: 0,
    hunt: 0, fish: 0, crime: 0, duel: 0, roulette: 0
  }
}

export const GROUP_DEFAULTS = {
  id: '',
  welcome: false,
  goodbye: false,
  welcomeMsg: '',
  goodbyeMsg: '',
  antilink: false,
  antinotadevoz: false,
  antimenciongp: false,
  antisticker: false,
  antivideo: false,
  antiimagen: false,
  antidelete: false,
  antitoxic: false,
  nsfw: false,
  autorespuesta: false,
  autosticker: false,
  warnLimit: 3,
  primaryBot: '',
  disabledBots: [],
  mainBotSleeping: false,
  onlyadmin: false,
  disabledCmds: [],
  disabledCategories: []
}
