// Cargar variables de entorno desde .env (si existe). Lo hacemos LO MÁS TEMPRANO posible.
import "dotenv/config";
import "./settings.js";
import main from '#main';
import events from '#events';
import makeWASocket, { Browsers, makeCacheableSignalKeyStore, useMultiFileAuthState, fetchLatestBaileysVersion, jidDecode, DisconnectReason } from 'baileys';
import pino from "pino";
import qrcode from "qrcode-terminal";
import chalk from "chalk";
import cfonts from "cfonts";
import fs from "fs";
import path from "path";
import readlineSync from "readline-sync";
import { smsg, getCachedMeta, setCachedMeta, deleteCachedMeta, patchGroupMetadata } from "#serialize";
import cmdsLoader from '#system/cmdsLoader';
import "#system/database";
import { startSubBot } from './cmds/socket/subs.js';
import db from '#db';
import NodeCache from "node-cache";
import { resolveChannel } from '#lib/channel';
import { startServer } from './server.js';

const log = {
  info: (msg) => console.log(chalk.bgBlue.white.bold(`INFO`), chalk.white(msg)),
  success: (msg) => console.log(chalk.bgGreen.white.bold(`SUCCESS`), chalk.greenBright(msg)),
  warn: (msg) => console.log(chalk.bgYellowBright.blueBright.bold(`WARNING`), chalk.yellow(msg)),
  error: (msg) => console.log(chalk.bgRed.white.bold(`ERROR`), chalk.redBright(msg))
};

let phoneNumber = "";
let phoneInput = "";
const methodCodeQR = process.argv.includes("--qr");
const methodCodeArg = process.argv.includes("code");
const hasSessionFile = fs.existsSync("./Sessions/Owner/creds.json");

// Método de vinculación por variable de entorno (.env): PAIRING_METHOD=code y PAIRING_NUMBER=52...
const envMethod = (process.env.PAIRING_METHOD || "").trim().toLowerCase();
const envNumber = (process.env.PAIRING_NUMBER || "").trim();
const methodCodeByEnv = envMethod === "code" && envNumber;
const methodCode = methodCodeArg || methodCodeByEnv;

function normalizePhone(input) {
  let s = String(input).replace(/\D/g, '');
  if (!s) return '';
  if (s.startsWith('0')) s = s.replace(/^0+/, '');
  if (s.length === 10 && s.startsWith('3')) s = '57' + s;
  if (s.startsWith('52') && !s.startsWith('521') && s.length >= 12) s = '521' + s.slice(2);
  if (s.startsWith('54') && !s.startsWith('549') && s.length >= 11) s = '549' + s.slice(2);
  return s;
}

// Chequeo de versión de Node: node:sqlite necesita >=22.5.0 (lo usa core/system/database.js).
// No forzamos engines para no romper Termux, pero advertimos claro.
const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(Number);
const needsSqliteVersion = (nodeMajor > 22) || (nodeMajor === 22 && nodeMinor >= 5);
if (!needsSqliteVersion) {
  console.log(chalk.yellow(`\n[ ⚠ ] Tu Node.js es ${process.versions.node} pero la base SQLite nativa requiere Node >= 22.5.0.`));
  console.log(chalk.yellow(`[ ⚠ ] En Termux puedes actualizar con: pkg update && pkg install nodejs`));
  console.log(chalk.yellow(`[ ⚠ ] Si ya tienes Node 22+ y sigue apareciendo, omite este aviso.\n`));
} else {
  console.log(chalk.gray(`[ ✿ ] Node.js ${process.versions.node} detectado.`));
}

const { say } = cfonts
console.log('\n')
  say('BUNNY GIRL', {
  font: 'block',
  align: 'center',
  gradient: ['#ff7eb3', '#f97316'],
  letterSpacing: 1,
  space: false
})
  say('Bot WhatsApp Multi-Device', {
  font: 'chrome',
  align: 'center',
  gradient: ['blue', 'magenta'],
  letterSpacing: 2
})
console.log(chalk.cyan('      🍁 Creado por Ginko-MD (@__ikg.05 en Instagram)\n') + chalk.gray('         ────────────────────────────\n'))

const botTypes = [
  { name: 'SubBot', folder: './Sessions/Subs', starter: startSubBot },
];
if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp', { recursive: true });
global.conns = global.conns || [];
const reconnecting = new Set();
const msgStore = new Map();
const msgLimit = 500;
const SENT_KEY = '__sent__:';
const MSG_STORE_MAX = 1000;

async function loadBots() {
  for (const { name, folder, starter } of botTypes) {
    if (!fs.existsSync(folder)) continue;
    const botIds = fs.readdirSync(folder);
    for (const userId of botIds) {
      const sessionPath = path.join(folder, userId);
      const credsPath = path.join(sessionPath, 'creds.json');
      if (!fs.existsSync(credsPath)) continue;
      if (global.conns.some((conn) => conn.userId === userId)) continue;
      if (reconnecting.has(userId)) continue;
      try {
        reconnecting.add(userId);
        await starter(null, null, '', false, userId, '');
      } catch (e) {
        console.log(chalk.gray(`[ loadBots ] Error iniciando ${name} ${userId}: ${e?.message || e}`));
        reconnecting.delete(userId);
      }
      await new Promise((res) => setTimeout(res, 2500));
    }
  }
  setTimeout(loadBots, 60 * 1000);
}

async function initDB() {
  db.initDB();
  db.clearDB();
  global.db = db;
  console.log(chalk.gray('[ ✿  ]  Base de datos cargada correctamente.'));
}

function cleanCache() {
  try {
    if (fs.existsSync('./tmp')) {
      const files = fs.readdirSync('./tmp');
      let cleaned = 0;
      for (const file of files) {
        try { fs.unlinkSync(path.join('./tmp', file)); cleaned++; } catch {}
      }
      if (cleaned > 0) console.log(chalk.gray(`[ ⚠ ] Cache tmp: ${cleaned} archivos eliminados`));
    }
  } catch (e) {
    console.error(chalk.red('Error en cleanCache: '), e);
  }
}

function clearSession() {
  try {
    const sessionDir = './Sessions/Owner';
    if (!fs.existsSync(sessionDir)) return;
    for (const file of fs.readdirSync(sessionDir)) {
      try { fs.unlinkSync(path.join(sessionDir, file)); } catch {}
    }
    log.warn('Sesión del principal eliminada — reiniciando para vincular de nuevo...');
  } catch (e) {
    log.error(`clearSession → ${e?.message || e}`);
  }
}

let opcion;
if (hasSessionFile) {
  // Ya existe credencial guardada: no preguntar nada, conectar directo.
  opcion = "0";
  console.log(chalk.gray("[ ✿ ] Sesión existente detectada, cargando..."));
} else if (methodCodeByEnv) {
  // PAIRING_METHOD=code + PAIRING_NUMBER desde .env: sin preguntar, sin readline.
  opcion = "2";
  phoneNumber = normalizePhone(envNumber);
  console.log(chalk.gray(`[ ✿ ] Vinculación por código (número desde .env: ${phoneNumber || '?'} )`));
} else if (methodCodeQR) {
  opcion = "1";
} else if (methodCodeArg) {
  opcion = "2";
  console.log(chalk.bold.redBright(`\nPor favor, Ingrese el número de WhatsApp.\n${chalk.bold.yellowBright("Ejemplo: +57301******")}\n${chalk.bold.magentaBright('---> ')}`));
  phoneInput = readlineSync.question("");
  phoneNumber = normalizePhone(phoneInput);
} else {
  // Primer arranque, sin consola no-interactiva detectada.
  // process.stdin.isTTY es false en paneles/hostings: evita colgar readline.
  const isInteractive = process.stdin.isTTY !== false;
  if (!isInteractive) {
    log.warn("No hay consola interactiva y no hay sesión guardada. Usa --qr, --code o configura .env");
    opcion = "1";
  } else {
    opcion = readlineSync.question(chalk.bold.white("\nSeleccione una opción:\n") + chalk.blueBright("1. Con código QR\n") + chalk.cyan("2. Con código de texto de 8 dígitos\n--> "));
    while (!/^[1-2]$/.test(opcion)) {
      console.log(chalk.bold.redBright(`No se permiten numeros que no sean 1 o 2, tampoco letras o símbolos especiales.`));
      opcion = readlineSync.question("--> ");
    }
    if (opcion === "2") {
      console.log(chalk.bold.redBright(`\nPor favor, Ingrese el número de WhatsApp.\n${chalk.bold.yellowBright("Ejemplo: +57301******")}\n${chalk.bold.magentaBright('---> ')}`));
      phoneInput = readlineSync.question("");
      phoneNumber = normalizePhone(phoneInput);
    }
  }
}

let bootTime = Date.now();
let reconexion = 0;
let botReady = false;
let isRestarting = false;
const retriesLimit = 15;
function remove(sock) {
  if (!sock) return;
  try { sock.ev.removeAllListeners(); } catch {}
  try { sock.ws?.close(); } catch {}
  try { sock.end?.(new Error('replaced')); } catch {}
  try { sock.msgRetryCounterCache?.close(); } catch {}
}

const logger = pino({ level: "silent" });
const versionCache = { value: null, expiresAt: 0 };
async function getVersion() {
  if (versionCache.value && Date.now() < versionCache.expiresAt) return versionCache.value;
  try {
    const latest = await fetchLatestBaileysVersion();
    versionCache.value = latest.version;
    versionCache.expiresAt = Date.now() + 60 * 60 * 1000;
  } catch (e) {
    if (!versionCache.value) versionCache.value = [2, 3000, 1033105955];
  }
  return versionCache.value;
}

async function warmupGroups(sock) {
  try {
    const allChats = db.getChat()
    const chatIds = allChats.map(c => c.id).filter(id => typeof id === 'string' && id.endsWith('@g.us')).slice(0, 50)
    if (!chatIds.length) return
    console.log(chalk.gray(`[ ✿ ] Precargando metadata de ${chatIds.length} grupos...`))
    const t = Date.now()
    const batches = []
    for (let i = 0; i < chatIds.length; i += 10) {
      batches.push(chatIds.slice(i, i + 10))
    }
    await Promise.allSettled(batches.map(batch => Promise.allSettled(batch.map(async id => {
    try {
    const meta = await sock.groupMetadata(id)
    if (meta) setCachedMeta(id, meta) } catch {}}))))
    console.log(chalk.gray(`[ ✿ ] Warmup completado en ${Date.now() - t}ms`))
  } catch (e) {
    console.log(chalk.gray(`[ ✿ ] warmupGroups → ${e?.message || e}`))
  }
}

export async function startBot() {
  if (isRestarting) return;
  isRestarting = true;
  bootTime = Date.now();
  const { state, saveCreds: saveCredsDB } = await useMultiFileAuthState('./Sessions/Owner');
  const version = await getVersion();
  let saveCredsTimer = null;
  const saveCreds = () => { clearTimeout(saveCredsTimer); saveCredsTimer = setTimeout(saveCredsDB, 2000); };
  const msgRetryCounterCache = new NodeCache({ stdTTL: 3600, checkperiod: 600, useClones: false });
  console.info = () => {};
  console.debug = () => {};
  const sock = makeWASocket({
    version,
    logger,
    browser: Browsers.macOS('Chrome'),
    printQRInTerminal: false,
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
    markOnlineOnConnect: false,
    syncFullHistory: false,
    shouldSyncHistoryMessage: () => false,
    fireInitQueries: false,
    generateHighQualityLinkPreview: false,
    shouldIgnoreJid: (jid) => jid.endsWith('@broadcast'),
    keepAliveIntervalMs: 30000,
    connectTimeoutMs: 20000,
    transactionOpts: { maxCommitRetries: 10, delayBetweenTriesMs: 3000 },
    emitOwnEvents: false,
    msgRetryCounterCache,
    cachedGroupMetadata: async (jid) => getCachedMeta(jid) ?? undefined,
    getMessage: async (key) => {
      // Buscar primero por jid:id (mensajes recibidos), luego por __sent__:id (enviados)
      if (!key?.id) return undefined;
      const byJid = key.remoteJid ? msgStore.get(key.remoteJid + ':' + key.id) : undefined;
      if (byJid) {
        // El store puede guardar el WAMessage.message directamente (recibidos) o {message} (enviados)
        return byJid.message ? byJid.message : byJid;
      }
      const bySent = msgStore.get(SENT_KEY + key.id);
      if (bySent) return bySent.message;
      return undefined;
    },
  });

  global.sock = sock;
  patchGroupMetadata(sock);
  sock.msgRetryCounterCache = msgRetryCounterCache;
  sock.ev.on("creds.update", saveCreds);
  sock.sendText = (jid, text, quoted = "", options) => sock.sendMessage(jid, { text, ...options }, { quoted });

  // Fix "Esperando mensaje" / "Waiting for this message":
  // Baileys necesita que getMessage pueda devolver el contenido de los mensajes
  // que ENVIAMOS (no solo los recibidos) cuando WhatsApp pide retransmisión
  // por fallo de cifrado E2E. Si no lo encuentra, el receptor se queda esperando.
  const origSendMessage = sock.sendMessage.bind(sock);
  sock.sendMessage = async (jid, content, opts) => {
    const result = await origSendMessage(jid, content, opts);
    try {
      if (result?.key?.id) {
        // Guardar tanto la clave por jid:id como la clave __sent__:id
        const stored = { key: result.key, message: content };
        msgStore.set(jid + ':' + result.key.id, stored);
        msgStore.set(SENT_KEY + result.key.id, stored);
        // Limitar tamaño
        while (msgStore.size > MSG_STORE_MAX) {
          msgStore.delete(msgStore.keys().next().value);
        }
      }
    } catch {}
    return result;
  };
  sock.decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
      const decode = jidDecode(jid) || {};
      return (decode.user && decode.server && decode.user + "@" + decode.server) || jid;
    }
    return jid;
  };

  if (opcion === "2" && !state.creds.registered) {
    setTimeout(async () => {
      try {
        if (!state.creds.registered) {
          const pairing = await sock.requestPairingCode(phoneNumber);
          const codeBot = pairing?.match(/.{1,4}/g)?.join("-") || pairing;
          console.log(chalk.bold.white(chalk.bgMagenta(`Código de emparejamiento:`)), chalk.bold.white(chalk.white(codeBot)));
        }
      } catch (err) {
        console.log(chalk.red("Error al generar código:"), err);
      }
    }, 3000);
  }

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (!botReady) return;
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (msg?.message && msg?.key?.id) {
        const sid = msg.key.remoteJid + ':' + msg.key.id;
        msgStore.set(sid, msg.message);
        if (msgStore.size > msgLimit) msgStore.delete(msgStore.keys().next().value);
      }
      try {
        if (!msg?.message || msg.key?.remoteJid === "status@broadcast") continue;
        if ((msg.messageTimestamp * 1000) < bootTime - 15_000) continue;
        if (msg.message.ephemeralMessage) msg.message = msg.message.ephemeralMessage.message;
        const m = await smsg(sock, msg);
        if (typeof main === 'function') main(sock, m, messages).catch((err) => console.error('[ ✿  ]  Main Owner »', err?.message));
      } catch (err) {
        console.error('Error:', err);
      }
    }
  });
  sock.ev.on("group-participants.update", ({ id }) => { deleteCachedMeta(id); });
  sock.ev.on("groups.update", (updates) => { for (const update of updates) deleteCachedMeta(update.id); });
  try { await events(sock, null); } catch (err) { console.log(chalk.gray(`[ EVENT ERROR ] → ${err}`)); }

  sock.ev.on("connection.update", async (update) => {
    const { qr, connection, lastDisconnect, isNewLogin, receivedPendingNotifications } = update;
    if (qr != 0 && qr != undefined || methodCodeQR) {
      if (opcion == '1' || methodCodeQR) {
        console.log(chalk.green.bold("[ ✿ ] Escanea este código QR"));
        qrcode.generate(qr, { small: true });
      }
    }
    if (connection === "open") {
      bootTime = Date.now();
      reconexion = 0;
      isRestarting = false;
      const userName = sock.user.name || "Desconocido";
      log.success(`[ ✿ ]  Conectado a: ${userName}`);
      if (!botReady) {
        botReady = true;
        warmupGroups(sock);
        // Resolver JID del canal oficial para mostrar el botón "Ver canal"
        resolveChannel(sock, db).catch(()=>{});
      }
    }
    if (isNewLogin) log.info("Nuevo dispositivo detectado");
    if (connection === "close") {
      remove(sock);
      const reason = lastDisconnect?.error?.output?.statusCode || 0;
      if ([DisconnectReason.loggedOut, DisconnectReason.forbidden, DisconnectReason.multideviceMismatch].includes(reason)) {
        log.warn(`Principal desvinculado (${reason}) — limpiando sesión y reiniciando...`);
        botReady = false;
        isRestarting = false;
        clearSession();
        process.exit(1);
      }
      if (reason === DisconnectReason.connectionReplaced) {
        log.warn("Conexión reemplazada — cerrá la otra sesión antes de reconectar.");
        isRestarting = false;
        return;
      }
      reconexion++;
      if (reconexion > retriesLimit) {
        log.error(`Demasiados reintentos (${retriesLimit}) — sesión posiblemente corrupta, limpiando...`);
        botReady = false;
        reconexion = 0;
        isRestarting = false;
        clearSession();
        process.exit(1);
      }
      const delay = Math.min(3000 * reconexion, 30000);
      const reasonMessages = {
        [DisconnectReason.connectionLost]: "Se perdió la conexión al servidor, intentando reconectar...",
        [DisconnectReason.connectionClosed]: "Conexión cerrada, intentando reconectarse...",
        [DisconnectReason.restartRequired]: "Es necesario reiniciar...",
        [DisconnectReason.timedOut]: "Tiempo de conexión agotado, intentando reconectarse...",
        [DisconnectReason.badSession]: "Sesión inválida, limpiando y reconectando...",
      };
      log.warn(reasonMessages[reason] || `Desconexión (${reason}), reconectando en ${delay / 1000}s...`);
      isRestarting = false;
      setTimeout(startBot, delay);
    }
  });
}

setInterval(cleanCache, 60 * 60 * 1000);
cleanCache();

(async () => {
  // Iniciar servidor HTTP de health check LO PRIMERO (BoxMine/paneles).
  startServer();
  await initDB();
  await cmdsLoader();
  await startBot();
  await loadBots();
})();

function onUncaughtException(e) {
  log.error(`ERROR → ${e?.stack || e?.message || e}`);
}
function onUnhandledRejection(reason) {
  if (reason instanceof SyntaxError) {
    process.off('uncaughtException', onUncaughtException);
    process.off('unhandledRejection', onUnhandledRejection);
    process.nextTick(() => { throw reason; });
    return;
  }
  log.error(`RECHAZO → ${reason?.stack || reason?.message || reason}`);
}
process.on('uncaughtException', onUncaughtException);
process.on('unhandledRejection', onUnhandledRejection);
