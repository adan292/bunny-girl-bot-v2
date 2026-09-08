import axios from 'axios';
import yts from 'yt-search';
import type { CommandDefinition } from './types';

const API_KEY = 'Bunny-girl-bot';

function formatViews(views: number | undefined): string {
  if (!views) return 'No disponible';
  if (views >= 1e9) return `${(views / 1e9).toFixed(1)}B`;
  if (views >= 1e6) return `${(views / 1e6).toFixed(1)}M`;
  if (views >= 1e3) return `${(views / 1e3).toFixed(1)}k`;
  return views.toString();
}

function formatDuration(duration: number | string | undefined): string {
  if (!duration) return 'No disponible';
  if (typeof duration === 'string') {
    if (duration.includes(':')) return duration;
    duration = Number(duration);
  }
  if (isNaN(duration)) return 'No disponible';

  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  const seconds = Math.floor(duration % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

const play: CommandDefinition = {
  name: 'play',
  aliases: ['yta', 'ytmp3', 'playaudio'],
  description: 'Descarga música de YouTube',

  handler: async ({
    sock,
    chatJid,
    msg,
    args,
  }) => {
    try {
      const text = args.join(' ').trim();

      if (!text) {
        await sock.sendMessage(
          chatJid,
          { text: '⛧ escribe el nombre o link del video' },
          { quoted: msg },
        );
        return;
      }

      await sock.sendMessage(chatJid, {
        react: { text: '🎧', key: msg.key },
      });

      const search = await yts(text);
      const yt = search.videos?.[0] || search.all?.[0];

      if (!yt) {
        await sock.sendMessage(
          chatJid,
          { text: '⛧ no encontré resultados' },
          { quoted: msg },
        );
        return;
      }

      const api = `https://api.lempi.lat/dl/yta?apikey=${API_KEY}&url=${encodeURIComponent(yt.url)}`;

      const res = await axios.get(api, {
        timeout: 90000,
      });

      const data = res.data;

      if (!data?.status || !data?.datos?.url) {
        await sock.sendMessage(
          chatJid,
          { text: '⛧ no pude obtener el audio' },
          { quoted: msg },
        );
        return;
      }

      const title: string = data.titulo;
      const thumbnail: string = data.miniatura;
      const youtube_url: string = yt.url;
      const download_url: string = data.datos.url;
      const calidad: string = data.datos.calidad || '360p';
      const formato: string = data.datos.extension?.replace('.', '') || 'mp3';
      const fileName: string = data.datos.archivo || `${title}.${formato}`;

      const vistas = formatViews(yt.views);

      await sock.sendMessage(
        chatJid,
        {
          image: { url: thumbnail },
          caption:
            `⛧ ${title}\n\n` +
            `⛧ vistas › ${vistas}\n` +
            `⛧ duración › ${formatDuration(yt.seconds)}\n` +
            `⛧ calidad › ${calidad}\n` +
            `⛧ formato › ${formato}\n` +
            `⛧ link › ${youtube_url}`,
        },
        { quoted: msg },
      );

      const isLongAudio = (yt.seconds || 0) > 1800;

      if (isLongAudio) {
        await sock.sendMessage(
          chatJid,
          {
            document: { url: download_url },
            mimetype: 'audio/mpeg',
            fileName,
            caption: '⛧ audio enviado como documento por duración/tamaño',
          },
          { quoted: msg },
        );
      } else {
        await sock.sendMessage(
          chatJid,
          {
            audio: { url: download_url },
            mimetype: 'audio/mpeg',
            ptt: false,
          },
          { quoted: msg },
        );
      }

      await sock.sendMessage(chatJid, {
        react: { text: '✅', key: msg.key },
      });
    } catch (e: any) {
      console.error(e);

      await sock.sendMessage(chatJid, {
        react: { text: '❌', key: msg.key },
      });

      await sock.sendMessage(
        chatJid,
        { text: `⛧ ${e.message || e}` },
        { quoted: msg },
      );
    }
  },
};

export default play;
