import axios from "axios";
import yts from "yt-search";

const API_KEY = process.env.LEMPI_API_KEY || "Duarte-1311-2026";

export default {
  name: ["play", "yta", "ytmp3", "playaudio"],
  description: "Descarga música de YouTube",
  category: "dl",
  ownerOnly: false,

  async run({ sock, from, msg, text, reply, react }) {
    try {
      const query = (text || "").trim();

      if (!query) {
        return reply({
          text: "⛧ escribe el nombre o link del video",
        });
      }

      await react("🎧");

      let yt = null;

      try {
        const search = await yts(query);
        const candidates = [...(search?.videos || []), ...(search?.all || [])];
        yt = candidates.find((item) => item?.url) || null;
      } catch (error) {
        console.error("Error al buscar en YouTube:", error);
      }

      if (!yt && /(?:youtube\.com|youtu\.be)/i.test(query)) {
        yt = {
          title: "YouTube video",
          url: query,
          views: 0,
          seconds: 0,
        };
      }

      if (!yt) {
        return reply({
          text: "⛧ no encontré resultados",
        });
      }

      const youtubeUrl = yt.url;
      const api = `https://api.lempi.lat/dl/yta?apikey=${API_KEY}&url=${encodeURIComponent(youtubeUrl)}`;

      const res = await axios.get(api, { timeout: 90000 });
      const data = res?.data;
      const downloadUrl = data?.datos?.url || data?.download_url || data?.url || null;

      if (!data?.status || !downloadUrl) {
        const errorText = data?.message || data?.error || "⛧ no pude obtener el audio";
        return reply({
          text: `⛧ ${errorText}`,
        });
      }

      const title = data?.titulo || yt.title || "Audio de YouTube";
      const thumbnail = data?.miniatura || yt.thumbnail || null;
      const calidad = data?.datos?.calidad || "360p";
      const formato = (data?.datos?.extension || "mp3").replace(/^\./, "") || "mp3";
      const fileName = sanitizeFileName(data?.datos?.archivo || `${title}.${formato}`);
      const vistas = formatViews(yt.views || 0);

      if (thumbnail) {
        await sock.sendMessage(
          from,
          {
            image: { url: thumbnail },
            caption:
              `⛧ ${title}\n\n` +
              `⛧ vistas › ${vistas}\n` +
              `⛧ duración › ${formatDuration(yt.seconds || 0)}\n` +
              `⛧ calidad › ${calidad}\n` +
              `⛧ formato › ${formato}\n` +
              `⛧ link › ${youtubeUrl}`,
          },
          { quoted: msg }
        );
      }

      const isLongAudio = Number(yt.seconds || 0) > 1800;

      if (isLongAudio) {
        await sock.sendMessage(
          from,
          {
            document: { url: downloadUrl },
            mimetype: "audio/mpeg",
            fileName,
            caption: "⛧ audio enviado como documento por duración/tamaño",
          },
          { quoted: msg }
        );
      } else {
        await sock.sendMessage(
          from,
          {
            audio: { url: downloadUrl },
            mimetype: "audio/mpeg",
            ptt: false,
          },
          { quoted: msg }
        );
      }

      await react("✅");
    } catch (e) {
      console.error(e);
      await react("❌");

      return reply({
        text: `⛧ ${e?.message || "error desconocido"}`,
      });
    }
  },
};

function sanitizeFileName(name) {
  return String(name || "audio.mp3")
    .replace(/[\\/:*?"<>|\n\r]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
}

function formatViews(views) {
  if (!views) return "No disponible";

  if (views >= 1e9) {
    return `${(views / 1e9).toFixed(1)}B`;
  }

  if (views >= 1e6) {
    return `${(views / 1e6).toFixed(1)}M`;
  }

  if (views >= 1e3) {
    return `${(views / 1e3).toFixed(1)}k`;
  }

  return views.toString();
}

function formatDuration(duration) {
  if (!duration) return "No disponible";

  if (typeof duration === "string") {
    if (duration.includes(":")) {
      return duration;
    }
    duration = Number(duration);
  }

  if (isNaN(duration)) {
    return "No disponible";
  }

  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  const seconds = Math.floor(duration % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
