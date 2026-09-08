const db = require("../database");
const { frase } = require("../frases");
const { mention, jidNumber, randomInt, pick, calculateLevel, msLeft, formatTime } = require("../utils");
const economy = require("../lib/economy");
const games = require("../lib/game");
const rpg = require("../lib/rpg");
const group = require("./group");

function getText(msg) {
  const m = msg.message;
  return (m?.conversation || m?.extendedTextMessage?.text || m?.imageMessage?.caption || m?.videoMessage?.caption || "").trim();
}
function getContext(msg) {
  return msg.message?.extendedTextMessage?.contextInfo || {};
}
function getTarget(msg, args) {
  const m = getContext(msg).mentionedJid || [];
  if (m.length) return m[0];
  if (getContext(msg).participant) return getContext(msg).participant;
  const n = args[0]?.replace(/\D/g, "");
  return n && n.length >= 8 ? n + "@s.whatsapp.net" : null;
}

const GROUP_COMMANDS = new Set([
  "kick","ban","mute","unmute","promote","demote","warn","unwarn","close","open","delete",
  "tagall","hidetag","admins","groupinfo","antilink","antiflood","antispam","antiparoles",
  "addword","delword","listwords","welcome","goodbye"
]);

async function execute(sock, msg, command, args, config) {
  const jid = msg.key.remoteJid;
  const sender = msg.key.participant || jid;
  const prefix = config.prefix;
  const reply = async (text, mentions = []) => sock.sendMessage(jid, { text, mentions });

  if (GROUP_COMMANDS.has(command)) {
    const result = await group.execute(sock, msg, command, args, prefix);
    if (result?.send) return reply(result.text, result.mentions || []);
    if (typeof result === "string") return reply(result);
    return;
  }

  if (command === "menu" || command === "help") {
    return reply(`🐰 *BUNNY BOT V2*

💜 GENERAL
${prefix}menu • ${prefix}ping • ${prefix}bot • ${prefix}owner • ${prefix}profile

👑 ADMIN
${prefix}kick @user • ${prefix}ban @user • ${prefix}warn @user
${prefix}promote @user • ${prefix}demote @user • ${prefix}close • ${prefix}open
${prefix}tagall • ${prefix}hidetag • ${prefix}admins • ${prefix}groupinfo
${prefix}antilink on/off • ${prefix}antiflood on/off
${prefix}antispam on/off • ${prefix}antiparoles on/off
${prefix}addword palabra • ${prefix}delword palabra • ${prefix}listwords
${prefix}welcome on/off • ${prefix}goodbye on/off

💰 ECONOMÍA
${prefix}balance • ${prefix}daily • ${prefix}weekly • ${prefix}work
${prefix}bank • ${prefix}deposit cantidad • ${prefix}withdraw cantidad
${prefix}pay @user cantidad • ${prefix}rob @user
${prefix}shop • ${prefix}buy id • ${prefix}inventory • ${prefix}leaderboard

⭐ XP
${prefix}level • ${prefix}rank

🎰 CASINO
${prefix}coinflip • ${prefix}dice • ${prefix}slots • ${prefix}roulette • ${prefix}blackjack

🎮 JUEGOS
${prefix}rps piedra/papel/tijera
${prefix}guess número • ${prefix}trivia

⚔️ RPG
${prefix}rpg • ${prefix}heal • ${prefix}duel @user

❤️ ANIME
${prefix}mai • ${prefix}sakuta • ${prefix}futaba • ${prefix}tomoe
${prefix}shoko • ${prefix}kaede • ${prefix}nodoka
${prefix}hug @user • ${prefix}kiss @user • ${prefix}pat @user
${prefix}love • ${prefix}slap @user • ${prefix}ship @user

👑 OWNER
${prefix}restart • ${prefix}broadcast texto`);
  }

  if (command === "ping") {
    const t = Date.now();
    await reply("🏓 Pong...");
    return reply(`⚡ ${Date.now() - t} ms`);
  }

  if (command === "bot" || command === "info") {
    return reply(`🐰 *${config.botName}*\n\n📦 V2.0.0\n🟢 Estado: Online\n⚡ Sistemas: Administración + Economía + RPG + Juegos + Anime`);
  }

  if (command === "owner") {
    return reply(`👑 Owner: ${config.owner ? "+" + config.owner : "No configurado"}`);
  }

  if (command === "profile" || command === "perfil") {
    const u = db.getUser(sender);
    const lvl = calculateLevel(u.xp);
    return reply(`╭─── 🐰 *BUNNY PROFILE* ───╮
│ 👤 ${mention(sender)}
│ 💰 ${u.coins} monedas
│ 🏦 ${u.bank} banco
│ ⭐ Nivel ${lvl.level}
│ ✨ XP ${lvl.current}/${lvl.required}
│ 🏆 Victorias ${u.stats.wins}
│ 💔 Derrotas ${u.stats.losses}
│ ❤️ Afinidad ${u.affinity}%
│ ⚠️ Warns ${u.warns}
╰────────────────────────╯`, [sender]);
  }

  if (command === "balance" || command === "bal") {
    const u = db.getUser(sender);
    return reply(`💰 ${mention(sender)} tiene *${u.coins}* monedas.\n🏦 Banco: *${u.bank}*`, [sender]);
  }

  if (command === "daily" || command === "weekly" || command === "work") {
    const fn = economy[command];
    const r = fn(sender);
    if (!r.ok) return reply(r.message);
    return reply(`${frase(command)}\n\n💰 +${r.amount} monedas`);
  }

  if (command === "bank") {
    const u = db.getUser(sender);
    return reply(`🏦 *BANCO*\n\n💰 Efectivo: ${u.coins}\n🏦 Banco: ${u.bank}\n💎 Total: ${u.coins + u.bank}`);
  }

  if (command === "deposit" || command === "withdraw") {
    const amount = Number(args[0]);
    if (!Number.isInteger(amount) || amount <= 0) return reply(`Uso: ${prefix}${command} cantidad`);
    const r = economy[command](sender, amount);
    return reply(r.ok ? `✅ Operación realizada.\n💰 Cantidad: ${amount}` : "❌ No tienes fondos suficientes o la cantidad es inválida.");
  }

  if (command === "pay") {
    const t = getTarget(msg, args);
    const amount = Number(args.find(x => /^\d+$/.test(x)));
    if (!t || !amount) return reply(`Uso: ${prefix}pay @usuario cantidad`);
    if (t === sender) return reply("🐰 No puedes pagarte a ti mismo.");
    const r = economy.transfer(sender, t, amount);
    return reply(r.ok ? `💸 ${mention(sender)} envió ${amount} monedas a ${mention(t)}.` : r.message, [sender, t]);
  }

  if (command === "rob") {
    const t = getTarget(msg, args);
    if (!t || t === sender) return reply(`Uso: ${prefix}rob @usuario`);
    const r = economy.rob(sender, t);
    if (!r.ok) return reply(r.message);
    if (r.success) return reply(`😈 Robo exitoso.\n💰 Ganaste ${r.amount} monedas.`, [t]);
    return reply(`🚨 Te descubrieron.\n💸 Perdiste ${r.amount} monedas.`);
  }

  if (command === "shop") {
    return reply(`🛒 *BUNNY SHOP*\n\n${economy.SHOP.map(x => `• *${x.id}* — ${x.name} — 💰${x.price}\n  ${x.desc}`).join("\n\n")}\n\nCompra: ${prefix}buy id`);
  }

  if (command === "buy") {
    const r = economy.buy(sender, args[0]?.toLowerCase());
    return reply(r.ok ? `🛍️ Compraste *${r.item.name}* por ${r.item.price} monedas.` : `❌ ${r.message}`);
  }

  if (command === "inventory" || command === "inv") {
    const u = db.getUser(sender);
    const counts = {};
    for (const x of u.inventory) counts[x] = (counts[x] || 0) + 1;
    const lines = Object.entries(counts).map(([k,v]) => `• ${k}: x${v}`);
    return reply(`🎒 *INVENTARIO*\n\n${lines.length ? lines.join("\n") : "Vacío."}`);
  }

  if (command === "leaderboard" || command === "top") {
    const rows = db.getAllUsers().sort((a,b) => (b[1].coins + b[1].bank) - (a[1].coins + a[1].bank)).slice(0, 10);
    return reply(`🏆 *TOP BUNNY USERS*\n\n${rows.map((r,i) => `${i+1}. ${mention(r[0])} — ${r[1].coins + r[1].bank} 💰`).join("\n")}`, rows.map(x => x[0]));
  }

  if (command === "level" || command === "rank") {
    const u = db.getUser(sender);
    const l = calculateLevel(u.xp);
    return reply(`⭐ *NIVEL*\n\n👤 ${mention(sender)}\n🏅 Nivel: ${l.level}\n✨ XP: ${l.current}/${l.required}\n📈 XP total: ${u.xp}`, [sender]);
  }

  if (command === "coinflip") return reply(`🪙 ${games.coinflip()}`);

  if (command === "dice") return reply(`🎲 Resultado: *${games.dice()}*`);

  if (command === "slots") {
    const r = games.slots();
    return reply(`🎰 [ ${r.result.join(" | ")} ]\n\n${r.jackpot ? "💎 JACKPOT" : r.pair ? "✨ Par conseguido" : "😏 Mejor suerte la próxima."}`);
  }

  if (command === "roulette") {
    const r = games.roulette();
    return reply(`🎰 Ruleta\n\n🎯 ${r.number}\n${r.color}`);
  }

  if (command === "blackjack") {
    const r = games.blackjack();
    return reply(`🃏 ${r.a} + ${r.b} = *${r.total}*\n\n${r.total === 21 ? "🎉 BLACKJACK" : r.total > 21 ? "💥 Te pasaste." : "🐰 Puedes pedir otra carta en una futura actualización."}`);
  }

  if (command === "rps") {
    const r = games.rps(args[0] || "");
    if (!r) return reply(`Uso: ${prefix}rps piedra/papel/tijera`);
    const result = r.result === "victoria" ? "🏆 Ganaste" : r.result === "derrota" ? "💔 Perdiste" : "🤝 Empate";
    return reply(`🎮 Tú: ${r.user}\n🐰 Bunny: ${r.bot}\n\n${result}`);
  }

  if (command === "guess") {
    const n = Number(args[0]);
    if (!Number.isInteger(n) || n < 1 || n > 10) return reply(`Uso: ${prefix}guess número (1-10)`);
    const answer = randomInt(1,10);
    return reply(n === answer ? `🎉 ¡Correcto! Era ${answer}.` : `😏 No era ese. Era ${answer}.`);
  }

  if (command === "trivia") {
    const q = pick(games.trivia);
    return reply(`🧠 *TRIVIA*\n\n${q.q}\n\nResponde con ${prefix}answer tu_respuesta`);
  }

  if (command === "rpg") {
    const s = rpg.stats(sender);
    return reply(`⚔️ *BUNNY RPG*\n\n❤️ HP: ${s.hp}/${s.maxHp}\n⚔️ Ataque: ${s.attack}\n🛡️ Defensa: ${s.defense}\n🗡️ Arma: ${s.weapon}`);
  }

  if (command === "heal") {
    rpg.heal(sender);
    return reply("🧪 HP restaurado al máximo.");
  }

  if (command === "duel") {
    const t = getTarget(msg, args);
    if (!t || t === sender) return reply(`Uso: ${prefix}duel @usuario`);
    const r = rpg.duel(sender, t);
    return reply(`⚔️ *DUELO*\n\n🏆 Ganador: ${mention(r.winner)}\n❤️ HP final: ${r.ahp}\n💙 HP rival: ${r.bhp}`, [sender,t]);
  }

  const chars = ["mai","sakuta","futaba","tomoe","shoko","kaede","nodoka"];
  if (chars.includes(command)) return reply(frase(command));

  if (["hug","kiss","pat","slap"].includes(command)) {
    const t = getTarget(msg,args);
    const m = t ? mention(t) : "tú";
    return reply(frase(command,m), t ? [t] : []);
  }

  if (command === "love") {
    const u = db.getUser(sender);
    const gain = randomInt(1,5);
    db.updateUser(sender, { affinity: Math.min(100, u.affinity + gain) });
    return reply(`${frase("love")}\n\n❤️ Afinidad Bunny: +${gain}%`);
  }

  if (command === "ship") {
    const t = getTarget(msg,args);
    if (!t) return reply(`Uso: ${prefix}ship @usuario`);
    return reply(`${frase("ship")}\n\n💘 Compatibilidad: *${randomInt(0,100)}%*`, [t]);
  }

  if (command === "restart" || command === "broadcast") {
    if (jidNumber(sender) !== config.owner) return reply("👑 Comando reservado para el owner.");
    if (command === "broadcast") {
      const msgText = args.join(" ").trim();
      if (!msgText) return reply(`Uso: ${prefix}broadcast texto`);
      const groups = await sock.groupFetchAllParticipating();
      let count = 0;
      for (const g of Object.keys(groups)) {
        await sock.sendMessage(g, { text: `📢 *BUNNY BOT*\n\n${msgText}` });
        count++;
      }
      return reply(`📢 Broadcast enviado a ${count} grupos.`);
    }
    await reply("🔄 Reiniciando Bunny Bot...");
    setTimeout(() => process.exit(0), 1000);
    return;
  }

  return reply(`🐰 No conozco ese comando. Usa ${prefix}menu.`);
}

module.exports = { execute, getText };
