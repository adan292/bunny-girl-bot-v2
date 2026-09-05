import fetch from 'node-fetch'

/**
 * Comando .pin / .pinterest — reimplementado para usar Bunny_girl_bot API.
 *
 * USO:
 * - Establece las variables de entorno:
 *     BUNNY_GIRL_BOT_URL  -> endpoint de la API (puede contener "{query}" como placeholder)
 *     BUNNY_GIRL_BOT_KEY  -> (opcional) token/API key si la API requiere auth (se enviará como Bearer)
 *
 * Ejemplos de BUNNY_GIRL_BOT_URL válidos:
 * - https://api.example.com/search?q={query}
 * - https://api.example.com/search    (se añadirá ?q=...)
 */

// Soportar varios nombres de variable de entorno por compatibilidad
const API_URL =
  process.env.BUNNY_GIRL_BOT_URL ||
  process.env.BUNNY_GIRL_URL ||
  process.env.BUNNY_GIRL_API_URL ||
  process.env.PINTEREST_API_URL ||
  ''
const API_KEY =
  process.env.BUNNY_GIRL_BOT_KEY ||
  process.env.BUNNY_GIRL_KEY ||
  process.env.BUNNY_GIRL_API_KEY ||
  process.env.PINTEREST_API_KEY ||
  ''

function unescapeSlashes(s) {
  if (!s) return s
  return s
    .replace(/\\\\/g, '\\') // \\\\ -> \\\\? original intent: \\\\ -> \\
    .replace(/\\\//g, '/')     // \\/ -> /
    .replace(/\\u002F/g, '/')   // \u002F -> /
}

export default {
  command: ['pinterest', 'pin'],
  category: 'downloads',
  description: 'Buscar y descargar imágenes de Pinterest usando Bunny_girl_bot API o un fallback público.',
  run: async ({ msg, usedPrefix, command }) => {
    try {
      const text = (msg?.body || '').trim()
      const parts = text.split(/\s+/)
      const query = parts.slice(1).join(' ').trim()

      if (!query) {
        return msg.reply(
          `Usa: ${usedPrefix}${command} <término de búsqueda>\n` +
          `Ej: ${usedPrefix}${command} sunset`
        )
      }

      // Si no hay API configurada, intentaremos un fallback que raspa la página pública de Pinterest
      const useFallback = !API_URL

      if (!API_URL) console.warn('Bunny_girl_bot API no configurada. Intentando fallback con la página pública de Pinterest.')

      // Construir URL: soporta placeholder {query} o añade ?q= si no existe.
      let url
      if (!useFallback) {
        url = API_URL.includes('{query}')
          ? API_URL.replace(/{query}/g, encodeURIComponent(query))
          : `${API_URL}${API_URL.includes('?') ? '&' : '?'}q=${encodeURIComponent(query)}`
      } else {
        // Fallback: usar r.jina.ai para recuperar la HTML pública de Pinterest (raw proxy)
        // Este servicio devuelve el HTML de la página solicitada; no es oficial de Pinterest.
        url = `https://r.jina.ai/http://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`
      }

      const headers = { 'Accept': 'application/json' }
      if (API_KEY && !useFallback) headers['Authorization'] = `Bearer ${API_KEY}`

      // Si usamos fallback, pedir la versión cruda pero con User-Agent para evitar bloqueos
      if (useFallback) {
        headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
        headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }

      const res = await fetch(url, { headers })
      if (!res.ok) {
        return msg.reply(
          `Error al consultar la API (status ${res.status}). Intenta más tarde.`
        )
      }

      // Intentar parsear JSON; si la API devuelve texto/HTML, manejamos también.
      let data
      const contentType = (res.headers.get('content-type') || '').toLowerCase()
      if (contentType.includes('application/json')) {
        data = await res.json()
      } else {
        // Respuesta no-JSON: puede ser HTML (fallback) o texto plano
        const textBody = await res.text()
        if (!useFallback) {
          data = { _raw: textBody }
        } else {
          // En el fallback, parseamos HTML para extraer la mejor URL de imagen posible.
          const html = textBody
          const candidates = new Set()

          // Decodificador ligero de entidades comunes
          function decodeEntities(str) {
            if (!str) return str
            return str
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'")
          }

          // 0) Intentar parsear JSON-LD <script type="application/ld+json">
          let match = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i)
          if (match && match[1]) {
            try {
              const j = JSON.parse(decodeEntities(match[1]))
              const imgs = []
              if (j.image) {
                if (typeof j.image === 'string') imgs.push(j.image)
                else if (Array.isArray(j.image)) imgs.push(...j.image)
                else if (j.image.url) imgs.push(j.image.url)
              }
              imgs.forEach(u => u && candidates.add(unescapeSlashes(u)))
            } catch (_) { /* ignorar parse errors */ }
          }

          // 1) Buscar JSON embebido típico de Pinterest: window.__INITIAL_STATE__ o __PWS_DATA__
          const jsonRegexes = [
            /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});?/i,
            /<script[^>]+id=["']__PWS_DATA__["'][^>]*>([\s\S]*?)<\/script>/i,
            /<script[^>]*>[\s\S]*?Pinterest\.s\S*?=\s*(\{[\s\S]*?\})<\/script>/i
          ]
          for (const r of jsonRegexes) {
            let m
            if ((m = r.exec(html))) {
              let snippet = m[1]
              try {
                snippet = decodeEntities(unescapeSlashes(snippet))
                const parsed = JSON.parse(snippet)
                const txt = JSON.stringify(parsed)
                const broadUrlRegex = /https?:\/\/[^"'\\s\\]+/ig
                let um
                while ((um = broadUrlRegex.exec(txt)) !== null) {
                  candidates.add(unescapeSlashes(um[0]))
                }
              } catch (_) {
                // si falla el parseo, intentar extraer URLs del snippet sin parsear
                const broadUrlRegex = /https?:\\?\\?\\\/\\?\\?[^"'\\s<>]+/ig
                let um
                const cleaned = decodeEntities(unescapeSlashes(snippet))
                while ((um = /https?:\/\/[^"'<>\\s]+/ig.exec(cleaned))) {
                  candidates.add(um[0])
                }
              }
              break
            }
          }

          // 2) Buscar meta og:image
          match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
          if (match && match[1]) candidates.add(unescapeSlashes(match[1]))

          // 3) Buscar imágenes en atributos comunes: src, data-src, data-srcset, srcset, data-large-image
          const attrRegex = /(?:src|data-src|data-srcset|data-large-image|srcset)=["']([^"']+)["']/ig
          while ((match = attrRegex.exec(html)) !== null) {
            const val = decodeEntities(match[1])
            if (val.includes(',')) {
              val.split(',').forEach(part => {
                const urlPart = part.trim().split(/\s+/)[0]
                if (urlPart) candidates.add(unescapeSlashes(urlPart))
              })
            } else {
              candidates.add(unescapeSlashes(val))
            }
          }

          // 4) Buscar URLs escapadas de i.pinimg.com (https:\/\/i.pinimg.com\/...)
          const escapedPinRegex = /https?:\\\/\\\/i\.pinimg\.com\\\/[\w\-\\\/\.]+/ig
          while ((match = escapedPinRegex.exec(html)) !== null) {
            candidates.add(unescapeSlashes(match[0]))
          }

          // 5) Buscar URLs directas a i.pinimg.com no escapadas
          const pinRegex = /https?:\/\/i\.pinimg\.com\/[\w\-\/\.]+/ig
          while ((match = pinRegex.exec(html)) !== null) {
            candidates.add(match[0])
          }

          // 6) Broad URL scan en versión unescaped/decoded
          const broadUrlRegex = /https?:\/\/[^")'>\s]+/ig
          const unescaped = decodeEntities(unescapeSlashes(html))
          while ((match = broadUrlRegex.exec(unescaped)) !== null) {
            candidates.add(match[0])
          }

          // 7) Como último recurso, buscar la primera <img src=...>
          if (candidates.size === 0) {
            match = html.match(/<img[^>]+src=["']([^"']+)["']/i)
            if (match && match[1]) candidates.add(unescapeSlashes(match[1]))
          }

          // Filtrar candidatos por extensiones de imagen o dominios de Pinterest
          const imageExtRegex = /\.(jpe?g|png|gif|webp|bmp)(?:\?|$)/i
          let selected = null

          // Preferir i.pinimg.com
          for (const c of candidates) {
            if (!c) continue
            const normalized = c.split('?')[0]
            if (/i\.pinimg\.com/.test(normalized) && imageExtRegex.test(normalized)) {
              selected = c
              break
            }
          }

          if (!selected) {
            for (const c of candidates) {
              if (!c) continue
              if (imageExtRegex.test(c)) {
                selected = c
                break
              }
            }
          }

          // Si aún no seleccionado, tomar el primer candidato que parezca URL
          if (!selected) {
            for (const c of candidates) {
              if (!c) continue
              if (/^https?:\/\//i.test(c)) {
                selected = c
                break
              }
            }
          }

          data = { image: selected }
        }
      }

      // Buscar URL de imagen en varios campos comunes; añade más rutas si tu API usa otros nombres.
      const imageUrl =
        // respuestas simples
        (typeof data === 'string' && data) ||
        data?.url ||
        data?.image ||
        data?.image_url ||
        data?.img ||
        // arrays
        (Array.isArray(data?.images) && data.images[0]) ||
        (Array.isArray(data?.result) && (data.result[0]?.url || data.result[0]?.image)) ||
        // raw text
        data?._raw ||
        null

      if (!imageUrl) {
        // Si no encontramos imagen y no usamos fallback, dar mensaje con instrucciones
        if (!useFallback) {
          return msg.reply(
            `No encontré imágenes para "${query}". Revisa que la variable de entorno BUNNY_GIRL_BOT_URL esté bien definida (acepta placeholders {query}).\n` +
            `Variables alternativas soportadas: BUNNY_GIRL_BOT_URL, BUNNY_GIRL_URL, BUNNY_GIRL_API_URL, PINTEREST_API_URL.\n` +
            `Si tu API requiere clave, define BUNNY_GIRL_BOT_KEY o BUNNY_GIRL_KEY.`
          )
        }

        // Si usamos fallback y no hay imagen, informar al usuario
        return msg.reply(
          `No pude extraer una imagen de Pinterest para "${query}" usando el método alternativo. ` +
          `Puedes configurar una API dedicada (BUNNY_GIRL_BOT_URL) para mejores resultados.`
        )
      }

      // Intentar enviar como media; si falla, enviar enlace como fallback.
      try {
        await msg.reply({ image: { url: imageUrl }, caption: `Resultado para: ${query}` })
      } catch (err) {
        await msg.reply(`Resultado para "${query}":\n${imageUrl}`)
      }
    } catch (err) {
      console.error('pinterest command error:', err)
      return msg.reply(
        `Ocurrió un error al buscar imágenes. Puedes usar otros comandos como ${usedPrefix}imagen o ${usedPrefix}play.`
      )
    }
  }
}
