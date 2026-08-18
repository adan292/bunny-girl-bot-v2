import fetch from 'node-fetch'

/**
 * Comando .pin / .pinterest — actualmente FUERA DE SERVICIO.
 *
 * Estado (2026-08-12):
 *   - La API anterior (fare.ink) tiene el certificado TLS roto.
 *   - APIs alternativas probadas (vihangayt, savekaito, cobalt v10, siputzx, lempi, ootaizumi):
 *     todas 404 / DNS muerto / requieren JWT de autenticación.
 *   - El scraping directo de Pinterest es demasiado frágil (React SSR con anti-bot)
 *     y cambiaría a cada actualización de su web.
 *
 * Cuando aparezca una API gratuita estable para Pinterest, este comando se puede
 * reactivar. Por ahora se deja un mensaje claro para que el usuario no se quede
 * pensando que es un error del bot.
 */
export default {
  command: ['pinterest', 'pin'],
  category: 'downloads',
  description: 'Buscar y descargar imágenes de Pinterest (⚠️ servicio temporalmente fuera de línea).',
  run: async ({ msg, usedPrefix, command }) => {
    return msg.reply(
      `《✧》 El servicio de descarga de *Pinterest* está temporalmente fuera de línea.\n\n` +
      `> La API gratuita que usaba el bot dejó de funcionar (certificado roto) y no hay una alternativa gratuita estable en este momento.\n` +
      `> Puedes seguir usando otros comandos como *${usedPrefix}imagen*, *${usedPrefix}play* o *${usedPrefix}tiktok* sin problemas.\n\n` +
      `Se reactivará en cuanto haya una API disponible.`
    )
  }
}
