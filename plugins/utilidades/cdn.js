import { downloadMediaMessage } from '@whiskeysockets/baileys'
import axios from 'axios'
import { FormData, Blob } from 'formdata-node'
import { fileTypeFromBuffer } from 'file-type'

const API_URL = 'https://cdn.dix.lat'

const MEDIA_TYPES = {
  imageMessage:    { ext: 'jpg',  mime: 'image/jpeg' },
  videoMessage:    { ext: 'mp4',  mime: 'video/mp4' },
  audioMessage:    { ext: 'm4a',  mime: 'audio/mp4' },
  documentMessage: { ext: 'bin',  mime: 'application/octet-stream' },
  stickerMessage:  { ext: 'webp', mime: 'image/webp' },
  ptvMessage:      { ext: 'mp4',  mime: 'video/mp4' }
}

function getContentType(message) {
  if (!message) return null
  const keys = Object.keys(message)
  return keys.find(key => key !== 'messageContextInfo' && key !== 'senderKeyDistributionMessage')
}

async function subirDix(buffer, filename, mimetype, esTemporal = false, ttl = 86400) {
  const form = new FormData()

  const blob = new Blob([buffer], { type: mimetype })

  form.append('file', blob, filename)

  const endpoint = esTemporal 
    ? `${API_URL}/upload/tmp?ttl=${ttl}`
    : `${API_URL}/upload`

  const { data } = await axios.post(
    endpoint,
    form,
    {
      timeout: 120000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      headers: {
        'User-Agent': 'Drive-Client'
      }
    }
  )

  return data
}

export default {
  name: ['cdn', 'subir', 'upload', 'tmp'],
  description: 'Sube archivos de forma permanente o temporal al CDN de Dix',
  category: 'utils',
  ownerOnly: false,

  async run({ sock, from, msg, react, reply, args }) {
    try {
      await react('⏳')

      const cmdUsado = msg.body?.trim()?.split(/\s+/)[0]?.toLowerCase() || ''
      const esTemporal = cmdUsado.includes('tmp') || args?.includes('--tmp') || args?.includes('-t')

      let ttlValue = 86400
      if (esTemporal && args) {
        const ttlArg = args.find(arg => !isNaN(arg) && parseInt(arg) >= 60 && parseInt(arg) <= 172800)
        if (ttlArg) ttlValue = parseInt(ttlArg)
      }

      let rawMessage = msg.message
      if (rawMessage?.ephemeralMessage) {
        rawMessage = rawMessage.ephemeralMessage.message
      }

      const msgType = getContentType(rawMessage)

      const quotedContext = rawMessage?.extendedTextMessage?.contextInfo
      let quotedMessage = quotedContext?.quotedMessage
      if (quotedMessage?.ephemeralMessage) {
        quotedMessage = quotedMessage.ephemeralMessage.message
      }

      const quotedType = getContentType(quotedMessage)

      let targetMsg = null
      let mediaInfo = null

      if (msgType && MEDIA_TYPES[msgType]) {
        targetMsg = msg
        mediaInfo = { type: msgType, ...MEDIA_TYPES[msgType] }
      } else if (quotedMessage && quotedType && MEDIA_TYPES[quotedType]) {
        targetMsg = {
          key: {
            remoteJid: from,
            id: quotedContext.stanzaId,
            participant: quotedContext.participant || quotedContext.remoteJid
          },
          message: quotedMessage
        }

        mediaInfo = {
          type: quotedType,
          ...MEDIA_TYPES[quotedType]
        }
      }

      if (!targetMsg || !mediaInfo) {
        return reply({
          text: '❌ Responde a un archivo válido o envía uno junto al comando.\n\n*Formatos:* Imágenes, Videos, Audios, Documentos, Stickers.'
        })
      }

      const buffer = await downloadMediaMessage(
        targetMsg,
        'buffer',
        {},
        { sock }
      )

      if (!buffer || buffer.length === 0) {
        throw new Error('No se pudo obtener el archivo (Buffer vacío)')
      }

      const detected = await fileTypeFromBuffer(buffer)
      const ext = detected?.ext || mediaInfo.ext
      const mime = detected?.mime || mediaInfo.mime
      const filename = `file_${Date.now()}.${ext}`

      const resultDix = await subirDix(buffer, filename, mime, esTemporal, ttlValue)

      if (!resultDix || !resultDix.status || !resultDix.data) {
        throw new Error('El servidor de Dix rechazó la subida o devolvió un formato incorrecto.')
      }

      const dataDix = resultDix.data

      const textoRespuesta = `✅ *Archivo subido con éxito*
      
📄 *Nombre:* \`${filename}\`
📦 *Mime:* \`${mime}\`
🆔 *Public ID:* \`${dataDix.public_id || '-'}\`
${esTemporal && dataDix.expires ? `⏳ *Expira:* \`${new Date(dataDix.expires * 1000).toLocaleString()}\`\n` : ''}🔗 *URL:*
${dataDix.url}
📏 *Tamaño:* \`${buffer.length} bytes\``

      await reply({ text: textoRespuesta })
      await react('✅')

    } catch (e) {
      await react('❌')
      await reply({
        text: `❌ *Error:* ${e.message}`
      })
      console.error(e)
    }
  }
}