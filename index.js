const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");
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

const app = express();
app.get("/", (_, res) => res.send("🐰 Bunny Bot V2 online."));
app.get("/health", (_, res) => res.json({ ok: true, version: config.version }));
app.listen(config.port, () => console.log(`🌐 Health server en ${config.port}`));

let reconnecting = false;
let sock;

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth");
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: "silent" }),
    browser: [config.botName, "Chrome", config.version],
    markOnlineOnConnect: false
  });

  sock.ev.on("creds.update", saveCreds);

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
