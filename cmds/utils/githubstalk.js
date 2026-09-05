/**
 * .githubstalk <usuario>  →  información de un usuario de GitHub (avatar, bio, repos, seguidores).
 */
export default {
  command: ['githubstalk', 'ghstalk', 'gh'],
  category: 'utils',
  description: 'Ver información de un usuario de GitHub.',
  run: async ({ msg, sock, usedPrefix, command, text }) => {
    if (!text) {
      return msg.reply(
        `《✧》 Escribe el *nombre de usuario* de GitHub.\n> Ejemplo: ${usedPrefix}gh riokuroxi-svg`
      );
    }
    const user = text.trim().replace(/^@/, '').split(/\s+/)[0];
    try {
      await msg.react('🐙');
      const res = await fetch(`https://api.github.com/users/${encodeURIComponent(user)}`, {
        headers: { 'User-Agent': 'Ginko-Bot', 'Accept': 'application/vnd.github+json' },
      });
      if (res.status === 404) return msg.reply(`《✧》 Usuario *${user}* no encontrado en GitHub.`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      const creado = d.created_at ? new Date(d.created_at).toLocaleDateString('es-MX') : '—';
      const caption = [
        `🐙 *GitHub:* ${d.login}`,
        d.name ? `👤 *Nombre:* ${d.name}` : '',
        d.bio ? `📝 *Bio:* ${d.bio}` : '',
        `📂 *Repos públicos:* ${d.public_repos ?? 0}`,
        `⭐ *Seguidores:* ${d.followers ?? 0}`,
        `👣 *Siguiendo:* ${d.following ?? 0}`,
        d.location ? `📍 *Ubicación:* ${d.location}` : '',
        d.blog ? `🔗 *Web:* ${d.blog}` : '',
        d.company ? `🏢 *Empresa:* ${d.company}` : '',
        d.twitter_username ? `🐦 *Twitter:* @${d.twitter_username}` : '',
        `📅 *En GitHub desde:* ${creado}`,
        `🔗 ${d.html_url}`,
      ].filter(Boolean).join('\n');
      if (d.avatar_url) {
        await sock.sendMessage(msg.chat, { image: { url: d.avatar_url }, caption }, { quoted: msg });
      } else {
        await msg.reply(caption);
      }
      await msg.react('✔️');
    } catch (e) {
      await msg.react('❌');
      msg.reply(`《✧》 Error al consultar GitHub.\n> ${e.message}`);
    }
  },
};
