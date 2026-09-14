import fetch from 'node-fetch'

const traducir = async (texto) => {
  if (!texto) return ''
  const partes = texto.match(/.{1,450}/g) || []
  let resultado = ''
  for (const parte of partes) {
    const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(parte)}&langpair=en|es`)
    const j = await r.json()
    resultado += (j.responseData.translatedText || parte) + ' '
  }
  return resultado.trim()
}

const handler = async (m, { text, usedPrefix, command }) => {
  if (!text) return m.reply(`*⌬┤ ✙ ├⌬ FALTA EL NOMBRE.*\n> Escribí el nombre del manhwa.\n> Ejemplo: ${usedPrefix}${command} Solo Leveling`)

  const query = encodeURIComponent(text)

  try {
    const res  = await fetch(`https://api.mangadex.org/manga?title=${query}&limit=1`)
    if (!res.ok) throw await res.text()
    const data = await res.json()

    if (!data.data?.length)
      return m.reply(`*⌬┤ ✙ ├⌬ SIN RESULTADOS.*\n> No encontré resultados para *${text}*`)

    const manga = data.data[0]
    const id    = manga.id
    const nd    = `No disponible`

    const titulo      = manga.attributes.title?.en || manga.attributes.title?.ja || manga.attributes.title?.ko || `Sin título`
    const descripcion = manga.attributes.description?.en || manga.attributes.description?.es || `Sin descripción.`
    const estado      = manga.attributes.status || nd
    const demografia  = manga.attributes.publicationDemographic || nd
    const year        = manga.attributes.year || nd
    const rating      = manga.attributes.contentRating || nd
    const generos     = manga.attributes.tags.map(tg => tg.attributes.name.en).slice(0, 3).join(', ') || nd
    const autores     = manga.relationships.filter(r => r.type === 'author').map(r => r.attributes?.name).join(', ') || nd

    const coverRes  = await fetch(`https://api.mangadex.org/cover?manga[]=${id}`)
    const coverJson = await coverRes.json()
    let imagen = null
    if (coverJson.data?.length) {
      const file = coverJson.data[0].attributes.fileName
      imagen = `https://uploads.mangadex.org/covers/${id}/${file}`
    }

    const [generosT, descripcionT, estadoT, demografiaT, ratingT] = await Promise.all([
      traducir(generos), traducir(descripcion), traducir(estado), traducir(demografia), traducir(rating),
    ])

    const caption = [
      `[ 🔎 ] *MANHWA / MANGA ENCONTRADO*`, '',
      `▢ *Nombre:* ${titulo}`, `▢ *Autor(es):* ${autores}`, `▢ *Género(s):* ${generosT}`,
      `▢ *Estado:* ${estadoT}`, `▢ *Demografía:* ${demografiaT}`, `▢ *Año:* ${year}`,
      `▢ *Rating:* ${ratingT}`, '', `📝 *Descripción:*\n${descripcionT}`,
    ].join('\n')

    if (imagen) {
      await m.replyImg({ url: imagen }, caption)
    } else {
      await m.reply(caption)
    }

  } catch (e) {
    console.error(e)
    m.reply(`*⌬┤ ✙ ├⌬ ERROR.*\n> Ocurrió un error al obtener los detalles del manhwa.`)
  }
}

handler.command = ['manhwa', 'manga']
handler.tags = ['anime']
handler.help = ['manhwa <nombre>']
export default handler