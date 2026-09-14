import axios from 'axios'

const BASE = 'https://luxinfinity.vercel.app/api/nsfw'

const CATEGORIAS = {
  boobs:        'boobs',
  nsfwboobs:    'boobs',
  xxxboobs:     'boobs',
  ass:          'ass',
  nsfwass:      'ass',
  trasero:      'ass',
  gangbang:     'gangbang',
  nsfwgangbang: 'gangbang',
  girls:        'grils',
  nsfwgirls:    'grils',
  xxxgirls:     'grils',
  nekonsfw:     'nekonsfw',
  nsfwneko:     'nekonsfw',
}

const handler = async (m, { conn, command }) => {
  const endpoint = CATEGORIAS[command]
  if (!endpoint) return

  await m.react('🔞')

  try {
    const res = await axios.get(`${BASE}/${endpoint}`, { responseType: 'arraybuffer', timeout: 20000 })
    const buf = Buffer.from(res.data)
    const caption = `🔞 *${command.toUpperCase()}*`
    const contentType = res.headers['content-type'] || ''

    if (contentType.includes('video')) {
      await conn.sendMessage(m.chat, { video: buf, gifPlayback: true, caption }, { quoted: m })
    } else {
      await conn.sendMessage(m.chat, { image: buf, caption }, { quoted: m })
    }
  } catch {
    m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> Error al obtener el contenido. Intentá de nuevo.`)
  }
}

handler.command = Object.keys(CATEGORIAS)
handler.tags = ['nsfw']
handler.help = ['boobs', 'ass', 'girls', 'gangbang', 'nekonsfw']
handler.nsfw = true
export default handler
