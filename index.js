const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers
} = require("@whiskeysockets/baileys");
const fs = require("fs");
const path = require("path");
const readline = require("node:readline/promises");
const { stdin, stdout, isTTY } = process;
const pino = require("pino");
const qrcode = require("qrcode-terminal");
const figlet = require("figlet");
const express = require("express");

const config = require("./config");
const db = require("./database");
const { calculateLevel, isUrl, jidNumber } = require("./utils");
const { frase } = require("./frases");
const commands = require("./handlers/commands");
const { checkAntiLink } = require("./handlers/commands");
const groupHandler = require("./handlers/group");
const economy = require("./lib/economy");
const { askAI } = require("./lib/ai");

const app = express();
app.get("/", (_, res) => res.send("🐰 Bunny Bot V2 online."));
app.get("/health", (_, res) => res.json({ ok: true, version: config.version }));
app.listen(config.port, () => console.log(`🌐 Health server en ${config.port}`));

let reconnecting = false;
let wasConnected = false;
let authMethod = null;
let currentCode = null;
let codeExpiryTimer = null;
let sock;
const aiHistory = new Map();

function pushAIHistory(jid, role, content) {
  const history = aiHistory.get(jid) || [];
  history.push({ role, content });
  aiHistory.set(jid, history.slice(-8));
}

function stripBotMention(text) {
  return text.replace(/@?bunny\s*/ig, "").trim();
}

function printBanner() {
  try {
    const art = figlet.textSync(config.botName.toUpperCase(), { font: "Standard" });
    console.log(art);
  } catch {
    console.log(`\n===== ${config.botName.toUpperCase()} =====\n`);
  }
  console.log("=".repeat(52));
}

function askQuestion(question) {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  return rl.question(question).finally(() => rl.close());
}

function hasRegisteredSession() {
  try {
    const creds = JSON.parse(fs.readFileSync(path.join(__dirname, "auth", "creds.json"), "utf8"));
    return creds.registered === true;
  } catch {
    return false;
  }
}

async function chooseAuthMethod() {
  printBanner();
  const paired = hasRegisteredSession();
  if (paired) {
    console.log(`🐰 Sesión ya vinculada. Conectando ${config.botName}...\n`);
    return "linked";
  }
  console.log("Elige cómo vincular tu WhatsApp:\n");
  console.log("  [1] Código QR (escanear con el teléfono)");
  console.log("  [2] Código de 8 dígitos (vincular con número de teléfono)\n");
  if (config.authMethod === "qr" || config.authMethod === "code") {
    console.log(`(AUTH_METHOD configurado → usando opción ${config.authMethod === "code" ? "2: código de 8 dígitos" : "1: QR"})`);
    return config.authMethod;
  }
  if (!isTTY) {
    const phone = config.pairingPhone || config.owner;
    if (config.authMethod === "qr") {
      console.log("(Sin terminal interactiva → usando opción 1: QR, se imprimirá en el log.)");
      return "qr";
    }
    if (config.authMethod === "code" || phone) {
      console.log(`(Sin terminal interactiva → usando opción 2: código de 8 dígitos${phone ? ` para ${phone}` : ""}. Configura AUTH_METHOD=qr|code en .env para elegir.)`);
      return "code";
    }
    console.log("⚠️ Sin terminal interactiva y sin número configurado. NO se imprimirá QR.");
    console.log("   Para recibir el código de 8 dígitos define en .env:");
    console.log("   PAIRING_PHONE=<número con código de país, sin +>  (o OWNER_NUMBER)");
    console.log("   El bot seguirá esperando...\n");
    return "code";
  }
  let choice;
  while (choice !== "1" && choice !== "2") {
    choice = (await askQuestion("Elige 1 o 2: ")).trim();
    if (choice !== "1" && choice !== "2") console.log("⚠️ Opción inválida. Escribe 1 (QR) o 2 (código de 8 dígitos).");
  }
  return choice === "2" ? "code" : "qr";
}

async function resolvePairingPhone() {
  if (config.pairingPhone) return config.pairingPhone;
  if (config.owner) return config.owner;
  if (!isTTY) return "";
  const raw = (await askQuestion("Escribe el número de teléfono (con código de país, sin +): ")).trim();
  return raw.replace(/\D/g, "");
}

function scheduleCodeExpiry() {
  if (codeExpiryTimer) clearTimeout(codeExpiryTimer);
  codeExpiryTimer = setTimeout(() => {
    if (!currentCode) return;
    console.log(`⏰ El código ${currentCode} expiró. Generando uno nuevo...\n`);
    currentCode = null;
    try {
      sock?.end?.(new Error("pairing-code-expired"));
    } catch {}
    if (!reconnecting) {
      reconnecting = true;
      setTimeout(startBot, 4000);
    }
  }, 55000);
}

async function startBot() {
  reconnecting = false;
  if (authMethod === null) authMethod = await chooseAuthMethod();
  const { state, saveCreds } = await useMultiFileAuthState("./auth");
  let version;
  try {
    ({ version } = await fetchLatestBaileysVersion());
  } catch (e) {
    console.warn("⚠️ No se pudo consultar la versión de Baileys; usando la predeterminada.");
  }

  sock = makeWASocket({
    ...(version ? { version } : {}),
    auth: state,
    logger: pino({ level: "silent" }),
    browser: Browsers.windows("Chrome"),
    markOnlineOnConnect: false
  });

  sock.ev.on("creds.update", saveCreds);

  if (!hasRegisteredSession() && authMethod === "code") {
    const phone = await resolvePairingPhone();
    if (phone) {
      setTimeout(async () => {
        try {
          const code = await sock.requestPairingCode(phone);
          const clean = code.match(/.{1,4}/g)?.join("-") || code;
          currentCode = clean;
          console.log(`\n🔢 Código de vinculación para ${phone}: ${clean}`);
          console.log("👉 En WhatsApp: Ajustes → Dispositivos vinculados → Vincular un dispositivo → Vincular con número de teléfono.\n");
          scheduleCodeExpiry();
        } catch (e) {
          console.error("❌ No se pudo generar el código de vinculación:", e.message);
        }
      }, 3000);
    } else {
      console.log("⚠️ No hay número configurado. Define PAIRING_PHONE u OWNER_NUMBER en .env y reinicia para recibir el código de 8 dígitos.");
    }
  }

  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr && authMethod === "qr") {
      console.log("\n📱 Escanea el QR con WhatsApp:\n");
      qrcode.generate(qr, { small: true });
    } else if (qr) {
      console.log("(QR recibido, ignorado: no se eligió la opción 1)");
    }
    if (connection === "open") {
      reconnecting = false;
      wasConnected = true;
      currentCode = null;
      if (codeExpiryTimer) clearTimeout(codeExpiryTimer);
      console.log(`🐰 ${config.botName} conectado.`);
    }
    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      console.warn(`⚠️ Conexión cerrada. StatusCode: ${code ?? "desconocido"}`, lastDisconnect?.error?.message ? `(${lastDisconnect.error.message})` : "");
      if (wasConnected && code === DisconnectReason.loggedOut) {
        console.log("🔐 Sesión cerrada. Elimina ./auth y vuelve a vincular.");
        return;
      }
      if (!wasConnected) {
        if (currentCode) {
          console.log(`⏸ Esperando a que expire el código ${currentCode} para generar uno nuevo...`);
          return;
        }
        if (!reconnecting) {
          reconnecting = true;
          setTimeout(startBot, 3000);
        }
        return;
      }
      if (!reconnecting) {
        reconnecting = true;
        console.log("↻ Reintentando conexión en 3s...");
        setTimeout(startBot, 3000);
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const msg of messages) {
      try {
        await handleMessage(msg);
      } catch (e) {
        console.error("❌ Error:", e);
      }
    }
  });

  sock.ev.on("group-participants.update", async ({ id, participants, action }) => {
    try {
      const g = db.getGroup(id);
      if (!g[action === "add" ? "welcome" : "goodbye"]) return;
      for (const p of participants) {
        const t = action === "add" ? frase("welcome", "@" + jidNumber(p)) : frase("goodbye", "@" + jidNumber(p));
        await sock.sendMessage(id, { text: t, mentions: [p] });
      }
    } catch (e) {
      console.error("❌ Evento de grupo:", e);
    }
  });
}

function getText(msg) {
  return commands.getText(msg);
}

async function handleMessage(msg) {
  if (!msg.message || msg.key.fromMe) return;
  const jid = msg.key.remoteJid;
  if (!jid) return;

  const sender = msg.key.participant || jid;
  const text = getText(msg);
  if (!text) return;

  const isGroup = jid.endsWith("@g.us");

  const botNumber = sock.user?.id ? jidNumber(sock.user.id) : "";
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  const mentionedBot = mentioned.some(x => jidNumber(x) === botNumber);
  const mentionText = stripBotMention(text);
  if (config.aiEnabled && !text.startsWith(config.prefix) && ((isGroup && mentionedBot) || (!isGroup && config.aiAutoPrivate))) {
    const prompt = mentionText || text;
    const history = aiHistory.get(jid) || [];
    const result = await askAI(prompt, history);
    if (result.ok) {
      pushAIHistory(jid, "user", prompt);
      pushAIHistory(jid, "assistant", result.text);
      await sock.sendMessage(jid, { text: `🐰🤖 ${result.text}`, mentions: [sender] });
    } else {
      await sock.sendMessage(jid, { text: result.message });
    }
    return;
  }

  const u = db.getUser(sender);
  if (Date.now() - u.lastXpAt > 60000) {
    const gain = 5 + Math.floor(Math.random() * 11);
    const old = calculateLevel(u.xp);
    const newXp = u.xp + gain;
    const level = calculateLevel(newXp);
    db.updateUser(sender, {
      xp: newXp,
      level: level.level,
      lastXpAt: Date.now(),
      stats: { ...u.stats, messages: u.stats.messages + 1 }
    });
    if (level.level > old.level) {
      await sock.sendMessage(jid, {
        text: `🎉 ¡${"@" + jidNumber(sender)} subió al nivel *${level.level}*!`,
        mentions: [sender]
      });
    }
  }

  if (isGroup) {
    const g = db.getGroup(jid);
    const admin = await isAdmin(sock, jid, sender);

    if (!admin && !text.startsWith(config.prefix)) {
      await checkAntiLink(sock, msg);

      if (g.antiparoles && g.blockedWords.some(w => text.toLowerCase().includes(w))) {
        try { await sock.sendMessage(jid, { delete: msg.key }); } catch {}
        await sock.sendMessage(jid, {
          text: `🚫 ${"@" + jidNumber(sender)}, esa palabra está prohibida en este grupo.`,
          mentions: [sender]
        });
        return;
      }
    }
  }

  if (!text.startsWith(config.prefix)) return;

  const body = text.slice(config.prefix.length).trim();
  if (!body) return;

  const parts = body.split(/\s+/);
  const command = parts.shift().toLowerCase();
  const args = parts;

  await commands.execute(sock, msg, command, args, config);
}

async function isAdmin(sock, jid, user) {
  try {
    const meta = await sock.groupMetadata(jid);
    const p = meta.participants.find(x => x.id === user);
    return !!p?.admin;
  } catch {
    return false;
  }
}

startBot().catch(e => {
  console.error("❌ Error fatal:", e);
  process.exit(1);
});
       
