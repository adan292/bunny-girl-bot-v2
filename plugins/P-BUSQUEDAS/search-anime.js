import fetch from 'node-fetch'

const handler = async (m, { conn, command, text, usedPrefix }) => {
  if (!text) return m.reply(`*⌬┤ ✙ ├⌬ USO.*\n> *${usedPrefix}${command} <búsqueda>*`)

  if (['animesearch', 'buscaranime'].includes(command)) {
    await m.reply(`*⌬┤ ⏳ ├⌬ Buscando...*`)
    
    try {
      const res = await fetch(`https://api.delirius.store/search/animesearch?q=${encodeURIComponent(text)}`)
      const json = await res.json()
      
      if (!json.status || !json.data?.length) return m.reply(`*⌬┤ ✙ ├⌬ SIN RESULTADOS.*\n> No se encontraron animes para *${text}*.`)
      
      const lista = json.data.slice(0, 8).map((a, i) => `> *${i + 1}.* *${a.title.trim()}*\n>    📺 ${a.type} · 🎬 ${a.episode} ep · ⭐ ${a.score}\n>    🔗 ${a.url}`).join('\n\n')
      const caption = `*⌬┤ 🎌 ├⌬ ANIME: ${text}*\n\n${lista}`
      
      try { 
        const buf = Buffer.from(await fetch(json.data[0].image).then(r => r.arrayBuffer()))
        await conn.sendMessage(m.chat, { image: buf, caption }, { quoted: m }) 
      } catch { 
        await m.reply(caption) 
      }
    } catch (e) { 
      await m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo completar la búsqueda.`) 
    }
    return
  }

  if (['mangasearch', 'buscarmanga'].includes(command)) {
    await m.reply(`*⌬┤ ⏳ ├⌬ Buscando...*`)
    
    try {
      const res = await fetch(`https://api.delirius.store/search/mangasearch?q=${encodeURIComponent(text)}`)
      const json = await res.json()
      
      if (!json.status || !json.data?.length) return m.reply(`*⌬┤ ✙ ├⌬ SIN RESULTADOS.*\n> No se encontraron mangas para *${text}*.`)
      
      const lista = json.data.slice(0, 8).map((a, i) => `> *${i + 1}.* *${a.title.trim()}*\n>    📚 ${a.type} · ${a.vol || '?'} vol · ⭐ ${a.score}\n>    🔗 ${a.link}`).join('\n\n')
      const caption = `*⌬┤ 📖 ├⌬ MANGA: ${text}*\n\n${lista}`
      
      try { 
        const buf = Buffer.from(await fetch(json.data[0].image).then(r => r.arrayBuffer()))
        await conn.sendMessage(m.chat, { image: buf, caption }, { quoted: m }) 
      } catch { 
        await m.reply(caption) 
      }
    } catch (e) { 
      await m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo completar la búsqueda.`) 
    }
    return
  }

  if (['stickerly', 'buscarsticker'].includes(command)) {
    await m.reply(`*⌬┤ ⏳ ├⌬ Buscando...*`)
    
    try {
      const res = await fetch(`https://api.delirius.store/search/stickerly?query=${encodeURIComponent(text)}`)
      const json = await res.json()
      
      if (!json.status || !json.data?.length) return m.reply(`*⌬┤ ✙ ├⌬ SIN RESULTADOS.*\n> No se encontraron stickers para *${text}*.`)
      
      const lista = json.data.slice(0, 5).map((s, i) => `> *${i + 1}.* *${s.name}* por *${s.author}*\n>    🎴 ${s.sticker_count} stickers · 👁️ ${s.view_count} · 📤 ${s.export_count}\n>    🔗 ${s.url}`).join('\n\n')
      const caption = `*⌬┤ 🎴 ├⌬ STICKERLY: ${text}*\n\n${lista}`
      
      try { 
        const imgBuf = Buffer.from(await fetch(json.data[0].preview).then(r => r.arrayBuffer()))
        await conn.sendMessage(m.chat, { image: imgBuf, caption }, { quoted: m }) 
      } catch { 
        await m.reply(caption) 
      }
    } catch (e) { 
      await m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo completar la búsqueda.`) 
    }
    return
  }
}

handler.help = ['animesearch <búsqueda>', 'buscarsticker <búsqueda>', 'buscarmanga <búsqueda>']
handler.command = ['animesearch', 'buscaranime', 'mangasearch', 'buscarmanga', 'stickerly', 'buscarsticker']
handler.tags = ['busquedas']

export default handler