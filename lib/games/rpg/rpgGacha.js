import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import User from '../../database/models/zen-users.js'
import { userCache } from '../../caches.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CHARS_PATH = path.join(__dirname, 'characters.json')

export function loadCharacters() {
  return JSON.parse(fs.readFileSync(CHARS_PATH, 'utf-8'))
}

export function saveCharacters(data) {
  fs.writeFileSync(CHARS_PATH, JSON.stringify(data, null, 2))
}

export function getCharById(id) {
  const chars = loadCharacters()
  return chars.find(c => String(c.id) === String(id)) || null
}

export function getCharsByOwner(jid) {
  const num = jid.split('@')[0].split(':')[0].replace(/\D/g, '')
  return loadCharacters().filter(c => {
    if (!c.user) return false
    const cNum = String(c.user).split('@')[0].split(':')[0].replace(/\D/g, '')
    return cNum === num
  })
}

export function getRarityData(value) {
  const v = parseInt(value)
  if (v >= 20000) return { emoji: '🌌', label: 'LEGENDARIO', color: '✨' }
  if (v >= 15000) return { emoji: '💜', label: 'ÉPICO',      color: '💫' }
  if (v >= 10000) return { emoji: '💙', label: 'RARO',       color: '🔹' }
  if (v >= 5000)  return { emoji: '💚', label: 'POCO COMÚN', color: '🔸' }
  return                 { emoji: '⬜', label: 'COMÚN',      color: '▫️' }
}

const extraerNum = (jid = '') => (typeof jid === 'string' ? jid : '').split('@')[0].split(':')[0].replace(/\D/g, '')

export async function syncUserDb(user) {
  const num = extraerNum(user.jid)
  const obj = user.toObject ? user.toObject() : user
  userCache.set(user.jid, obj)
  userCache.set(num, obj)
}

export const gachaSessions   = new Map()
export const auctionSessions = new Map()

const GACHA_TTL   = 60 * 1000
const AUCTION_TTL = 5  * 60 * 1000
const SELL_TAX    = 0.30

setInterval(() => {
  const now = Date.now()
  for (const [k, v] of gachaSessions.entries()) {
    if (now - v.ts > GACHA_TTL) gachaSessions.delete(k)
  }
  for (const [k, v] of auctionSessions.entries()) {
    if (now - v.endTs < now) auctionSessions.delete(k)
  }
}, 30_000)

export function rollGacha() {
  const chars = loadCharacters()
  const free  = chars.filter(c => !c.user || c.status === 'Libre')
  if (!free.length) return null
  return free[Math.floor(Math.random() * free.length)]
}

export function gachaSessionKey(chat, sender) {
  return `${chat}|${sender}`
}

export function getNetSell(value) {
  const v = parseInt(value)
  const tax = Math.floor(v * SELL_TAX)
  return { net: v - tax, tax }
}
