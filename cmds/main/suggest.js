import db from '#db';
import defaultAvatar from '../../lib/default-avatar.js';
export default {
  command: ['report', 'reporte', 'sug', 'suggest'],
  category: 'main',
  description: 'Enviar una sugerencia a los moderadores.',
  run: async ({ msg, sock, command, text }) => {
    const texto = text.trim();
    const now = Date.now();
    const esReporte = ['report', 'reporte'].includes(command);
    const cooldownHours = 12;
    const cooldownMs = cooldownHours * 60 * 60 * 1000;
    const userKey = esReporte ? 'reportCooldown' : 'sugCooldown';
    db.setCreate('users', msg.sender, userKey, 0);
    let user = db.getUser(msg.sender);
    const cooldown = user[userKey] || 0;
    const restante = cooldown - now;
    if (restante > 0) {
      return msg.reply(`ꕥ Espera *${msToTime(restante)}* para volver a ${esReporte ? 'reportar' : 'sugerir'}.`);
    }
    if (!texto) {
      return msg.reply(`《✧》 Debes *escribir* el ${esReporte ? '*reporte*' : '*sugerencia*'}.`);
    }
    if (texto.length < 10) {
      return msg.reply(`《✧》 Tu mensaje es *demasiado corto*. Explica mejor tu ${esReporte ? 'reporte' : 'sugerencia'} (mínimo 10 caracteres)`);
    }
    const fecha = new Date();
    const fechaLocal = fecha.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const tipo = esReporte ? '🆁ҽ𝕡σɾƚҽ' : '🆂մց𝕖ɾҽ𝚗cíᥲ';
    const tipo2 = esReporte ? 'ꕥ Reporte' : 'ꕥ Sugerencia';
    const name = user?.name || msg.pushName || 'Usuario desconocido';
    const numero = msg.sender.split('@')[0];
    const pp = await sock.profilePictureUrl(msg.sender, 'image').catch(() => defaultAvatar());
    const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
    const botSettings = db.getSettings(botId) || {};
    const isOficialBot = botId === ((global.sock?.user?.id?.split(':')[0] ?? null) && ((global.sock?.user?.id?.split(':')[0] ?? null) && (global.sock.user.id.split(':')[0] + '@s.whatsapp.net')));
    const botType = isOficialBot ? 'Principal/Owner' : 'Sub Bot';
    let reportMsg = `🫗۫᷒ᰰ⃘ׅ᷒  ۟　\`${tipo}\`　ׅ　ᩡ\n\n𖹭  ׄ  ְ ❖ *Nombre*\n> ${name}\n\n𖹭  ׄ  ְ ❖ *Número*\n> wa.me/${numero}\n\n𖹭  ׄ  ְ ❖ *Fecha*\n> ${fechaLocal}\n\n𖹭  ׄ  ְ ❖ *Socket*\n> ${botType}\n\n𖹭  ׄ  ְ ❖ *Mensaje*\n> ${texto}\n\n`;
    for (const num of global.owner) {
      try {
        await sock.sendMessage(`${num}@s.whatsapp.net`, { text: reportMsg });
      } catch {}
    }    
    db.setUser(msg.sender, userKey, now + cooldownMs);
    msg.reply(`《✧》 Gracias por tu *${esReporte ? 'reporte' : 'sugerencia'}*\n\n> Tu mensaje fue enviado correctamente a los moderadores`);
  },
};

const msToTime = (duration) => {
  const seconds = Math.floor((duration / 1000) % 60);
  const minutes = Math.floor((duration / (1000 * 60)) % 60);
  const hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
  const days = Math.floor(duration / (1000 * 60 * 60 * 24));
  const s = seconds.toString().padStart(2, '0');
  const m = minutes.toString().padStart(2, '0');
  const h = hours.toString().padStart(2, '0');
  const d = days.toString();
  const parts = [];
  if (days > 0) parts.push(`${d} día${d > 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${h} hora${h > 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${m} minuto${m > 1 ? 's' : ''}`);
  parts.push(`${s} segundo${s > 1 ? 's' : ''}`);
  return parts.join(', ');
};