import db from '#db';
export default {
  command: ['daily', 'diario', 'recompensa', 'gratis'],
  category: 'economy',
  description: 'Reclamar tu recompensa diaria.',
  run: async ({ msg, sock, usedPrefix }) => {
    const chat = db.getChat(msg.chat);
    if (chat.adminonly || !chat.economy) {
      return msg.reply(`ꕥ Los comandos de *Economía* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con el comando:\n» *${usedPrefix}economy on*`);
    }
    const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
    const bot = db.getSettings(botId);
    const monedas = bot.currency;
    db.setCreate('users', msg.sender, 'streak', 0);
    db.setCreate('users', msg.sender, 'lastDailyGlobal', 0);
    db.setCreate('chat_users', [msg.chat, msg.sender], 'lastdaily', 0);
    db.setCreate('chat_users', [msg.chat, msg.sender], 'inventory', {});
    db.setCreate('chat_users', [msg.chat, msg.sender], 'tools', {});
    db.setCreate('chat_users', [msg.chat, msg.sender], 'weapons', {});

    const users = db.getUser(msg.sender);
    const user = db.getChatUser(msg.chat, msg.sender);
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const maxStreak = 200;

    // Parsear estructuras JSON (por si vienen como string)
    const parse = (v, fb) => { try { return typeof v === 'string' ? JSON.parse(v) : (v || fb); } catch { return fb; } };
    user.inventory = parse(user.inventory, {});
    user.tools = parse(user.tools, {});
    user.weapons = parse(user.weapons, {});
    // Asegurar campos numéricos
    user.coins = user.coins || 0;
    user.health = typeof user.health === 'number' ? user.health : 100;
    user.stamina = typeof user.stamina === 'number' ? user.stamina : 100;
    user.magic = typeof user.magic === 'number' ? user.magic : 100;

    if (now < user.lastdaily) {
      const restante = formatRemainingTime(user.lastdaily - now);
      return msg.reply(`ꕥ Ya has reclamado hoy.\n> Vuelve en *${restante}*`);
    }

    let currentStreak = users.streak || 0;
    const lost = currentStreak >= 1 && now - users.lastDailyGlobal > oneDay * 1.5;
    if (lost) {
      currentStreak = 0;
      db.setUser(msg.sender, 'streak', 0);
    }
    const canClaimGlobal = now - users.lastDailyGlobal >= oneDay;
    if (canClaimGlobal) {
      currentStreak = Math.min(currentStreak + 1, maxStreak);
      db.setUser(msg.sender, 'streak', currentStreak);
      db.setUser(msg.sender, 'lastDailyGlobal', now);
    }

    const recompensa = Math.min(20000 + (currentStreak - 1) * 5000, 1015000);
    user.coins += recompensa;
    db.setChatUser(msg.chat, msg.sender, 'coins', user.coins);
    db.setChatUser(msg.chat, msg.sender, 'lastdaily', now + oneDay);

    // ── Starter pack (solo la PRIMERA vez que reclaman) ──
    let extraTxt = '';
    const esPrimeraVez = !user.tools?.pico;
    if (esPrimeraVez) {
      // Regalo de bienvenida: 15,000 extra + pico + 2 pociones + full stamina/salud
      const bonusInicial = 15000;
      user.coins += bonusInicial;
      user.tools.pico = { durability: 100, maxDurability: 100 };
      user.inventory.pocion = (user.inventory.pocion || 0) + 2;
      user.health = 100;
      user.stamina = 100;
      user.magic = 100;
      db.setChatUser(msg.chat, msg.sender, 'coins', user.coins);
      db.setChatUser(msg.chat, msg.sender, 'tools', user.tools);
      db.setChatUser(msg.chat, msg.sender, 'inventory', user.inventory);
      db.setChatUser(msg.chat, msg.sender, 'health', 100);
      db.setChatUser(msg.chat, msg.sender, 'stamina', 100);
      db.setChatUser(msg.chat, msg.sender, 'magic', 100);
      extraTxt = `\n\n🎁 *¡Paquete de bienvenida!*\n` +
        `▪ +${bonusInicial.toLocaleString()} ${monedas} extra\n` +
        `▪ ⛏️ *Pico* (100/100 durabilidad)\n` +
        `▪ 🧪 *2 Pociones*\n` +
        `▪ ❤️ Salud, ⚡ Stamina y ✨ Magia al 100%\n` +
        `Ya puedes usar *.minar* para empezar!`;
    }

    const siguiente = Math.min(20000 + currentStreak * 5000, 1015000).toLocaleString();
    let caption = `Día *${currentStreak + 1}* » *+¥${siguiente}*`;
    if (lost) caption += `\n> ☆ ¡Perdiste tu racha de días!`;

    await msg.reply(
      `「✿」Has reclamado *¥${recompensa.toLocaleString()} ${monedas}*! (Día *${currentStreak}*)\n${caption}${extraTxt}`
    );
  }
};

function formatRemainingTime(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  const partes = [];
  if (h) partes.push(`${h} ${h === 1 ? 'hora' : 'horas'}`);
  if (m) partes.push(`${m} ${m === 1 ? 'minuto' : 'minutos'}`);
  if (seg || partes.length === 0) partes.push(`${seg} ${seg === 1 ? 'segundo' : 'segundos'}`);
  return partes.join(' ');
}
