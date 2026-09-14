const config = {
  botName: 'ZΞN-BOT',
  ownerName: 'AXELDEV09',
  version: '8.0.0',
  prefix: /^[.#/!]/,
  ownerNumber: ['549XXXXXX'], // Cambia por tu número 
  phoneNumber: '', //Si estas en un entorno de desarrollo web, define el número que sera el bot aquí
  MODE: 'public',
  usePairingCode: true,
  antiSpam: {
    enabled: true,
    maxCmds: 5,
    ventanaMs: 8000,
    muteMs: 15000,
  },
  antiSpamSubBot: {
    enabled: true,
    maxCmds: 5,
    ventanaMs: 10000,
    muteMs: 20000,
  },
  newsletterJid: '120363403631501323@newsletter',
  groupLink: 'https://whatsapp.com/channel/0029Vb6OR9O2v1IvoXO5oT2c',
  CURRENCY_NAME: 'ZenCoins',
  CURRENCY_SYMBOL: '⌬',
  PREMIUM_NAME: 'Kōgen',
  PREMIUM_SYMBOL: '✦',
  kogenPrice: 1000,
  packname: 'ZΞN-BOT',
  author: 'AXELDEV09',
  limiteSubbots: '', // Cambia la cantidad según cuánto soporte tu servidor 
  footer: 'ᴢᴇɴ‑ʙᴏᴛ · ᴀxᴇʟᴅᴇᴠ⁰⁹'
}

export default config