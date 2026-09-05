/**
 * .acortar <url>  →  acorta una URL con TinyURL.
 */
export default {
  command: ['acortar', 'shorturl', 'shorten', 'acorta'],
  category: 'utils',
  description: 'Acortar un enlace con TinyURL.',
  run: async ({ msg, sock, args, usedPrefix, command, text }) => {
    if (!text) {
      return msg.reply(
        `《✧》 Envía un *enlace* para acortar.\n`
        + `> Ejemplo: ${usedPrefix}acortar https://github.com/adan292/bunny-girl-bot-v2`
      );
    }
    const url = text.trim().split(/\s+/)[0];
    if (!/^https?:\/\//i.test(url)) {
      return msg.reply(`《✧》 El texto no parece un enlace válido (debe empezar con http:// o https://).`);
    }
    try {
      const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
      const short = (await res.text()).trim();
      if (!res.ok || !short.startsWith('http')) {
        return msg.reply(`《✧》 No se pudo acortar el enlace. Intenta más tarde.`);
      }
      msg.reply(`🔗 *Enlace acortado:*\n\n> ${short}\n\n_Original:_ ${url}`);
    } catch (e) {
      msg.reply(`《✧》 Error al acortar.\n> ${e.message || 'error'}`);
    }
  },
};
