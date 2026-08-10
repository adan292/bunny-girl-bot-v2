import { lookup } from 'node:dns/promises';
import { Readable, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { isIP } from 'node:net';
import { basename } from 'node:path';
import { createLinkedAbortController } from '../utils/abort.js';
import { MediaProcessingError } from '../utils/errors.js';

const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECTS = 3;
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
  'metadata',
]);

const MIME_EXTENSIONS = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/gif', '.gif'],
  ['image/webp', '.webp'],
  ['video/mp4', '.mp4'],
  ['video/webm', '.webm'],
  ['audio/mpeg', '.mp3'],
  ['audio/ogg', '.ogg'],
  ['audio/mp4', '.m4a'],
  ['application/pdf', '.pdf'],
]);

class BoundedBufferWriter extends Writable {
  constructor(maxBytes) {
    super();
    this.maxBytes = maxBytes;
    this.size = 0;
    this.chunks = [];
  }

  _write(chunk, encoding, callback) {
    const buffer = Buffer.isBuffer(chunk)
      ? chunk
      : Buffer.from(chunk, encoding);

    if (this.size + buffer.length > this.maxBytes) {
      callback(Object.assign(
        new Error(`Download exceeds ${this.maxBytes} bytes`),
        { code: 'DOWNLOAD_SIZE_LIMIT' },
      ));
      return;
    }

    this.size += buffer.length;
    this.chunks.push(buffer);
    callback();
  }

  toBuffer() {
    return Buffer.concat(this.chunks, this.size);
  }
}

function privateIpv4(address) {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return true;
  }

  const [first, second] = parts;
  return first === 0
    || first === 10
    || first === 127
    || (first === 100 && second >= 64 && second <= 127)
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168)
    || (first === 198 && (second === 18 || second === 19))
    || first >= 224;
}

function privateIp(address) {
  const normalized = address.toLowerCase().replace(/^\[|\]$/gu, '');
  const version = isIP(normalized);

  if (version === 4) {
    return privateIpv4(normalized);
  }

  if (version !== 6) {
    return true;
  }

  if (normalized.startsWith('::ffff:')) {
    return privateIpv4(normalized.slice(7));
  }

  return normalized === '::'
    || normalized === '::1'
    || normalized.startsWith('fc')
    || normalized.startsWith('fd')
    || normalized.startsWith('fe8')
    || normalized.startsWith('fe9')
    || normalized.startsWith('fea')
    || normalized.startsWith('feb')
    || normalized.startsWith('2001:db8');
}

async function validateRemoteUrl(value) {
  let parsed;

  try {
    parsed = new URL(value);
  } catch (error) {
    throw new MediaProcessingError('URL de descarga inválida', {
      operation: 'download-url-validation',
      mediaType: 'remote-url',
      cause: error,
      code: 'DOWNLOAD_INVALID_URL',
    });
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new MediaProcessingError('Solo se permiten URLs HTTP o HTTPS', {
      operation: 'download-url-validation',
      mediaType: 'remote-url',
      code: 'DOWNLOAD_UNSUPPORTED_PROTOCOL',
    });
  }

  if (parsed.username || parsed.password) {
    throw new MediaProcessingError('Las URLs con credenciales están prohibidas', {
      operation: 'download-url-validation',
      mediaType: 'remote-url',
      code: 'DOWNLOAD_CREDENTIAL_URL',
    });
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    BLOCKED_HOSTNAMES.has(hostname)
    || hostname.endsWith('.localhost')
    || hostname.endsWith('.local')
    || hostname.endsWith('.internal')
  ) {
    throw new MediaProcessingError('El host de descarga está bloqueado', {
      operation: 'download-url-validation',
      mediaType: 'remote-url',
      code: 'DOWNLOAD_BLOCKED_HOST',
    });
  }

  if (isIP(hostname) && privateIp(hostname)) {
    throw new MediaProcessingError('No se permiten direcciones privadas', {
      operation: 'download-url-validation',
      mediaType: 'remote-url',
      code: 'DOWNLOAD_PRIVATE_ADDRESS',
    });
  }

  const addresses = await lookup(hostname, {
    all: true,
    verbatim: true,
  });

  if (!addresses.length || addresses.some(({ address }) => privateIp(address))) {
    throw new MediaProcessingError('El host resuelve a una dirección no permitida', {
      operation: 'download-url-validation',
      mediaType: 'remote-url',
      code: 'DOWNLOAD_PRIVATE_ADDRESS',
    });
  }

  return parsed;
}

function filenameFromResponse(response, url, contentType) {
  const disposition = response.headers.get('content-disposition') ?? '';
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/iu)?.[1];
  const plain = disposition.match(/filename="?([^";]+)"?/iu)?.[1];
  const fromHeader = encoded ?? plain;
  const fromUrl = basename(new URL(url).pathname) || 'download';

  let filename;
  try {
    filename = decodeURIComponent(fromHeader ?? fromUrl);
  } catch {
    filename = fromHeader ?? fromUrl;
  }

  filename = filename
    .replace(/[\\/\u0000-\u001F\u007F]/gu, '_')
    .replace(/[^\p{L}\p{N}._ -]/gu, '_')
    .trim()
    .slice(0, 96);

  if (!filename) {
    filename = 'download';
  }

  if (!/\.[a-z\d]{1,8}$/iu.test(filename)) {
    filename += MIME_EXTENSIONS.get(contentType) ?? '.bin';
  }

  return filename;
}

function mediaPayload(buffer, contentType, filename) {
  if (contentType.startsWith('image/')) {
    return {
      image: buffer,
      mimetype: contentType,
      caption: `Descarga completada: ${filename}`,
    };
  }

  if (contentType.startsWith('video/')) {
    return {
      video: buffer,
      mimetype: contentType,
      caption: `Descarga completada: ${filename}`,
    };
  }

  if (contentType.startsWith('audio/')) {
    return {
      audio: buffer,
      mimetype: contentType,
      fileName: filename,
      ptt: false,
    };
  }

  return {
    document: buffer,
    mimetype: contentType || 'application/octet-stream',
    fileName: filename,
    caption: `Descarga completada: ${filename}`,
  };
}

async function downloadRemoteMedia(urlValue, {
  maxBytes = 8 * 1024 * 1024,
  timeoutMs = 20000,
  signal,
} = {}) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 65536) {
    throw new RangeError('maxBytes must be at least 65536 bytes');
  }
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1000) {
    throw new RangeError('timeoutMs must be at least 1000 milliseconds');
  }

  const initialUrl = await validateRemoteUrl(urlValue);
  const timeoutController = new AbortController();
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    timeoutController.abort(new Error(`Download timeout after ${timeoutMs} ms`));
  }, timeoutMs);
  timer.unref?.();

  const linked = createLinkedAbortController(
    signal,
    timeoutController.signal,
  );

  try {
    let currentUrl = initialUrl;

    for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
      const response = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        signal: linked.signal,
        headers: {
          accept: 'image/*,video/*,audio/*,application/octet-stream,application/pdf',
          'user-agent': 'Bunny-Girl-Bot-v2/1.0',
        },
      });

      if (REDIRECT_STATUS_CODES.has(response.status)) {
        if (redirect === MAX_REDIRECTS) {
          throw new MediaProcessingError('Demasiadas redirecciones', {
            operation: 'download-redirect',
            mediaType: 'remote-url',
            code: 'DOWNLOAD_REDIRECT_LIMIT',
          });
        }

        const location = response.headers.get('location');
        if (!location) {
          throw new MediaProcessingError('Redirección sin destino', {
            operation: 'download-redirect',
            mediaType: 'remote-url',
            code: 'DOWNLOAD_INVALID_REDIRECT',
          });
        }

        currentUrl = await validateRemoteUrl(
          new URL(location, currentUrl).toString(),
        );
        continue;
      }

      if (!response.ok || !response.body) {
        throw new MediaProcessingError(
          `El servidor remoto respondió ${response.status}`,
          {
            operation: 'download-request',
            mediaType: 'remote-url',
            code: 'DOWNLOAD_HTTP_ERROR',
          },
        );
      }

      const contentType = (
        response.headers.get('content-type') ?? 'application/octet-stream'
      ).split(';', 1)[0].trim().toLowerCase();

      if (contentType === 'text/html' || contentType === 'application/json') {
        throw new MediaProcessingError('El recurso remoto no es un archivo multimedia', {
          operation: 'download-content-type',
          mediaType: contentType,
          code: 'DOWNLOAD_UNSUPPORTED_CONTENT',
        });
      }

      const contentLength = Number(response.headers.get('content-length'));
      if (Number.isSafeInteger(contentLength) && contentLength > maxBytes) {
        throw new MediaProcessingError('El archivo supera el límite permitido', {
          operation: 'download-size-check',
          mediaType: contentType,
          code: 'DOWNLOAD_SIZE_LIMIT',
        });
      }

      const writer = new BoundedBufferWriter(maxBytes);
      await pipeline(
        Readable.fromWeb(response.body),
        writer,
        { signal: linked.signal },
      );

      return {
        buffer: writer.toBuffer(),
        contentType,
        filename: filenameFromResponse(response, currentUrl, contentType),
        sourceUrl: currentUrl.toString(),
      };
    }

    throw new MediaProcessingError('No se pudo resolver la URL remota', {
      operation: 'download-request',
      mediaType: 'remote-url',
      code: 'DOWNLOAD_REDIRECT_FAILURE',
    });
  } catch (error) {
    if (error instanceof MediaProcessingError) {
      throw error;
    }

    if (timedOut) {
      throw new MediaProcessingError('La descarga excedió el tiempo límite', {
        operation: 'download-timeout',
        mediaType: 'remote-url',
        code: 'DOWNLOAD_TIMEOUT',
        cause: error,
      });
    }

    throw new MediaProcessingError('La descarga remota falló', {
      operation: 'download-request',
      mediaType: 'remote-url',
      cause: error,
    });
  } finally {
    clearTimeout(timer);
    linked.dispose();
  }
}

export default {
  name: 'tools/download',
  commands: ['download', 'dl', 'descargar'],
  priority: 50,
  permissions: ['user'],
  cooldownMs: 10000,
  async execute({ message, reply, signal, config }) {
    const url = message.args.find((argument) => /^https?:\/\//iu.test(argument));

    if (!url) {
      await reply({
        text: 'Uso: .download https://ejemplo.com/archivo.jpg',
      });
      return { handled: true };
    }

    await reply({ text: '⏬ Validando y descargando el recurso...' });

    try {
      const result = await downloadRemoteMedia(url, {
        maxBytes: config.downloadMaxBytes,
        timeoutMs: config.downloadTimeoutMs,
        signal,
      });

      await reply(mediaPayload(
        result.buffer,
        result.contentType,
        result.filename,
      ));
    } catch (error) {
      await reply({
        text: error instanceof MediaProcessingError
          ? `No se pudo descargar el archivo: ${error.message}`
          : 'No se pudo descargar el archivo.',
      });
    }

    return { handled: true };
  },
};

export {
  BoundedBufferWriter,
  downloadRemoteMedia,
  privateIp,
  validateRemoteUrl,
};
