import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import moment from 'moment-timezone';
import { bodyMenu, menuObject } from '#system/commands';
import db from '#db';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_BANNER = path.resolve(__dirname, '..', '..', 'media', 'menu.jpg');

function normalize(text = '') {
  text = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  return text.endsWith('s') ? text.slice(0, -1) : text;
}

function formatearMs(ms) {
  const segundos = Math.floor(ms / 1000);
  const minutos = Math.floor(segundos / 60);
  const horas = Math.floor(minutos / 60);
  const dias = Math.floor(horas / 24);
  return [dias && `${dias}d`, `${horas % 24}h`, `${minutos % 60}m`, `${segundos % 60}s`].filter(Boolean).join(' ');
}

export default {
  command: ['allmenu', 'help', 'menu', 'ayuda'],
  category: 'main',
  description: 'Ver el menú de comandos.',
  run: async ({ msg, sock, args, usedPrefix }) => {
    try {
      const now = new Date();
      const nowMx = new Date(now.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
      const tiempo = nowMx.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/,/g, '');
      const tempo = moment.tz('America/Mexico_City').format('hh:mm A');

      const botId = sock?.user?.id.split(':')[0] + '@s.whatsapp.net';
      const botSettings = db.getSettings(botId) || {};
      const botname = botSettings.botname || global.botname || 'Bunny Girl';
      const namebot = botSettings.namebot || botname;
      const owner = botSettings.owner || (global.owner && global.owner[0] ? global.owner[0] + '@s.whatsapp.net' : '');
      const prefix = botSettings.prefix || usedPrefix;

      // Banner local (Bocchi)
      let banner = botSettings.banner || '';
      if ((!banner || banner.includes('yuki-wabot')) && fs.existsSync(LOCAL_BANNER)) {
        banner = LOCAL_BANNER;
      }

      const instagram = (global.links && global.links.instagram) || '';

      // El "botón de canal" (reenviado desde newsletter) aparece si el JID
      // ya fue resuelto (al conectar el bot llama a resolveChannel que hace
      // newsletterMetadata(invite, code)). Si no está resuelto aún, intentamos
      // resolverlo en background pero NO lo usamos para no romper el envío.
      const { resolveChannel, getChannelInfo } = await import('#lib/channel');
      resolveChannel(sock, db).catch(()=>{});
      const chInfo = getChannelInfo();
      let canalId = chInfo.id || botSettings.newsletter_id || '';
      let canalName = (chInfo.resolved ? chInfo.name : '') || botSettings.nameid || '';
      // Si el JID en la DB es el de yuki (viejo) lo ignoramos
      if (canalId && canalId.includes('120363401404146384')) { canalId = ''; canalName = ''; }
      if (canalName && /yuki|ყµҡเ/i.test(canalName)) { canalName = ''; canalId = ''; }

      const isOficialBot = global.sock?.user?.id && botId === (global.sock.user.id.split(':')[0] + '@s.whatsapp.net');
      const botType = isOficialBot ? 'Principal/Owner' : 'Sub Bot';
      const users = db.getUser();
      const usersCount = users?.length || 0;
      const { getDevice } = await import('baileys');
      const device = getDevice(msg.key.id);
      const userGlobal = db.getUser(msg.sender);
      const sender = userGlobal?.name || msg.pushName || 'Usuario';
      const time = sock.uptime ? formatearMs(Date.now() - sock.uptime) : 'Desconocido';

      const alias = {
        anime: ['anime', 'reacciones'],
        downloads: ['downloads', 'descargas'],
        economia: ['economia', 'economy', 'eco'],
        fun: ['fun', 'diversion', 'entretenimiento', 'juegos'],
        gacha: ['gacha', 'rpg'],
        grupo: ['grupo', 'group'],
        nsfw: ['nsfw', '+18'],
        profile: ['profile', 'perfil'],
        sockets: ['sockets', 'bots'],
        stickers: ['stickers', 'sticker'],
        utils: ['utils', 'utilidades', 'herramientas']
      };
      const input = normalize(args[0] || '');
      const cat = Object.keys(alias).find(k => alias[k].map(normalize).includes(input));
      const category = `${cat ? ` para \`${cat}\`` : '. *(˶ᵔ ᵕ ᵔ˶)*'}`;
      if (args[0] && !cat) {
        return msg.reply(`《✧》La categoria *${args[0]}* no existe, las categorias disponibles son: *${Object.keys(alias).join(', ')}*.\n> Para ver la lista completa escribe *${usedPrefix}menu*\n> Para ver los comandos de una categoría escribe *${usedPrefix}menu [categoría]*\n> Ejemplo: *${usedPrefix}menu anime*`);
      }

      const sections = menuObject;
      const content = cat ? String(sections[cat] || '') : Object.values(sections).map(s => String(s || '')).join('\n\n');
      let menu = bodyMenu ? String(bodyMenu || '') + '\n\n' + content : content;

      const replacements = {
        $owner: owner ? (isNaN(owner.replace(/@s\.whatsapp\.net$/, '')) ? owner : ((db.getUser(owner))?.name || owner.split('@')[0])) : 'Oculto por privacidad',
        $botType: botType,
        $device: device,
        $tiempo: tiempo,
        $tempo: tempo,
        $users: usersCount.toLocaleString(),
        $instagram: instagram,
        $cat: category,
        $sender: sender,
        $botname: botname,
        $namebot: namebot,
        $prefix: usedPrefix,
        $uptime: time
      };
      for (const [key, value] of Object.entries(replacements)) {
        menu = menu.replace(new RegExp(`\\${key}`, 'g'), value);
      }

      const mentioned = [owner, msg.sender].filter(Boolean);

      // ContextInfo seguro:
      // - El botón "Ver canal" (forwarded newsletter) SOLO se envía en GRUPOS.
      //   En chats privados (DM/@s.whatsapp.net) WhatsApp a veces no logra descifrar
      //   el reenvío del canal y muestra "Esperando mensaje. Esto puede tomar tiempo".
      const isGroup = msg.chat.endsWith('@g.us');
      const contextInfo = { mentionedJid: mentioned };
      if (isGroup && canalId && canalName) {
        contextInfo.isForwarded = true;
        contextInfo.forwardedNewsletterMessageInfo = {
          newsletterJid: canalId,
          serverMessageId: 0,
          newsletterName: canalName
        };
      }

      if (banner && fs.existsSync(banner)) {
        const isVideo = /\.(mp4|webm)(\?|$)/i.test(banner);
        // Leer a Buffer para que Baileys no tenga que resolver rutas locales
        // en un flujo que a veces WhatsApp interpreta como "cargando" en DMs.
        const mediaBuffer = fs.readFileSync(banner);
        const media = isVideo
          ? { video: mediaBuffer, gifPlayback: true, caption: menu.trim(), contextInfo }
          : { image: mediaBuffer, caption: menu.trim(), contextInfo };
        await sock.sendMessage(msg.chat, media, { quoted: msg });
      } else {
        await sock.sendMessage(msg.chat, { text: menu.trim(), contextInfo }, { quoted: msg });
      }
    } catch (e) {
      console.error('[MENU ERROR]', e);
      await msg.reply(`> Ocurrió un error al mostrar el menú.\n> [Error: *${e.message}*]`);
    }
  }
};
