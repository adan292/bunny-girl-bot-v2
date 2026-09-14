import { isJsonMode } from '../db.js'
import { createJsonModel } from '../json-adapter.js'
import { USER_DEFAULTS } from '../db-defaults.js'

export const RANGOS = [
  "🪵 Madera V", "🪵 Madera IV", "🪵 Madera III", "🪵 Madera II", "🪵 Madera I",
  "🪨 Piedra V", "🪨 Piedra IV", "🪨 Piedra III", "🪨 Piedra II", "🪨 Piedra I",
  "⛓️ Hierro V", "⛓️ Hierro IV", "⛓️ Hierro III", "⛓️ Hierro II", "⛓️ Hierro I",
  "🥉 Bronce V", "🥉 Bronce IV", "🥉 Bronce III", "🥉 Bronce II", "🥉 Bronce I",
  "🥉 Cobre V", "🥉 Cobre IV", "🥉 Cobre III", "🥉 Cobre II", "🥉 Cobre I",
  "🥈 Plata V", "🥈 Plata IV", "🥈 Plata III", "🥈 Plata II", "🥈 Plata I",
  "🥇 Oro V", "🥇 Oro IV", "🥇 Oro III", "🥇 Oro II", "🥇 Oro I",
  "💠 Platino V", "💠 Platino IV", "💠 Platino III", "💠 Platino II", "💠 Platino I",
  "💎 Diamante V", "💎 Diamante IV", "💎 Diamante III", "💎 Diamante II", "💎 Diamante I",
  "💚 Esmeralda V", "💚 Esmeralda IV", "💚 Esmeralda III", "💚 Esmeralda II", "💚 Esmeralda I",
  "🏮 Rubí V", "🏮 Rubí IV", "🏮 Rubí III", "🏮 Rubí II", "🏮 Rubí I",
  "🔹 Zafiro V", "🔹 Zafiro IV", "🔹 Zafiro III", "🔹 Zafiro II", "🔹 Zafiro I",
  "⬛ Obsidiana V", "⬛ Obsidiana IV", "⬛ Obsidiana III", "⬛ Obsidiana II", "⬛ Obsidiana I",
  "🟣 Ametista V", "🟣 Ametista IV", "🟣 Ametista III", "🟣 Ametista II", "🟣 Ametista I",
  "🔩 Titanio V", "🔩 Titanio IV", "🔩 Titanio III", "🔩 Titanio II", "🔩 Titanio I",
  "🎓 Maestro V", "🎓 Maestro IV", "🎓 Maestro III", "🎓 Maestro II", "🎓 Maestro I",
  "⚔️ Gran Maestro V", "⚔️ Gran Maestro IV", "⚔️ Gran Maestro III", "⚔️ Gran Maestro II", "⚔️ Gran Maestro I",
  "🏆 Leyenda V", "🏆 Leyenda IV", "🏆 Leyenda III", "🏆 Leyenda II", "🏆 Leyenda I",
  "🔱 Semidiós V", "🔱 Semidiós IV", "🔱 Semidiós III", "🔱 Semidiós II", "🔱 Semidiós I",
  "🌌 Eterno V", "🌌 Eterno IV", "🌌 Eterno III", "🌌 Eterno II", "🌌 Eterno I",
  "🛐 Deidad Suprema"
]

let User

if (isJsonMode()) {
  User = createJsonModel('users', USER_DEFAULTS)
} else {
  const mongoose = (await import('mongoose')).default
  const UserSchema = new mongoose.Schema({
    jid: { type: String, required: true, unique: true },
    name: { type: String, default: '' },
    age: { type: Number, default: 0 },
    level: { type: Number, default: 0 },
    xp: { type: Number, default: 0 },
    zenCoins: { type: Number, default: 100 },
    bankBalance: { type: Number, default: 0 },
    bankExpiry: { type: Number, default: 0 },
    kogen: { type: Number, default: 15 },
    registered: { type: Boolean, default: false },
    everRegistered: { type: Boolean, default: false },
    noButtons: { type: Boolean, default: false },
    serial: { type: String, default: '' },
    warnTox: { type: Number, default: 0 },
    warns: { type: Map, of: Number, default: {} },
    farmerXP: { type: Number, default: 0 },
    farmerLogros: { type: [String], default: [] },
    farm: { type: Object, default: {} },
    farmerStats: { type: Object, default: {} },
    farmMisiones: { type: Object, default: {} },
    farmInventario: { type: Object, default: {} },
    farmProtecciones: { type: Object, default: {} },
    shopStock: { type: Object, default: {} },
    social: {
      bio: { type: String, default: '' },
      nickname: { type: String, default: '' },
      country: { type: String, default: '' },
      song: { type: String, default: '' },
      color: { type: String, default: '' },
      food: { type: String, default: '' },
      zodiac: { type: String, default: '' },
      birthday: { type: String, default: '' }
    },
    inventory: {
      pickaxe: { type: String, default: 'none' },
      pickaxeDurability: { type: Number, default: 0 },
      bow: { type: String, default: 'none' },
      bowDurability: { type: Number, default: 0 },
      bait: { type: String, default: 'none' },
      baitDurability: { type: Number, default: 0 },
      sword: { type: Number, default: 0 },
      swordTier: { type: String, default: 'none' },
      swordUses: { type: Number, default: 0 },
      potion: { type: Number, default: 0 },
      potionTier: { type: String, default: 'none' },
      potionStock: { type: Map, of: Number, default: {} },
      shield: { type: Number, default: 0 },
      shieldStock: { type: Map, of: Number, default: {} },
      amulet: { type: String, default: 'none' },
      suit: { type: Boolean, default: false },
      mask: { type: Boolean, default: false },
      title: { type: String, default: '' },
      titles: { type: [String], default: [] },
      badges: { type: [String], default: [] }
    },
    bestiary: { type: Map, of: Number, default: {} },
    aquarium: { type: Map, of: Number, default: {} },
    dailyStats: {
      lastReset: { type: Number, default: 0 },
      workCount: { type: Number, default: 0 },
      mineCount: { type: Number, default: 0 },
      crimeCount: { type: Number, default: 0 },
      rouletteCount: { type: Number, default: 0 },
      suitUsed: { type: Boolean, default: false },
      maskUsed: { type: Boolean, default: false },
      buy_mythic: { type: Number, default: 0 },
      buy_rare: { type: Number, default: 0 },
      buy_normal: { type: Number, default: 0 },
      buy_legendary: { type: Number, default: 0 },
      buy_sword: { type: Number, default: 0 },
      buy_potion: { type: Number, default: 0 },
      buy_shield: { type: Number, default: 0 },
      buy_suit: { type: Number, default: 0 },
      buy_mask: { type: Number, default: 0 },
      buy_amulet: { type: Number, default: 0 },
      buy_cosmetic: { type: Number, default: 0 },
      transferToday: { type: Number, default: 0 }
    },
    cooldowns: {
      daily:    { type: Number, default: 0 },
      work:     { type: Number, default: 0 },
      mine:     { type: Number, default: 0 },
      rob:      { type: Number, default: 0 },
      hunt:     { type: Number, default: 0 },
      fish:     { type: Number, default: 0 },
      crime:    { type: Number, default: 0 },
      duel:     { type: Number, default: 0 },
      roulette: { type: Number, default: 0 }
    }
  })

  UserSchema.index({ zenCoins: -1 })
  UserSchema.index({ kogen: -1 })

  User = mongoose.models.ZenUser || mongoose.model('ZenUser', UserSchema)
}

export default User
