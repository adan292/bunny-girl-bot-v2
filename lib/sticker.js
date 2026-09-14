import { writeFile, readFile, unlink } from 'fs/promises'
import fs from 'fs'
import path from 'path'
import { tmpdir } from 'os'
import { v4 as uuidv4 } from 'uuid'
import { spawn } from 'child_process'
import axios from 'axios'
import { fileTypeFromBuffer } from 'file-type'
import crypto from 'crypto'
import webp from 'node-webpmux'

const tmp = tmpdir()

export async function addExif(webpBuffer, packname, author) {
  const img  = new webp.Image()
  const json = {
    'sticker-pack-id':        crypto.randomBytes(32).toString('hex'),
    'sticker-pack-name':      packname,
    'sticker-pack-publisher': author,
    emojis: ['✨'],
  }
  const exifAttr = Buffer.from([0x49,0x49,0x2a,0x00,0x08,0x00,0x00,0x00,0x01,0x00,0x41,0x57,0x07,0x00,0x00,0x00,0x00,0x00,0x16,0x00,0x00,0x00])
  const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8')
  const exif = Buffer.concat([exifAttr, jsonBuffer])
  exif.writeUIntLE(jsonBuffer.length, 14, 4)
  await img.load(webpBuffer)
  img.exif = exif
  return await img.save(null)
}

function runFFmpeg(inputPath, outputPath, isVideo = false) {
  return new Promise((resolve, reject) => {
    const args = [
      '-i', inputPath,
      ...(isVideo
        ? [
            '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,fps=15,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
            '-vcodec', 'libwebp',
            '-loop', '0',
            '-ss', '00:00:00.0',
            '-t', '00:00:10.0',
            '-preset', 'default',
            '-an',
            '-vsync', '0',
            '-s', '512:512'
          ]
        : [
            '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
            '-vcodec', 'libwebp',
            '-preset', 'default',
            '-an',
            '-vsync', '0',
            '-s', '512:512'
          ]),
      outputPath
    ]
    const ffmpeg = spawn('ffmpeg', args)
    ffmpeg.on('close', async (code) => {
      if (code !== 0) {
        try { await unlink(inputPath) } catch {}
        try { await unlink(outputPath) } catch {}
        return reject(new Error('Error al convertir con ffmpeg'))
      }
      try {
        const stickerBuffer = await readFile(outputPath)
        try { await unlink(inputPath) } catch {}
        try { await unlink(outputPath) } catch {}
        resolve(stickerBuffer)
      } catch (e) {
        reject(e)
      }
    })
  })
}

export async function stickerBufferFromUrl(url) {
  const res = await axios.get(url, { responseType: 'arraybuffer' })
  const type = await fileTypeFromBuffer(res.data)
  if (!type || !type.mime.startsWith('image/')) throw new Error('No es una imagen válida')
  const inputPath = path.join(tmp, `${uuidv4()}.${type.ext}`)
  const outputPath = inputPath.replace(`.${type.ext}`, '.webp')
  await writeFile(inputPath, res.data)
  try {
    const buffer = await runFFmpeg(inputPath, outputPath, false)
    return buffer
  } catch (e) {
    try { await unlink(inputPath) } catch {}
    try { await unlink(outputPath) } catch {}
    throw e
  }
}

export async function sendImageAsSticker(conn, jid, buffer, m, options = {}) {
  const type = await fileTypeFromBuffer(buffer)
  if (!type || !type.mime.startsWith('image/')) throw new Error('No es una imagen válida')
  
  const inputPath = path.join(tmp, `${uuidv4()}.${type.ext}`)
  const outputPath = path.join(tmp, `${uuidv4()}.webp`)
  await writeFile(inputPath, buffer)
  
  let stickerBuffer = await runFFmpeg(inputPath, outputPath, false)
  
  if (options.packname || options.author) {
    stickerBuffer = await addExif(stickerBuffer, options.packname || '', options.author || '')
  }
  
  return await conn.sendMessage(jid, { sticker: stickerBuffer, contextInfo: options.contextInfo }, { quoted: m })
}

export async function sendVideoAsSticker(conn, jid, buffer, m, options = {}) {
  const type = await fileTypeFromBuffer(buffer)
  if (!type || !type.mime.startsWith('video/')) throw new Error('No es un video válido')
  
  const inputPath = path.join(tmp, `${uuidv4()}.${type.ext}`)
  const outputPath = path.join(tmp, `${uuidv4()}.webp`)
  await writeFile(inputPath, buffer)
  
  let stickerBuffer = await runFFmpeg(inputPath, outputPath, true)
  
  if (options.packname || options.author) {
    stickerBuffer = await addExif(stickerBuffer, options.packname || '', options.author || '')
  }
  
  return await conn.sendMessage(jid, { sticker: stickerBuffer, contextInfo: options.contextInfo }, { quoted: m })
}

export async function toImg(buffer) {
  const inputPath = path.join(tmp, `${uuidv4()}.webp`)
  const outputPath = inputPath.replace('.webp', '.png')
  await writeFile(inputPath, buffer)
  await new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', ['-i', inputPath, outputPath])
    ffmpeg.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error('Error al convertir sticker a imagen'))
    })
  })
  const imageBuffer = await readFile(outputPath)
  try { await unlink(inputPath) } catch {}
  try { await unlink(outputPath) } catch {}
  return imageBuffer
}

export async function handleMediaMessage(conn, m) {
  const buffer = await conn.downloadMediaMessage(m)
  const type = await fileTypeFromBuffer(buffer)
  if (m.message?.viewOnceMessageV2 || m.message?.viewOnceMessage) {
    if (type && type.mime.startsWith('image/')) {
      return await conn.sendMessage(m.chat, { image: buffer }, { quoted: m })
    }
    if (type && type.mime.startsWith('video/')) {
      const inputPath = path.join(tmp, `${uuidv4()}.${type.ext}`)
      const outputPath = path.join(tmp, `${uuidv4()}.webp`)
      await writeFile(inputPath, buffer)
      const stickerBuffer = await runFFmpeg(inputPath, outputPath, true)
      return await conn.sendMessage(m.chat, { sticker: stickerBuffer }, { quoted: m })
    }
  }
  if (type && type.mime.startsWith('image/')) {
    const inputPath = path.join(tmp, `${uuidv4()}.${type.ext}`)
    const outputPath = path.join(tmp, `${uuidv4()}.webp`)
    await writeFile(inputPath, buffer)
    const stickerBuffer = await runFFmpeg(inputPath, outputPath, false)
    return await conn.sendMessage(m.chat, { sticker: stickerBuffer }, { quoted: m })
  }
  if (type && type.mime.startsWith('video/')) {
    const inputPath = path.join(tmp, `${uuidv4()}.${type.ext}`)
    const outputPath = path.join(tmp, `${uuidv4()}.webp`)
    await writeFile(inputPath, buffer)
    const stickerBuffer = await runFFmpeg(inputPath, outputPath, true)
    return await conn.sendMessage(m.chat, { sticker: stickerBuffer }, { quoted: m })
  }
}