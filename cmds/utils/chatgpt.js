import fetch from 'node-fetch';
import FormData from 'form-data';

/**
 * Comando de IA con Google Gemini.
 * Aliases: ai, ia, chatgpt, gemini, chat
 *
 * Características:
 *  - Usa Gemini (gemini-flash-latest = Gemini 3.6 Flash) con la key del settings.js
 *  - Mantiene memoria de conversación por chat (últimos 10 mensajes)
 *  - .ai reset / .ia limpiar → borra la memoria del chat
 *  - Responde a imágenes citadas (usa litterbox para subir la imagen a URL pública)
 *  - Sin console.log extra — solo el log estándar del main.js
 */

// Memoria por chat: { chatId: [ {role:'user'|'model', text:string} ] }
const memoria = {};
const MEM_MAX = 10;
const URL_GEMINI = (key, model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

// Reutilizamos el uploader a litterbox (mismo que .tourl)
async function subirLitterbox(buffer, mime) {
  const ext = (mime || 'image/jpeg').split('/')[1]?.split(';')[0] || 'jpg';
  const filename = `ginko_${Date.now()}.${ext}`;
  for (const t of ['1h', '12h', '24h', '72h']) {
    try {
      const form = new FormData();
      form.append('reqtype', 'fileupload');
      form.append('time', t);
      form.append('fileToUpload', buffer, { filename, contentType: mime || 'image/jpeg' });
      const res = await fetch('https://litterbox.catbox.moe/resources/internals/api.php', {
        method: 'POST',
        body: form,
      });
      const text = await res.text();
      if (text.startsWith('https://')) return text;
    } catch (_) {}
  }
  return null;
}

async function geminiPedir(key, model, contents, sysPrompt) {
  const safetySettings = [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  ];

  // Inserta system prompt como primer par user/model
  const arr = [];
  if (sysPrompt) {
    arr.push({ role: 'user', parts: [{ text: sysPrompt }] });
    arr.push({ role: 'model', parts: [{ text: 'Entendido. Seguiré esas instrucciones.' }] });
  }
  arr.push(...contents);

  const res = await fetch(URL_GEMINI(key, model), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: arr,
      safetySettings,
      generationConfig: { maxOutputTokens: 900, temperature: 0.75 },
    }),
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const err = await res.json(); msg = err?.error?.message || msg; } catch (_) {}
    throw new Error(msg);
  }
  const data = await res.json();
  const blocked = data?.promptFeedback?.blockReason
    || data?.candidates?.[0]?.finishReason === 'SAFETY';
  if (blocked) throw new Error('La IA bloqueó esta respuesta por políticas de seguridad.');
  const resp = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!resp) throw new Error('Gemini no devolvió respuesta.');
  return resp.trim();
}

export default {
  command: ['ai', 'ia', 'chatgpt', 'gemini', 'chat'],
  category: 'utils',
  description: 'Chatear con la IA (Gemini) con memoria.',
  run: async ({ msg, sock, args, usedPrefix, command, text }) => {
    const key = global.geminiKey;
    const model = global.geminiModel || 'gemini-flash-latest';
    const chatId = msg.chat;

    if (!key || key === 'tu_key_aqui') {
      return msg.reply(
        '《✧》 No hay *key de Gemini* configurada.\n'
        + '> Consíguela gratis en aistudio.google.com/apikey\n'
        + '> y ponla en settings.js como global.geminiKey'
      );
    }

    const comando = (text || '').trim().toLowerCase();

    // Reset de memoria
    if (['reset', 'limpiar', 'clear', 'borrar'].includes(comando)) {
      delete memoria[chatId];
      return msg.reply('🧠 *Memoria borrada.* Empezamos de cero.');
    }

    // Obtener texto (del mensaje directo o del citado si no hay texto)
    let texto = text?.trim() || '';
    let imageUrl = null;
    const q = msg.quoted || null;
    const mimeCitado = q?.mimetype || '';

    if (q && /^image\//.test(mimeCitado)) {
      try {
        const buf = await q.download();
        if (buf) {
          const up = await subirLitterbox(buf, mimeCitado);
          if (up) imageUrl = up;
        }
      } catch (_) {}
    }

    if (!texto && !imageUrl) {
      return msg.reply(
        `《✧》 Escribe una *petición* para que la IA responda.\n\n`
        + `Ejemplos:\n`
        + `• ${usedPrefix}ai ¿cuál es la capital de Japón?\n`
        + `• Responde a una *imagen* con ${usedPrefix}ai ¿qué se ve aquí?\n`
        + `• ${usedPrefix}ai reset → borra la memoria del chat`
      );
    }

    // Reacción de espera
    try { await msg.react('🕒'); } catch (_) {}
    let statusKey = null;
    try {
      const s = await sock.sendMessage(msg.chat, { text: 'ꕥ *Gemini* está pensando...' }, { quoted: msg });
      statusKey = s.key;
    } catch (_) {}

    try {
      // Construir historial
      const historial = memoria[chatId] || [];
      const systemPrompt =
        'Eres Bunny Girl, el asistente de WhatsApp. Responde siempre en español, '
        + 'de forma clara, amigable y breve (máximo 600 caracteres a menos que pidan más detalle). '
        + 'Si te envían una imagen, descríbela con precisión.';

      const parts = [];
      const reqText = texto || (imageUrl ? 'Describe esta imagen.' : '');
      parts.push({ text: reqText });
      if (imageUrl) parts.push({ file_data: { mime_type: 'image/jpeg', file_uri: imageUrl } });

      const contenido = [];
      contenido.push(...historial);
      contenido.push({ role: 'user', parts });

      const respuesta = await geminiPedir(key, model, contenido, systemPrompt);

      // Guardar en memoria (solo el texto para no inflar con imágenes)
      if (!memoria[chatId]) memoria[chatId] = [];
      memoria[chatId].push({ role: 'user', parts: [{ text: reqText }] });
      memoria[chatId].push({ role: 'model', parts: [{ text: respuesta }] });
      // Mantener límite
      while (memoria[chatId].length > MEM_MAX) memoria[chatId].shift();

      // Enviar respuesta (edita el msj de "pensando" si existe)
      try { await msg.react('✔️'); } catch (_) {}
      if (statusKey) {
        try {
          await sock.sendMessage(msg.chat, { text: respuesta, edit: statusKey });
        } catch (_) {
          await msg.reply(respuesta);
        }
      } else {
        await msg.reply(respuesta);
      }
    } catch (e) {
      try { await msg.react('❌'); } catch (_) {}
      if (statusKey) {
        try {
          await sock.sendMessage(msg.chat, {
            text: `《✧》 No se pudo obtener respuesta.\n> ${e.message || 'error desconocido'}`,
            edit: statusKey,
          });
          return;
        } catch (_) {}
      }
      msg.reply(`《✧》 No se pudo obtener respuesta.\n> ${e.message || 'error desconocido'}`);
    }
  },
};
