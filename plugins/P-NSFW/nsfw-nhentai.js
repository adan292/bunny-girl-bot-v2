import axios from 'axios'
import { PDFDocument } from 'pdf-lib'

const BASE = 'https://luxinfinity.vercel.app/api/nsfw/nhentai'

const handler = async (m, { conn, command, text, usedPrefix }) => {
  const esSearch = command.includes('search')
  await m.react('🔞')

  const query = text?.trim()
  if (!query) return m.reply(`*⌬┤ ❗ ├⌬ FALTA TEXTO.*\n> Ej: *${usedPrefix}${command} naruto*`)

  if (esSearch) {
    await m.reply(`*⌬┤ 🔍 ├⌬ Buscando...*`)
    try {
      const { data } = await axios.get(`${BASE}/search`, { params: { query }, timeout: 15000 })
      const items = data.data ?? []
      if (!items.length) return m.reply(`*⌬┤ ❌ ├⌬ SIN RESULTADOS.*\n> Nada encontrado para "${query}".`)
      const lista = items.slice(0, 8).map((item, i) =>
        `*${i + 1}.* ${item.title || `#${item.id}`}\n🔗 ${item.url}`
      ).join('\n\n')
      return m.reply(`*⌬┤ 🔞 ├⌬ Resultados para "${query}":*\n\n${lista}`)
    } catch {
      return m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> Falló la búsqueda. Intentá de nuevo.`)
    }
  } else {
    const id = query.match(/\/g\/(\d+)/)?.[1] || query.match(/^(\d{4,7})$/)?.[1]

    try {
      let resolvedId = id
      if (!resolvedId) {
        const { data: sData } = await axios.get(`${BASE}/search`, { params: { query }, timeout: 15000 })
        const results = sData.data ?? []
        if (!results.length) return m.reply(`*⌬┤ ❌ ├⌬ SIN RESULTADOS.*\n> No se encontró el código.`)
        resolvedId = results[0].id
        if (!resolvedId) return m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo extraer el ID.`)
      }

      await m.reply(`*⌬┤ 📤 ├⌬ Generando PDF, esto puede tardar...*`)

      const { data: res } = await axios.get(`${BASE}/gallery`, { params: { id: resolvedId }, timeout: 30000 })
      const d = res.data

      if (!d.images?.length) return m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se encontraron páginas.`)

      const pdfDoc = await PDFDocument.create()

      for (const page of d.images) {
        const url = page.urls?.[0]
        if (!url) continue
        try {
          const imgRes = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 })
          const imgBuf = imgRes.data
          const isJpg = url.endsWith('.jpg') || url.endsWith('.jpeg')
          const img = isJpg ? await pdfDoc.embedJpg(imgBuf) : await pdfDoc.embedPng(imgBuf)
          const pg = pdfDoc.addPage([img.width, img.height])
          pg.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height })
        } catch {}
      }

      const buffer = Buffer.from(await pdfDoc.save())
      const nombre = (d.title || 'nhentai').replace(/[\\/:*?"<>|]/g, '_').slice(0, 80)

      const lines = [
        `🔞 *${d.title || '—'}*`,
        d.titleJp ? `🇯🇵 _${d.titleJp}_` : '',
        `\n🆔 ID: *${d.id}*`,
        `📄 Páginas: *${d.pages}*`,
        `🔗 ${d.url}`,
        d.artists?.length ? `🎨 Artista: *${d.artists.join(', ')}*` : '',
        d.tags?.length ? `🏷️ Tags: _${d.tags.slice(0, 12).join(', ')}${d.tags.length > 12 ? '...' : ''}_` : ''
      ].filter(Boolean)

      await conn.sendMessage(m.chat, {
        document: buffer,
        mimetype: 'application/pdf',
        fileName: `${nombre}.pdf`,
        caption: lines.join('\n'),
      }, { quoted: m })

    } catch {
      return m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> Ocurrió un error al procesar el PDF.`)
    }
  }
}

handler.command = ['nhentaisearch', 'nsfwnhentaisearch', 'nhentai', 'nsfwnhentai']
handler.tags = ['nsfw']
handler.help = ['nhentaisearch <query>', 'nhentai <id/url>']
handler.nsfw = true
export default handler
