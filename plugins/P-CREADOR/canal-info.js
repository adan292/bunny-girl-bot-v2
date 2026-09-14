const handler = async (m, { conn, text, usedPrefix, command }) => {
  const input = text.trim()
  if (!input) return m.reply(`*⌬┤ ⚠️ ├⌬ LINK REQUERIDO.*\n> Uso: *${usedPrefix}${command} https://whatsapp.com/channel/xxxx*`)

  const match = input.match(/whatsapp\.com\/channel\/([A-Za-z0-9_-]+)/)
  if (!match) return m.reply(`*⌬┤ ⚠️ ├⌬ LINK INVÁLIDO.*\n> Usá el link completo del canal.`)
  const code = match[1]

  const info = await conn.newsletterMetadata('invite', code)
  if (!info) return m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se encontró info del canal.`)

  const meta = info.thread_metadata
  const nombre      = meta?.name?.text || 'N/A'
  const desc        = meta?.description?.text || 'Sin descripción'
  const subs        = meta?.subscribers_count ?? 'N/A'
  const link        = `https://whatsapp.com/channel/${meta?.invite || ''}`
  const verificado  = meta?.verification === 'VERIFIED' ? '✅ Verificado' : '❌ No verificado'
  const estado      = info.state?.type || 'N/A'
  const creacion    = meta?.creation_time ? new Date(parseInt(meta.creation_time) * 1000).toLocaleDateString('es-AR') : 'N/A'
  const reacciones  = meta?.settings?.reaction_codes?.value || 'N/A'
  const handle      = meta?.handle ? `@${meta.handle}` : 'Sin handle'

  const caption =
    `*⌬┤ 📡 ├⌬ INFO DEL CANAL.*\n` +
    `▢ *Nombre:* ${nombre}\n` +
    `▢ *Handle:* ${handle}\n` +
    `▢ *ID:* ${info.id}\n` +
    `▢ *Estado:* ${estado}\n` +
    `▢ *Verificado:* ${verificado}\n` +
    `▢ *Suscriptores:* ${subs}\n` +
    `▢ *Creado:* ${creacion}\n` +
    `▢ *Reacciones:* ${reacciones}\n` +
    `▢ *Descripción:* ${desc}\n` +
    `▢ *Link:* ${link}`

  const preview = meta?.preview
  if (preview?.direct_path) {
    const fotoUrl = `https://mmg.whatsapp.net${preview.direct_path}`
    try {
      await conn.sendMessage(m.chat, { image: { url: fotoUrl }, caption }, { quoted: m })
      return
    } catch (e) {
    }
  }

  m.reply(caption)
}

handler.help = ['infocanal <link>']
handler.tags = ['owner']
handler.command = ['infocanal', 'channelinfo']
handler.ownerOnly = true

export default handler
