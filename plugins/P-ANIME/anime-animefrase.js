import fetch from 'node-fetch'

const handler = async (m, { conn }) => {
  try {
    const res = await fetch('https://katanime.vercel.app/api/getrandom')
    if (!res.ok) throw await res.text()
    const data = await res.json()
    const item = data.result[0]

    const fraseOriginal = item.quote || item.english || item.indo || 'Frase no disponible'

    let frase = fraseOriginal
    const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(fraseOriginal)}&langpair=en|es`)
    const j = await r.json()
    frase = j.responseData.translatedText || fraseOriginal

    const busqueda = await fetch(`https://api.jikan.moe/v4/characters?q=${encodeURIComponent(item.character)}&limit=1`)
    const datos = await busqueda.json()
    const imagen = datos.data?.[0]?.images?.jpg?.image_url || null

    const caption = `[ 💬 ] *ANIME FRASE*\n\n▢ *Frase:*\n${frase}\n\n▢ *Personaje:* ${item.character}\n▢ *Anime:* ${item.anime}`

    if (imagen) {
      await conn.sendMessage(m.chat, { image: { url: imagen }, caption }, { quoted: m })
    } else {
      await m.reply(caption)
    }

  } catch (error) {
    console.error(error)
    m.reply(`*⌬┤ ✙ ├⌬ ERROR.*\n> No se pudo obtener una frase en este momento.`)
  }
}

handler.command = ['animefrase', 'fraseanime']
handler.tags = ['anime']
handler.help = ['animefrase']
export default handler