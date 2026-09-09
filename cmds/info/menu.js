import db from "#db"
import { getDevice, prepareWAMessageMedia } from 'baileys';
import fs from 'fs';
import fetch from 'node-fetch';
import axios from 'axios';
import moment from 'moment-timezone';
import { commands } from '../../lib/system/comandos.js';

export default {
  command: ['allmenu', 'help', 'menu'],
  category: 'info',
  run: async ({ msg, sock, args, command, text, usedPrefix: prefix }) => {
    try {

      const now = new Date();
      const colombianTime = new Date(
        now.toLocaleString('en-US', { timeZone: 'America/Bogota' })
      );
      const tiempo = colombianTime
        .toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
        .replace(/,/g, '');
      const tiempo2 = moment.tz('America/Bogota').format('hh:mm A');

      const botId = sock?.user?.id.split(':')[0] + '@s.whatsapp.net' || '';
      const botSettings = await db.getSettings(botId);
      const botname = botSettings.namebot || '';
      const botname2 = botSettings.namebot2 || '';
      const banner = botSettings.banner || '';
      const owner = botSettings.owner || '';
      const link = botSettings.link || '';

      const isOficialBot =
        botId === global?.sock ? global?.sock?.user?.id?.split(':')[0] + '@s.whatsapp.net' : ''
      const botType = isOficialBot
        ? 'Owner'
        : 'Sub Bot';

      const userr = await db.getUser();
      const users = Object.keys(userr).length || 0;

      const time = sock.uptime
        ? formatearMs(Date.now() - sock.uptime)
        : 'Desconocido';
      const device = getDevice(msg.key.id);

      const own = await db.getUser(owner);

      let menu = `> *Hola!* ${msg.pushName}, como esta tu dia?, mucho gusto mi nombre es *${botname2}*
   
: *DEVELOPER ::* ${
        owner
          ? !isNaN(owner.replace(/@s\.whatsapp\.net$/, ''))
            ? own.name
            : owner
          : 'Oculto por privacidad'
      }
: *TIPO ::* ${botType}
: *SISTEMA/OPER ::* ${device}

: *TIME ::* ${tiempo}, ${tiempo2}
: *USERS ::* ${users.toLocaleString()}
: *MI TIEMPO ::* ${time}
: *URL ::* ${link}

*COMANDOS*
`;

      const categoryArg = args[0]?.toLowerCase();
      const categories = {};

      for (const command of commands) {
        const category = command.category || 'otros';
        if (!categories[category]) categories[category] = [];
        categories[category].push(command);
      }

      if (categoryArg && !categories[categoryArg]) {
        return msg.reply(
          `La categoria *${categoryArg}* no fue encontrada.`
        );
      }

      for (const [category, cmds] of Object.entries(categories)) {
        if (categoryArg && category.toLowerCase() !== categoryArg) continue;
        const catName = category.charAt(0).toUpperCase() + category.slice(1);
        menu += `\n*${catName}*\n`;
        
        cmds.forEach((cmd) => {
          try {
            const cmdAliases = Array.isArray(cmd.alias) 
              ? cmd.alias 
              : (cmd.alias ? [cmd.alias] : (cmd.command ? cmd.command : []));
            
            const aliases = cmdAliases
              .map((a) => {
                let aliasClean = String(a).toLowerCase();
                const match = aliasClean.match(/[a-z0-9_-]+$/);
                aliasClean = match ? match[0] : aliasClean;
                return prefix + aliasClean;
              })
              .join(' > ');
            
            menu += `• ${aliases}`;
            if (cmd.uso) menu += ` + ${cmd.uso}`;
            menu += `\n`;
            if (cmd.desc) menu += `  └─ ${cmd.desc}\n`;
          } catch (er) {
            console.error('Error procesando comando:', cmd, er);
          }
        });
      }

      menu += `\n> *${botname2} desarrollado por Diego*`;

      const isVideo = banner.includes('.mp4') || banner.includes('.gif') || banner.includes('.webm');
      const contextBase = {
        mentionedJid: null,
        isForwarded: false
      };

      if (isVideo) {
        await sock.sendMessage(
          msg.chat,
          { video: { url: banner }, caption: menu.trim(), contextInfo: contextBase },
          { quoted: msg }
        );
      } else {
        let linkPreviewData = undefined;
        if (link && banner) {
          try {
            const mediaData = await prepareWAMessageMedia({ image: { url: banner } }, { upload: sock.waUploadToServer, mediaTypeOverride: 'thumbnail-link' });
            const { imageMessage } = mediaData;
            linkPreviewData = {
              'canonical-url': link,
              'matched-text': link,
              title: botname,
              description: `${botname2}, Built With Love By Stellar`,
              jpegThumbnail: imageMessage?.jpegThumbnail ? Buffer.from(imageMessage.jpegThumbnail) : undefined,
              highQualityThumbnail: imageMessage || undefined
            };
          } catch (bannerError) {
            console.warn('Advertencia: No se pudo cargar banner:', bannerError.message);
            linkPreviewData = undefined;
          }
        }
        await sock.sendMessage(msg.chat, { 
          text: menu.trim(), 
          linkPreview: linkPreviewData, 
          contextInfo: contextBase
        }, { quoted: msg });
      }
    } catch (e) {
      console.error('Error en comando menu:', e);
      await msg.reply('Error al generar el menu. Intenta de nuevo mas tarde.');
    }
  },
};

function formatearMs(ms) {
  const segundos = Math.floor(ms / 1000);
  const minutos = Math.floor(segundos / 60);
  const horas = Math.floor(minutos / 60);
  const dias = Math.floor(horas / 24);
  return [dias && `${dias}d`, `${horas % 24}h`, `${minutos % 60}m`, `${segundos % 60}s`]
    .filter(Boolean)
    .join(' ');
}