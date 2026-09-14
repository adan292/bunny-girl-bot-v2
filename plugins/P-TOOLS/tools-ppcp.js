import axios from 'axios'

const handler = async (m, { conn }) => {
  try {
    const res = await axios.get('https://raw.githubusercontent.com/ShirokamiRyzen/WAbot-DB/main/fitur_db/ppcp.json')
    const cita = res.data[Math.floor(Math.random() * res.data.length)]
    
    const cowo = (await axios.get(cita.cowo, { responseType: 'arraybuffer' })).data
    await conn.sendMessage(m.chat, { image: cowo, caption: `*Masculino* ♂️` }, { quoted: m })
    
    const cewe = (await axios.get(cita.cewe, { responseType: 'arraybuffer' })).data
    await conn.sendMessage(m.chat, { image: cewe, caption: `*Femenina* ♀️` }, { quoted: m })
  } catch { 
    m.reply(`*⌬┤ ❌ ├⌬ ERROR.*\n> No se pudo obtener las imágenes. Intentá de nuevo.`) 
  }
}

handler.command = ['ppcp', 'ppcouple']
handler.tags = ['tools']
handler.help = ['ppcouple']
export default handler