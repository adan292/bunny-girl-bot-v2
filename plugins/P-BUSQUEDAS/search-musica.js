import axios from 'axios'
import fetch from 'node-fetch'

const handler = async (m, { conn, command, text, usedPrefix }) => {
  if (!text) return m.reply(`*⌬┤ ✙ ├⌬ USO.*\n> *${usedPrefix}${command} <canción>*`)

  if (['genius', 'geniuslyrics', 'letragenius'].includes(command)) {
    await m.reply(`*⌬┤ ⏳ ├⌬ Buscando...*`)
    
    try {
      let titulo = text, artista = '?', album = '?', imagenUrl = null
      try {
        const it = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(text)}&media=music&limit=1`, { timeout: 8000 })
        const tr = it.data?.results?.[0]
        if (tr) { titulo = tr.trackName || text; artista = tr.artistName || '?'; album = tr.collectionName || '?'; imagenUrl = tr.artworkUrl100?.replace('100x100', '600x600') || null }
      } catch {}
      
      let geniusUrl = null
      try {
        const query = encodeURIComponent(`${artista !== '?' ? artista + ' ' : ''}${titulo}`)
        const gSearch = await fetch(`https://api.delirius.store/search/genius?q=${query}`)
        const gJson = await gSearch.json()
        const hit = gJson?.data?.find(s => !s.instrumental) || gJson?.data?.[0]
        geniusUrl = hit?.url || null
        if (hit?.image) imagenUrl = hit.image
      } catch {}
      
      if (!geniusUrl) return m.reply(`*⌬┤ ✙ ├⌬ SIN RESULTADOS.*\n> No se encontró la letra de esa canción.`)
      
      let letra = null
      try {
        const lRes = await fetch(`https://api.delirius.store/search/geniuslyrics?url=${encodeURIComponent(geniusUrl)}&parse=false`)
        const lJson = await lRes.json()
        letra = lJson?.data?.lyrics || null
      } catch {}
      
      if (!letra) return m.reply(`*⌬┤ ✙ ├⌬ SIN RESULTADOS.*\n> No se encontró la letra de esa canción.`)
      
      const truncado = letra.length > 3000 ? letra.slice(0, 3000) + '\n\n... *(letra truncada)*' : letra
      const caption = `🎵 *${titulo}*\n👤 *Artista:* ${artista}\n💿 *Álbum:* ${album}\n\n📖 *Letra:*\n${truncado}`
      
      if (imagenUrl) {
        try { 
          const imgBuf = Buffer.from(await fetch(imagenUrl).then(r => r.arrayBuffer()))
          await conn.sendMessage(m.chat, { image: imgBuf, caption }, { quoted: m }) 
        } catch { await m.reply(caption) }
      } else { 
        await m.reply(caption) 
      }
    } catch (e) { 
      await m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo completar la búsqueda.`) 
    }
    return
  }

  if (['lyrics', 'letracancion', 'songlyrics'].includes(command)) {
    await m.reply(`*⌬┤ ⏳ ├⌬ Buscando...*`)
    try {
      const { data: res } = await axios.get('https://luxinfinity.vercel.app/api/tools/lyrics', {
        params: { query: text },
        timeout: 15000
      })
      const song = res?.data?.[0]
      if (!song?.lyrics) return m.reply(`*⌬┤ ✙ ├⌬ SIN RESULTADOS.*\n> No se encontró la letra de *${text}*.`)

      const truncado = song.lyrics.length > 3000 ? song.lyrics.slice(0, 3000) + '\n\n... *(letra truncada)*' : song.lyrics
      const dur = song.duration ? `${Math.floor(song.duration / 60)}:${String(song.duration % 60).padStart(2, '0')}` : '?'

      await m.reply(`*⌬┤ 🎵 ├⌬ ${song.title}*\n> 👤 *${song.artist}*\n> 💿 *${song.album || '?'}* · ⏱️ *${dur}*\n\n${truncado}`)
    } catch {
      await m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo completar la búsqueda.`)
    }
    return
  }
}

handler.help = ['genius <canción>']
handler.command = ['genius', 'geniuslyrics', 'letragenius', 'lyrics', 'letracancion', 'songlyrics']
handler.tags = ['busquedas']

export default handler