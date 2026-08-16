const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers
} = require("@whiskeysockets/baileys");
const fs = require("fs");
const path = require("path");
const pino = require("pino");
const qrcode = require("qrcode-terminal");
const express = require("express");

const config = require("./config");
const db = require("./database");
const { calculateLevel, isUrl, jidNumber } = require("./utils");
const { frase } = require("./frases");
const commands = require("./handlers/commands");
const groupHandler = require("./handlers/group");
const economy = require("./lib/economy");
const { askAI } = require("./lib/ai");

const app = express();
app.get("/", (_, res) => res.send("🐰 Bunny Bot V2 online."));
app.get("/health", (_, res) => res.json({ ok: true, version: config.version }));
app.listen(config.port, () => console.log(`🌐 Health server en ${config.port}`));

let reconnecting = false;
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

async function startBot() {
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

  const paired = fs.existsSync(path.join(__dirname, "auth", "creds.json"));
  if (!paired && config.pairingPhone) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(config.pairingPhone);
        const clean = code.match(/.{1,4}/g)?.join("-") || code;
        console.log(`\n🔢 Código de vinculación para ${config.pairingPhone}: ${clean}`);
        console.log("👉 En WhatsApp: Ajustes → Dispositivos vinculados → Vincular un dispositivo → Vincular con número de teléfono.\n");
      } catch (e) {
        console.error("❌ No se pudo generar el código de vinculación:", e.message);
      }
    }, 3000);
  }

  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log("\n📱 Escanea el QR con WhatsApp:\n");
      qrcode.generate(qr, { small: true });
    }
    if (connection === "open") {
      reconnecting = false;
      console.log(`🐰 ${config.botName} conectado.`);
    }
    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      console.warn(`⚠️ Conexión cerrada. StatusCode: ${code ?? "desconocido"}`, lastDisconnect?.error?.message ? `(${lastDisconnect.error.message})` : "");
      if (code === DisconnectReason.loggedOut) {
        console.log("🔐 Sesión cerrada. Elimina ./auth y vuelve a vincular.");
        return;
      }
      if (!reconnecting) {
        reconnecting = true;
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

  // 🤖 En privado Bunny puede conversar sin prefijo. En grupos responde al mencionarla.
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

  // XP por actividad.
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

  // Moderación automática.
  if (isGroup) {
    const g = db.getGroup(jid);
    const admin = await isAdmin(jid, sender);

    if (!admin && !text.startsWith(config.prefix)) {
      if (g.antilink && isUrl(text)) {
        try { await sock.sendMessage(jid, { delete: msg.key }); } catch {}
        await sock.sendMessage(jid, {
          text: `🚫 ${"@" + jidNumber(sender)}, los enlaces no están permitidos.`,
          mentions: [sender]
        });
        return;
      }

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

async function isAdmin(jid, user) {
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
