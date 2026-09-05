/**
 * .qr <texto|url>  →  genera un código QR como imagen.
 */
export default {
  command: ['qrcode', 'qrgen', 'makeqr'],
  category: 'utils',
  description: 'Generar un código QR a partir de un texto o enlace.',
  run: async ({ msg, sock, args, usedPrefix, command, text }) => {
    if (!text) {
      return msg.reply(
        `《✧》 Escribe el *texto* o *enlace* para generar el QR.\n`
        + `> Ejemplo: ${usedPrefix}qr https://github.com/adan292/bunny-girl-bot-v2`
      );
    }
    try {
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(text)}`;
      await sock.sendMessage(msg.chat, {
        image: { url },
        caption: `📱 *QR generado*\n\n> Contenido: ${text.slice(0, 200)}`,
      }, { quoted: msg });
    } catch (e) {
      msg.reply(`《✧》 No pude generar el QR.\n> ${e.message || 'error'}`);
    }
  },
};
