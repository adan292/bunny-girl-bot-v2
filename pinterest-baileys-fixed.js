/**
 * pinterest-baileys-fixed.js
 * Mejoras:
 * - Mueve la API key a .env (process.env.PINTEREST_API_KEY)
 * - Reintentos con exponential backoff (intentos configurables)
 * - En caso de 403, reintenta usando Authorization/User-Agent
 * - Logging detallado (status, headers, body) cuando la API devuelve error
 * - Rate limiting simple por usuario para reducir bloqueos
 *
 * Requisitos:
 * npm i @adiwajshing/baileys qrcode-terminal dotenv
 * Si usas Node < 18: npm i node-fetch@2
 *
 * .env ejemplo:
 * PINTEREST_API_KEY=Bunny-girl-bot
 * PINTEREST_API_BASE=https://api.lempi.lat/tools/pinterest
 *
 * Ejecutar: node pinterest-baileys-fixed.js
 */

require('dotenv').config();
const qrcode = require('qrcode-terminal');
const { default: makeWASocket, useSingleFileAuthState } = require('@adiwajshing/baileys');

const fetch = global.fetch || require('node-fetch'); // node18+ tiene fetch
const { state, saveState } = useSingleFileAuthState('./auth_info_multi.json');

// Configuración
const API_KEY = process.env.PINTEREST_API_KEY || 'Bunny-girl-bot';
const API_BASE = process.env.PINTEREST_API_BASE || 'https://api.lempi.lat/tools/pinterest';
const API_DEFAULT_PARAMS = { action: 'search', limit: '5' };
const MAX_RESULTS = 5;

// Reintentos
const MAX_ATTEMPTS = 3;
const BACKOFF_BASE_MS = 800; // backoff exponencial: base * 2^(attempt-1)

// Rate limiting simple por usuario
const COOLDOWN_MS = 3000; // 3s entre comandos del mismo usuario
const WINDOW_MS = 60_000; // ventana para contador
const MAX_PER_WINDOW = 6; // max peticiones por usuario por ventana

const userActivity = new Map(); // jid -> { lastTs, windowStart, count }

function allowedToRun(jid) {
  const now = Date.now();
  let info = userActivity.get(jid);
  if (!info) {
    info = { lastTs: 0, windowStart: now, count: 0 };
    userActivity.set(jid, info);
  }

  // cooldown
  if (now - info.lastTs < COOLDOWN_MS) return { allowed: false, reason: 'cooldown' };

  // window rate
  if (now - info.windowStart > WINDOW_MS) {
    info.windowStart = now;
    info.count = 0;
  }
  if (info.count >= MAX_PER_WINDOW) return { allowed: false, reason: 'rate_limit' };

  // allow and update
  info.lastTs = now;
  info.count += 1;
  return { allowed: true };
}

function buildApiUrl(query, includeKeyAsQuery = true) {
  const params = new URLSearchParams(API_DEFAULT_PARAMS);
  if (includeKeyAsQuery) params.set('apikey', API_KEY);
  params.set('query', query);
  return `${API_BASE}?${params.toString()}`;
}

async function callApiWithAttempts(apiUrl, attemptOptions = {}) {
  // attemptOptions: { useAuthHeader: boolean, userAgent: string }
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const headers = { 'Content-Type': 'application/json' };
    if (attemptOptions.useAuthHeader) headers['Authorization'] = `Bearer ${API_KEY}`;
    if (attemptOptions.userAgent) headers['User-Agent'] = attemptOptions.userAgent;

    try {
      const res = await fetch(apiUrl, { method: 'GET', headers });
      const text = await res.text(); // leer body para logging y parsing
      let parsed = null;
      try { parsed = text ? JSON.parse(text) : null; } catch (e) { parsed = text; }

      if (res.ok) {
        return { ok: true, parsed, status: res.status, headers: Object.fromEntries(res.headers.entries()) };
      }

      // Log detallado en consola para diagnóstico
      console.error(`API call failed (attempt ${attempt}/${MAX_ATTEMPTS})`, {
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        body: parsed
      });

      // Si es 403 y quedan intentos, se intentará con diferentes headers desde el caller
      if (attempt < MAX_ATTEMPTS) {
        const backoff = BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }

      return { ok: false, parsed, status: res.status, headers: Object.fromEntries(res.headers.entries()) };
    } catch (err) {
      console.error(`Fetch error on attempt ${attempt}:`, err);
      if (attempt < MAX_ATTEMPTS) {
        const backoff = BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }
      return { ok: false, error: err };
    }
  }
}

async function queryPinterest(query) {
  // 1) Intento normal: apikey en querystring
  const urlWithKey = buildApiUrl(query, true);
  let result = await callApiWithAttempts(urlWithKey, { useAuthHeader: false });

  // 2) Si 403 o error, intentar con Authorization header (sin apikey en query)
  if (!result.ok && result.status === 403) {
    console.log('Received 403 — reintentando con Authorization header (sin apikey en query)');
    const urlNoKey = buildApiUrl(query, false);
    result = await callApiWithAttempts(urlNoKey, { useAuthHeader: true });
  }

  // 3) Si sigue fallando con 403, intentar con Authorization + User-Agent
  if (!result.ok && result.status === 403) {
    console.log('403 persistente — reintentando con Authorization + User-Agent');
    const urlNoKey = buildApiUrl(query, false);
    result = await callApiWithAttempts(urlNoKey, { useAuthHeader: true, userAgent: 'mi-bot/1.0 (baileys)' });
  }

  return result;
}

async function start() {
  const sock = makeWASocket({ printQRInTerminal: true, auth: state });
  sock.ev.on('creds.update', saveState);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) qrcode.generate(qr, { small: true });
    if (connection === 'close' && lastDisconnect) {
      console.log('Conexión cerrada, reiniciando...', lastDisconnect.error);
      start().catch(console.error);
    } else if (connection === 'open') {
      console.log('WhatsApp conectado');
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    try {
      if (m.type !== 'notify') return;
      const msg = m.messages[0];
      if (!msg || !msg.message) return;
      if (msg.key && msg.key.fromMe) return;

      // Obtener texto
      let text = '';
      if (msg.message.conversation) text = msg.message.conversation;
      else if (msg.message.extendedTextMessage && msg.message.extendedTextMessage.text) text = msg.message.extendedTextMessage.text;
      else if (msg.message.imageMessage && msg.message.imageMessage.caption) text = msg.message.imageMessage.caption;
      else text = '';

      if (!text || !text.trim().startsWith('.pinterest')) return;
      const query = text.trim().split(' ').slice(1).join(' ').trim();
      const jid = msg.key.remoteJid;

      if (!query) {
        await sock.sendMessage(jid, { text: 'Usa `.pinterest <consulta>`' }, { quoted: msg });
        return;
      }

      // Rate limit check
      const allowed = allowedToRun(jid);
      if (!allowed.allowed) {
        const reply = allowed.reason === 'cooldown'
          ? 'Espera un momento antes de usar el comando de nuevo.'
          : 'Has alcanzado el límite de peticiones. Intenta en unos segundos.';
        await sock.sendMessage(jid, { text: reply }, { quoted: msg });
        return;
      }

      // Llamada a la API con reintentos y estrategias
      await sock.sendMessage(jid, { text: 'Buscando en Pinterest... (esto puede tardar un poco)' }, { quoted: msg });
      const apiResult = await queryPinterest(query);

      if (!apiResult.ok) {
        // Si tenemos info del status, la enviamos; si no, mensaje genérico
        if (apiResult.status) {
          if (apiResult.status === 403) {
            await sock.sendMessage(jid, { text: 'Error al consultar la API (403). He intentado reintentos y diferentes encabezados. Revisa la API key o contacta al proveedor.' }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, { text: `Error al consultar la API (status ${apiResult.status}). Revisa la consola para más detalles.` }, { quoted: msg });
          }
          console.error('API final failed details:', apiResult);
        } else {
          await sock.sendMessage(jid, { text: 'Error al consultar la API. Revisa la consola para más detalles.' }, { quoted: msg });
          console.error('API final failed (no status):', apiResult);
        }
        return;
      }

      const data = apiResult.parsed;
      const results = Array.isArray(data) ? data : (data && (data.results || data.items || []));

      if (!results || results.length === 0) {
        await sock.sendMessage(jid, { text: 'No se encontraron resultados.' }, { quoted: msg });
        return;
      }

      // Enviar hasta MAX_RESULTS resultados
      for (const item of results.slice(0, MAX_RESULTS)) {
        const imageUrl = (item && (item.image?.url || item.image || item.thumbnail || item.media || item.url || item.link)) || null;
        const title = (item && (item.title || item.name || (item.description && item.description.slice(0, 200)))) || 'Resultado de Pinterest';
        const targetUrl = (item && (item.url || item.link)) || '';
        const caption = targetUrl ? `${title}\n${targetUrl}` : title;

        if (imageUrl) {
          try {
            const rImg = await fetch(imageUrl);
            if (!rImg.ok) throw new Error(`Status ${rImg.status}`);
            const arrayBuffer = await rImg.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            await sock.sendMessage(jid, { image: buffer, caption }, { quoted: msg });
          } catch (err) {
            console.error('Error descargando o enviando imagen:', err);
            await sock.sendMessage(jid, { text: `${caption}\n(Imagen no disponible)` }, { quoted: msg });
          }
        } else {
          await sock.sendMessage(jid, { text: caption }, { quoted: msg });
        }
      }
    } catch (err) {
      console.error('Error en handler .pinterest:', err);
      try {
        const jid = (m.messages && m.messages[0] && m.messages[0].key && m.messages[0].key.remoteJid) || null;
        if (jid) await sock.sendMessage(jid, { text: 'Error al procesar el comando .pinterest.' });
      } catch (e) { /* ignore */ }
    }
  });
}

start().catch(console.error);
