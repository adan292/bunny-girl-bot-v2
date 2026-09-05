/**
 * .anime <título>  →  información de un anime (AniList GraphQL).
 * Incluye título, episodios, score, año, géneros, estudio, portada.
 */
export default {
  command: ['anime', 'anibusc'],
  category: 'anime',
  description: 'Buscar información de un anime por AniList.',
  run: async ({ msg, sock, args, usedPrefix, command, text }) => {
    if (!text) {
      return msg.reply(
        `《✧》 Escribe el nombre del *anime*.\n> Ejemplo: ${usedPrefix}anime jujutsu kaisen`
      );
    }
    await msg.react('🎬').catch(() => {});
    try {
      const query = `
        query ($s: String) {
          Media(search: $s, type: ANIME) {
            title { romaji english native }
            description(asHtml: false)
            episodes
            duration
            status
            seasonYear
            genres
            averageScore
            studios(isMain: true) { nodes { name } }
            coverImage { large }
            bannerImage
            siteUrl
          }
        }`;
      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'BunnyGirlBot/1.0', 'Accept': 'application/json' },
        body: JSON.stringify({ query, variables: { s: text } }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const m = data?.data?.Media;
      if (!m) return msg.reply('《✧》 Anime no encontrado.');

      const titulo = m.title?.romaji || m.title?.english || m.title?.native || '?';
      const tit_en = m.title?.english || '—';
      const tit_jp = m.title?.native || '—';
      const desc = (m.description || 'Sin descripción.').replace(/<[^>]+>/g, '').replace(/\n+/g, ' ').slice(0, 400);
      const estado = { FINISHED: '✅ Terminado', RELEASING: '🟢 En emisión', NOT_YET_RELEASED: '🔜 Próximamente', CANCELLED: '❌ Cancelado', HIATUS: '⏸ Pausado' }[m.status] || m.status;
      const est = m.studios?.nodes?.[0]?.name || '—';
      const gen = (m.genres || []).join(', ') || '—';
      const txt =
        `🎬 *${titulo}*\n\n`
        + `🇬🇧 EN: ${tit_en}\n`
        + `🇯🇵 JP: ${tit_jp}\n\n`
        + `📺 Episodios: ${m.episodes || '—'}\n`
        + `⏱ Duración: ${m.duration ? m.duration + ' min' : '—'}\n`
        + `📅 Año: ${m.seasonYear || '—'}\n`
        + `📊 Estado: ${estado}\n`
        + `⭐ Score: ${m.averageScore ? m.averageScore + '/100' : '—'}\n`
        + `🎞 Estudio: ${est}\n`
        + `🏷 Géneros: ${gen}\n\n`
        + `📝 ${desc}${desc.length >= 399 ? '...' : ''}\n\n`
        + `🔗 ${m.siteUrl}`;

      if (m.coverImage?.large) {
        await sock.sendMessage(msg.chat, { image: { url: m.coverImage.large }, caption: txt }, { quoted: msg });
      } else {
        msg.reply(txt);
      }
      await msg.react('✔️').catch(() => {});
    } catch (e) {
      await msg.react('❌').catch(() => {});
      msg.reply(`《✧》 No pude buscar el anime.\n> ${e.message}`);
    }
  },
};
