import PDFDocument from 'pdfkit'
import { createWriteStream, readFileSync } from 'fs'
import { rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

const tmp   = () => join(tmpdir(), `pdf_${Date.now()}.pdf`)
const clean = async p => { if (p) await rm(p, { force: true }).catch(() => {}) }

const handler = async (m, { conn, command, text }) => {
  let o

  if (command === 'crearpdf') {
    if (!text) return m.reply(`*⌬┤ ✙ ├⌬ USO:* !crearpdf <texto>`)
    await m.reply(`*⌬┤ ⏳ ├⌬ Convirtiendo...*`)
    o = tmp()
    try {
      await new Promise((res, rej) => {
        const doc = new PDFDocument(); const s = createWriteStream(o)
        doc.pipe(s); doc.fontSize(14).text(text, { lineGap: 4 }); doc.end()
        s.on('finish', res); s.on('error', rej)
      })
      await conn.sendMessage(m.chat, { document: readFileSync(o), mimetype: 'application/pdf', fileName: 'documento.pdf', caption: `📄 *Aquí tenés tu PDF.*` }, { quoted: m })
    } catch { m.reply(`*⌬┤ ❌ ├⌬ ERROR.*`) } finally { await clean(o) }
    return
  }

  const mtype = m.quoted?.mtype || m.mtype
  if (mtype !== 'imageMessage') return m.reply(`*⌬┤ ✙ ├⌬ SIN IMAGEN.*\n> Respondé una imagen para convertirla a PDF.`)
  await m.reply(`*⌬┤ ⏳ ├⌬ Convirtiendo...*`)
  o = tmp()
  try {
    const buffer = await (m.quoted || m).download()
    if (!buffer) throw new Error('Sin buffer')
    await new Promise((res, rej) => {
      const doc = new PDFDocument({ size: [595, 842] }); const s = createWriteStream(o)
      doc.pipe(s); doc.image(buffer, 0, 0, { fit: [595, 842], align: 'center', valign: 'center' }); doc.end()
      s.on('finish', res); s.on('error', rej)
    })
    await conn.sendMessage(m.chat, { document: readFileSync(o), mimetype: 'application/pdf', fileName: 'imagen.pdf', caption: `📄 *Aquí tenés tu PDF.*` }, { quoted: m })
  } catch { m.reply(`*⌬┤ ❌ ├⌬ ERROR.*`) } finally { await clean(o) }
}

handler.help = ['topdf']
handler.command = ['topdf', 'crearpdf', 'createpdf', 'criarpdf']
handler.tags    = ['convertidores']

export default handler
