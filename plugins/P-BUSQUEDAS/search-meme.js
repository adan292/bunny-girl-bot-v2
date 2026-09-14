import axios from 'axios'
import { sendSmart } from '../../lib/serializer.js'
import fetch from 'node-fetch'

const handler = async (m, { conn, command, usedPrefix, userDb }) => {
  await m.reply(`*⌬┤ ⏳ ├⌬ Buscando...*`)

  try {
    const res = await axios.get(`https://meme-api.com/gimme/memesenespanol`)
    const { title, url, postLink } = res.data
    const buf = Buffer.from(await fetch(url).then(r => r.arrayBuffer()))

    await sendSmart(conn, m, {
      image: buf,
      caption: `🎭 *Meme*\n[ 📛 ] *Título:* ${title}\n🔗 ${postLink}`,
      footer: global.botname || 'ZΞN-BOT',
      buttons: [{ buttonId: `${usedPrefix}${command}`, buttonText: { displayText: '😂 Otro meme' } }],
      viewOnce: true,
      headerType: 4
    }, {}, userDb)

  } catch (e) {
    await m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo completar la búsqueda.`)
  }
}

handler.help = ['meme']
handler.command = ['meme', 'memardo', 'chiste']
handler.tags = ['busquedas']

export default handler
