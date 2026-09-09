import fs from 'fs';
import { watchFile, unwatchFile } from 'fs'
import { fileURLToPath } from 'url'

global.owner = ['584120299482']

global.api = {
  url: 'https://api.stellarwa.xyz',
  key: 'proyectsV2' 
}

global.msgglobal = '✨!ഞ.˖ Ocurrió un problema, contacte al creador'
global.dev = `★❌[Adán]❌★`

global.mess = {
  socket: '(∩´◔_◔ʹ∩ ツ) Este comando solo puede ser ejecutado por un Socket.',
  admin: '܀ඔ⋕ฆ⋕ຣ܀ Este comando solo puede ser ejecutado por los Administradores del Grupo.',
  botAdmin: '(𝙼𝚊𝚗𝚘𝚜 𝙰𝚛𝚛𝚒𝚋𝚊) Este comando solo puede ser ejecutado si el Socket es Administrador del Grupo.',
  nsfw: '(•ಂ²ˆ²ಂ•) Los comandos de *NSFW* están desactivados en este grupo.',
  comandooff: 'ᴛhᴇsᴇ ᴄᴏᴍᴀɴᴅs ᴀʀᴇ ᴅᴇᴀᴄтɪᴠᴀтᴇᴅ ɪɴ ᴛhɪs ɢʀᴏᴜᴩ.'
}

global.my = {
ch: "120363407128588763@newsletter"
}

let file = fileURLToPath(import.meta.url)
watchFile(file, () => {
  unwatchFile(file)
  import(`${file}?update=${Date.now()}`)
})
