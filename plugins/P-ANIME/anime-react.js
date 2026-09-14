import axios from 'axios'
import ffmpeg from 'fluent-ffmpeg'
import { promises as fs } from 'fs'
import crypto from 'crypto'
import path from 'path'

const API_BASE = 'https://luxinfinity.vercel.app/api/anime/reaction?type='

const ACCIONES = {
  angry:      { emoji: '😠', msgs: ['está enojado con {obj}! 😠',              'está enojado consigo mismo 😠'] },
  baka:       { emoji: '😤', msgs: ['le dice baka a {obj} 😤',                 'se dice baka a sí mismo 😤'] },
  bite:       { emoji: '🦷', msgs: ['le mordió a {obj}! au! 🦷',               'se mordió a sí mismo... au 🤕'] },
  bleh:       { emoji: '😝', msgs: ['le saca la lengua a {obj} 😝',             'se saca la lengua al espejo 😝'] },
  blowkiss:   { emoji: '💋', msgs: ['le manda un beso a {obj} 💋',              'se manda un beso al espejo 💋'] },
  blush:      { emoji: '😳', msgs: ['se sonrojó por {obj} 😳',                  'se sonrojó uwu 😳'] },
  bonk:       { emoji: '🔨', msgs: ['le dio un bonk a {obj} 🔨',               'se dio un bonk a sí mismo 🔨'] },
  bored:      { emoji: '😑', msgs: ['está aburrido de {obj}...',                'está aburrido...'] },
  carry:      { emoji: '🤲', msgs: ['cargó a {obj} en brazos 🤲',              'intenta cargarse a sí mismo 🤲'] },
  clap:       { emoji: '👏', msgs: ['le aplaude a {obj} 👏',                    'se aplaude a sí mismo 👏'] },
  confused:   { emoji: '😕', msgs: ['está confundido por {obj} 😕',             'está muy confundido 😕'] },
  cry:        { emoji: '😭', msgs: ['está llorando por culpa de {obj}',         'está llorando...'] },
  cuddle:     { emoji: '🤗', msgs: ['se acurruca con {obj} 💕',                 'se acurruca consigo mismo 🥲'] },
  dance:      { emoji: '💃', msgs: ['está bailando con {obj} 💃',               'está bailando~ 💃'] },
  facepalm:   { emoji: '🤦', msgs: ['hace facepalm por culpa de {obj} 🤦',      'hace facepalm 🤦'] },
  feed:       { emoji: '🍽️', msgs: ['le da de comer a {obj} 🍽️',               'se da de comer a sí mismo 🍽️'] },
  handhold:   { emoji: '🤝', msgs: ['le toma la mano a {obj} 🤝',               'se toma la mano a sí mismo 🤝'] },
  handshake:  { emoji: '🤝', msgs: ['saluda con un apretón a {obj} 🤝',         'se da la mano a sí mismo 🤝'] },
  happy:      { emoji: '😊', msgs: ['está feliz gracias a {obj} ~',             'está muy feliz~'] },
  highfive:   { emoji: '🙌', msgs: ['le choca los cinco a {obj} 🙌',            'se choca los cinco solo 🙌'] },
  hug:        { emoji: '🤗', msgs: ['le dio un abrazo a {obj} 💕',              'se dio un abrazo a sí mismo... alguien dale amor 💔'] },
  kabedon:    { emoji: '💢', msgs: ['le hizo un kabedon a {obj} 💢',            'hace kabedon contra la pared 💢'] },
  kill:       { emoji: '⚰️', msgs: ['mató a {obj} 💀 ⚰️',                        'intentó matarse a sí mismo 💀 ⚰️'] },
  kiss:       { emoji: '😘', msgs: ['le dio un beso a {obj} 💋',                'se dio un beso a sí mismo 💋'] },
  lappillow:  { emoji: '😴', msgs: ['usa las piernas de {obj} de almohada 😴',  'usa sus propias piernas de almohada 😴'] },
  laugh:      { emoji: '😂', msgs: ['se muere de risa de {obj} 😂',             'se está muriendo de risa 😂'] },
  lurk:       { emoji: '👀', msgs: ['está espiando a {obj} 👀',                 'está espiando en el chat 👀'] },
  nod:        { emoji: '👍', msgs: ['le da la razón a {obj} con un nod 👍',     'asiente solo 👍'] },
  nom:        { emoji: '🍽️', msgs: ['está comiendo con {obj} nom nom 🍽️',       'está comiendo nom nom 🍽️'] },
  nope:       { emoji: '🙅', msgs: ['le dice nope a {obj} 🙅',                  'dice nope a todo 🙅'] },
  nya:        { emoji: '🐱', msgs: ['le dice nya a {obj} 🐱',                   'dice nya~ 🐱'] },
  pat:        { emoji: '🤲', msgs: ['le acaricia la cabeza a {obj}',            'se acaricia la cabeza a sí mismo'] },
  peck:       { emoji: '😘', msgs: ['le da un besito rápido a {obj} 😘',        'se da un besito a sí mismo 😘'] },
  poke:       { emoji: '👉', msgs: ['pica a {obj} 👉',                          'se picó a sí mismo 👉'] },
  pout:       { emoji: '😤', msgs: ['hace pucheros por {obj} 😤',               'está haciendo pucheros 😤'] },
  punch:      { emoji: '👊', msgs: ['le pegó un puñetazo a {obj}! 👊',          'se dio un puñetazo a sí mismo 😵 👊'] },
  run:        { emoji: '🏃', msgs: ['está corriendo de {obj} 🏃',               'está corriendo 🏃'] },
  salute:     { emoji: '🫡', msgs: ['le hace un saludo militar a {obj} 🫡',     'saluda al vacío 🫡'] },
  shake:      { emoji: '🤝', msgs: ['le da la mano a {obj} 🤝',                 'se da la mano a sí mismo 🤝'] },
  shocked:    { emoji: '😱', msgs: ['está shockeado por {obj} 😱',              'está completamente shockeado 😱'] },
  shoot:      { emoji: '🔫', msgs: ['le dispara a {obj} 🔫',                    'se dispara a sí mismo 🔫'] },
  shrug:      { emoji: '🤷', msgs: ['se encoge de hombros ante {obj} 🤷',       'se encoge de hombros 🤷'] },
  sip:        { emoji: '☕', msgs: ['toma té mirando a {obj} ☕',               'toma té tranquilo ☕'] },
  slap:       { emoji: '👋', msgs: ['le pegó una cachetada a {obj} 😤',         'se dio una cachetada a sí mismo 😵'] },
  sleep:      { emoji: '😴', msgs: ['se va a dormir con {obj}... zZz 😴',       'se va a dormir... zZz 😴'] },
  smile:      { emoji: '😊', msgs: ['le sonríe a {obj} 😊',                     'sonríe al vacío 😊'] },
  smug:       { emoji: '😏', msgs: ['está siendo smug con {obj} 😏',            'está siendo smug solo 😏'] },
  spin:       { emoji: '🌀', msgs: ['gira feliz con {obj} 🌀',                  'está girando~ 🌀'] },
  stare:      { emoji: '👁️', msgs: ['le clava la mirada a {obj} 👁️',            'clava la mirada en la nada 👁️'] },
  tableflip:  { emoji: '(╯°□°）╯', msgs: ['voltea la mesa por culpa de {obj} (╯°□°）╯', 'voltea la mesa (╯°□°）╯'] },
  teehee:     { emoji: '😄', msgs: ['se ríe de {obj} teehee 😄',                'teehee~ 😄'] },
  think:      { emoji: '🤔', msgs: ['está pensando en {obj}... 🤔',             'está pensando... 🤔'] },
  thumbsup:   { emoji: '👍', msgs: ['le da un thumbsup a {obj} 👍',             'se da un thumbsup a sí mismo 👍'] },
  tickle:     { emoji: '🤣', msgs: ['le hace cosquillas a {obj} 🤣',            'se hace cosquillas a sí mismo 🤣'] },
  wag:        { emoji: '🐾', msgs: ['menea la cola ante {obj} 🐾',              'menea la cola~ 🐾'] },
  wave:       { emoji: '👋', msgs: ['le saluda con la mano a {obj} 👋',         'saluda con la mano 👋'] },
  wink:       { emoji: '😉', msgs: ['le guiña el ojo a {obj} 😉',               'guiña el ojo 😉'] },
  yawn:       { emoji: '🥱', msgs: ['bosteza al lado de {obj} 🥱',              'está bostezando 🥱'] },
  yeet:       { emoji: '💨', msgs: ['yeetea a {obj} por los aires 💨',          'se yeetea a sí mismo 💨'] },
}

async function gifToMp4(gifBuffer) {
  const tempGif = path.join('./tmp', `${crypto.randomBytes(6).toString('hex')}.gif`)
  const tempMp4 = path.join('./tmp', `${crypto.randomBytes(6).toString('hex')}.mp4`)
  await fs.writeFile(tempGif, gifBuffer)
  return new Promise((resolve, reject) => {
    ffmpeg(tempGif)
      .outputOptions([
        '-pix_fmt yuv420p',
        '-c:v libx264',
        '-movflags +faststart',
        '-filter:v crop=floor(in_w/2)*2:floor(in_h/2)*2'
      ])
      .toFormat('mp4')
      .on('end', async () => {
        try {
          const mp4Buffer = await fs.readFile(tempMp4)
          await fs.unlink(tempGif).catch(() => {})
          await fs.unlink(tempMp4).catch(() => {})
          resolve(mp4Buffer)
        } catch (e) {
          reject(e)
        }
      })
      .on('error', async (err) => {
        await fs.unlink(tempGif).catch(() => {})
        await fs.unlink(tempMp4).catch(() => {})
        reject(err)
      })
      .save(tempMp4)
  })
}

function buildTexto(accion, remitente, objetivo, conTarget) {
  const cfg = ACCIONES[accion]
  const raw = conTarget ? cfg.msgs[0] : cfg.msgs[1]
  return `\`${remitente}\` *${raw.replace('{obj}', objetivo)}*`
}

const handler = async (m, { conn, command }) => {
  const cfg = ACCIONES[command]
  if (!cfg) return

  let target = m.sender
  if (m.mentionedJid?.[0])   target = m.mentionedJid[0]
  else if (m.quoted?.sender) target = m.quoted.sender

  const remitente = m.pushName || m.sender.split('@')[0]
  const objetivo  = '@' + target.split('@')[0]
  const conTarget = target !== m.sender
  const texto     = buildTexto(command, remitente, objetivo, conTarget)

  await m.react(cfg.emoji)

  try {
    const res = await axios.get(`${API_BASE}${command}`, {
      responseType: 'arraybuffer',
      timeout: 20000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })

    let buf = Buffer.from(res.data)
    const contentType = res.headers['content-type'] || ''

    if (contentType.includes('application/json') || !contentType.startsWith('image') && !contentType.startsWith('video')) {
      let json
      try {
        json = JSON.parse(buf.toString('utf-8'))
      } catch {
        throw new Error('respuesta no es JSON ni media válida')
      }

      const gifUrl = json.url || json.image || json.gif || json.link || json.result || json.data?.url
      if (!gifUrl) throw new Error('la API no devolvió una URL de GIF')

      const gifRes = await axios.get(gifUrl, {
        responseType: 'arraybuffer',
        timeout: 20000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      buf = Buffer.from(gifRes.data)
    }

    if (!buf || buf.length < 1000) throw new Error('buffer vacío o demasiado pequeño')

    let outputBuf = buf
    try {
      outputBuf = await gifToMp4(buf)
    } catch (err) {
      console.warn(`[anime-react] transcodificacion ffmpeg omitida o fallida: ${err.message}`)
    }

    await conn.sendMessage(
      m.chat,
      { video: outputBuf, gifPlayback: true, mimetype: 'video/mp4', caption: texto, mentions: [m.sender, target] },
      { quoted: m }
    )
  } catch (e) {
    console.error(`[anime-react:${command}]`, e.message)
    m.reply(`[ ❗ ] No se pudo obtener el GIF para \`${command}\`.`)
  }
}

handler.command = Object.keys(ACCIONES)
handler.tags    = ['anime']
handler.help    = Object.keys(ACCIONES).map(a => `${a} [@user]`)
export default handler