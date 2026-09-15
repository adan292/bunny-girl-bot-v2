function rTime(seconds) {
  seconds = Number(seconds)
  var d = Math.floor(seconds / (3600 * 24))
  var h = Math.floor((seconds % (3600 * 24)) / 3600)
  var m = Math.floor((seconds % 3600) / 60)
  var s = Math.floor(seconds % 60)
  var dDisplay = d > 0 ? d + (d == 1 ? " día, " : " días, ") : ""
  var hDisplay = h > 0 ? h + (h == 1 ? " hora, " : " horas, ") : ""
  var mDisplay = m > 0 ? m + (m == 1 ? " minuto, " : " minutos, ") : ""
  var sDisplay = s > 0 ? s + (s == 1 ? " segundo" : " segundos") : ""
  return dDisplay + hDisplay + mDisplay + sDisplay
}

export default {
  name: ['runtime', 'uptime'],
  description: 'Muestra cuánto tiempo lleva activo el bot',
  category: 'info',
  ownerOnly: false,

  async run({ sock, reply }) {
    const uptime = process.uptime()

    const currentBotJid = sock.user?.id
      ? sock.user.id.split('@')[0].split(':')[0].replace(/\D/g, '') + '@s.whatsapp.net'
      : ''

    const { db } = await import('../../database/db.js')
    const config = (await import('../../config.js')).default

    const botData = db.getBot(currentBotJid)
    const esLabelAutomatico = botData?.label?.startsWith('SUB_') || botData?.label === 'Subbot' || botData?.label === 'MAIN'
    const nombreBot = (esLabelAutomatico || !botData?.label) ? config.botName : botData.label

    const texto = `*${nombreBot}*\n\n✰ Tiempo activo: ${rTime(uptime)}`

    await reply({ text: texto })
  }
}