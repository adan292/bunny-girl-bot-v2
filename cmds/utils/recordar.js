/**
 * .recordar <minutos>|<mensaje>  →  programa un recordatorio en el mismo chat.
 *
 * Los temporizadores se guardan en memoria global para que no se pierdan
 * al recargar el plugin (pero se perderán si se reinicia el bot).
 */
if (!global.ginkoRecordatorios) global.ginkoRecordatorios = [];

export default {
  command: ['recordar', 'recordatorio', 'reminder', 'alarma'],
  category: 'utils',
  description: 'Programar un recordatorio en X minutos.',
  run: async ({ msg, sock, usedPrefix, command, text }) => {
    if (!text) {
      return msg.reply(
        `《✧》 Programa un recordatorio.\n`
        + `> Formato: ${usedPrefix}recordar <minutos>|<mensaje>\n`
        + `> Ejemplo: ${usedPrefix}recordar 5|tomar agua`
      );
    }
    const sep = text.indexOf('|');
    if (sep === -1) {
      return msg.reply(`《✧》 Separa los minutos del mensaje con | (pleca).\n> Ej: ${usedPrefix}recordar 5|tomar agua`);
    }
    const minsRaw = text.slice(0, sep).trim();
    const mensaje = text.slice(sep + 1).trim();
    const mins = parseInt(minsRaw, 10);
    if (!Number.isFinite(mins) || mins < 1) {
      return msg.reply(`《✧》 Los minutos deben ser un *número mayor a 0*.`);
    }
    if (!mensaje) {
      return msg.reply(`《✧》 Falta el mensaje del recordatorio.`);
    }
    const jid = msg.chat;
    const delay = Math.min(mins, 60 * 24) * 60000; // limitar a 24h
    const timer = setTimeout(async () => {
      try {
        await sock.sendMessage(jid, {
          text: `⏰ *Recordatorio*\n\n» ${mensaje}\n\n_(programado hace ${mins} min)_`,
        });
      } catch (_) {}
      global.ginkoRecordatorios = global.ginkoRecordatorios.filter(r => r.timer !== timer);
    }, delay);
    global.ginkoRecordatorios.push({ timer, jid, msg: mensaje, mins });
    msg.reply(`✅ *Recordatorio programado* para dentro de *${mins} min*.\n\n📝 » ${mensaje}`);
  },
};
