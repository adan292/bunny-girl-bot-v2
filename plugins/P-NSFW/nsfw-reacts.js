import axios from 'axios'

const BASE = 'https://luxinfinity.vercel.app/api/nsfw'

const ACCIONES = {
  sexo:        { api: 'fuck',      caption: `*🔥 SEXO*\n\n> *{name1}* se folla a *{name2}* hasta dejarlo sin fuerzas 😈` },
  mamar:       { api: 'blowjob',   caption: `*💋 MAMADA*\n\n> *{name1}* le chupa la verga a *{name2}* hasta dejarlo seco 💦` },
  chuparpussy: { api: 'pussylick', caption: `*👅 PUSSY LICK*\n\n> *{name1}* le come el coño a *{name2}* hasta hacerla temblar 💦` },
  anal:        { api: 'anal',      caption: `*🍑 ANAL*\n\n> *{name1}* le hace anal a *{name2}* sin aviso y sin lubricante 🔥` },
  cum:         { api: 'cum',       caption: `*💦 LECHADA*\n\n> *{name1}* se corre encima de *{name2}* sin avisar 🥵` },
  mojada:      { api: 'yuri',      caption: `*💧 MOJADA*\n\n> *{name2}* está empapada y lista, no puede parar de correrse 🥵` },
  tocarse:     { api: 'solo',      caption: `*🤤 TOCÁNDOSE*\n\n> *{name2}* se toca solita hasta correrse de placer 💦` },
}

const PENETRAR_VIDEOS = [
  'https://files.catbox.moe/xph5x5.mp4','https://files.catbox.moe/4ffxj8.mp4','https://files.catbox.moe/f6ovgb.mp4',
  'https://qu.ax/XmLe.mp4','https://qu.ax/yiMt.mp4','https://qu.ax/cdKQ.mp4',
  'https://telegra.ph/file/a2ad1dd463a935d5dfd17.mp4','https://telegra.ph/file/e3abb2e79cd1ccf709e91.mp4',
  'https://telegra.ph/file/c5be4a906531c6731cd41.mp4','https://telegra.ph/file/9c4b894e034c290df75e4.mp4',
  'https://telegra.ph/file/3246f62c61a0ebebcb5c8.mp4','https://telegra.ph/file/820460f05d76bb2329bbc.mp4',
  'https://telegra.ph/file/2072f260302c6bb97682a.mp4','https://telegra.ph/file/22d0ef801c93c1b2ac074.mp4',
  'https://telegra.ph/file/6f66fd1974e8df1496768.mp4',
]

const PENETRAR_FRASES = [
  `PENETRADO COMO UNA PUTA\n\n🔥 Le metió la verga hasta el fondo a {objetivo}, lo dejó temblando y con el culo ardiendo.`,
  `PENETRADO SIN PIEDAD\n\n💦 {objetivo} fue abierto de patas, follado duro y usado como un juguete hasta gemir sin control.`,
  `PENETRADO HASTA EL FONDO\n\n🥵 {objetivo} terminó exhausto, con la verga dentro hasta el último centímetro y pidiendo más.`,
  `PENETRADO COMO UN JUGUETE SEXUAL\n\n🔥 {objetivo} recibió cada embestida brutal hasta quedar roto y lleno de semen.`,
  `PENETRADO BRUTALMENTE\n\n💦 Entre sudor, gemidos y cachetadas, {objetivo} fue follado hasta perder la voz y las fuerzas.`,
  `PENETRADO A LO BESTIA\n\n🥵 {objetivo} fue usado como carne barata, sin descanso, sin condón y sin compasión alguna.`,
  `PENETRADO HASTA ROMPERLO\n\n💦 {objetivo} quedó hecho mierda, sudando, temblando y con el agujero dilatado al máximo.`,
  `PENETRADO SIN CONTROL\n\n🔥 {objetivo} fue follado como animal, con embestidas salvajes hasta llenarlo todo.`,
  `PENETRADO HASTA LLORAR\n\n💦 {objetivo} terminó con lágrimas de placer, el culo rojo y pidiendo clemencia... pero no la tuvo.`,
  `PENETRADO EN CADA ORIFICIO\n\n🔥 Le metieron por delante y por detrás a {objetivo}, lo dejaron exhausto y babeando.`,
  `PENETRADO SALVAJEMENTE\n\n💦 Entre gritos y gemidos, {objetivo} fue destrozado hasta no poder caminar derecho.`,
  `PENETRADO HASTA EL LÍMITE\n\n🥵 {objetivo} sintió cada centímetro, cada embestida, hasta quedar con el culo en llamas.`,
]

const handler = async (m, { conn, usedPrefix, command }) => {
  const target = m.mentionedJid?.[0] || m.quoted?.sender

  if (!target && command !== 'tocarse') return m.reply(`*[ ⚠️ ] Tenés que mencionar o responder a alguien.*\n> Ej: *${usedPrefix}${command}* @usuario`)

  const name1 = m.pushName || m.sender.split('@')[0]
  const name2 = target ? `@${target.split('@')[0]}` : `@${m.sender.split('@')[0]}`

  await m.react('🔞')

  if (command === 'penetrar' || command === 'penetrado') {
    const frase    = PENETRAR_FRASES[Math.floor(Math.random() * PENETRAR_FRASES.length)].replace(/\{objetivo\}/g, name2)
    const videoUrl = PENETRAR_VIDEOS[Math.floor(Math.random() * PENETRAR_VIDEOS.length)]
    try {
      const res = await axios.get(videoUrl, { responseType: 'arraybuffer', timeout: 20000 })
      await conn.sendMessage(m.chat, { video: Buffer.from(res.data), gifPlayback: true, caption: frase, mentions: [target] }, { quoted: m })
    } catch {
      m.reply(`*[ ❗ ] Error al enviar el contenido.*`)
    }
    return
  }

  const baseCommand = ['sex', 'follar', 'nsfwsexo', 'xxxsexo'].includes(command) ? 'sexo'
                    : ['chupar', 'blowjob', 'nsfwmamar', 'xxxmamar'].includes(command) ? 'mamar'
                    : ['pussylick', 'chuparcoño', 'lamerpussy', 'nsfwpussy', 'xxxpussy'].includes(command) ? 'chuparpussy'
                    : ['nsfwanal', 'xxxanal', 'porculear', 'culito'].includes(command) ? 'anal'
                    : ['lechear', 'correrse', 'nsfwcum', 'xxxcum'].includes(command) ? 'cum'
                    : ['yuri', 'wetgirl', 'nsfwmojada', 'xxxmojada'].includes(command) ? 'mojada'
                    : ['masturbarse', 'solo', 'nsfwsolo', 'xxxsolo'].includes(command) ? 'tocarse' : command

  const accion = ACCIONES[baseCommand]
  if (!accion) return

  const caption = accion.caption.replace('{name1}', name1).replace('{name2}', name2)

  try {
    const res = await axios.get(`${BASE}/${accion.api}`, { responseType: 'arraybuffer', timeout: 20000 })
    const buf = Buffer.from(res.data)
    await conn.sendMessage(m.chat, { video: buf, gifPlayback: true, caption, mentions: target ? [target] : [m.sender] }, { quoted: m })
  } catch {
    m.reply(`*[ ❗ ] Error al enviar el contenido.*`)
  }
}

handler.command = ['sexo', 'sex', 'follar', 'nsfwsexo', 'xxxsexo', 'mamar', 'chupar', 'blowjob', 'nsfwmamar', 'xxxmamar', 'chuparpussy', 'pussylick', 'chuparcoño', 'lamerpussy', 'nsfwpussy', 'xxxpussy', 'anal', 'nsfwanal', 'xxxanal', 'porculear', 'culito', 'cum', 'lechear', 'correrse', 'nsfwcum', 'xxxcum', 'mojada', 'yuri', 'wetgirl', 'nsfwmojada', 'xxxmojada', 'tocarse', 'masturbarse', 'solo', 'nsfwsolo', 'xxxsolo', 'penetrar', 'penetrado']
handler.tags = ['nsfw']
handler.help = ['sexo', 'mamar', 'chuparpussy', 'anal', 'cum', 'mojada', 'tocarse', 'penetrar'].map(c => `${c} @u`)
handler.nsfw = true
export default handler
