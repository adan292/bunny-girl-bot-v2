import axios from 'axios'
import { fileTypeFromBuffer } from 'file-type'

const API_URL = 'https://api.stellarwa.xyz/dl/mediafire?key=Miku_michi'

export default {
  name: ['mediafire'],
  description: 'Descarga archivos desde Mediafire usando la API de StellarWA',
  category: 'dl',
  ownerOnly: false,

  async run({ sock, from, msg, args, react, reply }) {
    try {
      const url = args.find(a => /https?:\/\/(www\.)?mediafire\.com\/[\w\-/.?=&%]+/i.test(a))
      if (!url) {
        return await reply({ text: '❌ Debes proporcionar un enlace de Mediafire válido.\n\nEjemplo: `.mediafire https://www.mediafire.com/file/xxxxx/nombre/file`' })
      }

      await react('🕒')

      const apiRes = await axios.get(`${API_URL}&url=${encodeURIComponent(url)}`, { timeout: 120000 })
      const data = apiRes?.data

      if (!data) throw new Error('Sin respuesta de la API')

      // buscar posibles ubicaciones de la URL de descarga en la respuesta
      let dl = data.result?.url || data.url || data.downloadUrl || data.result?.downloadUrl || data.result?.link || data.data?.url

      // algunos endpoints devuelven un array de archivos
      if (!dl && data.result?.files && Array.isArray(data.result.files) && data.result.files.length) {
        dl = data.result.files[0].url || data.result.files[0].download
      }

      if (!dl) throw new Error('No se encontró la URL de descarga en la respuesta de la API')

      // descargar el archivo final
      const resp = await axios.get(dl, { responseType: 'arraybuffer', timeout: 0, maxContentLength: Infinity, maxBodyLength: Infinity })
      const buffer = Buffer.from(resp.data)

      const type = await fileTypeFromBuffer(buffer)
      const mime = type?.mime || resp.headers['content-type'] || 'application/octet-stream'
      const ext = type?.ext || (mime.split('/')[1] || 'bin')

      // intentar obtener filename desde headers
      let filename = `mediafire_${Date.now()}.${ext}`
      const cd = resp.headers['content-disposition'] || ''
      const match = cd.match(/filename\*?=(?:UTF-8''|\")?([^\";]+)/i)
      if (match && match[1]) {
        try {
          filename = decodeURIComponent(match[1].replace(/(^\")|("$)/g, ''))
        } catch (e) {
          filename = match[1].replace(/(^\")|("$)/g, '')
        }
      }

      // enviar como documento (es la opción más segura para cualquier tipo de archivo)
      await sock.sendMessage(from, {
        document: buffer,
        fileName: filename,
        mimetype: mime
      }, { quoted: msg })

      await react('✔️')
    } catch (e) {
      console.error('[mediafire]', e?.message || e)
      await react('❌')
      await reply({ text: `❌ Error: ${e?.message || 'falló la descarga'}` })
    }
  }
}
