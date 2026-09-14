import axios from 'axios'

const CATEGORIAS = {
  waifu: 'waifu', nsfwwaifu: 'waifu', xxxwaifu: 'waifu',
  neko: 'neko', nsfwneko: 'neko', xxxneko: 'neko',
  trap: 'trap', nsfwtrap: 'trap', trapito: 'trap', xxxtrap: 'trap',
  blowjob: 'blowjob', nsfwblowjob: 'blowjob', xxxblowjob: 'blowjob',
}

const handler = async (m, { conn, command }) => {
  const path = CATEGORIAS[command]
  if (!path) return

  await m.react('🔞')
  try {
    const r = await axios.get(`https://api.waifu.pics/nsfw/${path}`, { timeout: 10000 })
    if (!r.data?.url) throw new Error('Sin URL')
    
    await conn.sendMessage(m.chat, {
      image: { url: r.data.url },
      caption: `🔞 *${command.toUpperCase()}*`,
    }, { quoted: m })
  } catch (e) {
    m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo obtener el contenido.`)
  }
}

handler.command = Object.keys(CATEGORIAS)
handler.tags = ['nsfw']
handler.help = ['waifu', 'neko', 'trap', 'blowjob']
handler.nsfw = true
export default handler