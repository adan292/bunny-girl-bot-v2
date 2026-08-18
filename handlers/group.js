const db = require("../database");
const { jidNumber, mention, isUrl } = require("../utils");
const { frase } = require("../frases");

function text(msg) {
  const m = msg.message;
  return (m?.conversation || m?.extendedTextMessage?.text || m?.imageMessage?.caption || m?.videoMessage?.caption || "").trim();
}

function context(msg) {
  return msg.message?.extendedTextMessage?.contextInfo || {};
}

function mentioned(msg) {
  return context(msg).mentionedJid || [];
}

function target(msg, args) {
  const m = mentioned(msg);
  if (m.length) return m[0];
  if (context(msg).participant) return context(msg).participant;
  const n = args[0]?.replace(/\D/g, "");
  return n && n.length >= 8 ? `${n}@s.whatsapp.net` : null;
}

async function metadata(sock, jid) {
  return sock.groupMetadata(jid);
}

async function isAdmin(sock, jid, user) {
  const meta = await metadata(sock, jid);
  const p = meta.participants.find(x => x.id === user);
  return !!p?.admin;
}

async function botAdmin(sock, jid) {
  return isAdmin(sock, jid, sock.user.id);
}

// Función principal para manejar los comandos de grupo
async function execute(sock, msg, command, args, config) {
  const jid = msg.key.remoteJid;
  if (!jid || !jid.endsWith("@g.us")) return "👥 Este comando solo funciona en grupos.";

  const sender = msg.key.participant || jid;
  const prefix = config.prefix;

  if (!(await isAdmin(sock, jid, sender))) return "👑 Necesitas ser administrador.";
  
  const group = db.getGroup(jid);

  if (command === "tagall" || command === "hidetag") {
    const meta = await metadata(sock, jid);
    const members = meta.participants.map(p => p.id);
    const textMsg = args.join(" ") || "🐰 ¡Atención, grupo!";
    return { send: true, text: textMsg, mentions: members };
  }

  if (command === "admins") {
    const meta = await metadata(sock, jid);
    const admins = meta.participants.filter(p => p.admin);
    return `👑 *ADMINISTRADORES*\n\n${admins.map(p => "• " + mention(p.id)).join("\n")}`;
  }

  if (command === "groupinfo") {
    const meta = await metadata(sock, jid);
    return `👥 *${meta.subject}*\n\n📝 ${meta.desc || "Sin descripción"}\n👤 Miembros: ${meta.participants.length}\n👑 Admins: ${meta.participants.filter(p => p.admin).length}`;
  }

  if (command === "antilink" || command === "antiflood" || command === "antispam" || command === "antiparoles") {
    const v = args[0]?.toLowerCase();
    if (!["on","off"].includes(v)) return `Uso: ${prefix}${command} on/off`;
    const key = command === "antiparoles" ? "antiparoles" : command;
    db.updateGroup(jid, { [key]: v === "on" });
    return `🛡️ ${command}: *${v.toUpperCase()}*`;
  }

  if (command === "addword") {
    const word = args.join(" ").trim().toLowerCase();
    if (!word) return `Uso: ${prefix}addword palabra`;
    const words = [...new Set([...group.blockedWords, word])];
    db.updateGroup(jid, { blockedWords: words, antiparoles: true });
    return `🚫 Palabra agregada: *${word}*`;
  }

  if (command === "delword") {
    const word = args.join(" ").trim().toLowerCase();
    const words = group.blockedWords.filter(x => x !== word);
    db.updateGroup(jid, { blockedWords: words });
    return `✅ Palabra registrada: *${word}*`;
  }

  if (command === "listwords") {
    return `🚫 *PALABRAS BLOQUEADAS*\n\n${group.blockedWords.length ? group.blockedWords.map(x => "• " + x).join("\n") : "Ninguna"}`;
  }

  if (command === "welcome" || command === "goodbye") {
    const v = args[0]?.toLowerCase();
    if (!["on","off"].includes(v)) return `Uso: ${prefix}${command} on/off`;
    db.updateGroup(jid, { [command]: v === "on" });
    return `👋 ${command}: *${v.toUpperCase()}*`;
  }

  if (!(await botAdmin(sock, jid))) return "👑 Necesito ser administrador para realizar esa acción.";

  if (command === "close" || command === "open") {
    await sock.groupSettingUpdate(jid, command === "close" ? "announcement" : "not_announcement");
    return frase(command);
  }

  if (command === "delete") {
    const c = context(msg);
    if (!c.stanzaId || !c.participant) return `🐰 Responde a un mensaje con ${prefix}delete.`;
    try {
      await sock.sendMessage(jid, {
        delete: { remoteJid: jid, fromMe: false, id: c.stanzaId, participant: c.participant }
      });
      return "🗑️ Mensaje eliminado.";
    } catch {
      return "⚠️ No pude eliminar el mensaje.";
    }
  }

  const t = target(msg, args);
  if (!t) return `🐰 Menciona o responde al usuario.\nEjemplo: ${prefix}${command} @usuario`;

  if (command === "kick" || command === "ban") {
    await sock.groupParticipantsUpdate(jid, [t], "remove");
    return { send: true, text: frase(command, mention(t)), mentions: [t] };
  }

  if (command === "promote" || command === "demote") {
    await sock.groupParticipantsUpdate(jid, [t], command);
    return { send: true, text: frase(command, mention(t)), mentions: [t] };
  }

  if (command === "mute" || command === "unmute") {
    return { send: true, text: `🤫 ${mention(t)}\n\nWhatsApp no permite silenciar individualmente a un miembro mediante la API estándar. Usa ${prefix}close para restringir el grupo completo.`, mentions: [t] };
  }
}

// Detector Antilink automático
async function checkAntiLink(sock, msg) {
  try {
    const from = msg.key.remoteJid;
    if (!from || !from.endsWith("@g.us")) return;  

    if (!global.antilink?.[from]) return;  

    const textMsg = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";  
    const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|chat\.whatsapp\.com\/[^\s]+)/i;  

    if (!linkRegex.test(textMsg)) return;  

    const sender = msg.key.participant || msg.participant;  
    if (!sender) return;  

    const groupMetadata = await sock.groupMetadata(from);  
    const participant = groupMetadata.participants.find(p => p.id === sender);  

    if (participant?.admin === "admin" || participant?.admin === "superadmin") {  
      return;  
    }  

    try {  
      await sock.sendMessage(from, { delete: msg.key });  
    } catch (e) {  
      console.log("No se pudo eliminar el enlace:", e);  
    }  

    await sock.sendMessage(from, {  
      text: `🔗⚠️ *ANTILINK*\n\n@${sender.split("@")[0]}, los enlaces no están permitidos en este grupo.\n\n🗑️ Mensaje eliminado.`,
      mentions: [sender]
    });
  } catch (error) {  
    console.error("Error AntiLink:", error);  
  }
}

module.exports = {
  execute,
  checkAntiLink,
  getText: text
};
  
