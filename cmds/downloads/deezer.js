/**
 * .deezer <búsqueda o enlace>  →  busca música en Deezer y envía preview (30s) + info del track.
 */
export default {
  command: ['deezer', 'dzr', 'deezermusic'],
  category: 'downloads',
  description: 'Buscar música en Deezer (preview de 30 segundos).',
  run: async ({ msg, sock, usedPrefix, command, text }) => {
    if (!text) return msg.reply(`《✧》 Escribe qué canción buscar.\n> Ejemplo: ${usedPrefix}deezer Bad Bunny Diles`);
    try {
      await msg.react('🎧');
      // Buscar
      const url = `https://api.deezer.com/search?q=${encodeURIComponent(text)}&limit=1`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const track = data?.data?.[0];
      if (!track) return msg.reply('《✧》 No encontré esa canción en Deezer.');

      const caption = [
        `🎧 *Deezer*`,
        `• *Título:* ${track.title}`,
        `• *Artista:* ${track.artist?.name || '—'}`,
        `• *Álbum:* ${track.album?.title || '—'}`,
        `• *Duración:* ${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, '0')}`,
        `• *Explícito:* ${track.explicit_lyrics ? 'Sí' : 'No'}`,
        `• *Link:* ${track.link}`,
        '',
        '_Se envía un preview de 30s (Deezer no da canciones completas gratis)._',
      ].join('\n');

      // Enviar portada + info
      if (track.album?.cover_medium || track.album?.cover) {
        const cover = track.album?.cover_medium || track.album?.cover;
        await sock.sendMessage(msg.chat, { image: { url: cover }, caption }, { quoted: msg });
      } else {
        await msg.reply(caption);
      }

      // Enviar preview de audio (30s)
      if (track.preview) {
        const audioRes = await fetch(track.preview);
        if (audioRes.ok) {
          const buf = Buffer.from(await audioRes.arrayBuffer());
          await sock.sendMessage(msg.chat, {
            audio: buf,
            mimetype: 'audio/mpeg',
            fileName: `${track.artist.name} - ${track.title}.mp3`,
          }, { quoted: msg });
        }
      } else {
        if (!(track.album?.cover_medium)) await msg.reply(caption);
        await msg.reply('⚠️ Esta canción no tiene preview disponible.');
      }
      await msg.react('✔️');
    } catch (e) {
      await msg.react('❌');
      msg.reply(`《✧》 Error en Deezer.\n> ${e.message}`);
    }
  },
};
