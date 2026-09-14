import axios from 'axios'

const OPT = { timeout: 10000 }

const handler = async (m, { conn, command }) => {
  await m.react('🔞')
  try {
    if (command.includes('girltiktok') || command.includes('tiktoknsfw')) {
      await conn.sendMessage(m.chat, {
        video: { url: 'https://api.delirius.store/nsfw/tiktok' },
        gifPlayback: true,
        caption: `🔞 *GIRLTIKTOK*`,
      }, { quoted: m })
      return
    }

    const isVid2 = command.includes('hentaivid2')
    const url = isVid2 
      ? 'https://api.vreden.my.id/api/v1/random/hentai' 
      : 'https://api.delirius.store/anime/hentaivid'

    const r = await axios.get(url, OPT)
    const items = (isVid2 ? r.data?.result : r.data)?.slice?.(0, 2) || []
    
    if (!items.length) return m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo obtener el contenido.`)

    for (const item of items) {
      const caption = `🎬 *${item.title}*\n📂 Categoría: ${item.category}\n👁️ Vistas: ${item.views_count}\n🔗 Link: ${item.link}`
      if (item.type === 'video/mp4' && item.video_1) {
        await conn.sendMessage(m.chat, { video: { url: item.video_1 }, caption }, { quoted: m })
      } else {
        await conn.sendMessage(m.chat, { text: caption }, { quoted: m })
      }
    }
  } catch (e) {
    m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> Error al obtener el contenido. Intentá de nuevo.`)
  }
}

handler.command = ['hentaivid', 'nsfwhentaivid', 'xxxhentaivid', 'hentaivid2', 'nsfwhentaivid2', 'girltiktok', 'nsfwgirltiktok', 'xxxgirltiktok', 'tiktoknsfw']
handler.tags = ['nsfw']
handler.help = ['hentaivid', 'girltiktok']
handler.nsfw = true
export default handler