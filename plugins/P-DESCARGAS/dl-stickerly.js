import fetch from 'node-fetch'
import axios from 'axios'
import crypto from 'crypto'
import { writeFileSync, readFileSync } from 'fs'
import { rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { exec } from 'child_process'
import { createRequire } from 'module'
import config from '../../config.js'

const require = createRequire(import.meta.url)

function hkdf(key, length, info = '') {
    const h = crypto.createHmac('sha256', Buffer.alloc(32)).update(key).digest()
    const infoBuffer = Buffer.from(info)
    const output = []
    let prev = Buffer.alloc(0)
    let done = 0
    let i = 0
    while (done < length) {
        i++
        const hmac = crypto.createHmac('sha256', h)
        hmac.update(prev)
        hmac.update(infoBuffer)
        hmac.update(Buffer.from([i]))
        prev = hmac.digest()
        output.push(prev)
        done += prev.length
    }
    return Buffer.concat(output).slice(0, length)
}

function encryptBuffer(buffer, hkdfInfo) {
    const mediaKey = crypto.randomBytes(32)
    const keys = hkdf(mediaKey, 112, hkdfInfo)
    const iv = keys.slice(0, 16)
    const cipherKey = keys.slice(16, 48)
    const macKey = keys.slice(48, 80)
    const cipher = crypto.createCipheriv('aes-256-cbc', cipherKey, iv)
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()])
    const mac = crypto.createHmac('sha256', macKey).update(iv).update(encrypted).digest().slice(0, 10)
    const encBody = Buffer.concat([encrypted, mac])
    const fileSha256 = crypto.createHash('sha256').update(buffer).digest()
    const fileEncSha256 = crypto.createHash('sha256').update(encBody).digest()
    return { mediaKey, encBody, fileSha256, fileEncSha256 }
}

function crc32(buf) {
    let crc = 0xFFFFFFFF
    for (const b of buf) {
        crc ^= b
        for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0)
    }
    return (crc ^ 0xFFFFFFFF) >>> 0
}

function buildZip(files) {
    const localParts = []
    const centralDirs = []
    let offset = 0
    for (const file of files) {
        const name = Buffer.from(file.name, 'utf8')
        const crc = crc32(file.data)
        const size = file.data.length
        const local = Buffer.alloc(30 + name.length)
        local.writeUInt32LE(0x04034b50, 0)
        local.writeUInt16LE(20, 4)
        local.writeUInt16LE(0, 6)
        local.writeUInt16LE(0, 8)
        local.writeUInt16LE(0, 10)
        local.writeUInt16LE(0, 12)
        local.writeUInt32LE(crc, 14)
        local.writeUInt32LE(size, 18)
        local.writeUInt32LE(size, 22)
        local.writeUInt16LE(name.length, 26)
        local.writeUInt16LE(0, 28)
        name.copy(local, 30)
        localParts.push(local, file.data)
        
        const cd = Buffer.alloc(46 + name.length)
        cd.writeUInt32LE(0x02014b50, 0)
        cd.writeUInt16LE(20, 4)
        cd.writeUInt16LE(20, 6)
        cd.writeUInt16LE(0, 8)
        cd.writeUInt16LE(0, 10)
        cd.writeUInt16LE(0, 12)
        cd.writeUInt16LE(0, 14)
        cd.writeUInt32LE(crc, 16)
        cd.writeUInt32LE(size, 20)
        cd.writeUInt32LE(size, 24)
        cd.writeUInt16LE(name.length, 28)
        cd.writeUInt16LE(0, 30)
        cd.writeUInt16LE(0, 32)
        cd.writeUInt16LE(0, 34)
        cd.writeUInt16LE(0, 36)
        cd.writeUInt32LE(0, 38)
        cd.writeUInt32LE(offset, 42)
        name.copy(cd, 46)
        centralDirs.push(cd)
        offset += 30 + name.length + size
    }
    const central = Buffer.concat(centralDirs)
    const eocd = Buffer.alloc(22)
    eocd.writeUInt32LE(0x06054b50, 0)
    eocd.writeUInt16LE(0, 4)
    eocd.writeUInt16LE(0, 6)
    eocd.writeUInt16LE(files.length, 8)
    eocd.writeUInt16LE(files.length, 10)
    eocd.writeUInt32LE(central.length, 12)
    eocd.writeUInt32LE(offset, 16)
    eocd.writeUInt16LE(0, 20)
    return Buffer.concat([...localParts, central, eocd])
}

let patchedDefaults = false
async function patchMediaPathMap() {
    if (patchedDefaults) return
    try {
        const defaultsPath = require.resolve('@whiskeysockets/baileys/lib/Defaults/index.js')
        const pathUrl = process.platform === 'win32' ? `file://${defaultsPath.replace(/\\/g, '/')}` : `file://${defaultsPath}`
        const defaults = await import(pathUrl)
        if (defaults.MEDIA_PATH_MAP) defaults.MEDIA_PATH_MAP['sticker-pack'] = '/mms/sticker-pack'
        if (defaults.MEDIA_HKDF_KEY_MAPPING) defaults.MEDIA_HKDF_KEY_MAPPING['sticker-pack'] = 'Sticker Pack'
        patchedDefaults = true
    } catch (e) {
        console.error('[StickerPack] Error parcheando Baileys:', e.message)
    }
}

async function uploadBuffer(conn, buffer, mediaType) {
    if (!buffer || buffer.length === 0) return null
    const enc = encryptBuffer(buffer, mediaType === 'sticker' ? 'WhatsApp Image Keys' : 'WhatsApp Sticker Pack Keys')
    const tmpPath = join(tmpdir(), `wa-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.enc`)
    writeFileSync(tmpPath, enc.encBody)
    try {
        const result = await conn.waUploadToServer(tmpPath, {
            fileEncSha256B64: enc.fileEncSha256.toString('base64'),
            mediaType
        })
        return { ...enc, directPath: result.directPath }
    } finally {
        rm(tmpPath, { force: true }).catch(() => {})
    }
}

async function createTrayIcon(buffer) {
    const tmpIn = join(tmpdir(), `tray_in_${crypto.randomBytes(4).toString('hex')}`)
    const tmpOut = join(tmpdir(), `tray_out_${crypto.randomBytes(4).toString('hex')}.png`)
    writeFileSync(tmpIn, buffer)
    
    await new Promise((resolve, reject) => {
        exec(`ffmpeg -i "${tmpIn}" -vf "scale=96:96:force_original_aspect_ratio=decrease,pad=96:96:(ow-iw)/2:(oh-ih)/2:color=0x00000000" -vcodec png -y "${tmpOut}"`, (err) => {
            if (err) reject(err)
            else resolve()
        })
    })
    
    const outBuf = readFileSync(tmpOut)
    await rm(tmpIn, { force: true }).catch(()=>{})
    await rm(tmpOut, { force: true }).catch(()=>{})
    return outBuf
}

async function createStickerWebp(buffer) {
    const tmpIn = join(tmpdir(), `stk_in_${crypto.randomBytes(4).toString('hex')}`)
    const tmpOut = join(tmpdir(), `stk_out_${crypto.randomBytes(4).toString('hex')}.webp`)
    writeFileSync(tmpIn, buffer)
    
    await new Promise((resolve, reject) => {
        exec(`ffmpeg -i "${tmpIn}" -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000" -vcodec libwebp -q:v 75 -loop 0 -preset default -an -vsync 0 -y "${tmpOut}"`, (err) => {
            if (err) reject(err)
            else resolve()
        })
    })
    
    const outBuf = readFileSync(tmpOut)
    await rm(tmpIn, { force: true }).catch(()=>{})
    await rm(tmpOut, { force: true }).catch(()=>{})
    return outBuf
}

function isAnimated(buffer) {
    return buffer.indexOf(Buffer.from('ANIM')) !== -1 || buffer.indexOf(Buffer.from('NETSCAPE2.0')) !== -1
}

const handler = async (m, { conn, text, usedPrefix, command, userDb }) => {
    let url = text ? text.trim() : ''
    if (!url && m.quoted) {
      const quotedText = m.quoted.body || m.quoted.text || ''
      const match = quotedText.match(/https?:\/\/[^\s]+/i)
      if (match) url = match[0]
    }

    if (!url) return m.reply(`*⌬┤ ❗ ├⌬ LINK REQUERIDO.*\n> Ingresá o respondé a un mensaje con un enlace válido de Stickerly.`)
    if (!url.includes('sticker.ly')) return m.reply(`*⌬┤ ❗ ├⌬ LINK INVÁLIDO.*\n> Asegurate de que sea de Stickerly.`)
    if (userDb.kogen < 1) return m.reply(`*⌬┤ 💎 ├⌬ SIN ${config.PREMIUM_NAME.toUpperCase()}.*\n> No tenés suficientes ${config.PREMIUM_NAME} para usar este comando.`)

    await m.reply(`*⌬┤ ⏳ ├⌬ Generando Pack Nativo...*\n> _Esto puede tardar unos segundos, por favor espera._`)

    try {
        await patchMediaPathMap()

        const json = await (await fetch(`https://api.delirius.store/download/stickerly?url=${encodeURIComponent(url)}`)).json()
        if (!json.status || !json.data) return m.reply(`*⌬┤ ⚠️ ├⌬ No se pudo obtener el pack.*`)

        const packData = json.data
        const stickersToProcess = packData.stickers.slice(0, 30) 

        const coverRes = await axios.get(packData.preview, { responseType: 'arraybuffer' })
        const trayBuffer = await createTrayIcon(Buffer.from(coverRes.data)).catch(() => null)
        if (!trayBuffer) throw new Error('Error al procesar el icono del paquete.')

        const zipFiles = []
        const stickerMeta = []

        for (let i = 0; i < stickersToProcess.length; i++) {
            try {
                const resp = await axios.get(stickersToProcess[i], { responseType: 'arraybuffer' })
                const inputBuf = Buffer.from(resp.data)
                if (inputBuf.length < 100) continue

                const animated = isAnimated(inputBuf)
                const processedBuf = await createStickerWebp(inputBuf)

                const uploadRes = await uploadBuffer(conn, processedBuf, 'sticker')
                if (!uploadRes) continue

                const hash = crypto.createHash('sha256').update(processedBuf).digest('base64url')
                const fileName = `${String(i).padStart(2, '0')}_${hash}.webp`
                
                zipFiles.push({ name: fileName, data: processedBuf })
                stickerMeta.push({
                    fileName,
                    isAnimated: animated,
                    emojis: ['✨'],
                    mimetype: 'image/webp',
                    accessibilityLabel: ''
                })
            } catch (err) { continue }
        }

        if (zipFiles.length === 0) return m.reply(`*⌬┤ ❌ ├⌬ Error al procesar los stickers.*`)
        
        const packEncTemp = encryptBuffer(buildZip(zipFiles), 'WhatsApp Sticker Pack Keys')
        const packId = packEncTemp.fileEncSha256.toString('base64url')
        const trayIconName = `${packId}.png`

        const finalZipBuffer = buildZip([{ name: trayIconName, data: trayBuffer }, ...zipFiles])
        const packUpload = await uploadBuffer(conn, finalZipBuffer, 'sticker-pack')

        if (!packUpload) throw new Error('Error al subir el paquete a WhatsApp.')

        const thumbSha256 = crypto.createHash('sha256').update(trayBuffer).digest()
        const thumbKeys = hkdf(packUpload.mediaKey, 112, 'WhatsApp Sticker Pack Keys')
        const thumbCipher = crypto.createCipheriv('aes-256-cbc', thumbKeys.slice(16, 48), thumbKeys.slice(0, 16))
        const thumbEnc = Buffer.concat([thumbCipher.update(trayBuffer), thumbCipher.final()])
        const thumbMac = crypto.createHmac('sha256', thumbKeys.slice(48, 80)).update(thumbKeys.slice(0, 16)).update(thumbEnc).digest().slice(0, 10)
        const thumbEncSha256 = crypto.createHash('sha256').update(Buffer.concat([thumbEnc, thumbMac])).digest()

        const msgId = crypto.randomBytes(8).toString('hex').toUpperCase()

        await conn.relayMessage(m.chat, {
            stickerPackMessage: {
                stickerPackId: packUpload.fileEncSha256.toString('base64url'),
                name: packData.name.substring(0, 30),
                publisherName: packData.author.substring(0, 30) || 'ZenBot',
                trayIconFileName: trayIconName,
                stickers: stickerMeta,
                stickerPackSize: finalZipBuffer.length,
                stickerPackOrigin: 'THIRD_PARTY',
                mediaKey: packUpload.mediaKey,
                fileLength: packUpload.encBody.length,
                fileSha256: packUpload.fileSha256,
                fileEncSha256: packUpload.fileEncSha256,
                directPath: packUpload.directPath,
                thumbnailDirectPath: packUpload.directPath,
                thumbnailSha256: thumbSha256,
                thumbnailEncSha256: thumbEncSha256,
                thumbnailHeight: 96,
                thumbnailWidth: 96,
                mediaKeyTimestamp: Math.floor(Date.now() / 1000),
                packDescription: 'ZenBot Native Pack',
                imageDataHash: thumbSha256.toString('base64')
            }
        }, { messageId: msgId, quoted: m })

        userDb.kogen -= 1
        await conn.sendMessage(m.chat, { text: `${config.PREMIUM_SYMBOL} Utilizaste *1 ${config.PREMIUM_NAME}*\n> 📦 Pack de ${zipFiles.length} stickers agregado.` }, { quoted: m })

    } catch (err) {
        console.error('[Stickerly Pack]', err)
        return m.reply(`*⌬┤ ❌ ├⌬ Error al procesar el pack de stickers.*`)
    }
}

handler.help = [`stickerly <link> ${config.PREMIUM_SYMBOL}`]
handler.command = ['stickerly', 'stpack', 'stickers']
handler.tags = ['descargas']

export default handler