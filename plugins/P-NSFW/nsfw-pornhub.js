import axios from 'axios'

const SEP = '─'.repeat(28)
const BASE = 'https://luxinfinity.vercel.app/api/nsfw/pornhub'

function buildListMsg(query, results) {
  let msg = `*⌬┤ 🔞 ├⌬ PORNHUB — ${query.toUpperCase()}*\n\n`
  results.forEach((v, i) => {
    msg += `*${i + 1}.* 🎬 ${v.title}\n> ⏳ ${v.duration || '-'} | 👀 -\n> 🔗 ${v.url}\n${SEP}\n`
  })
  return msg
}

const handler = async (m, { conn, command, text, args, usedPrefix, userDb }) => {
  const query = text?.trim()
  await m.react('🔞')

  try {
    if (['phsearch', 'pornhubsearch'].includes(command)) {
      if (!query) return m.reply(`*⌬┤ ❗ ├⌬ FALTA TEXTO.*\n> Ej: *${usedPrefix}${command} colegiala*`)
      await m.reply(`*⌬┤ ⏳ ├⌬ Buscando en PornHub...*`)
      const { data } = await axios.get(`${BASE}/search`, { params: { query, limit: 6 }, timeout: 15000 })
      const results = Array.isArray(data) ? data : (data.results ?? data.data ?? [])
      if (!results.length) return m.reply(`*⌬┤ ❌ ├⌬ SIN RESULTADOS.*`)
      return conn.sendMessage(m.chat, { text: buildListMsg(query, results) }, { quoted: m })
    }

    if (['pornhub', 'phdl', 'ph'].includes(command)) {
      if (!args[0] || !args[0].includes('pornhub.com'))
        return m.reply(`*⌬┤ ❗ ├⌬ LINK INVÁLIDO.*\n> Ingresá un link de PornHub.`)

      if (userDb.kogen < 3)
        return m.reply(`*⌬┤ ✦ ├⌬ SIN KŌGEN.*\n> Necesitás *3 Kōgen* para descargar videos.`)

      await m.reply(`*⌬┤ ⏳ ├⌬ Descargando video, esto puede tardar...*`)
      const { data } = await axios.get(`${BASE}/download`, { params: { url: args[0] }, timeout: 15000 })
      if (!data) return m.reply(`*⌬┤ ❌ ├⌬ SIN VIDEO.*\n> No se pudo obtener el video.`)

      await conn.sendMessage(m.chat, {
        video:    { url: data.url || data.download?.url || Object.values(data.hls ?? {})[0]?.url },
        mimetype: 'video/mp4',
        caption:  `*⌬┤ 🔞 ├⌬ PORNHUB*\n\n🎬 *${data.title}*\n⏳ ${data.duration || '-'}\n🔗 ${args[0]}\n\n> ✦ Utilizaste *3 Kōgen*`,
      }, { quoted: m })

      userDb.kogen -= 3
      await userDb.save()
    }
  } catch (e) {
    m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo procesar. Intentá de nuevo.`)
  }
}

handler.command = ['phsearch', 'pornhubsearch', 'pornhub', 'phdl', 'ph']
handler.tags = ['nsfw']
handler.help = ['phsearch <texto>', 'pornhub <link>']
handler.nsfw = true
export default handler
