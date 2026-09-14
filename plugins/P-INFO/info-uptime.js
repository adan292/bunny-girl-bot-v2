const handler = async (m) => {
  const ms   = process.uptime() * 1000
  const seg  = Math.floor(ms / 1000) % 60
  const min  = Math.floor(ms / 60000) % 60
  const hora = Math.floor(ms / 3600000) % 24
  const dias = Math.floor(ms / 86400000)

  m.reply(`*⌬┤ ⏱️ ├⌬ UPTIME.*\n> *${dias}d ${hora}h ${min}m ${seg}s*`)
}

handler.help = ['uptime']
handler.command = ['uptime', 'runtime']
handler.tags    = ['info']

export default handler
