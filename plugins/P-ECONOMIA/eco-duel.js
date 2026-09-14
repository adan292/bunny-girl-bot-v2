import User from '../../lib/database/models/zen-users.js'
import config from '../../config.js'
import { userCache } from '../../lib/caches.js'

const extraerNum = (jid = '') => (typeof jid === 'string' ? jid : '').split('@')[0].split(':')[0].replace(/\D/g, '')

const resolveTargetJid = (m, participants = []) => {
  const raw = m.mentionedJid?.[0] || m.quoted?.sender || null
  if (!raw) return null
  if (!raw.endsWith('@lid')) return raw
  const p = participants.find(p => p.id === raw || p.lid === raw)
  if (p?.phoneNumber) return `${String(p.phoneNumber).replace(/\D/g, '')}@s.whatsapp.net`
  if (p?.id?.includes('@s.whatsapp.net')) return p.id
  return raw
}

const findByNum = (jid) => {
  const num = extraerNum(jid)
  if (!num) return null
  return User.findOne({ jid: { $regex: `^${num}@` } })
}

const SWORD_BUFF = {
  none: 1.0,
  normal: 1.15,
  rare: 1.30,
  mythic: 1.50,
  legendary: 1.80
}

const SWORD_ICON = {
  none: '',
  normal: '⚔️',
  rare: '🗡️',
  mythic: '🌌',
  legendary: '🔥'
}

const POTION_HP = {
  normal: 200,
  rare: 350,
  mythic: 600
}

function bestPotion(inv) {
  const stock = inv?.potionStock instanceof Map ? Object.fromEntries(inv.potionStock) : (inv?.potionStock || {})
  for (const tier of ['mythic', 'rare', 'normal']) {
    if (stock[tier] > 0) return { tier, hpBonus: POTION_HP[tier] }
  }
  if ((inv?.potion || 0) > 0 && !stock.normal && !stock.rare && !stock.mythic) {
    return { tier: 'normal', hpBonus: POTION_HP.normal, legacy: true }
  }
  return null
}

const battleStories = [
    "🤠 Se miraron a los ojos en el centro del pueblo. {w} fue más rápido desenfundando su revólver y dejó a {l} besando el polvo.",
    "⚔️ En un choque de espadas épico, {w} encontró un hueco en la defensa de {l} y terminó el combate con un tajo certero.",
    "🥋 {w} aplicó una técnica secreta de artes marciales que dejó a {l} paralizado antes de que pudiera parpadear.",
    "🪄 {w} lanzó un hechizo de fuego que consumió el escudo de {l}. El duelo terminó en una explosión de cenizas 🔥.",
    "🦾 En una pelea callejera brutal, {w} conectó un gancho de derecha que mandó a {l} directo a la lona.",
    "🌌 {w} usó un sable de luz para desarmar a {l} en medio de una estación espacial futurista ⚔️.",
    "🏹 {l} lanzó una flecha, pero {w} la partió a la mitad con un cuchillo y contraatacó con precisión quirúrgica 🎯.",
    "🥊 {w} dominó los 12 rounds y terminó ganando por decisión unánime, dejando a {l} muy lastimado.",
    "🐉 {w} invocó el poder del dragón antiguo, reduciendo la voluntad de {l} a cenizas 💨.",
    "♟️ No fue una pelea de fuerza, sino de ingenio. {w} le hizo jaque mate a {l} en pocos movimientos 🧠.",
    "🧨 {l} intentó usar una granada, pero {w} se la devolvió de una patada antes de que explotara ¡BOOM! 💥.",
    "👟 {w} hizo un truco increíble sobre la cabeza de {l} y le robó la billetera en el aire ¡Hulk flip! 👟.",
    "⚡ {w} se movió a la velocidad del rayo, apareciendo detrás de {l} antes de que este pudiera reaccionar.",
    "🛡️ {l} atacó con todo, pero {w} se mantuvo firme como una roca y esperó el momento justo para el contragolpe 🗿.",
    "💻 {w} hackeó los sistemas de defensa de {l}, dejando sus armas totalmente inútiles 💻.",
    "🔱 Ante miles de espectadores en el coliseo, {w} obligó a {l} a pedir clemencia de rodillas 🔱.",
    "🌊 {w} controló las mareas para arrastrar a {l} mar adentro, ganando el duelo por sumisión 🌊.",
    "🎤 {w} lanzó unas rimas tan potentes en la batalla de rap que {l} se retiró llorando del escenario 🔥.",
    "👨‍🍳 Fue un duelo de cocina. El plato de {w} fue tan exquisito que {l} se rindió al primer bocado 👨‍🍳.",
    "💀 {l} fue rodeado por los aliados no-muertos de {w}. No tuvo ninguna oportunidad de escapar 💀.",
    "💨 En una carrera ilegal, {w} activó el nitro en el último segundo y dejó a {l} oliendo caucho quemado 💨.",
    "🪵 {w} partió el hacha de {l} a la mitad con un golpe brutal de pura fuerza bruta 🪵.",
    "🌫️ {w} se volvió intangible y los ataques de {l} solo atravesaban el aire. El miedo venció al perdedor 🌫️.",
    "🐺 Bajo la luna llena, {w} mostró su verdadera forma y {l} huyó aterrorizado dejando su oro 🐺.",
    "🥵 El duelo ocurrió al borde de un volcán. {w} empujó a {l} hacia las cenizas calientes 🥵.",
    "📡 Un satélite controlado por {w} disparó un rayo láser desde el espacio, desintegrando a {l} 📡.",
    "🧪 {w} usó un veneno paralizante en sus dagas. {l} cayó al suelo sin poder mover un músculo 🧪.",
    "❄️ En la cima del Everest, el frío venció a {l}, pero {w} resistió gracias a su entrenamiento legendario ❄️.",
    "🎾 {w} le devolvió el ataque a {l} con tanta fuerza que rebotó y lo noqueó a él mismo 🎾.",
    "👶 {w} le quitó la apuesta a {l} como si fuera un dulce a un bebé ¡Qué fácil! 👶.",
    "🤘 {w} tocó un solo de guitarra tan épico que la cabeza de {l} explotó de pura envidia 🤘.",
    "🏗️ {l} chocó contra el muro defensivo que {w} construyó en solo tres segundos 🏗️.",
    "📍 {w} pinchó la confianza de {l} con un solo comentario sarcástico antes de derrotarlo 📍.",
    "🚲 {w} escapó con el botín en una bicicleta vieja mientras {l} intentaba entender qué había pasado 🚲.",
    "🐾 {w} tiene reflejos de gato y esquivó cada estocada de {l} con una elegancia insultante 🐾.",
    "✨ {w} usó el brillo de sus diamantes para cegar a {l} y asestar el golpe final ✨.",
    "👤 {w} se camufló con el bosque y atacó a {l} desde las sombras. Nadie lo vio venir 👤.",
    "🍯 Un enjambre de abejas entrenadas por {w} persiguió a {l} hasta que soltó su bolsa de dinero 🍯.",
    "🛤️ {w} arrolló a {l} como un tren de carga. La diferencia de poder fue devastadora 🛤️.",
    "🌊 {w} ancló las esperanzas de {l} al fondo del mar con un golpe contundente en el pecho 🌊.",
    "🃏 {w} tenía un as bajo la manga y engañó a {l} en la apuesta final del duelo 🃏.",
    "👹 {w} usó una máscara aterradora que hizo que a {l} se le congelara la sangre en las venas 👹.",
    "🛠️ {w} martilleó la voluntad de {l} hasta que este no pudo más que rendirse ante su superioridad 🛠️.",
    "🍜 {w} lanzó una poción de debilidad y {l} quedó tan flojo como un fideo hervido 🍜.",
    "👀 En la oscuridad total, los ojos de {w} fueron lo último que {l} vio antes de perderlo todo 👀.",
    "🗑️ {w} barrió el suelo con {l} y luego lo tiró a la basura como el desecho que es 🗑️.",
    "🔬 {w} tiene ADN de guerrero de élite, mientras que {l} parece un error de la naturaleza 🔬.",
    "👑 {w} reclamó su trono tras derrotar al pretendiente {l} en un duelo a muerte por la corona 👑.",
    "🛐 {w} recibió la bendición de la Deidad Suprema y aplastó a {l} con un solo dedo 🛐.",
    "🌪️ Un tornado invocado por {w} lanzó a {l} a otro continente en menos de un segundo 🌪️.",
    "💰 {w} sobornó a los jueces del duelo y {l} fue declarado perdedor antes de empezar 💰.",
    "🎯 {w} disparó una flecha desde un kilómetro de distancia y le dio justo al sombrero de {l} 🎯.",
    "🚫 {w} compró el edificio donde vivía {l} y lo desalojó en medio del duelo ¡Qué mala leche! 🚫.",
    "🦴 {w} trajo un T-Rex de una cápsula del tiempo para devorar las esperanzas de {l} 🦴.",
    "🥴 {w} le dio una pastilla de placebo a {l} y este creyó que estaba muriendo de verdad 🥴.",
    "☂️ {w} usó un paraguas para bloquear todos los proyectiles de {l} como si fuera un juego ☂️.",
    "💩 {w} entrenó a miles de palomas para que bombardearan a {l} sin piedad alguna 💩.",
    "🕳️ {w} usó un GPS trucado para que {l} caminara directo hacia una trampa para osos 🕳️.",
    "🚀 {w} lanzó a {l} fuera de la órbita terrestre de una patada magistral ¡Adiós! 🚀."
]

const handler = async (m, { conn, text, usedPrefix, command, userDb, participants }) => {
    try {
        if (!userDb) return
        const senderJid = userDb.jid
        const cooldown = 300000
        const now = Date.now()
        const remaining = cooldown - (now - (userDb.lastDuel || 0))

        if (remaining > 0) {
            return m.reply(`*⌬┤ ⏳ ├⌬ ARENA CERRADA.*\n> Esperá: *${Math.floor(remaining / 60000)}m ${Math.floor((remaining % 60000) / 1000)}s*.`)
        }

        const targetRaw = resolveTargetJid(m, participants)
        if (!targetRaw || extraerNum(targetRaw) === extraerNum(m.sender)) {
            return m.reply(`*⌬┤ ⚔️ ├⌬ DUELO*\n> Uso: ${usedPrefix + command} @usuario [apuesta opcional]`)
        }

        const txt = text || ''
        const montoMatch = txt.replace(/@\d+/g, '').match(/\d+/)
        let apuesta
        let fueAleatoria = false

        if (montoMatch) {
            apuesta = parseInt(montoMatch[0])
            if (apuesta < 2 || apuesta > 10000) {
                return m.reply(`*⌬┤ ⚠️ ├⌬ APUESTA INVÁLIDA.*\n> El rango válido es de *2 a 10,000* ${config.CURRENCY_NAME}.`)
            }
        } else {
            apuesta = Math.floor(Math.random() * 3499) + 2
            fueAleatoria = true
        }

        if (userDb.zenCoins < apuesta) {
            return m.reply(`*⌬┤ ❌ ├⌬ FONDOS INSUFICIENTES.*\n> Necesitás *${apuesta}* ${config.CURRENCY_NAME} pero tenés *${userDb.zenCoins}*.`)
        }

        const v = await findByNum(targetRaw)
        if (!v) return m.reply(`*⌬┤ ❌ ├⌬ RIVAL NO REGISTRADO.*`)
        if (v.zenCoins < apuesta) {
            return m.reply(`*⌬┤ ❌ ├⌬ RIVAL SIN FONDOS.*\n> Tiene *${v.zenCoins}* ${config.CURRENCY_NAME} pero la apuesta es *${apuesta}*.`)
        }

        const target = v.jid

        const invA = userDb.inventory || {}
        const invB = v.inventory || {}

        const swordTierA = invA.swordTier && invA.swordTier !== 'none' ? invA.swordTier : (invA.sword > 0 ? 'normal' : 'none')
        const swordTierB = invB.swordTier && invB.swordTier !== 'none' ? invB.swordTier : (invB.sword > 0 ? 'normal' : 'none')
        const dmgBuffA = SWORD_BUFF[swordTierA] ?? 1.0
        const dmgBuffB = SWORD_BUFF[swordTierB] ?? 1.0
        const usedSwordA = swordTierA !== 'none'
        const usedSwordB = swordTierB !== 'none'

        const potionA = bestPotion(invA)
        const potionB = bestPotion(invB)
        let hpA = 100 + (potionA ? potionA.hpBonus : 0)
        let hpB = 100 + (potionB ? potionB.hpBonus : 0)

        const updateA = { $inc: {}, $set: { lastDuel: now } }
        const updateB = { $inc: {} }

        if (potionA) {
            if (potionA.legacy) {
                updateA.$inc['inventory.potion'] = -1
            } else {
                updateA.$inc[`inventory.potionStock.${potionA.tier}`] = -1
                updateA.$inc['inventory.potion'] = -1
            }
        }
        if (potionB) {
            if (potionB.legacy) {
                updateB.$inc['inventory.potion'] = -1
            } else {
                updateB.$inc[`inventory.potionStock.${potionB.tier}`] = -1
                updateB.$inc['inventory.potion'] = -1
            }
        }

        if (usedSwordA) {
            const nuevosUsos = (invA.swordUses || 1) - 1
            updateA.$inc['inventory.swordUses'] = -1
            if (nuevosUsos <= 0) {
                updateA.$set['inventory.swordTier'] = 'none'
                updateA.$set['inventory.sword'] = 0
            }
        }
        if (usedSwordB) {
            const nuevosUsos = (invB.swordUses || 1) - 1
            updateB.$inc['inventory.swordUses'] = -1
            if (nuevosUsos <= 0) {
                updateB.$set = { ...(updateB.$set || {}), 'inventory.swordTier': 'none', 'inventory.sword': 0 }
            }
        }

        let logs = []
        while (hpA > 0 && hpB > 0) {
            let d1 = Math.floor((Math.random() * 20 + 10) * dmgBuffA)
            hpB -= d1
            logs.push(`⚔️ @${extraerNum(m.sender)} quita ${d1} PV`)
            if (hpB <= 0) break
            let d2 = Math.floor((Math.random() * 20 + 10) * dmgBuffB)
            hpA -= d2
            logs.push(`🛡️ @${extraerNum(target)} responde con ${d2} PV`)
        }

        const win = hpA > 0
        const winner = win ? senderJid : target
        const loser  = win ? target : senderJid

        if (win) {
            updateA.$inc.zenCoins = apuesta
            updateB.$inc.zenCoins = -apuesta
            userDb.zenCoins += apuesta
        } else {
            updateA.$inc.zenCoins = -apuesta
            updateB.$inc.zenCoins = apuesta
            userDb.zenCoins -= apuesta
        }
        userDb.lastDuel = now

        await Promise.all([
          User.updateOne({ jid: senderJid }, updateA),
          User.updateOne({ jid: target }, updateB)
        ])

        const targetCache = userCache.get(target) || userCache.get(extraerNum(target))
        if (targetCache) {
            targetCache.zenCoins += (win ? -apuesta : apuesta)
            if (potionB) {
                if (targetCache.inventory.potionStock?.[potionB.tier] !== undefined) {
                    targetCache.inventory.potionStock[potionB.tier] = Math.max(0, targetCache.inventory.potionStock[potionB.tier] - 1)
                }
                targetCache.inventory.potion = Math.max(0, (targetCache.inventory.potion || 1) - 1)
            }
            if (usedSwordB) {
                targetCache.inventory.swordUses = Math.max(0, (targetCache.inventory.swordUses || 1) - 1)
                if (targetCache.inventory.swordUses <= 0) {
                    targetCache.inventory.swordTier = 'none'
                    targetCache.inventory.sword = 0
                }
            }
        }

        const story = battleStories[Math.floor(Math.random() * battleStories.length)]
            .replace(/{w}/g, `@${extraerNum(winner)}`)
            .replace(/{l}/g, `@${extraerNum(loser)}`)

        const pfp = await conn.profilePictureUrl(winner, 'image').catch(() => 'https://i.ibb.co/nNkgRQjK/images-4.jpg')

        const hpInicialA = 100 + (potionA ? potionA.hpBonus : 0)
        const hpInicialB = 100 + (potionB ? potionB.hpBonus : 0)

        let resText = `*╔═══⌦ ✦ ⚔️ DUELO ⚔️ ✦ ⌫═══╗*\n\n`
        if (fueAleatoria) resText += `> 🎲 *Apuesta aleatoria:* ${apuesta} ${config.CURRENCY_NAME}\n\n`
        resText += `*📊 PUNTOS DE VIDA:*\n`
             + `> @${extraerNum(m.sender)}: ${hpInicialA} PV ${usedSwordA ? SWORD_ICON[swordTierA] : ''}${potionA ? ' 🧪' : ''}\n`
             + `> @${extraerNum(target)}: ${hpInicialB} PV ${usedSwordB ? SWORD_ICON[swordTierB] : ''}${potionB ? ' 🧪' : ''}\n\n`
             + `*📝 BATALLA:*\n${logs.slice(-5).join('\n')}\n...\n\n`
             + `> 📖 ${story}\n\n`
             + `*🏆 GANADOR:* @${extraerNum(winner)}\n`
             + `*💰 BOTÍN:* ${apuesta * 2} ${config.CURRENCY_NAME}\n`
             + `*╚══⌦ ${config.footer} ⌫══╝*`

        await conn.sendMessage(m.chat, { image: { url: pfp }, caption: resText, mentions: [senderJid, target] }, { quoted: m })

    } catch (e) {
        console.error('[ERROR DUELO]', e)
        m.reply(`*⌬┤ ❌ ├⌬ OCURRIÓ UN ERROR INTERNO.*\n> Por favor, intenta de nuevo.`)
    }
}

handler.help = ['duelo @tag [apuesta]']
handler.tags = ['eco']
handler.command = ['duel', 'duelo']
handler.groupOnly = true
handler.register = true
export default handler
