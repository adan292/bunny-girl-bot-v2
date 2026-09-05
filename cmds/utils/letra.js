/**
 * .letra <artista>/<canción>  →  letra de la canción (lyrics.ovh).
 * También acepta .letra <artista> <canción> (sin /) si se puede adivinar.
 */
export default {
  command: ['letra', 'lyrics', 'lyric'],
  category: 'utils',
  description: 'Buscar la letra de una canción.',
  run: async ({ msg, usedPrefix, command, text }) => {
    if (!text) {
      return msg.reply(
        `《✧》 Escribe el *artista* y *canción*.\n`
        + `> Formato: ${usedPrefix}letra Bad Bunny/Diles\n`
        + `> O también: ${usedPrefix}letra Bad Bunny Diles`
      );
    }
    let artista, cancion;
    if (text.includes('/')) {
      const partes = text.split('/').map(s => s.trim());
      artista = partes[0];
      cancion = partes.slice(1).join('/');
    } else {
      // Si el usuario pasa "Bad Bunny Diles" intentamos partir en 2 (primera palabra = artista es arriesgado;
      // intentamos lo más simple: artista es la primera palabra hasta el espacio y canción el resto, pero para casos
      // de artistas con 2+ nombres no funciona; por eso preferimos /)
      // Probamos primero si es "artista cancion" separando por el primer espacio; si no, avisamos que use /.
      const parts = text.trim().split(/\s+/);
      if (parts.length < 2) {
        return msg.reply(`《✧》 Usa el formato *artista/canción*.\n> Ej: ${usedPrefix}letra Bad Bunny/Diles`);
      }
      // Heurística: artista = primera palabra, canción = resto (pobre, pero lyrics.ovh suele encontrar)
      artista = parts[0];
      cancion = parts.slice(1).join(' ');
    }
    if (!artista || !cancion) {
      return msg.reply(`《✧》 Formato incorrecto. Usa *artista/canción*.`);
    }
    try {
      await msg.react('🎵');
      const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artista)}/${encodeURIComponent(cancion)}`;
      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.lyrics) {
        await msg.react('❌');
        return msg.reply(`《✧》 No encontré la letra de *${cancion}* de *${artista}*.`);
      }
      const letra = data.lyrics.trim();
      const cabecera = `🎵 *Letra: ${cancion}*\n👤 ${artista}\n\n`;
      // Dividir en mensajes de ~3500 caracteres para no exceder límite de WhatsApp
      const maxLen = 3500 - cabecera.length;
      const chunks = [];
      let rest = letra;
      while (rest.length > maxLen) {
        const corte = rest.lastIndexOf('\n', maxLen);
        const i = corte > maxLen - 400 ? corte : maxLen;
        chunks.push(rest.slice(0, i));
        rest = rest.slice(i).replace(/^\n+/, '');
      }
      chunks.push(rest);
      for (let i = 0; i < chunks.length; i++) {
        const encabezado = i === 0 ? cabecera : `🎵 *${cancion}* (${i + 1}/${chunks.length})\n\n`;
        await msg.reply(encabezado + chunks[i]);
      }
      await msg.react('✔️');
    } catch (e) {
      await msg.react('❌');
      msg.reply(`《✧》 Error al buscar la letra.\n> ${e.message}`);
    }
  },
};
