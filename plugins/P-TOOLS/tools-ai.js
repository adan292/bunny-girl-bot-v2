import fetch from 'node-fetch'
import axios from 'axios'
import FormData from 'form-data'
import gtts from 'node-gtts'
import fs from 'fs'
import { promisify } from 'util'
import { exec } from 'child_process'
import { join } from 'path'

const readFile = promisify(fs.readFile)
const unlink = promisify(fs.unlink)
const execPromise = promisify(exec)

const SPENZY = 'https://spenzy-api.vercel.app/api/ai'
const IDENTITY = `Eres un asistente de WhatsApp llamado ZenBot. Fuiste creado por AxelDev09. Si alguien te pregunta quién te creó, quién es tu dueño, quién te programó, quién eres o cualquier pregunta relacionada con tu origen o identidad, responde que fuiste creado por AxelDev09. Responde siempre de forma natural y amigable. Pregunta del usuario: `

const GEMINI_KEYS = [
    process.env.GEMINI_API_KEY || 'AQ.Ab8RN6Ixd32dRsGatF4cQ7Evm8w9X979iliDiVR-ch63_jdpMg',
    'AQ.Ab8RN6LJqKhPzhy1pUOyvjc0BOG5eoAdu06SzkYtZ7VQ547DFA'
]
const REMOVEBG_KEY = 'zCdVbVyLkHkVkqRRzycSzMrc'

const handler = async (m, { conn, command, text, usedPrefix, userDb }) => {
    const query = text?.trim()
    let q = m.quoted ? m.quoted : m
    let mime = (q.msg || q).mimetype || q.mediaType || ''

    if (['generarimg', 'crearimg', 'aiimg', 'flux', 'aimg', 'delfon', 'removebg'].includes(command)) {
        
        if (['delfon', 'removebg'].includes(command)) {
            if (!/image/.test(mime)) return m.reply(`*⌬┤ 🖼️ ├⌬ USO.*\n> Respondé a una imagen con *${usedPrefix}${command}* para quitarle el fondo.\n> Cuesta *1 ✦*.`)
            if (userDb.kogen < 1) return m.reply(`*⌬┤ 💎 ├⌬ SIN KŌGEN.*\n> No tenés suficientes Kōgen para usar esto.`)

            await m.reply(`*⌬┤ ⏳ ├⌬ Procesando imagen...*`)
            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

            try {
                const buffer = await q.download()
                const formData = new FormData()
                formData.append('image_file', buffer, 'image.png')
                formData.append('size', 'auto')

                const res = await axios.post('https://api.remove.bg/v1.0/removebg', formData, {
                    headers: { 'X-Api-Key': REMOVEBG_KEY, ...formData.getHeaders() },
                    responseType: 'arraybuffer'
                })

                await conn.sendMessage(m.chat, { image: Buffer.from(res.data), caption: '*⌬┤ ✂️ · FONDO ELIMINADO ├⌬*' }, { quoted: m })
                userDb.kogen -= 1
                await conn.sendMessage(m.chat, { text: `✦ Utilizaste *1 Kōgen*` }, { quoted: m })
                return conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
            } catch (e) {
                await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
                return m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo quitar el fondo. No se cobró Kōgen.`)
            }
        }

        if (!query) return m.reply(`*⌬┤ ✙ ├⌬ USO.*\n> *${usedPrefix}${command} <descripción>*\n> Cuesta *1 ✦* por generación.`)
        if (userDb.kogen < 1) return m.reply(`*⌬┤ 💎 ├⌬ SIN KŌGEN.*\n> No tenés suficientes Kōgen para usar este comando.`)
        
        await m.reply(`*⌬┤ ⏳ ├⌬ Generando obra de arte...*`)
        await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

        try {
            let imageUrl = null;
            let captionText = `*⌬┤ 🖼️ ├⌬ IMAGEN GENERADA*\n\n> 🎨 Prompt: _${query}_`

            if (command === 'flux') {
                const initRes = await axios.get(`https://omegatech-api.dixonomega.tech/api/ai/flux-pro2?prompt=${encodeURIComponent(query)}`)
                if (!initRes.data.success) throw new Error()
                
                const taskId = initRes.data.task_id
                for (let i = 0; i < 15; i++) {
                    await new Promise(r => setTimeout(r, 4000))
                    const check = await axios.get(`https://omegatech-api.dixonomega.tech/api/ai/nano-banana2-result?task_id=${taskId}`)
                    if (check.data.status === 'completed' && check.data.image_url) {
                        imageUrl = check.data.image_url
                        break
                    }
                }
                if (!imageUrl) throw new Error('Timeout')
                captionText += `\n> ⚙️ Motor: Flux.1 Pro`

            } else if (command === 'aimg') {
                const token = "cat_bot_token_decoded_here"
                const form = new FormData()
                form.append('prompt', query)
                form.append('token', token)
                const res = await axios.post('https://text2video.aritek.app/text2img', form, { headers: form.getHeaders() })
                imageUrl = res.data?.url
                if (!imageUrl) throw new Error()
                captionText += `\n> ⚙️ Motor: Aritek AI`

            } else {
                const res = await axios.get(`https://zellapi.autos/ai/text2image5?prompt=${encodeURIComponent(query)}`, { timeout: 30000 })
                imageUrl = res.data?.result || res.data?.url
            }

            if (!imageUrl) throw new Error()
            
            await conn.sendMessage(m.chat, { image: { url: imageUrl.trim() }, caption: captionText }, { quoted: m })
            userDb.kogen -= 1
            await conn.sendMessage(m.chat, { text: `✦ Utilizaste *1 Kōgen*` }, { quoted: m })
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

        } catch (e) {
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
            m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> El motor de imágenes está saturado. Intenta de nuevo más tarde. No se cobró Kōgen.`)
        }
        return
    }

    if (['voz', 'decir'].includes(command)) {
        if (!query) return m.reply(`*⌬┤ ✙ ├⌬ USO.*\n> *${usedPrefix}${command} <texto>*`)
        await conn.sendMessage(m.chat, { react: { text: '🗣️', key: m.key } })

        const id = Math.floor(Math.random() * 10000)
        const input = join('./tmp', `input_${id}.mp3`)
        const output = join('./tmp', `output_${id}.opus`)

        try {
            const speech = gtts('es')
            await new Promise((resolve, reject) => {
                speech.save(input, query, (err) => err ? reject(err) : resolve())
            })
            await execPromise(`ffmpeg -i ${input} -c:a libopus -b:a 32k -vbr on -compression_level 10 ${output}`)
            const buffer = await readFile(output)

            await conn.sendMessage(m.chat, { audio: buffer, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: m })
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
        } catch (e) {
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
            m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> Fallo al generar el audio. ¿Tienes FFmpeg instalado?`)
        } finally {
            if (fs.existsSync(input)) await unlink(input).catch(() => {})
            if (fs.existsSync(output)) await unlink(output).catch(() => {})
        }
        return
    }

    if (!query && !/image/.test(mime)) return m.reply(`*⌬┤ ✙ ├⌬ USO.*\n> *${usedPrefix}${command} <tu pregunta>*`)
    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

    try {
        if (['gemini', 'ia', 'askai'].includes(command)) {
            const currentParts = [{ text: (IDENTITY + (query || "Describe esta imagen")) }]
            
            if (/image/.test(mime)) {
                const media = await q.download()
                currentParts.push({ inline_data: { mime_type: mime, data: media.toString('base64') } })
            }

            const payload = { contents: [{ role: 'user', parts: currentParts }] }
            const res = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEYS[0]}`, payload, {
                headers: { 'Content-Type': 'application/json' }, timeout: 30000
            })
            
            const answer = res.data?.candidates?.[0]?.content?.parts?.[0]?.text
            if (!answer) throw new Error()
            
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
            return conn.sendMessage(m.chat, { text: `*⌬┤ 🔷 ├⌬ GEMINI*\n\n${answer.replace(/\*\*/g, '*')}` }, { quoted: m })
        }

        if (['nova', 'catia'].includes(command)) {
            const payload = {
                model: "nova-2-lite-v1",
                messages: [
                    { role: "system", content: IDENTITY },
                    { role: "user", content: query }
                ]
            }
            const { data } = await axios.post('https://api.nova.amazon.com/v1/chat/completions', payload, {
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer 3f7f5a1f-36df-44b0-ac47-eb5554fe022c` }
            })
            let response = data.choices[0].message.content
            response = response.replace(/###\s+/g, '■ ').replace(/##\s+/g, '▼ ').replace(/#\s+/g, '► ').replace(/\*\*/g, '*')
            
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
            return m.reply(`*⌬┤ 🌌 ├⌬ NOVA AI*\n\n${response.trim()}`)
        }

        if (['chatgpt', 'gpt'].includes(command)) {
            const q = encodeURIComponent(IDENTITY + query)
            const res = await fetch(`${SPENZY}/chatgpt?text=${q}`, { timeout: 20000 })
            const data = await res.json()
            if (!data?.status || !data?.result?.message) throw new Error()
            
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
            return conn.sendMessage(m.chat, { text: `*⌬┤ 🧠 ├⌬ CHATGPT*\n\n${data.result.message}` }, { quoted: m })
        }

        if (['copilot', 'ms', 'nagi'].includes(command)) {
            const res = await axios.get(`https://api.yupra.my.id/api/ai/gpt5?text=${encodeURIComponent(IDENTITY + query)}`, { timeout: 20000 })
            const answer = res.data?.result || res.data?.response
            if (!answer) throw new Error()
            
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
            const prefix = command === 'nagi' ? '✨ NAGI' : '🪟 COPILOT'
            return conn.sendMessage(m.chat, { text: `*⌬┤ ${prefix.split(' ')[0]} ├⌬ ${prefix.split(' ')[1]}*\n\n${answer}` }, { quoted: m })
        }

    } catch (e) {
        console.error(e)
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo obtener respuesta de la IA. Intentá de nuevo.`)
    }
}

handler.command = ['chatgpt', 'gpt', 'nagi', 'gemini', 'ia', 'askai', 'copilot', 'ms', 'nova', 'catia', 'generarimg', 'crearimg', 'aiimg', 'flux', 'aimg', 'delfon', 'removebg', 'voz', 'decir']
handler.tags = ['tools']
handler.help = ['chatgpt <msg>', 'ia <msg/foto>', 'flux <desc> ✦', 'removebg <foto> ✦']
export default handler