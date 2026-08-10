import ffmpeg from 'fluent-ffmpeg';
import WebP from 'node-webpmux';
import { Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createLinkedAbortController } from '../utils/abort.js';

const STICKER_EXIF_PREFIX = Buffer.from([
  0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
]);

function configureFfmpegPath(ffmpegPath) {
  if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath);
  }
}

function buildStickerExif({ packName = 'Bunny Girl Bot', author = 'Bunny Girl Bot', packId = 'bunny-girl-bot-v2' } = {}) {
  const metadata = {
    'sticker-pack-id': String(packId).slice(0, 128),
    'sticker-pack-name': String(packName).slice(0, 128),
    'sticker-pack-publisher': String(author).slice(0, 128),
    emojis: [],
  };
  const json = Buffer.from(JSON.stringify(metadata), 'utf8');
  const exif = Buffer.concat([STICKER_EXIF_PREFIX, json]);
  exif.writeUInt32LE(json.length, 14);
  return exif;
}

class BoundedCollector extends Writable {
  constructor(maxBytes) {
    super();
    this.maxBytes = maxBytes;
    this.size = 0;
    this.chunks = [];
  }

  _write(chunk, encoding, callback) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding);
    this.size += buffer.length;
    if (this.size > this.maxBytes) {
      callback(Object.assign(new Error(`Media output exceeds ${this.maxBytes} bytes`), { code: 'MEDIA_SIZE_LIMIT' }));
      return;
    }
    this.chunks.push(buffer);
    callback();
  }

  toBuffer() {
    return Buffer.concat(this.chunks, this.size);
  }
}

/**
 * Run FFmpeg from an input Readable into a Writable. No temporary media file is
 * created. Abort and timeout always kill the child process and destroy the
 * output stream so a failed conversion cannot leave a zombie subprocess.
 */
export async function transcodeToWritable(input, output, {
  timeoutMs = 30000,
  signal,
  ffmpegPath,
  inputFormat,
  outputFormat = 'webp',
  outputOptions = [],
} = {}) {
  if (!input || typeof input.pipe !== 'function') {
    throw new TypeError('input must be a readable stream');
  }
  if (!output || typeof output.write !== 'function') {
    throw new TypeError('output must be a writable stream');
  }
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1000) {
    throw new Error('timeoutMs must be at least 1000 milliseconds');
  }

  configureFfmpegPath(ffmpegPath);
  const controller = createLinkedAbortController(signal);
  const timeout = setTimeout(() => {
    controller.abort(new Error(`FFmpeg timed out after ${timeoutMs} ms`));
  }, timeoutMs);
  timeout.unref?.();

  let command;
  let outputStream;
  let commandError;
  try {
    command = ffmpeg(input);
    if (inputFormat) {
      command.inputFormat(inputFormat);
    }
    command
      .outputOptions(outputOptions)
      .format(outputFormat);

    outputStream = command.pipe();
    const errorPromise = new Promise((_, reject) => {
      command.once('error', reject);
    });
    errorPromise.catch(() => undefined);

    const pipelinePromise = pipeline(outputStream, output, { signal: controller.signal });
    pipelinePromise.catch(() => undefined);

    const abortListener = () => {
      command.kill('SIGKILL');
      outputStream.destroy(controller.signal.reason);
      input.destroy(controller.signal.reason);
    };
    controller.signal.addEventListener('abort', abortListener, { once: true });

    try {
      await Promise.race([pipelinePromise, errorPromise]);
    } catch (error) {
      commandError = error;
      throw error;
    } finally {
      controller.signal.removeEventListener('abort', abortListener);
    }
  } finally {
    clearTimeout(timeout);
    if (controller.signal.aborted || commandError) {
      command?.kill('SIGKILL');
      outputStream?.destroy(commandError ?? controller.signal.reason);
    }
    controller.dispose();
  }
}

/**
 * Convert a short sticker-sized stream while keeping a hard output bound.
 * The bound is deliberate: node-webpmux needs a complete WebP image to inject
 * EXIF metadata, while FFmpeg itself remains stream-based and bounded.
 */
export async function createStickerWebp(input, {
  timeoutMs = 30000,
  maxBytes = 1024 * 1024,
  ffmpegPath,
  inputFormat,
  packName,
  author,
  packId,
  signal,
} = {}) {
  const collector = new BoundedCollector(maxBytes);
  await transcodeToWritable(input, collector, {
    timeoutMs,
    signal,
    ffmpegPath,
    inputFormat,
    outputFormat: 'webp',
    outputOptions: [
      '-vcodec', 'libwebp',
      '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:-1:-1:color=white@0.0',
      '-loop', '0',
      '-an',
      '-vsync', '0',
    ],
  });

  const image = new WebP.Image();
  await image.load(collector.toBuffer());
  image.exif = buildStickerExif({ packName, author, packId });
  return image.save(null);
}

export { BoundedCollector, buildStickerExif };
