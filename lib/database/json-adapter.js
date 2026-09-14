import { promises as fs } from 'fs'
import { existsSync, mkdirSync } from 'fs'
import path from 'path'
import chalk from 'chalk'

const DATA_DIR = path.resolve('./lib/database/data')
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })

function filePath(name) {
  return path.join(DATA_DIR, `${name}.json`)
}

const writeQueues = new Map()

function queueWrite(name, task) {
  if (!writeQueues.has(name)) {
    writeQueues.set(name, Promise.resolve())
  }
  const current = writeQueues.get(name)
  const next = current.then(task).catch(() => {})
  writeQueues.set(name, next)
  return next
}

async function readAll(name) {
  const fp = filePath(name)
  if (!existsSync(fp)) return []
  try {
    const data = await fs.readFile(fp, 'utf8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

async function writeAll(name, data) {
  const fp = filePath(name)
  await fs.writeFile(fp, JSON.stringify(data, null, 2), 'utf8')
}

function applyDotPath(doc, key, val) {
  const parts = key.split('.')
  let cur = doc
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur[parts[i]] == null || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {}
    cur = cur[parts[i]]
  }
  cur[parts[parts.length - 1]] = val
}

function getDotPath(doc, key) {
  return key.split('.').reduce((o, k) => (o != null ? o[k] : undefined), doc)
}

function applyUpdate(doc, update) {
  if (update.$set) {
    for (const [k, v] of Object.entries(update.$set)) applyDotPath(doc, k, v)
  }
  if (update.$inc) {
    for (const [k, v] of Object.entries(update.$inc)) {
      const cur = getDotPath(doc, k) ?? 0
      applyDotPath(doc, k, cur + v)
    }
  }
  if (update.$push) {
    for (const [k, v] of Object.entries(update.$push)) {
      const arr = getDotPath(doc, k) ?? []
      arr.push(v)
      applyDotPath(doc, k, arr)
    }
  }
  if (update.$pull) {
    for (const [k, v] of Object.entries(update.$pull)) {
      const arr = getDotPath(doc, k) ?? []
      applyDotPath(doc, k, arr.filter(i => i !== v))
    }
  }
  if (update.$addToSet) {
    for (const [k, v] of Object.entries(update.$addToSet)) {
      const arr = getDotPath(doc, k) ?? []
      if (!arr.includes(v)) arr.push(v)
      applyDotPath(doc, k, arr)
    }
  }
  return doc
}

function matchFilter(doc, filter) {
  for (const [key, val] of Object.entries(filter)) {
    if (key === '$or') {
      if (!val.some(f => matchFilter(doc, f))) return false
      continue
    }
    const docVal = getDotPath(doc, key)
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      if (val.$regex) {
        const regex = val.$regex instanceof RegExp ? val.$regex : new RegExp(val.$regex, val.$options || '')
        if (!regex.test(String(docVal ?? ''))) return false
        continue
      }
      if (val.$gt !== undefined && !(docVal > val.$gt)) return false
      if (val.$gte !== undefined && !(docVal >= val.$gte)) return false
      if (val.$lt !== undefined && !(docVal < val.$lt)) return false
      if (val.$lte !== undefined && !(docVal <= val.$lte)) return false
      if (val.$ne !== undefined && docVal === val.$ne) return false
      if (val.$in !== undefined && !val.$in.includes(docVal)) return false
    } else {
      if (docVal !== val) return false
    }
  }
  return true
}

class JsonDocument {
  constructor(collectionName, defaults, data = {}) {
    this.__collection = collectionName
    this.__defaults = defaults
    
    const base = structuredClone(defaults)
    deepMerge(base, data)
    Object.assign(this, base)
  }

  async save() {
    await queueWrite(this.__collection, async () => {
      const all = await readAll(this.__collection)
      const primaryKey = this.__collection === 'groups' ? 'id' : 'jid'
      const idx = all.findIndex(d => d[primaryKey] === this[primaryKey])
      const plain = toPlain(this)
      if (idx === -1) all.push(plain)
      else all[idx] = plain
      await writeAll(this.__collection, all)
    })
    return this
  }

  lean() { return toPlain(this) }

  toObject() { return toPlain(this) }
}

function toPlain(doc) {
  const obj = {}
  for (const [k, v] of Object.entries(doc)) {
    if (k.startsWith('__')) continue
    if (typeof v === 'function') continue
    obj[k] = v
  }
  return obj
}

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key] || typeof target[key] !== 'object') target[key] = {}
      deepMerge(target[key], source[key])
    } else {
      target[key] = source[key]
    }
  }
  return target
}

export function createJsonModel(collectionName, defaults) {
  const Model = class extends JsonDocument {
    constructor(data = {}) {
      super(collectionName, defaults, data)
    }
  }

  Model.collectionName = collectionName

  Model.findOne = async (filter = {}, projection = null) => {
    const all = await readAll(collectionName)
    const doc = all.find(d => matchFilter(d, filter))
    if (!doc) return null
    const instance = new Model(doc)
    
    instance.lean = () => structuredClone(toPlain(instance))
    return instance
  }

  Model.find = async (filter = {}, projection = null) => {
    const all = await readAll(collectionName)
    return all
      .filter(d => matchFilter(d, filter))
      .map(d => {
        const inst = new Model(d)
        inst.lean = () => structuredClone(toPlain(inst))
        return inst
      })
  }

  Model.findOneAndUpdate = async (filter, update, options = {}) => {
    let resultDoc
    let oldDoc
    await queueWrite(collectionName, async () => {
      const all = await readAll(collectionName)
      let idx = all.findIndex(d => matchFilter(d, filter))
      if (idx === -1) {
        if (!options.upsert) {
          resultDoc = null
          return
        }
        const doc = structuredClone(defaults)
        applyUpdate(doc, update)
        all.push(doc)
        resultDoc = doc
      } else {
        oldDoc = structuredClone(all[idx])
        applyUpdate(all[idx], update)
        resultDoc = all[idx]
      }
      await writeAll(collectionName, all)
    })

    if (resultDoc === null) return null
    const finalDoc = options.new ? resultDoc : (oldDoc || resultDoc)
    const inst = new Model(finalDoc)
    inst.lean = () => structuredClone(toPlain(inst))
    return inst
  }

  Model.updateOne = async (filter, update) => {
    let modifiedCount = 0
    await queueWrite(collectionName, async () => {
      const all = await readAll(collectionName)
      const idx = all.findIndex(d => matchFilter(d, filter))
      if (idx !== -1) {
        applyUpdate(all[idx], update)
        await writeAll(collectionName, all)
        modifiedCount = 1
      }
    })
    return { modifiedCount }
  }

  Model.updateMany = async (filter, update) => {
    let count = 0
    await queueWrite(collectionName, async () => {
      const all = await readAll(collectionName)
      for (const doc of all) {
        if (matchFilter(doc, filter)) { applyUpdate(doc, update); count++ }
      }
      if (count > 0) {
        await writeAll(collectionName, all)
      }
    })
    return { modifiedCount: count }
  }

  Model.deleteOne = async (filter) => {
    let deletedCount = 0
    await queueWrite(collectionName, async () => {
      const all = await readAll(collectionName)
      const idx = all.findIndex(d => matchFilter(d, filter))
      if (idx !== -1) {
        all.splice(idx, 1)
        await writeAll(collectionName, all)
        deletedCount = 1
      }
    })
    return { deletedCount }
  }

  Model.countDocuments = async (filter = {}) => {
    const all = await readAll(collectionName)
    return all.filter(d => matchFilter(d, filter)).length
  }

  return Model
}