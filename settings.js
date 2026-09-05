import { watchFile, unwatchFile } from "fs";
import chalk from "chalk";
import { fileURLToPath } from "url";
import fs from "fs";
import path from "path";

// Pon AQUÍ tu número de teléfono como owner (solo dígitos, sin + ni espacios)
// Ejemplo: México 525574370309
global.owner = ['584120299482'];

// Créditos
global.dev = "🍁 Adan-MD";
global.links = {
  channel: "https://whatsapp.com/channel/0029Vb7OVMwJf05bKntqZx1G",
  channelCode: "0029VbDVFpSGJP89hfZUe522",
  channelName: "🐰Bunny Girl-bot🐰",
  instagram: "https://www.instagram.com/__ikg.05",
  github: "https://github.com/adan292/bunny-girl-bot-v2",
  gmail: ""
}
// JID resuelto del canal (se llena automáticamente al conectar con newsletterMetadata)
global.channelJid = { id: '', name: global.links.channelName, resolved: false };
global.my = {
  ch1: ''
};

// APIs externas (NO CAMBIAR — son necesarias para que funcionan los comandos)
global.APIs = { 
  yuki: { url: "https://api.yuki-wabot.my.id", key: "YukiBot-MD" },
  vreden: { url: "https://api.vreden.web.id", key: null },
  ootaizumi: { url: "https://api.ootaizumi.web.id", key: null },
  delirius: { url: "https://api.delirius.store", key: null },
  zenzxz: { url: "https://api.zenzxz.my.id", key: null },
  siputzx: { url: "https://app.siputzx.my.id", key: null },
  Ginko: { url: "https://api.lempi.lat", key: "montekey28" }
};

// Google Gemini (IA)
// Carga la key desde config.private.js (NO se sube a GitHub), o desde variable de entorno GEMINI_API_KEY.
// Para configurarla: copia config.private.example.js a config.private.js y pon tu key ahí.
let _geminiKey = process.env.GEMINI_API_KEY || "";
let _geminiModel = process.env.GEMINI_MODEL || "gemini-flash-latest";
try {
  const privPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "config.private.js");
  if (fs.existsSync(privPath)) {
    const priv = await import(`file://${privPath}?v=${Date.now()}`);
    if (priv.geminiKey) _geminiKey = priv.geminiKey;
    if (priv.geminiModel) _geminiModel = priv.geminiModel;
  }
} catch (_) {}
global.geminiKey = _geminiKey;
global.geminiModel = _geminiModel;

// Nombre predeterminado del bot
global.botname = "Bunny Girl";

// Mensajes por defecto
global.mess = {
  socket: '⚠️ Este comando solo puede ser ejecutado por un sub-bot.',
  admin: '🔒 Este comando solo puede ser ejecutado por los Administradores del Grupo.',
  botAdmin: '⚠️ Necesito ser Administrador del Grupo para ejecutar este comando.'
};

let file = fileURLToPath(import.meta.url);
watchFile(file, () => {
  unwatchFile(file);
  import(`${file}?update=${Date.now()}`);
});
