import User from '../../lib/database/models/zen-users.js'
import { calcFarmerLevel, getFarmerRank } from '../../lib/games/rpg/rpgFarmerProfile.js'
import config from '../../config.js'

const handler = async (m, { conn, command }) => {

  if (['perfilgranjero', 'farmperfil'].includes(command)) {
    let target = m.mentionedJid?.[0] || m.sender
    let targetNum = target.split('@')[0]
    
    let u = await User.findOne({ jid: target })
    if (!u) return m.reply('*⌬┤ ❌ · USUARIO NO REGISTRADO.*')

    const xp = u.farmerXP || 0
    const lvl = calcFarmerLevel(xp)
    const rango = getFarmerRank(lvl)
    const stats = u.farmerStats || {}

    let texto = `*╔═══⌦ ✦ 👨‍🌾 PERFIL GRANJERO ✦ ⌫═══╗*\n\n`
              + `> 👤 *Usuario:* @${targetNum}\n`
              + `> 🏅 *Rango:* ${rango}\n`
              + `> 🌟 *Nivel:* ${lvl} (${xp} FXP)\n\n`
              + `*📊 ESTADÍSTICAS GLOBALES:*\n`
              + `> 🌾 *Cosechados:* ${stats.totalHarvested || 0}\n`
              + `> 💰 *Vendidos (Crudo):* ${stats.cropsSold || 0}\n`
              + `> 🍲 *Vendidos (Cocina):* ${stats.foodSold || 0}\n`
              + `> 💀 *Podridos/Perdidos:* ${stats.cropsLost || 0}\n\n`
              + `*╚══⌦ ${config.footer} ⌫══╝*`

    return conn.sendMessage(m.chat, { text: texto, mentions: [target] }, { quoted: m })
  }

  if (['topgranjeros', 'topfarm'].includes(command)) {
    const top = await User.find({ registered: true, farmerXP: { $gt: 0 } })
                          .sort({ farmerXP: -1 })
                          .limit(10)
                          .lean()
    
    if (top.length === 0) return m.reply('*⌬┤ 🌾 · Nadie ha plantado aún.*')

    const MEDALS = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟']
    
    let texto = `*╔═══⌦ ✦ 🏆 TOP GRANJEROS ✦ ⌫═══╗*\n\n`
    top.forEach((u, i) => {
      const lvl = calcFarmerLevel(u.farmerXP)
      const rank = getFarmerRank(lvl)
      texto += `> ${MEDALS[i]} @${u.jid.split('@')[0]}\n`
      texto += `>    └ Lvl ${lvl} | ${rank}\n`
    })
    texto += `\n*╚══⌦ ${config.footer} ⌫══╝*`

    return conn.sendMessage(m.chat, { text: texto, mentions: top.map(u => u.jid) }, { quoted: m })
  }
}

handler.help = ['perfilgranjero', 'topgranjeros']
handler.tags = ['rpg']
handler.command = ['perfilgranjero', 'farmperfil', 'topgranjeros', 'topfarm']
handler.register = true
export default handler