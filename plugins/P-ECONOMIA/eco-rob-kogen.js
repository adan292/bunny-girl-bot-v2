import User from '../../lib/database/models/zen-users.js'
import config from '../../config.js'

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
  return User.findOne({ jid: { $regex: `^${num}@` } }).lean()
}

function parseKogen(val) {
  if (val == null) return 0
  if (typeof val === 'number') return val
  if (typeof val === 'string') return parseFloat(val) || 0
  if (typeof val === 'object') {
    if (val.$numberDecimal) return parseFloat(val.$numberDecimal) || 0
    if (typeof val.toString === 'function') {
      const s = val.toString()
      if (s !== '[object Object]') return parseFloat(s) || 0
    }
  }
  return 0
}

function bestShield(inv) {
  const stock = inv?.shieldStock instanceof Map ? Object.fromEntries(inv.shieldStock) : (inv?.shieldStock || {})
  for (const tier of ['mythic', 'rare', 'normal']) {
    if (stock[tier] > 0) return { tier }
  }
  if ((inv?.shield || 0) > 0 && !stock.normal && !stock.rare && !stock.mythic) {
    return { tier: 'normal', legacy: true }
  }
  return null
}

const ESCENARIOS_EXITO = [
  "Bypasseaste los cortafuegos principales usando una inyección de firmware descompilado directamente en el puerto de mantenimiento de la bóveda.",
  "Te hiciste pasar por un técnico de soporte oficial de Zen-Bot. La IA de seguridad te cedió las credenciales de root sin chistar.",
  "Sobrecargaste los nodos de red de la víctima con un ataque de desbordamiento de búfer y abriste su bóveda criogénica de Kōgen.",
  "Sincronizaste tu terminal con los satélites de la red para desviar el flujo de datos premium a tu billetera personal encriptada.",
  "Instalaste un malware sigiloso tipo troyano en su cliente de mensajería que siphoneó las firmas digitales del depósito.",
  "Bypasseaste los detectores de proximidad virtual camuflándote detrás del ruido de fondo de las transacciones comunes del bot.",
  "Con tu terminal overclockeada, forzaste un descifrado por fuerza bruta sobre el mainframe de almacenamiento premium.",
  "Usaste una llave criptográfica obsoleta pero válida que los sistemas de la víctima olvidaron dar de baja en el último parche.",
  "Secuestraste temporalmente el nodo de validación del grupo, autorizando tu propia transacción de Kōgen sin levantar sospechas.",
  "Aprovechaste una brecha de seguridad en los servidores locales para duplicar el canal de transferencia de fondos premium.",
  "Infiltraste la base de datos simulando un paquete de actualización de firmware del sistema del bot.",
  "Desviaste la atención de la IA centinela con un paquete falso mientras vaciabas los compartimentos traseros de su bóveda.",
  "Hackeaste los registros DNS del host local, redirigiendo la base de datos de transacciones a tu servidor proxy personal.",
  "Utilizaste ingeniería social inversa engañando al bot de seguridad para que creyera que tu billetera era la cuenta de respaldo de la víctima.",
  "Extrajiste las claves privadas usando un ataque de canal lateral analizando las fluctuaciones de consumo energético de su servidor.",
  "Lograste interceptar el tráfico mediante un ataque Man-in-the-Middle simulando ser el servidor central de autenticación de Zen-Bot.",
  "Un script de automatización que dejaste latente en su base de datos se activó a medianoche, ejecutando el asalto cuántico sin fallas.",
  "Sobornaste virtualmente al protocolo de enrutamiento fronterizo para que reencaminara los depósitos premium a tu terminal.",
  "Ejecutaste un ataque de denegación de servicio distribuido que congeló sus sistemas mientras tus bots hacían el trabajo sucio.",
  "Bypasseaste el lector biométrico de la bóveda utilizando un render sintético generado por inteligencia artificial.",
  "Clonaste las credenciales de administrador de la víctima tras interceptar una sesión de depuración abierta por error.",
  "Inyectaste comandos SQL maliciosos directamente a través de los metadatos de una imagen de perfil, abriendo el mainframe.",
  "Lograste infiltrarte gracias a una puerta trasera de fábrica que los desarrolladores de la base de datos dejaron sin querer.",
  "Saturaste los buffers de memoria de su firewall cuántico obligando al sistema a entrar en modo de recuperación sin protección.",
  "Desencriptaste las firmas SHA-256 de las bóvedas de almacenamiento utilizando una supercomputadora alquilada en la deep web.",
  "Hiciste un bypass de seguridad haciéndote pasar por un nodo validador de la blockchain privada de Kōgen.",
  "Lograste clonar la clave física OTP del objetivo interceptando la señal electromagnética de su dispositivo.",
  "Reemplazaste el archivo de configuración de seguridad de su terminal por una plantilla vacía mediante un ataque FTP sigiloso.",
  "Inyectaste código malicioso directamente en la caché del procesador central del objetivo para desviar los fondos.",
  "Te abriste paso descifrando el firmware de la bóveda cuántica y extrayendo los activos premium directamente a tu terminal."
]

const ESCENARIOS_FALLO = [
  "Activaste un honeypot camuflado que alertó instantáneamente a la red de seguridad de la corporación.",
  "La Inteligencia Artificial de la red detectó fluctuaciones inusuales de tráfico y bloqueó tus puertos de salida.",
  "Un escáner centinela detectó tu firma digital corrupta e inició un protocolo de rastreo inverso de inmediato.",
  "El cortafuegos cuántico de la víctima se cerró de golpe atrapando tus herramientas de hackeo dentro del sistema.",
  "Un bot de monitoreo de transacciones sospechosas detectó tu intento de inyección de código y bloqueó tu acceso.",
  "La terminal cuántica que estabas usando se sobrecalentó debido a un ataque de saturación defensivo de su servidor.",
  "Tu troyano fue aislado en un entorno sandbox donde los sistemas defensivos estudiaron y rastrearon tu dirección MAC.",
  "Te tropezaste con una trampa de trituración de datos que borró tus scripts de infiltración y expuso tus datos personales.",
  "El nodo de validación detectó tu firma falsificada y mandó un reporte automático a las autoridades de Zen-Bot.",
  "Apareció un parche de seguridad de emergencia justo en medio de tu asalto cuántico, dejándote atrapado en la red.",
  "Un analista de seguridad de la corporación detectó tus conexiones sospechosas y activó la alarma manual del mainframe.",
  "Tus paquetes de datos falsificados fueron rechazados por el validador debido a una inconsistencia de hashes SHA-256.",
  "El cortafuegos redirigió tu terminal de hackeo a un bucle infinito que consumió todos tus recursos del sistema.",
  "Tu proxy de la deep web cayó de repente dejando expuesta tu IP real ante los sistemas defensivos de la víctima.",
  "El sistema de seguridad del objetivo ejecutó un borrado de memoria flash defensivo, destruyendo tus vectores de ataque.",
  "Fuiste delatado por un bot de monitoreo de red que detectó tu escaneo de puertos sobre la bóveda premium.",
  "El validador multifactor de la víctima rechazó tu huella digital clonada y bloqueó el acceso permanentemente.",
  "Tropezaste con un cortafuegos adaptativo que copió tu propia firma y la utilizó para bloquear tus herramientas de ataque.",
  "La base de datos defensiva reconoció el exploit que estabas usando porque ya había sido parcheado en la mañana.",
  "Tu conexión de red sufrió una microcaída de milisegundos que desincronizó tu bypass cuántico activando las alarmas de red."
]

const handler = async (m, { userDb, participants }) => {
  if (!userDb) return
  const senderJid = userDb.jid

  if ((userDb.level || 0) < 15) {
    return m.reply(`*⌬┤ 🔒 ├⌬ NIVEL INSUFICIENTE.*\n\n> Necesitás ser mínimo *Nivel 15* para realizar incursiones cuánticas.\n> Tu nivel actual: *${userDb.level}*.`)
  }

  const cooldown = 3600000
  const now = Date.now()
  const elapsed = now - (userDb.lastKogenRob || 0)

  if (elapsed < cooldown) {
    const remaining = cooldown - elapsed
    return m.reply(`*⌬┤ ⏳ ├⌬ SISTEMA BLOQUEADO.*\n\n> Tu terminal de hackeo está en enfriamiento.\n> Esperá: *${Math.floor(remaining / 60000)}m ${Math.floor((remaining % 60000) / 1000)}s*.`)
  }

  const targetRaw = resolveTargetJid(m, participants)
  if (!targetRaw || extraerNum(targetRaw) === extraerNum(m.sender)) {
    return m.reply('*⌬┤ ⚠️ · ETIQUETÁ O RESPONDÉ A ALGUIEN.*')
  }

  const targetDb = await findByNum(targetRaw)
  if (!targetDb) return m.reply('*⌬┤ ❌ · USUARIO NO REGISTRADO.*')

  const targetJid = targetDb.jid
  const targetKogenVal = parseKogen(targetDb.kogen)

  if (targetKogenVal < 30) {
    return m.reply(`*⌬┤ 🛡️ ├⌬ BÓVEDA PROTEGIDA.*\n\n> No podés asaltar a @${extraerNum(targetJid)}. Su cuenta tiene menos de *30 ${config.PREMIUM_NAME}*, activando el bloqueo de seguridad.`)
  }

  userDb.lastKogenRob = now
  const shield = bestShield(targetDb.inventory)

  if (shield) {
    const updateTarget = { $inc: {} }
    if (shield.legacy) {
      updateTarget.$inc['inventory.shield'] = -1
    } else {
      updateTarget.$inc[`inventory.shieldStock.${shield.tier}`] = -1
      updateTarget.$inc['inventory.shield'] = -1
    }

    let penaltyText = ''
    if (shield.tier === 'mythic') {
      const attackerKogen = parseKogen(userDb.kogen)
      const penaltyKogen = Math.min(attackerKogen, 2)
      if (penaltyKogen > 0) {
        userDb.kogen = attackerKogen - penaltyKogen
        updateTarget.$inc.kogen = penaltyKogen
        penaltyText = `\n> ⚡ El contra-hackeo de su escudo *Mítico* te penalizó con *${penaltyKogen} ${config.PREMIUM_NAME}*, que fueron transferidos al objetivo.`
      }
    }

    await Promise.all([
      User.updateOne({ jid: targetJid }, updateTarget),
      User.updateOne({ jid: senderJid }, { $set: { lastKogenRob: now, kogen: userDb.kogen } })
    ])

    let shieldTxt = `*╔═══⌦ ✦ 🛡️ INTRUSIÓN DETENIDA ✦ ⌫═══╗*\n\n`
                  + `> Intentaste hackear a @${extraerNum(targetJid)} pero su escudo *${shield.tier.toUpperCase()}* detuvo tu ataque.\n`
                  + `> El escudo ha sido destruido.${penaltyText}\n\n`
                  + `*╚══⌦ ${config.footer} ⌫══╝*`

    return m.reply(shieldTxt, { mentions: [targetJid] })
  }

  let chance = 0.35
  let bonusLogs = []

  if (userDb.inventory?.amulet === 'thief') {
    chance += 0.10
    bonusLogs.push(`> 🥷 *Amuleto del Ladrón:* +10% de probabilidad.`)
  }

  if (userDb.inventory?.title === 'title_sombra') {
    chance += 0.10
    bonusLogs.push(`> 👤 *Título "Sombra":* +10% de sigilo cuántico.`)
  }

  let usarMascara = false
  if (userDb.inventory?.mask === true) {
    chance += 0.25
    usarMascara = true
    bonusLogs.push(`> 👺 *Máscara Hacker usada:* +25% de probabilidad (Consumida).`)
  }

  if (Math.random() < chance) {
    let stolenKogen = 3
    let asaltoExcepcional = false

    if (targetKogenVal >= 100000) {
      asaltoExcepcional = true
      const maxWhaleSteal = Math.min(10000, Math.floor(targetKogenVal * 0.05))
      const minWhaleSteal = 100
      stolenKogen = Math.max(minWhaleSteal, Math.floor(Math.random() * (maxWhaleSteal - minWhaleSteal + 1)) + minWhaleSteal)
    } else {
      const maxStorableSteal = Math.min(targetKogenVal - 15, 10)
      stolenKogen = Math.max(3, Math.floor(Math.random() * (maxStorableSteal - 3 + 1)) + 3)
    }

    const stolenCoins = Math.floor(Math.random() * (150 - 40 + 1)) + 40

    const attackerKogen = parseKogen(userDb.kogen)
    userDb.kogen = attackerKogen + stolenKogen
    userDb.zenCoins = (userDb.zenCoins || 0) + stolenCoins

    const updateSender = {
      $inc: { kogen: stolenKogen, zenCoins: stolenCoins },
      $set: { lastKogenRob: now }
    }

    if (usarMascara) {
      updateSender.$set['inventory.mask'] = false
    }

    await Promise.all([
      User.updateOne({ jid: targetJid }, { $inc: { kogen: -stolenKogen } }),
      User.updateOne({ jid: senderJid }, updateSender)
    ])

    const escenario = ESCENARIOS_EXITO[Math.floor(Math.random() * ESCENARIOS_EXITO.length)]

    let successTxt = `*╔═══⌦ ✦ 🛰️ ASALTO EXITOSO ✦ ⌫═══╗*\n\n`
                   + `> 👤 *Víctima:* @${extraerNum(targetJid)}\n`
                   + `> 🔮 *Escenario:* ${escenario}\n\n`
                   + `*⌬┤ 💾 DATOS DE LA OPERACIÓN ├⌬*\n`
                   + `> ✦ *${config.PREMIUM_NAME} robados:* ${stolenKogen} ${config.PREMIUM_SYMBOL}\n`
                   + `> ⌬ *${config.CURRENCY_NAME} siphoneados:* ${stolenCoins} ${config.CURRENCY_SYMBOL}\n\n`

    if (asaltoExcepcional) {
      successTxt += `> 🌌 *¡FALLA DE SEGURIDAD DETECTADA!*\n`
                 + `> La inmensa acumulación de activos en la bóveda del objetivo colapsó sus protocolos defensivos, lo que te permitió realizar una extracción masiva de grado gubernamental.\n\n`
    }

    if (bonusLogs.length) {
      successTxt += `*⌬┤ 🛠️ POTENCIADORES ├⌬*\n` + bonusLogs.join('\n') + `\n\n`
    }

    successTxt += `*╚══⌦ ${config.footer} ⌫══╝*`
    return m.reply(successTxt, { mentions: [targetJid] })

  } else {
    const failureOutcome = Math.random() < 0.50
    const escenario = ESCENARIOS_FALLO[Math.floor(Math.random() * ESCENARIOS_FALLO.length)]

    const updateSender = { $set: { lastKogenRob: now } }
    if (usarMascara) {
      updateSender.$set['inventory.mask'] = false
    }

    if (failureOutcome) {
      const zcLoss = Math.floor(Math.random() * (3000 - 1000 + 1)) + 1000
      const actualZcLoss = Math.min(userDb.zenCoins || 0, zcLoss)

      userDb.zenCoins -= actualZcLoss
      updateSender.$inc = { zenCoins: -actualZcLoss }

      await User.updateOne({ jid: senderJid }, updateSender)

      let failTxt = `*╔═══⌦ ✦ 🚨 SISTEMA COMPROMETIDO ✦ ⌫═══╗*\n\n`
                  + `> 👤 *Objetivo:* @${extraerNum(targetJid)}\n`
                  + `> 📡 *Escenario:* ${escenario}\n\n`
                  + `*⌬┤ 👮 CONSECUENCIAS ├⌬*\n`
                  + `> 💸 *Multa de escape:* ${actualZcLoss} ${config.CURRENCY_NAME} perdidos.\n\n`

      if (bonusLogs.length) {
        failTxt += `*⌬┤ 🛠️ COMPONENTES USADOS ├⌬*\n` + bonusLogs.join('\n') + `\n\n`
      }

      failTxt += `*╚══⌦ ${config.footer} ⌫══╝*`
      return m.reply(failTxt, { mentions: [targetJid] })

    } else {
      const attackerKogen = parseKogen(userDb.kogen)
      const kogenLoss = Math.floor(Math.random() * (3 - 1 + 1)) + 1
      const actualKogenLoss = Math.min(attackerKogen, kogenLoss)

      userDb.kogen = attackerKogen - actualKogenLoss
      updateSender.$inc = { kogen: -actualKogenLoss }

      await Promise.all([
        User.updateOne({ jid: targetJid }, { $inc: { kogen: actualKogenLoss } }),
        User.updateOne({ jid: senderJid }, updateSender)
      ])

      let totalFailTxt = `*╔═══⌦ ✦ 👮 TERMINAL CONFISCADA ✦ ⌫═══╗*\n\n`
                       + `> 👤 *Objetivo:* @${extraerNum(targetJid)}\n`
                       + `> 📡 *Escenario:* ${escenario}\n\n`
                       + `*⌬┤ 🚔 SANCIONES PREMIUM ├⌬*\n`
                       + `> 💔 *${config.PREMIUM_NAME} transferidos:* ${actualKogenLoss} ${config.PREMIUM_SYMBOL} confiscados para compensar a la víctima.\n\n`

      if (bonusLogs.length) {
        totalFailTxt += `*⌬┤ 🛠️ COMPONENTES USADOS ├⌬*\n` + bonusLogs.join('\n') + `\n\n`
      }

      totalFailTxt += `*╚══⌦ ${config.footer} ⌫══╝*`
      return m.reply(totalFailTxt, { mentions: [targetJid] })
    }
  }
}

handler.help = ['robkogen @tag']
handler.tags = ['eco']
handler.command = ['robkogen', 'robark', 'rbk', 'rk', 'heist', 'robarkogen']
handler.groupOnly = true
handler.register = true
export default handler