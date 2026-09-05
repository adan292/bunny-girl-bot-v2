// Edge-TTS ligero: Microsoft ReadAloud (gratis, sin API key).
// Voz predeterminada: Dalia (es-MX, femenina).
import WebSocket from 'ws';
import crypto from 'crypto';

const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const CHROMIUM_VERSION = '143.0.3650.75';
const SEC_MS_GEC_VERSION = `1-${CHROMIUM_VERSION}`;
const WSS_URL = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}`;
const OUTPUT_FORMAT = 'audio-24khz-48kbitrate-mono-mp3';
const MAX_CHUNK = 4500;
const DEFAULT_VOICE = 'es-MX-DaliaNeural';

function generateSecMsGec() {
  let ticks = (Date.now() / 1000) + 11644473600;
  ticks -= ticks % 300;
  ticks = Math.floor(ticks * 10_000_000);
  return crypto.createHash('sha256')
    .update(String(ticks) + TRUSTED_CLIENT_TOKEN)
    .digest('hex')
    .toUpperCase();
}

function muid() { return crypto.randomBytes(16).toString('hex').toUpperCase(); }
function uuidNoDash() { return crypto.randomUUID().replace(/-/g, ''); }

function jsDate() {
  return new Date().toUTCString().replace(/GMT$/, 'GMT+0000 (Coordinated Universal Time)');
}

function ssml(text) {
  const safe = String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return (
    `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='es-MX'>` +
    `<voice name='${DEFAULT_VOICE}'>` +
    `<prosody pitch='+0Hz' rate='+0%' volume='+0%'>${safe}</prosody>` +
    `</voice></speak>`
  );
}

function splitText(text, max = MAX_CHUNK) {
  text = String(text || '').trim();
  if (!text) return [];
  if (text.length <= max) return [text];
  const chunks = [];
  let rest = text;
  while (rest.length > max) {
    let cut = -1;
    for (const sep of ['. ', '! ', '? ', '\n', ' ']) {
      const c = rest.lastIndexOf(sep, max);
      if (c > max * 0.5) { cut = c + sep.length; break; }
    }
    if (cut < 0) cut = max;
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut);
  }
  if (rest.trim()) chunks.push(rest.trim());
  return chunks;
}

function synthesizeChunk(text) {
  return new Promise((resolve, reject) => {
    const gec = generateSecMsGec();
    const cid = uuidNoDash();
    let ws;
    try {
      ws = new WebSocket(
        `${WSS_URL}&ConnectionId=${cid}&Sec-MS-GEC=${gec}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}`,
        {
          headers: {
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache',
            'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
            'Sec-WebSocket-Version': '13',
            'Accept-Encoding': 'gzip, deflate, br, zstd',
            'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
            'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROMIUM_VERSION.split('.')[0]}.0.0.0 Safari/537.36 Edg/${CHROMIUM_VERSION.split('.')[0]}.0.0.0`,
            'Cookie': `muid=${muid()};`
          },
          perMessageDeflate: true
        }
      );
    } catch (e) { return reject(e); }
    const chunks = [];
    let done = false;
    const to = setTimeout(() => {
      if (!done) { done = true; try { ws.close(); } catch (_) {} reject(new Error('Tiempo de espera agotado')); }
    }, 30000);
    ws.on('open', () => {
      const ts = jsDate();
      ws.send(
        `X-Timestamp:${ts}\r\n` +
        `Content-Type:application/json; charset=utf-8\r\n` +
        `Path:speech.config\r\n\r\n` +
        `{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"${OUTPUT_FORMAT}"}}}}\r\n`
      );
      ws.send(
        `X-RequestId:${cid}\r\n` +
        `Content-Type:application/ssml+xml\r\n` +
        `X-Timestamp:${ts}Z\r\n` +
        `Path:ssml\r\n\r\n` +
        ssml(text)
      );
    });
    ws.on('message', (d, isBin) => {
      if (!isBin) {
        const s = d.toString();
        if (s.includes('Path:turn.end')) { done = true; clearTimeout(to); try { ws.close(); } catch (_) {} return; }
        return;
      }
      const buf = Buffer.isBuffer(d) ? d : Buffer.from(d);
      if (buf.length < 2) return;
      const hl = buf.readUInt16BE(0);
      if (hl > buf.length) return;
      if (2 + hl < buf.length) chunks.push(buf.slice(2 + hl));
    });
    ws.on('error', (e) => { if (!done) { done = true; clearTimeout(to); reject(e); } });
    ws.on('close', (code) => {
      if (done && chunks.length) resolve(Buffer.concat(chunks));
      else if (!done) { done = true; clearTimeout(to); reject(new Error('Conexión cerrada sin audio (código ' + code + ')')); }
    });
  });
}

export async function synthesize(text) {
  const parts = splitText(text);
  if (!parts.length) throw new Error('Texto vacío');
  const buffers = [];
  for (const p of parts) buffers.push(await synthesizeChunk(p));
  return Buffer.concat(buffers);
}
