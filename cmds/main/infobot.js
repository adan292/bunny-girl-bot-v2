import os from 'os';
import db from '#db';

export default {
  command: ['infobot', 'botinfo'],
  category: 'main',
  description: 'Obtener información del bot.',
  run: async ({ msg, sock, usedPrefix, command }) => {
    const botId = sock.user.id.split(':')[0] + "@s.whatsapp.net";
    const botSettings = db.getSettings(botId) || {};
    const botname = botSettings.botname || 'Bot';
    const namebot = botSettings.namebot || 'Bot';
    const monedas = botSettings.currency || 'Yenes';
    const prefijo = botSettings.prefix;
    const owner = botSettings.owner || '';
    const isOficialBot = global.sock?.user?.id && botId === (global.sock.user.id.split(':')[0] + '@s.whatsapp.net');
    const botType = isOficialBot ? 'Principal/Owner' : 'Sub Bot';

    let desar = 'Oculto';
    if (owner && !isNaN(owner.replace(/@s\.whatsapp\.net$/, ''))) {
      const userData = db.getUser(owner);
      desar = userData?.genre || 'Oculto';
    }

    const platform = os.type();
    const now = new Date();
    const colombianTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
    const nodeVersion = process.version;
    const sistemaUptime = rTime(os.uptime());
    const uptime = process.uptime();
    const uptimeDate = new Date(colombianTime.getTime() - uptime * 1000);
    const formattedUptimeDate = uptimeDate.toLocaleString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(/^./, m => m.toUpperCase());
      const instagram = (global.links && global.links.instagram) || '';

    // Resolver JID del canal en background
    const { resolveChannel, getChannelInfo } = await import('#lib/channel');
    resolveChannel(sock, db).catch(()=>{});
    const chInfo = getChannelInfo();
    let dbCanalId = chInfo.id || botSettings.newsletter_id || '';
    let dbCanalName = (chInfo.resolved ? chInfo.name : '') || botSettings.nameid || '';
    if (dbCanalId && dbCanalId.includes('120363401404146384')) { dbCanalId = ''; dbCanalName = ''; }
    if (dbCanalName && /yuki|ყµҡเ/i.test(dbCanalName)) { dbCanalId = ''; dbCanalName = ''; }

    try {
      const lines = [`✐ Información del bot *${botname}!*`, '',
        `✿ *Nombre Corto ›* ${namebot}`,
        `✿ *Nombre Largo ›* ${botname}`,
        `✦ *Moneda ›* ${monedas}`,
        `✦ *Prefijo${Array.isArray(prefijo) && prefijo.length > 1 ? 's' : ''} ›* ${prefijo === 1 ? '\`sin prefijos\`' : (Array.isArray(prefijo) ? prefijo : [prefijo || '/']).map(p => `\`${p}\``).join(', ')}`, '',
        `❒ *Tipo ›* ${botType}`,
        `❒ *Plataforma ›* ${platform}`,
        `❒ *NodeJS ›* ${nodeVersion}`,
        `❒ *Activo desde ›* ${formattedUptimeDate}`,
        `❒ *Sistema Activo ›* ${sistemaUptime}`,
        `❒ *${desar === 'Hombre' ? 'Dueño' : desar === 'Mujer' ? 'Dueña' : 'Dueño(a)'} ›* ${owner ? (!isNaN(owner.replace(/@s\.whatsapp\.net$/, '')) ? `@${owner.split('@')[0]}` : owner) : "Oculto por privacidad"}`
      ];
      if (instagram) lines.push('', `> \`Instagram:\` ${instagram}`);
      const message = lines.join('\n').trim();

      const contextInfo = (dbCanalId && dbCanalName) ? {
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: dbCanalId,
          serverMessageId: 0,
          newsletterName: dbCanalName
        }
      } : {};
      await sock.sendMessage(msg.chat, { text: message, contextInfo }, { quoted: msg });
    } catch (e) {
      return msg.reply(`> Ocurrió un error con *${usedPrefix + command}*.\n> [Error: *${e.message}*]`);
    }
  }
};

function rTime(seconds) {
  seconds = Number(seconds);
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const dDisplay = d > 0 ? d + (d === 1 ? ' día, ' : ' días, ') : '';
  const hDisplay = h > 0 ? h + (h === 1 ? ' hora, ' : ' horas, ') : '';
  const mDisplay = m > 0 ? m + (m === 1 ? ' minuto, ' : ' minutos, ') : '';
  const sDisplay = s > 0 ? s + (s === 1 ? ' segundo' : ' segundos') : '';
  return dDisplay + hDisplay + mDisplay + sDisplay;
}
