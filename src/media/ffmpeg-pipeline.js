import ffmpeg from 'fluent-ffmpeg';
import WebP from 'node-webpmux';
import { Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createLinkedAbortController } from '../utils/abort.js';
import { MediaProcessingError } from '../utils/errors.js';

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

function safeMetadata(value, fallback) {
  return String(value ?? fallback)
    .replace(/[\u0000-\u001F\u007F]/gu, '')
    .slice(0, 128);
}

function buildStickerExif({
  packName = 'Bunny Girl Bot',
  author = 'Bunny Girl Bot',
  packId = 'bunny-girl-bot-v2',
} = {}) {
  const metadata = {
    'sticker-pack-id': safeMetadata(packId, 'bunny-girl-bot-v2'),
    'sticker-pack-name': safeMetadata(packName, 'Bunny Girl Bot'),
    'sticker-pack-publisher': safeMetadata(author, 'Bunny Girl Bot'),
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

    if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
      throw new RangeError('maxBytes must be a positive integer');
    }

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
        new Error(`Media output exceeds ${this.maxBytes} bytes`),
        { code: 'MEDIA_SIZE_LIMIT' },
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

function terminateCommand(command) {
  try {
    command?.kill?.('SIGKILL');
  } catch {
    // The process may already have exited; cleanup remains idempotent.
  }
}

/**
 * Run FFmpeg from a Readable into a Writable without creating temporary media
 * files. Timeout, AbortSignal and downstream errors all terminate FFmpeg.
 */
export async function transcodeToWritable(input, output, {
  timeoutMs = 30000,
  signal,
  ffmpegPath,
  inputFormat,
  outputFormat = 'webp',
  outputOptions = [],
  operation = 'ffmpeg-transcode',
  mediaType = outputFormat,
} = {}) {
  if (!input || typeof input.pipe !== 'function') {
    throw new TypeError('input must be a readable stream');
  }
  if (!output || typeof output.write !== 'function') {
    throw new TypeError('output must be a writable stream');
  }
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1000) {
    throw new RangeError('timeoutMs must be at least 1000 milliseconds');
  }
  if (!Array.isArray(outputOptions)) {
    throw new TypeError('outputOptions must be an array');
  }

  configureFfmpegPath(ffmpegPath);

  const controller = createLinkedAbortController(signal);
  let timedOut = false;
  let timeoutError;
  let command;
  let outputStream;
  let commandError;

  const timeout = setTimeout(() => {
    timedOut = true;
    timeoutError = new MediaProcessingError(
      `FFmpeg timed out after ${timeoutMs} ms`,
      {
        operation,
        mediaType,
        code: 'MEDIA_PROCESSING_TIMEOUT',
      },
    );
    controller.abort(timeoutError);
  }, timeoutMs);
  timeout.unref?.();

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

    const pipelinePromise = pipeline(
      outputStream,
      output,
      { signal: controller.signal },
    );
    pipelinePromise.catch(() => undefined);

    const abortListener = () => {
      terminateCommand(command);
      outputStream?.destroy(controller.signal.reason);
      input.destroy?.(controller.signal.reason);
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
  } catch (error) {
    if (timedOut && timeoutError) {
      throw timeoutError;
    }

    if (error instanceof MediaProcessingError) {
      throw error;
    }

    const code = error?.code === 'MEDIA_SIZE_LIMIT'
      ? 'MEDIA_SIZE_LIMIT'
      : 'MEDIA_PROCESSING_FAILED';

    throw new MediaProcessingError(
      `FFmpeg operation failed: ${operation}`,
      {
        operation,
        mediaType,
        code,
        cause: error,
      },
    );
  } finally {
    clearTimeout(timeout);

    if (controller.signal.aborted || commandError) {
      terminateCommand(command);
      outputStream?.destroy(commandError ?? controller.signal.reason);
    }

    controller.dispose();
  }
}

/**
 * Convert short media into WebP while enforcing an output bound. The final
 * WebP must be materialized briefly because node-webpmux injects EXIF into the
 * complete container; FFmpeg itself remains stream-based and timeout-bound.
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
    operation: 'sticker-transcode',
    mediaType: 'sticker',
    outputFormat: 'webp',
    outputOptions: [
      '-vcodec', 'libwebp',
      '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:-1:-1:color=white@0.0',
      '-loop', '0',
      '-an',
      '-vsync', '0',
    ],
  });

  try {
    const image = new WebP.Image();
    await image.load(collector.toBuffer());
    image.exif = buildStickerExif({ packName, author, packId });
    return await image.save(null);
  } catch (error) {
    throw new MediaProcessingError('WebP metadata injection failed', {
      operation: 'sticker-metadata',
      mediaType: 'sticker',
      cause: error,
    });
  }
}

export {
  BoundedCollector,
  buildStickerExif,
};
