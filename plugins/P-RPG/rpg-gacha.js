import User from '../../lib/database/models/zen-users.js'
import config from '../../config.js'
import { userCache } from '../../lib/caches.js'
import {
  loadCharacters, saveCharacters, getCharById, getCharsByOwner,
  getRarityData, gachaSessions, auctionSessions, rollGacha,
  gachaSessionKey, getNetSell, syncUserDb
} from '../../lib/games/rpg/rpgGacha.js'

const GACHA_TTL   = 60 * 1000
const AUCTION_TTL = 5  * 60 * 1000

const extraerNum = (jid = '') => (typeof jid === 'string' ? jid : '').split('@')[0].split(':')[0].replace(/\D/g, '')

function fmtTime(ms) {
  if (ms <= 0) return '✅ Listo'
  const s = Math.ceil(ms / 1000)
  const m = Math.floor(s / 60)
  const rem = s % 60
  return m > 0 ? `${m}m ${rem}s` : `${s}s`
}

function buildCharCard(char, ownerName = null) {
  const r = getRarityData(char.value)
  const owner = char.user ? (ownerName || `+${extraerNum(char.user)}`) : null
  const status = char.status === 'Libre' && !char.user ? '✅ Disponible' : `❌ Canjeado por ${owner}`

  return [
    `${r.color} *${char.name}*`,
    `> 🎌 *Fuente:* ${char.source}`,
    `> ${r.emoji} *Rareza:* ${r.label}`,
    `> 💰 *Valor:* ${parseInt(char.value).toLocaleString()} ${config.CURRENCY_NAME}`,
    `> ⚧️ *Género:* ${char.gender}`,
    `> 🆔 *ID:* #${char.id}`,
    `> 📌 *Estado:* ${status}`,
  ].join('\n')
}

const handler = async (m, { conn, command, args, text, usedPrefix, userDb }) => {
  if (!userDb?.registered) return m.reply(`*⌬┤ 🔒 ├⌬ NO REGISTRADO.*\n> Usá *${usedPrefix}reg nombre.edad* para registrarte.`)

  const sender   = m.sender
  const senderNum = extraerNum(sender)
  const now = Date.now()

  if (['gacha', 'invocar', 'pull', 'rw', 'rollwaifu'].includes(command)) {
    const key = gachaSessionKey(m.chat, sender)
    if (gachaSessions.has(key)) {
      const sess = gachaSessions.get(key)
      const left = GACHA_TTL - (now - sess.ts)
      return m.reply(`*⌬┤ ⏳ ├⌬ INVOCACIÓN ACTIVA.*\n> Ya tenés un personaje pendiente.\n> Tiempo restante: *${fmtTime(left)}*\n> Usá *${usedPrefix}canjear ${sess.charId}* para reclamarlo o espera que expire.`)
    }

    const char = rollGacha()
    if (!char) return m.reply(`*⌬┤ 😔 ├⌬ SIN PERSONAJES LIBRES.*\n> Todos los personajes están canjeados. Volvé más tarde.`)

    gachaSessions.set(key, { charId: char.id, ts: now })

    const r = getRarityData(char.value)
    const img = char.img?.[0]
    const caption = [
      `*╔═══⌦ ✦ 🎴 INVOCACIÓN ✦ ⌫═══╗*\n`,
      buildCharCard(char),
      `\n> ⏱️ *Tiempo para canjear:* 60 segundos`,
      `\n> Usá *${usedPrefix}canjear ${char.id}* para quedártelo.`,
      `> Si no canjeas en 60s, el personaje se libera y perdés la oportunidad de canjearlo.`,
      `\n*╚══⌦ ${config.footer} ⌫══╝*`
    ].join('\n')

    if (img) {
      try {
        await conn.sendMessage(m.chat, { image: { url: img }, caption }, { quoted: m })
      } catch {
        await m.reply(caption)
      }
    } else {
      await m.reply(caption)
    }

    setTimeout(() => {
      if (gachaSessions.has(key)) {
        gachaSessions.delete(key)
        conn.sendMessage(m.chat, {
          text: `*⌬┤ ⌛ ├⌬ INVOCACIÓN EXPIRADA.*\n> @${senderNum}, el tiempo para canjear *${char.name}* venció. El personaje fue liberado.`,
          mentions: [sender]
        }).catch(() => {})
      }
    }, GACHA_TTL)
    return
  }

  if (['canjear', 'claim', 'reclamar'].includes(command)) {
    const id = args[0]
    if (!id) return m.reply(`*⌬┤ ✙ ├⌬ USO:* \`${usedPrefix}canjear <id>\``)

    const key = gachaSessionKey(m.chat, sender)
    const sess = gachaSessions.get(key)

    if (!sess) return m.reply(`*⌬┤ ❌ ├⌬ SIN INVOCACIÓN.*\n> No tenés ninguna de las Invocaciones activas. Usá *${usedPrefix}gacha* primero.`)
    if (String(sess.charId) !== String(id)) return m.reply(`*⌬┤ ❌ ├⌬ ID INCORRECTO.*\n> Tu invocación activa es el personaje *#${sess.charId}*, no *#${id}*.`)

    const expired = now - sess.ts > GACHA_TTL
    if (expired) {
      gachaSessions.delete(key)
      return m.reply(`*⌬┤ ⌛ ├⌬ TIEMPO VENCIDO.*\n> El tiempo para canjear venció. Usá *${usedPrefix}gacha* para volver a invocar.`)
    }

    const chars = loadCharacters()
    const char  = chars.find(c => String(c.id) === String(id))
    if (!char) return m.reply(`*⌬┤ ❌ ├⌬ PERSONAJE NO ENCONTRADO.*`)

    if (char.user && extraerNum(char.user) !== senderNum) {
      gachaSessions.delete(key)
      return m.reply(`*⌬┤ ❌ ├⌬ YA CANJEADO.*\n> *${char.name}* pertenece a otro usuario.`)
    }

    char.user   = sender
    char.status = 'Canjeado'
    saveCharacters(chars)
    gachaSessions.delete(key)

    const r = getRarityData(char.value)
    return m.reply([
      `*╔═══⌦ ✦ ✅ PERSONAJE CANJEADO ✦ ⌫═══╗*\n`,
      `> ${r.color} *${char.name}* es tuyo ahora.`,
      `> ${r.emoji} *Rareza:* ${r.label}`,
      `> 💰 *Valor:* ${parseInt(char.value).toLocaleString()} ${config.CURRENCY_NAME}`,
      `> 🆔 *ID:* #${char.id}`,
      `\n*╚══⌦ ${config.footer} ⌫══╝*`
    ].join('\n'))
  }

  if (['vender', 'sell'].includes(command)) {
    const id = args[0]
    if (!id) return m.reply(`*⌬┤ ✙ ├⌬ USO:* \`${usedPrefix}vender <id>\`\n> Se cobra un *30% de impuesto* sobre el valor.`)

    const chars = loadCharacters()
    const char  = chars.find(c => String(c.id) === String(id))
    if (!char) return m.reply(`*⌬┤ ❌ ├⌬ PERSONAJE NO ENCONTRADO.*\n> Verificá el ID con *${usedPrefix}collection*.`)

    if (!char.user || extraerNum(char.user) !== senderNum) {
      return m.reply(`*⌬┤ 🚫 ├⌬ NO ES TUYO.*\n> Solo podés vender personajes de tu colección.`)
    }

    const { net, tax } = getNetSell(char.value)
    char.user   = null
    char.status = 'Libre'
    saveCharacters(chars)

    await User.updateOne({ jid: userDb.jid }, { $inc: { zenCoins: net } })
    userDb.zenCoins += net
    await syncUserDb(userDb)

    const r = getRarityData(char.value)
    return m.reply([
      `*╔═══⌦ ✦ 💸 PERSONAJE VENDIDO ✦ ⌫═══╗*\n`,
      `> ${r.color} *${char.name}*`,
      `> 💰 *Valor base:* ${parseInt(char.value).toLocaleString()} ${config.CURRENCY_NAME}`,
      `> 🏛️ *Impuesto (30%):* -${tax.toLocaleString()}`,
      `> ✅ *Recibiste:* *${net.toLocaleString()} ${config.CURRENCY_NAME}*`,
      `\n*╚══⌦ ${config.footer} ⌫══╝*`
    ].join('\n'))
  }

  if (['collection', 'miscartas', 'cartas', 'mispersonajes'].includes(command)) {
    const target = m.quoted?.sender || sender
    const targetNum = extraerNum(target)
    const owned = getCharsByOwner(target)

    if (!owned.length) return m.reply(`*⌬┤ 🃏 ├⌬ COLECCIÓN VACÍA.*\n> ${target === sender ? 'No tenés' : `@${targetNum} no tiene`} personajes canjeados aún.\n> Usá *${usedPrefix}gacha* para invocar.`)

    owned.sort((a, b) => parseInt(b.value) - parseInt(a.value))

    const totalVal = owned.reduce((s, c) => s + parseInt(c.value), 0)
    let txt = `*╔═══⌦ ✦ 🃏 COLECCIÓN ✦ ⌫═══╗*\n\n`
    txt += `> 👤 *Dueño:* @${targetNum}\n`
    txt += `> 📦 *Personajes:* ${owned.length}\n`
    txt += `> 💰 *Valor total:* ${totalVal.toLocaleString()} ${config.CURRENCY_NAME}\n\n`

    for (const c of owned) {
      const r = getRarityData(c.value)
      txt += `> ${r.emoji} *#${c.id}* — ${c.name} _(${parseInt(c.value).toLocaleString()})_\n`
    }
    txt += `\n> Usá *${usedPrefix}ver <id>* para ver detalles.\n`
    txt += `*╚══⌦ ${config.footer} ⌫══╝*`

    return conn.sendMessage(m.chat, { text: txt, mentions: [target] }, { quoted: m })
  }

  if (['ver', 'info', 'carta'].includes(command)) {
    const id = args[0]
    if (!id) return m.reply(`*⌬┤ ✙ ├⌬ USO:* \`${usedPrefix}ver <id>\``)

    const char = getCharById(id)
    if (!char) return m.reply(`*⌬┤ ❌ ├⌬ PERSONAJE NO ENCONTRADO.*\n> ID *#${id}* no existe.`)

    let ownerName = null
    if (char.user) {
      const ownerDb = await User.findOne({ jid: { $regex: `^${extraerNum(char.user)}@` } }).lean()
      ownerName = ownerDb?.name || `+${extraerNum(char.user)}`
    }

    const img = char.img?.[Math.floor(Math.random() * char.img.length)]
    const caption = [`*╔═══⌦ ✦ 🃏 FICHA ✦ ⌫═══╗*\n`, buildCharCard(char, ownerName), `\n*╚══⌦ ${config.footer} ⌫══╝*`].join('\n')

    if (img) {
      try {
        return await conn.sendMessage(m.chat, { image: { url: img }, caption }, { quoted: m })
      } catch {
        return await m.reply(caption)
      }
    }
    return m.reply(caption)
  }

  if (['buscar', 'search', 'findchar'].includes(command)) {
    if (!text) return m.reply(`*⌬┤ ✙ ├⌬ USO:* \`${usedPrefix}buscar <nombre>\``)

    const q = text.toLowerCase()
    const chars = loadCharacters()
    const results = chars.filter(c =>
      c.name.toLowerCase().includes(q) || c.source.toLowerCase().includes(q)
    ).slice(0, 10)

    if (!results.length) return m.reply(`*⌬┤ 🔍 ├⌬ SIN RESULTADOS.*\n> No encontré personajes con *"${text}"*.`)

    let txt = `*╔═══⌦ ✦ 🔍 BÚSQUEDA ✦ ⌫═══╗*\n\n`
    txt += `> 🔎 *Query:* ${text}\n> 📦 *Resultados:* ${results.length}\n\n`
    for (const c of results) {
      const r = getRarityData(c.value)
      const status = c.user ? `❌ @${extraerNum(c.user)}` : '✅ Libre'
      txt += `> ${r.emoji} *#${c.id}* — ${c.name} — ${status}\n`
    }
    txt += `\n> Usá *${usedPrefix}ver <id>* para ver detalles.\n`
    txt += `*╚══⌦ ${config.footer} ⌫══╝*`

    return conn.sendMessage(m.chat, { text: txt }, { quoted: m })
  }

  if (['donar', 'regalar', 'gift'].includes(command)) {
    const id   = args[0]
    const targetRaw = m.quoted?.sender || (m.mentionedJid?.[0])
    if (!id || !targetRaw) return m.reply(`*⌬┤ ✙ ├⌬ USO:* Citá o mencioná al usuario y escribí *${usedPrefix}donar <id>*`)

    if (extraerNum(targetRaw) === senderNum) return m.reply(`*⌬┤ ❌ ├⌬ No podés donarte a vos mismo.*`)

    const chars = loadCharacters()
    const char  = chars.find(c => String(c.id) === String(id))
    if (!char) return m.reply(`*⌬┤ ❌ ├⌬ PERSONAJE NO ENCONTRADO.*`)
    if (!char.user || extraerNum(char.user) !== senderNum) return m.reply(`*⌬┤ 🚫 ├⌬ NO ES TUYO.*`)

    const recipientDb = await User.findOne({ jid: { $regex: `^${extraerNum(targetRaw)}@` } })
    if (!recipientDb?.registered) return m.reply(`*⌬┤ ❌ ├⌬ El usuario no está registrado.*`)

    char.user   = recipientDb.jid
    char.status = 'Canjeado'
    saveCharacters(chars)

    const r = getRarityData(char.value)
    return conn.sendMessage(m.chat, {
      text: [
        `*╔═══⌦ ✦ 🎁 DONACIÓN ✦ ⌫═══╗*\n`,
        `> ${r.color} *${char.name}* fue donado a @${extraerNum(targetRaw)}.`,
        `> ${r.emoji} *Rareza:* ${r.label}`,
        `> 💰 *Valor:* ${parseInt(char.value).toLocaleString()} ${config.CURRENCY_NAME}`,
        `\n*╚══⌦ ${config.footer} ⌫══╝*`
      ].join('\n'),
      mentions: [targetRaw, sender]
    }, { quoted: m })
  }

  if (['subastar', 'auction', 'subasta'].includes(command)) {
    const id    = args[0]
    const precio = parseInt(args[1])
    if (!id || isNaN(precio) || precio <= 0) return m.reply(`*⌬┤ ✙ ├⌬ USO:* \`${usedPrefix}subastar <id> <precio_base>\``)

    const chars = loadCharacters()
    const char  = chars.find(c => String(c.id) === String(id))
    if (!char) return m.reply(`*⌬┤ ❌ ├⌬ PERSONAJE NO ENCONTRADO.*`)
    if (!char.user || extraerNum(char.user) !== senderNum) return m.reply(`*⌬┤ 🚫 ├⌬ NO ES TUYO.*`)

    const existing = [...auctionSessions.values()].find(a => String(a.charId) === String(id))
    if (existing) return m.reply(`*⌬┤ ❌ ├⌬ Este personaje ya está en subasta.*`)

    const endTs = now + AUCTION_TTL
    auctionSessions.set(id, {
      charId: id, seller: sender, chat: m.chat,
      basePrice: precio, currentBid: precio, topBidder: null,
      endTs, ts: now
    })

    const r = getRarityData(char.value)
    const img = char.img?.[0]
    const caption = [
      `*╔═══⌦ ✦ 🏷️ SUBASTA INICIADA ✦ ⌫═══╗*\n`,
      buildCharCard(char),
      `\n> 💵 *Precio base:* ${precio.toLocaleString()} ${config.CURRENCY_NAME}`,
      `> ⏱️ *Duración:* 5 minutos`,
      `> 📢 Usá *${usedPrefix}pujar ${id} <monto>* para ofertar.`,
      `\n*╚══⌦ ${config.footer} ⌫══╝*`
    ].join('\n')

    if (img) {
      try {
        await conn.sendMessage(m.chat, { image: { url: img }, caption }, { quoted: m })
      } catch {
        await m.reply(caption)
      }
    } else {
      await m.reply(caption)
    }

    setTimeout(async () => {
      const sess = auctionSessions.get(id)
      if (!sess) return
      auctionSessions.delete(id)

      if (!sess.topBidder) {
        return conn.sendMessage(sess.chat, {
          text: `*⌬┤ 🏷️ ├⌬ SUBASTA FINALIZADA.*\n> *${char.name}* no recibió ofertas. El personaje queda con su dueño original.`
        }).catch(() => {})
      }

      char.user   = sess.topBidder
      char.status = 'Canjeado'
      saveCharacters(loadCharacters().map(c => String(c.id) === String(id) ? char : c))

      const sellerDb = await User.findOne({ jid: { $regex: `^${extraerNum(sess.seller)}@` } })
      if (sellerDb) {
        const { net, tax } = getNetSell(sess.currentBid)
        await User.updateOne({ jid: sellerDb.jid }, { $inc: { zenCoins: net } })
      }

      conn.sendMessage(sess.chat, {
        text: [
          `*╔═══⌦ ✦ 🏆 SUBASTA TERMINADA ✦ ⌫═══╗*\n`,
          `> 🃏 *Personaje:* ${char.name}`,
          `> 🥇 *Ganador:* @${extraerNum(sess.topBidder)}`,
          `> 💰 *Oferta ganadora:* ${sess.currentBid.toLocaleString()} ${config.CURRENCY_NAME}`,
          `> 💸 *Vendedor recibe (−30%):* ${getNetSell(sess.currentBid).net.toLocaleString()} ${config.CURRENCY_NAME}`,
          `\n*╚══⌦ ${config.footer} ⌫══╝*`
        ].join('\n'),
        mentions: [sess.topBidder, sess.seller]
      }).catch(() => {})
    }, AUCTION_TTL)
    return
  }

  if (['pujar', 'bid', 'ofertar'].includes(command)) {
    const id     = args[0]
    const monto  = parseInt(args[1])
    if (!id || isNaN(monto) || monto <= 0) return m.reply(`*⌬┤ ✙ ├⌬ USO:* \`${usedPrefix}pujar <id> <monto>\``)

    const sess = auctionSessions.get(id)
    if (!sess) return m.reply(`*⌬┤ ❌ ├⌬ No hay subasta activa para el personaje*#${id}*.`)
    if (extraerNum(sess.seller) === senderNum) return m.reply(`*⌬┤ 🚫 ├⌬ No podés pujar en tu propia subasta.*`)
    if (monto <= sess.currentBid) return m.reply(`*⌬┤ ❌ ├⌬ Tu oferta debe ser mayor a la actual:*${sess.currentBid.toLocaleString()} ${config.CURRENCY_NAME}*.`)
    if (userDb.zenCoins < monto) return m.reply(`*⌬┤ 💸 ├⌬ SIN FONDOS.*\n> Tenés *${userDb.zenCoins.toLocaleString()} ${config.CURRENCY_SYMBOL}* y ofertás *${monto.toLocaleString()} ${config.CURRENCY_SYMBOL}*.`)

    const left = sess.endTs - now
    if (left <= 0) return m.reply(`*⌬┤ ⌛ ├⌬ La subasta ya terminó.*`)

    if (sess.topBidder && extraerNum(sess.topBidder) !== senderNum) {
      const prevDb = await User.findOne({ jid: { $regex: `^${extraerNum(sess.topBidder)}@` } })
      if (prevDb) await User.updateOne({ jid: prevDb.jid }, { $inc: { zenCoins: sess.currentBid } })
    }

    await User.updateOne({ jid: userDb.jid }, { $inc: { zenCoins: -monto } })
    userDb.zenCoins -= monto
    await syncUserDb(userDb)

    sess.currentBid = monto
    sess.topBidder  = sender

    const char = getCharById(id)
    return conn.sendMessage(m.chat, {
      text: [
        `*╔═══⌦ ✦ 💵 NUEVA OFERTA ✦ ⌫═══╗*\n`,
        `> 🃏 *Personaje:* ${char?.name || `#${id}`}`,
        `> 🥇 *Oferta actual:* ${monto.toLocaleString()} ${config.CURRENCY_NAME}`,
        `> 👤 *Pujador:* @${senderNum}`,
        `> ⏱️ *Tiempo restante:* ${fmtTime(left)}`,
        `\n*╚══⌦ ${config.footer} ⌫══╝*`
      ].join('\n'),
      mentions: [sender]
    }, { quoted: m })
  }

  if (['subastas', 'auctions', 'versubastas'].includes(command)) {
    if (!auctionSessions.size) return m.reply(`*⌬┤ 🏷️ ├⌬ SIN SUBASTAS ACTIVAS.*\n> Usá *${usedPrefix}subastar <id> <precio>* para iniciar una.`)

    let txt = `*╔═══⌦ ✦ 🏷️ SUBASTAS ACTIVAS ✦ ⌫═══╗*\n\n`
    for (const [id, sess] of auctionSessions.entries()) {
      const char = getCharById(id)
      const r    = char ? getRarityData(char.value) : { emoji: '❓' }
      const left = sess.endTs - now
      txt += `> ${r.emoji} *#${id}* — ${char?.name || '???'}\n`
      txt += `>   💵 Oferta actual: *${sess.currentBid.toLocaleString()}*\n`
      txt += `>   ⏱️ Termina en: *${fmtTime(left)}*\n`
      txt += `>   📢 *${usedPrefix}pujar ${id} <monto>*\n\n`
    }
    txt += `*╚══⌦ ᴢᴇɴ‑ʙᴏＴ · ᴀxᴇʟᴅᴇᴠ⁰⁹ ⌫══╝*`
    return m.reply(txt)
  }

  if (['topcartas', 'rankcartas', 'rankgacha'].includes(command)) {
    const chars  = loadCharacters()
    const counts = {}
    for (const c of chars) {
      if (!c.user) continue
      const num = extraerNum(c.user)
      counts[num] = (counts[num] || { count: 0, value: 0 })
      counts[num].count++
      counts[num].value += parseInt(c.value)
    }

    const sorted = Object.entries(counts).sort((a, b) => b[1].value - a[1].value).slice(0, 10)
    if (!sorted.length) return m.reply(`*⌬┤ 🏆 ├⌬ Nadie tiene personajes aún.*`)

    let txt = `*╔═══⌦ ✦ 🏆 TOP COLECCIONISTAS ✦ ⌫═══╗*\n\n`
    const medals = ['🥇', '🥈', '🥉']
    sorted.forEach(([num, data], i) => {
      const medal = medals[i] || `${i + 1}.`
      txt += `> ${medal} *+${num}* — ${data.count} cartas · ${data.value.toLocaleString()} ${config.CURRENCY_NAME}\n`
    })
    txt += `\n*╚══⌦ ${config.footer} ⌫══╝*`
    return m.reply(txt)
  }

  if (['gachastats', 'misestadisticas'].includes(command)) {
    const owned    = getCharsByOwner(sender)
    const totalVal = owned.reduce((s, c) => s + parseInt(c.value), 0)
    const byRarity = { 'LEGENDARIO': 0, 'ÉPICO': 0, 'RARO': 0, 'POCO COMÚN': 0, 'COMÚN': 0 }
    for (const c of owned) {
      const r = getRarityData(c.value)
      byRarity[r.label] = (byRarity[r.label] || 0) + 1
    }

    const sess = gachaSessions.get(gachaSessionKey(m.chat, sender))
    const activeGacha = sess
      ? `⚡ Activa — #${sess.charId} (${fmtTime(GACHA_TTL - (now - sess.ts))} restante)`
      : '— Sin invocación pendiente'

    return m.reply([
      `*╔═══⌦ ✦ 📊 TUS STATS DE GACHA ✦ ⌫═══╗*\n`,
      `> 👤 *Usuario:* @${senderNum}`,
      `> 📦 *Total cartas:* ${owned.length}`,
      `> 💰 *Valor colección:* ${totalVal.toLocaleString()} ${config.CURRENCY_NAME}\n`,
      `*⌬┤ 🎴 POR RAREZA*`,
      `> 🌌 Legendario: ${byRarity['LEGENDARIO']}`,
      `> 💜 Épico: ${byRarity['ÉPICO']}`,
      `> 💙 Raro: ${byRarity['RARO']}`,
      `> 💚 Poco común: ${byRarity['POCO COMÚN']}`,
      `> ⬜ Común: ${byRarity['COMÚN']}\n`,
      `*⌬┤ 🎴 INVOCACIÓN*`,
      `> ${activeGacha}`,
      `\n*╚══⌦ ${config.footer} ⌫══╝*`
    ].join('\n'))
  }
}

handler.help = [
  'gacha', 'canjear <id>', 'vender <id>',
  'collection', 'ver <id>', 'buscar <nombre>',
  'donar <id>', 'subastar <id> <precio>',
  'pujar <id> <monto>', 'subastas', 'topcartas', 'gachastats'
]
handler.tags    = ['rpg']
handler.command = [
  'gacha', 'invocar', 'pull', 'rw', 'rollwaifu',
  'canjear', 'claim', 'reclamar',
  'vender', 'sell',
  'collection', 'miscartas', 'cartas', 'mispersonajes',
  'ver', 'info', 'carta',
  'buscar', 'search', 'findchar',
  'donar', 'regalar', 'gift',
  'subastar', 'auction', 'subasta',
  'pujar', 'bid', 'ofertar',
  'subastas', 'auctions', 'versubastas',
  'topcartas', 'rankcartas', 'rankgacha',
  'gachastats', 'misestadisticas'
]
handler.register = true

export default handler