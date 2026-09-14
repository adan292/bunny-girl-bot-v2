import axios from 'axios'
import { exec } from 'child_process'
import fs from 'fs'
import { rm } from 'fs/promises'
import path from 'path'

const DEFAULT_PIC = 'https://files.catbox.moe/s1zyut.jpg'

const TIPOS_MAP = {
  top5lindos: 'lindos', lindos: 'lindos', top5lindo: 'lindos', top5lindas: 'lindos',
  top5feos: 'feos', feos: 'feos', top5feo: 'feos',
  top5otakus: 'otakus', otakus: 'otakus', otaku: 'otakus',
  top5gay: 'gays', top5gays: 'gays',
  top5lesbianas: 'lesbianas', top5lesbiana: 'lesbianas', top5lesbi: 'lesbianas',
  top5putos: 'putos', putos: 'putos', top5puto: 'putos',
  top5putas: 'putas', putas: 'putas', top5puta: 'putas',
  top5cornudos: 'cornudos', cornudos: 'cornudos', top5cornudo: 'cornudos', cornudo: 'cornudos',
  top5borrachos: 'borrachos', borrachos: 'borrachos', top5borracho: 'borrachos',
  top5idiotas: 'idiotas', idiotas: 'idiotas', top5idiota: 'idiotas'
}

const MEDALLAS_NUM  = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣']
const MEDALLAS_CUPS = ['🥇','🥈','🥉','4️⃣','5️⃣']
const EMOJIS_TOP10  = ['🔥','🦄','😈','🍕','😅','😂','😍','👹','💩','🐸','🤡','👑','🛸','🦖','🤠','🧟','😱','🥵','👻','🙈','😎','🦋','🥇','🥈','🥉','⚡','🌟','🧸','🍀','🎉','🎃','🐻','🤖','😜']

const rnd  = arr => arr[Math.floor(Math.random() * arr.length)]
const pick = (arr, n) => {
  const pool = [...arr], result = []
  while (result.length < n && pool.length) result.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0])
  return result
}

const TEXTOS_TOP = {
  lindos: { emoji: '💖', titulo: 'LINDOS/AS', frases: ['Belleza natural', 'Tallado por los dioses', 'Rompiendo corazones', 'Imposible no mirarle', 'Demasiada facha'] },
  feos: { emoji: '🤢', titulo: 'FEOS', frases: ['Te pisó un tren', 'Rompes los espejos', 'Susto a medianoche', 'Complicado de mirar', 'Solo te quiere tu mamá'] },
  otakus: { emoji: '🎌', titulo: 'OTAKUS', frases: ['No se baña hace 3 días', 'Su novia es 2D', 'Respira anime', 'Huele a cebolla', 'Naruto runner'] },
  gays: { emoji: '🏳️‍🌈', titulo: 'GAYS', frases: ['Súper diva', 'Le encanta', 'Reina suprema', 'Se le moja la canoa', 'Bate para el otro lado'] },
  lesbianas: { emoji: '✂️', titulo: 'LESBIANAS', frases: ['Reyna de las tijeras', 'Amante de los gatos', 'Usa camisa a cuadros', 'Camionera ofical', 'Solo le gustan las chicas'] },
  putos: { emoji: '🍆', titulo: 'PUTOS', frases: ['Más regalado imposible', 'Le entra a todo', 'No perdona una', 'Cobras caro', 'Goloso/a'] },
  putas: { emoji: '🍑', titulo: 'PUTAS', frases: ['Se regala siempre', 'Facturando', 'Rompe camas', 'Nadie se salva', 'Buscando colágeno'] },
  cornudos: { emoji: '🦌', titulo: 'CORNUDOS', frases: ['Asta al techo', 'El reno del grupo', 'Bambi se queda corto', 'Le adornaron la cabeza', 'No pasa por la puerta'] },
  borrachos: { emoji: '🍺', titulo: 'BORRACHOS', frases: ['Hígado de acero', 'Vive en el bar', 'Toma hasta el agua del florero', 'Siempre en pedo', 'Auspiciado por Quilmes'] },
  idiotas: { emoji: '🤡', titulo: 'IDIOTAS', frases: ['No suma 2+2', 'Falta materia gris', 'Se cae solo', 'Habla sin pensar', 'Un milagro que respire'] }
}

const MODOS_TEST = {
  gay: {
    loading: ['Analizando tu nivel de diva... 💅', 'Consultando el radar gay... 📡', 'Midiento tu porcentaje de brillo... ✨'],
    extra: ['¡Qué reina! 👑', 'Se sabía... 🤫', 'Atrapada! 📸'],
    api: 'gaycard',
    bajo: ['Eres {p}% gay, @{nombre}. Todavía te gustan las mujeres.', 'Apenas {p}% gay, @{nombre}. Sos re macho alfa.'],
    medio: ['@{nombre}, sos {p}% gay. En secreto te encanta.', 'Mmm, {p}% gay para @{nombre}. Con unas copas caés.'],
    alto: ['@{nombre} es {p}% gay. Oficialmente del bando. 🏳️‍🌈', '¡Reina suprema! @{nombre} es {p}% gay. 💅']
  },
  lesbiana: {
    loading: ['Buscando camisas a cuadros... 👕', 'Midiendo tu afición a las tijeras... ✂️', 'Calculando tu energía sáfica... 🌈'],
    extra: ['¡Poder femenino! 💪', 'Alta tijera ✂️', 'El clóset es de cristal 🚪'],
    api: null,
    bajo: ['Eres {p}% lesbiana, @{nombre}. Cien por ciento hetero.', 'Apenas {p}% torta, @{nombre}. Los varones son lo tuyo.'],
    medio: ['@{nombre}, sos {p}% lesbiana. A veces dudás bastante...', 'Ojo, {p}% lesbiana para @{nombre}. Una chica linda te hace temblar.'],
    alto: ['@{nombre} es {p}% lesbiana. Camionera oficial. 🚚', '¡Tijera suprema! @{nombre} es {p}% lesbiana. ✂️']
  },
  puto: {
    loading: ['Analizando qué tan regalado sos... 🎁', 'Calculando el precio de tus servicios... 💵', 'Midiendo tu nivel de goloso... 🍭'],
    extra: ['¡Controlate! 😂', 'No dejás una... 🥵', 'Te fuiste al pasto 🌿'],
    api: null,
    bajo: ['Eres {p}% puto, @{nombre}. Sos un santo.', 'Apenas {p}% puto, @{nombre}. Estás reservado/a.'],
    medio: ['@{nombre}, sos {p}% puto. Coqueteás con todos.', 'Ojo, {p}% puto para @{nombre}. Dejás la puerta entreabierta.'],
    alto: ['@{nombre} es {p}% puto. ¡Te regalás con todos! 🍑', '¡Cobras caro! @{nombre} es {p}% puto. 🔥']
  },
  puta: {
    loading: ['Midiendo el nivel de perreo... 💃', 'Calculando tu temperatura... 🌡️', 'Viendo a cuántos rompiste el corazón... 💔'],
    extra: ['¡A la pista! 🎶', 'Reina de la noche 🌙', 'Indomable 🦁'],
    api: null,
    bajo: ['Eres {p}% puta, @{nombre}. Un ángel caído del cielo. 😇', 'Apenas {p}% puta, @{nombre}. Ni salís de tu casa.'],
    medio: ['@{nombre}, sos {p}% puta. Te hacés la difícil pero no tanto. 😏', 'Ojo, {p}% puta para @{nombre}. Si te buscan, te encuentran.'],
    alto: ['@{nombre} es {p}% puta. ¡Nadie se salva de vos! 🥵', '¡Facturando! @{nombre} es {p}% puta. 💸']
  }
}

const handler = async (m, ctx) => {
  const { conn, command, args, text, groupMetadata } = ctx
  const sender = m.sender

  if (command in TIPOS_MAP) {
    if (!m.isGroup) return m.reply(`*⌬┤ ✙ ├⌬ SOLO GRUPOS.*\n> Este comando solo funciona en grupos.`)

    const tipo = TIPOS_MAP[command]
    const tipoData = TEXTOS_TOP[tipo]
    if (!tipoData) return

    const participantes = groupMetadata.participants.filter(p => !p.admin).map(p => p.id)
    if (participantes.length < 5) return m.reply(`*⌬┤ ✙ ├⌬ POCOS MIEMBROS.*\n> Se necesitan al menos 5 miembros.`)

    const top = participantes.sort(() => Math.random() - 0.5).slice(0, 5)
    const titulo = `${tipoData.emoji} *TOP 5 ${tipoData.titulo}*`
    const medallas = ['gays','lesbianas','putos','putas'].includes(tipo) ? MEDALLAS_CUPS : MEDALLAS_NUM
    const frasesPool = [...tipoData.frases].sort(() => Math.random() - 0.5)
    const lineas = top.map((jid, i) => `${medallas[i]} *@${jid.split('@')[0]}* — ${frasesPool[i] ?? rnd(tipoData.frases)}`).join('\n')

    return conn.sendMessage(m.chat, { text: `${titulo}\n\n${lineas}`, mentions: top }, { quoted: m })
  }

  if (command === 'top' || command === 'top10') {
    if (!m.isGroup) return m.reply(`*⌬┤ ✙ ├⌬ SOLO GRUPOS.*\n> Este comando solo funciona en grupos.`)

    const motivo = args.join(' ').trim()
    if (!motivo || motivo.length < 3) return m.reply(`*⌬┤ ✙ ├⌬ SIN MOTIVO.*\n> Escribí el motivo del top. Ej: *!top los más activos*`)

    const participantes = groupMetadata.participants.map(p => p.id).filter(jid => jid !== sender && !jid.startsWith('status@broadcast'))
    if (participantes.length < 10) return m.reply(`*⌬┤ ✙ ├⌬ POCOS MIEMBROS.*\n> Se necesitan al menos 10 miembros.`)

    const seleccionados = participantes.sort(() => Math.random() - 0.5).slice(0, 10)
    const emojis = pick(EMOJIS_TOP10, 10)
    let mensaje = `${rnd(EMOJIS_TOP10)} *TOP 10 ${motivo.toUpperCase()}*\n\n`
    for (let i = 0; i < 10; i++) mensaje += `*@${seleccionados[i].split('@')[0]}* ${emojis[i]}\n`

    return conn.sendMessage(m.chat, { text: mensaje, mentions: seleccionados }, { quoted: m })
  }

  if (['gay','gei','lesbiana','lesbi','puto','puta'].includes(command)) {
    let target = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
      || m.message?.extendedTextMessage?.contextInfo?.participant
      || (text ? text.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null)
      
    if (!target) target = sender

    const nombre = target.split('@')[0]
    const porcentaje = Math.floor(Math.random() * 101)
    const modoKey = { gay: 'gay', gei: 'gay', lesbiana: 'lesbiana', lesbi: 'lesbiana', puto: 'puto', puta: 'puta' }[command]
    const modo = MODOS_TEST[modoKey]

    await m.reply(`*⌬┤ ⏳ ├⌬ ${rnd(modo.loading)}*`)

    let frase = rnd(porcentaje <= 19 ? modo.bajo : porcentaje <= 79 ? modo.medio : modo.alto)
    frase = frase.replace(/{nombre}/g, nombre).replace(/{p}/g, porcentaje)
    const caption = `${frase}\n\n> ${rnd(modo.extra)}`

    if (modo.api) {
      try {
        let profilePic
        try { profilePic = await conn.profilePictureUrl(target, 'image') }
        catch { profilePic = DEFAULT_PIC }

        const apiUrl = modo.api === 'gaycard'
          ? `https://api.delirius.store/canvas/gaycard?url=${encodeURIComponent(profilePic)}&name=${encodeURIComponent(nombre)}&rank=${porcentaje}`
          : `https://api.delirius.store/canvas/${modo.api}?url=${encodeURIComponent(profilePic)}`

        await conn.sendMessage(m.chat, { image: { url: apiUrl }, caption, mentions: [target] }, { quoted: m })
      } catch {
        await conn.sendMessage(m.chat, { text: `*⌬┤ ❌ ├⌬ ERROR DE FOTO.*\n\n${frase}`, mentions: [target] }, { quoted: m })
      }
    } else {
      await conn.sendMessage(m.chat, { text: caption, mentions: [target] }, { quoted: m })
    }
    return
  }

  if (['pet','mascota','acariciar'].includes(command)) {
    const target = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
      || m.message?.extendedTextMessage?.contextInfo?.participant
      || sender
    const remitente = m.pushName || sender.split('@')[0]
    const objetivo = target.split('@')[0]

    m.react('🐾')
    const texto = target !== sender
      ? `🐾 *${remitente}* le hizo caricias a *${objetivo}* ¡qué tierno! 🥰`
      : `🐾 *${remitente}* se acarició solito... ¿todo bien? 😅`

    const ts = Date.now()
    const gifPath = path.join(process.cwd(), `temp_pet_${ts}.gif`)
    const mp4Path = path.join(process.cwd(), `temp_pet_${ts}.mp4`)

    try {
      let userPic
      try { userPic = await conn.profilePictureUrl(target, 'image') }
      catch { userPic = 'https://cdn.popcat.xyz/avatar.png' }

      const apiRes = await axios.get(`https://api.popcat.xyz/pet?image=${encodeURIComponent(userPic)}`, { responseType: 'arraybuffer', timeout: 15000 })
      fs.writeFileSync(gifPath, Buffer.from(apiRes.data))

      await new Promise((resolve, reject) => {
        exec(`ffmpeg -y -i "${gifPath}" -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -c:v libx264 "${mp4Path}"`, err => err ? reject(err) : resolve())
      })

      await conn.sendMessage(m.chat, { video: fs.readFileSync(mp4Path), gifPlayback: true, caption: texto, mentions: [sender, target] }, { quoted: m })
    } catch (err) {
      m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> Fallo al generar el gif. Intentá de nuevo.`)
    } finally {
      await rm(gifPath, { force: true }).catch(() => {})
      await rm(mp4Path, { force: true }).catch(() => {})
    }
  }
}

handler.help = ['top <motivo>']
handler.tags = ['fun']
handler.command = [
  'top5lindos','lindos','top5lindo','top5lindas',
  'top5feos','feos','top5feo',
  'top5otakus','otakus','otaku',
  'top5gay','top5gays',
  'top5lesbianas','top5lesbiana','top5lesbi',
  'top5putos','putos','top5puto',
  'top5putas','putas','top5puta',
  'top5cornudos','cornudos','top5cornudo','cornudo',
  'top5borrachos','borrachos','top5borracho',
  'top5idiotas','idiotas','top5idiota',
  'top','top10',
  'gay','gei','lesbiana','lesbi','puto','puta',
  'pet','mascota','acariciar'
]

export default handler