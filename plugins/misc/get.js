import axios from 'axios'
import { fileTypeFromBuffer } from 'file-type'

export default {
  name: ['fetch', 'get', 'descargar'],
  description: 'Descarga y envía el contenido de una URL (Soporta imágenes, videos, audios y texto)',
  category: 'misc',
  ownerOnly: false,

  async run({ sock, from, msg, args, react, reply }) {
    try {
      const url = args.join(' ').trim()

      if (!url) {
        return reply({
          text: '❌ Por favor, proporciona una URL válida.\n\n*Ejemplo:* `.fetch https://ejemplo.com/imagen.jpg`'
        })
      }

      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return reply({ text: '❌ La URL debe comenzar con http:// o https://' })
      }

      await react('⏳')
      await reply({ text: '🌐 Conectando con el servidor y descargando datos...' })

      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 60000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })

      const buffer = Buffer.from(response.data)

      if (!buffer || buffer.length === 0) {
        throw new Error('El servidor devolvió un archivo vacío.')
      }

      const detected = await fileTypeFromBuffer(buffer)
      const mime = detected?.mime || response.headers['content-type'] || 'text/plain'

      if (mime.startsWith('image/')) {
        await sock.sendMessage(from, {
          image: buffer,
          caption: `✅ *Imagen obtenida con éxito*`
        }, { quoted: msg })

      } else if (mime.startsWith('video/')) {
        await sock.sendMessage(from, {
          video: buffer,
          caption: `✅ *Video obtenido con éxito*`
        }, { quoted: msg })

      } else if (mime.startsWith('audio/')) {
        await sock.sendMessage(from, {
          audio: buffer,
          mimetype: mime,
          ptt: mime.includes('ogg')
        }, { quoted: msg })

      } else if (mime.startsWith('text/') || mime.includes('json') || mime.includes('javascript')) {
        const textContent = buffer.toString('utf-8')

        if (textContent.length > 3000) {
          // Si es muy largo lo mandamos como archivo .txt descargable
          // para no truncar nada y que el usuario pueda ver todo
          await sock.sendMessage(from, {
            document: Buffer.from(textContent),
            mimetype: 'text/plain',
            fileName: `fetch_${Date.now()}.txt`,
            caption: `📄 *Contenido muy largo — se envía como archivo*\n> Tamaño: ${(textContent.length / 1024).toFixed(1)} KB`
          }, { quoted: msg })
        } else {
          await reply({
            text: `📄 *Resultado de la petición Texto/JSON:*\n\n\`\`\`${textContent}\`\`\``
          })
        }

      } else {
        const ext = detected?.ext || 'bin'
        await sock.sendMessage(from, {
          document: buffer,
          mimetype: mime,
          fileName: `fetch_file_${Date.now()}.${ext}`
        }, { quoted: msg })
      }

      await react('✅')

    } catch (e) {
      await react('❌')

      let errMsg = e.message
      if (e.response) {
        errMsg = `El servidor respondió con código de estado ${e.response.status}`
      } else if (e.code === 'ECONNABORTED') {
        errMsg = 'Tiempo de espera agotado al descargar el archivo.'
      }

      await reply({
        text: `❌ *Error al realizar el Fetch:* ${errMsg}`
      })
      console.error(e)
    }
  }
}