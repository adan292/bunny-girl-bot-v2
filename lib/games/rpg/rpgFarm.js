import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import User from '../../database/models/zen-users.js'
import { calcFarmerLevel } from './rpgFarmerProfile.js'
import { userCache } from '../../caches.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const seedsCatalog = JSON.parse(fs.readFileSync(path.join(__dirname, 'json', 'seeds.json')))
export const recipes      = JSON.parse(fs.readFileSync(path.join(__dirname, 'json', 'recipes.json')))
export const itemsCatalog = JSON.parse(fs.readFileSync(path.join(__dirname, 'json', 'farm-items.json')))

let sortedSeeds = []

export function getSortedSeeds() {
  if (sortedSeeds.length === 0) {
    const arr = Object.entries(seedsCatalog).sort((a, b) => a[1].price - b[1].price)
    sortedSeeds = arr.map(([id, data], index) => {
      const reqLevel = Math.floor(index * 0.7)
      return { id, ...data, reqLevel }
    })
  }
  return sortedSeeds
}

export function getSeedData(seedId) {
  return getSortedSeeds().find(s => s.id === seedId)
}

export const TERRAINS = [
  { level: 1, capacity: 6,  cost: 0 },
  { level: 2, capacity: 12, cost: 100000 },
  { level: 3, capacity: 20, cost: 300000 },
  { level: 4, capacity: 30, cost: 800000 },
  { level: 5, capacity: 50, cost: 2000000 }
]

const DEFAULT_FARM = {
  seeds: {}, plots: [], harvest: [], food: [], items: {},
  terrainLevel: 1, maxPlots: 6,
  dailySeedsBought: 0, lastSeedPurchaseDate: '',
  dailyItemsBought: {}, lastItemPurchaseDate: '',
  buffs: { anti_plaga: 0, anti_sequia: 0, anti_pudricion: 0 }
}

const DEFAULT_STATS = { cropsSold: 0, foodSold: 0, cropsLost: 0, totalHarvested: 0 }

const extraerNum = (jid = '') => (typeof jid === 'string' ? jid : '').split('@')[0].split(':')[0].replace(/\D/g, '')

const syncCache = (user) => {
  const numSender = extraerNum(user.jid)
  const obj = user.toObject ? user.toObject() : user
  userCache.set(user.jid, obj)
  userCache.set(numSender, obj)
}

async function getFarmUser(sender) {
  let user = await User.findOne({ jid: sender })
  if (!user) return null

  if (!user.farm || Object.keys(user.farm).length === 0) user.farm = { ...DEFAULT_FARM }
  if (!user.farmerStats || Object.keys(user.farmerStats).length === 0) user.farmerStats = { ...DEFAULT_STATS }
  
  if (!user.farm.plots) user.farm.plots = []
  if (!user.farm.harvest) user.farm.harvest = []
  if (!user.farm.food) user.farm.food = []
  if (!user.farm.seeds) user.farm.seeds = {}
  if (!user.farm.items) user.farm.items = {}
  if (!user.farm.buffs) user.farm.buffs = { anti_plaga: 0, anti_sequia: 0, anti_pudricion: 0 }
  if (!user.farm.terrainLevel) user.farm.terrainLevel = 1
  
  return user
}

export async function checkPlots(sender) {
  const user = await getFarmUser(sender)
  if (!user) return []

  let updated = false
  const now = Date.now()
  const buffs = user.farm.buffs

  for (const plot of user.farm.plots) {
    if (plot.state === 'dead' || plot.state === 'rotten') continue

    if (plot.state === 'ready') {
      const rotGrace = (buffs.anti_pudricion > now) ? 86400000 : 0
      const rotLimit = plot.growTime + Math.max(plot.growTime, 43200000) + rotGrace
      
      if (now - plot.readyAt > rotLimit) {
        plot.state = 'rotten'
        updated = true
      }
      continue
    }

    if (plot.state === 'growing') {
      let currentTime = plot.lastCheck
      
      while (currentTime < now) {
        let step = Math.min(now - currentTime, 3600000)
        currentTime += step

        if (plot.needsWater || plot.infected) {
          if (currentTime - plot.dangerAt > 43200000) {
            plot.state = 'dead'
            plot.deadReason = plot.needsWater ? 'sequía' : 'plaga'
            updated = true
            break
          }
        } else {
          plot.progress += step
          
          if (plot.progress >= plot.growTime) {
            plot.state = 'ready'
            plot.readyAt = currentTime
            updated = true
            break
          }

          const antiPlaga = buffs.anti_plaga > currentTime
          const antiSequia = buffs.anti_sequia > currentTime

          if (!antiPlaga && Math.random() < 0.03) {
            plot.infected = true
            plot.dangerAt = currentTime
            updated = true
          } else if (!antiSequia && Math.random() < 0.04) {
            plot.needsWater = true
            plot.dangerAt = currentTime
            updated = true
          }
        }
      }
      plot.lastCheck = now
      updated = true
    }
  }

  if (updated) {
    user.markModified('farm')
    await user.save()
    syncCache(user)
  }
  return user.farm.plots
}

export async function buySeed(sender, seedId, amount = 1) {
  const seed = getSeedData(seedId)
  if (!seed) return { ok: false, reason: 'invalidSeed' }

  const user = await getFarmUser(sender)
  if (!user) return { ok: false }

  const cost = seed.price * amount
  const userLevel = calcFarmerLevel(user.farmerXP)
  
  if (userLevel < seed.reqLevel) return { ok: false, reason: 'levelTooLow', req: seed.reqLevel, current: userLevel }

  const hoy = new Date().toDateString()
  if (user.farm.lastSeedPurchaseDate !== hoy) {
    user.farm.dailySeedsBought = 0
    user.farm.lastSeedPurchaseDate = hoy
  }

  const totalLimit = 15 + (userLevel * 2)
  if ((user.farm.dailySeedsBought || 0) + amount > totalLimit) {
    return { ok: false, reason: 'dailyLimit', limit: totalLimit, current: user.farm.dailySeedsBought }
  }

  if (user.zenCoins < cost) return { ok: false, reason: 'noMoney' }

  user.zenCoins -= cost
  user.farm.seeds[seedId] = (user.farm.seeds[seedId] || 0) + amount
  user.farm.dailySeedsBought += amount

  user.markModified('farm')
  await user.save()
  syncCache(user)
  return { ok: true, limit: totalLimit - user.farm.dailySeedsBought, totalCost: cost }
}

export async function plantSeed(sender, seedId) {
  const user = await getFarmUser(sender)
  if (!user) return { ok: false }

  if (user.farm.plots.length >= user.farm.maxPlots) return { ok: false, reason: 'noSpace' }
  if (!user.farm.seeds[seedId] || user.farm.seeds[seedId] <= 0) return { ok: false, reason: 'noSeeds' }

  user.farm.seeds[seedId]--
  
  user.farm.plots.push({
    seed: seedId,
    plantedAt: Date.now(),
    lastCheck: Date.now(),
    progress: 0,
    growTime: seedsCatalog[seedId].growTime,
    state: 'growing',
    needsWater: false,
    infected: false,
    dangerAt: 0
  })

  user.markModified('farm')
  await user.save()
  syncCache(user)
  return { ok: true }
}

export async function harvestPlot(sender, index) {
  const user = await getFarmUser(sender)
  if (!user) return { ok: false }

  const plot = user.farm.plots[index]
  if (!plot) return { ok: false, reason: 'notReady' }

  if (plot.state === 'dead' || plot.state === 'rotten') {
    user.farmerStats.cropsLost = (user.farmerStats.cropsLost || 0) + 1
    user.farm.plots.splice(index, 1)
    user.markModified('farm')
    user.markModified('farmerStats')
    await user.save()
    syncCache(user)
    return { ok: true, lost: true, reason: plot.state, item: plot.seed }
  }

  if (plot.state !== 'ready') return { ok: false, reason: 'notReady' }

  const amount = seedsCatalog[plot.seed].harvest
  const existente = user.farm.harvest.find(h => h.item === plot.seed)
  if (existente) existente.amount += amount
  else user.farm.harvest.push({ item: plot.seed, amount })
  
  user.farm.plots.splice(index, 1)

  const farmerXpGain = Math.max(5, Math.floor(seedsCatalog[plot.seed].price / 5)) 
  user.farmerXP += farmerXpGain
  user.farmerStats.totalHarvested = (user.farmerStats.totalHarvested || 0) + amount

  user.markModified('farm')
  user.markModified('farmerStats')
  await user.save()
  syncCache(user)
  
  return { ok: true, lost: false, item: plot.seed, amount, farmerXp: farmerXpGain }
}

export async function waterPlot(sender, index) {
  const user = await getFarmUser(sender)
  const plot = user.farm.plots[index]
  if (!plot || plot.state !== 'growing' || !plot.needsWater) return { ok: false }
  
  plot.needsWater = false
  plot.dangerAt = 0
  plot.lastCheck = Date.now()
  user.markModified('farm')
  await user.save()
  syncCache(user)
  return { ok: true }
}

export async function curePlot(sender, index) {
  const user = await getFarmUser(sender)
  const plot = user.farm.plots[index]
  if (!plot || plot.state !== 'growing' || !plot.infected) return { ok: false }
  
  plot.infected = false
  plot.dangerAt = 0
  plot.lastCheck = Date.now()
  user.markModified('farm')
  await user.save()
  syncCache(user)
  return { ok: true }
}

export async function buyFarmItem(sender, itemId, amount = 1) {
  const item = itemsCatalog[itemId]
  if (!item) return { ok: false, reason: 'invalidItem' }

  const user = await getFarmUser(sender)
  const cost = item.price * amount

  const hoy = new Date().toDateString()
  if (user.farm.lastItemPurchaseDate !== hoy) {
    user.farm.dailyItemsBought = {}
    user.farm.lastItemPurchaseDate = hoy
  }

  if ((user.farm.dailyItemsBought[itemId] || 0) + amount > item.limit) {
    return { ok: false, reason: 'dailyLimit', limit: item.limit }
  }

  if (user.zenCoins < cost) return { ok: false, reason: 'noMoney' }

  user.zenCoins -= cost
  user.farm.items[itemId] = (user.farm.items[itemId] || 0) + amount
  user.farm.dailyItemsBought[itemId] = (user.farm.dailyItemsBought[itemId] || 0) + amount

  user.markModified('farm')
  await user.save()
  syncCache(user)
  return { ok: true, totalCost: cost }
}

export async function useFarmItem(sender, itemId, index = -1) {
  const item = itemsCatalog[itemId]
  const user = await getFarmUser(sender)
  
  if (!item || !user.farm.items[itemId] || user.farm.items[itemId] <= 0) return { ok: false, reason: 'noStock' }

  if (item.efecto === 'reduce_time') {
    if (index < 0 || !user.farm.plots[index] || user.farm.plots[index].state !== 'growing') return { ok: false, reason: 'invalidPlot' }
    const plot = user.farm.plots[index]
    const reduction = plot.growTime * item.valor
    plot.progress += reduction
    user.farm.items[itemId]--
    user.markModified('farm')
    await user.save()
    syncCache(user)
    return { ok: true, effect: 'reduce_time' }
  }

  if (['anti_plaga', 'anti_sequia', 'anti_pudricion'].includes(item.efecto)) {
    user.farm.buffs[item.efecto] = Date.now() + item.valor
    user.farm.items[itemId]--
    user.markModified('farm')
    await user.save()
    syncCache(user)
    return { ok: true, effect: item.efecto }
  }

  return { ok: false }
}

export async function buyTerrain(sender) {
  const user = await getFarmUser(sender)
  const currentLevel = user.farm.terrainLevel
  const nextTerrain = TERRAINS.find(t => t.level === currentLevel + 1)
  
  if (!nextTerrain) return { ok: false, reason: 'maxLevel' }
  if (user.zenCoins < nextTerrain.cost) return { ok: false, reason: 'noMoney', cost: nextTerrain.cost }

  user.zenCoins -= nextTerrain.cost
  user.farm.terrainLevel = nextTerrain.level
  user.markModified('farm')
  await user.save()
  syncCache(user)
  return { ok: true, level: nextTerrain.level, capacity: nextTerrain.capacity }
}

export async function buyPlot(sender) {
  const user = await getFarmUser(sender)
  const currentTerrain = TERRAINS.find(t => t.level === user.farm.terrainLevel)
  
  if (user.farm.maxPlots >= currentTerrain.capacity) return { ok: false, reason: 'terrainFull' }
  
  const cost = 2000 + (user.farm.maxPlots * 1000)
  if (user.zenCoins < cost) return { ok: false, reason: 'noMoney', cost }

  user.zenCoins -= cost
  user.farm.maxPlots++
  user.markModified('farm')
  await user.save()
  syncCache(user)
  return { ok: true, cost, maxPlots: user.farm.maxPlots }
}

export async function getFarmData(sender) {
  const user = await getFarmUser(sender)
  return user ? user.farm : DEFAULT_FARM
}

export async function cookRecipe(sender, recipeName) {
  const recipe = recipes[recipeName]
  if (!recipe) return { ok: false, reason: 'invalidRecipe' }

  const user = await getFarmUser(sender)
  const farm = user.farm

  for (const item in recipe.requires) {
    const total = farm.harvest.filter(h => h.item === item).reduce((a, b) => a + b.amount, 0)
    if (total < recipe.requires[item]) return { ok: false, reason: 'noIngredients' }
  }

  for (const item in recipe.requires) {
    let needed = recipe.requires[item]
    for (const stack of farm.harvest.filter(h => h.item === item)) {
      if (needed <= 0) break
      const take = Math.min(stack.amount, needed)
      stack.amount -= take
      needed -= take
    }
  }
  
  farm.harvest = farm.harvest.filter(h => h.amount > 0)
  const existing = farm.food.find(f => f.item === recipe.gives.food)
  if (existing) existing.amount++
  else farm.food.push({ item: recipe.gives.food, amount: 1 })

  user.farmerXP += recipe.gives.xp
  user.markModified('farm')
  await user.save()
  syncCache(user)

  return { ok: true, food: recipe.gives.food, xp: recipe.gives.xp }
}
