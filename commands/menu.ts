import axios from 'axios';
import { prepareWAMessageMedia, generateWAMessageFromContent } from '@whiskeysockets/baileys';
import { config } from '../config';
import { formatNumber } from '../utils/jid';
import type { CommandDefinition } from './types';

const BORDER = '┈┈┈┈┈┈┈┈୨♡୧┈┈┈┈┈┈┈┈';
const DIVIDER = '   ₊˚⊹ ୨୧ ⊹˚₊';
const BANNER_URL = 'https://cdn.dix.lat/me/l11jgl-c91x-z7oqze-24cf1a.jpg';
const LINK_PREVIEW_URL = 'https://mancosyasociados.kesug.com';
const CACHE_MS = 60 * 60 * 1000;

let bannerBuffer: Buffer | null = null;
let bannerBufferTime = 0;
let bannerMedia: any = null;
let bannerMediaTime = 0;

async function getBannerBuffer(): Promise<Buffer> {
  if (bannerBuffer && Date.now() - bannerBufferTime < CACHE_MS) return bannerBuffer;
  const res = await axios({ method: 'get', url: BANNER_URL, responseType: 'arraybuffer' });
  bannerBuffer = Buffer.from(res.data);
  bannerBufferTime = Date.now();
  return bannerBuffer;
}

async function getBannerMedia(sock: any): Promise<any> {
  if (bannerMedia && Date.now() - bannerMediaTime < CACHE_MS) return bannerMedia;
  const buffer = await getBannerBuffer();
  const prepared = await prepareWAMessageMedia(
    { image: buffer },
    { upload: sock.waUploadToServer, mediaTypeOverride: 'thumbnail-link' },
  );
  bannerMedia = prepared.imageMessage;
  bannerMediaTime = Date.now();
  return bannerMedia;
}

function getTs(ts: unknown): number {
  if (typeof ts === 'object' && ts !== null && 'low' in ts) {
    return Number((ts as { low: unknown }).low);
  }
  return Number(ts);
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Buenos días';
  if (hour >= 12 && hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

const menu: CommandDefinition = {
  name: 'menu',
  description: 'Muestra este menú de comandos',
  handler: async ({ sock, chatJid, msg, bot, isOwner, commands, senderJid }) => {
    try {
      const senderNum = formatNumber(senderJid);
      const greeting = getGreeting();

      const lines = [...new Set(commands.values())]
        .filter((def) => !def.ownerOnly || isOwner)
        .map((def) => `   ✧ ${config.prefix}${def.name} — ${def.description}`);

      const text = [
        BORDER,
        '',
        `¡Hola @${senderNum}! ${greeting} (⁠◕⁠ᴗ⁠◕⁠✿)`,
        `Soy ${bot.name}, ¡este es mi menú!`,
        '',
        DIVIDER,
        '',
        ...lines,
        '',
        `🔗 ${LINK_PREVIEW_URL}`,
        '',
        BORDER,
      ].join('\n');

      const imgBanner = await getBannerMedia(sock);

      const content = {
        extendedTextMessage: {
          endCardTiles: [],
          text,
          matchedText: LINK_PREVIEW_URL,
          canonicalUrl: LINK_PREVIEW_URL,
          title: bot.name.toUpperCase(),
          description: `Menú de comandos | ${bot.name}`,
          previewType: 0,
          jpegThumbnail: imgBanner.jpegThumbnail,
          thumbnailDirectPath: imgBanner.directPath,
          thumbnailSha256: imgBanner.fileSha256,
          thumbnailEncSha256: imgBanner.fileEncSha256,
          mediaKey: imgBanner.mediaKey,
          mediaKeyTimestamp: getTs(imgBanner.mediaKeyTimestamp),
          thumbnailHeight: imgBanner.height || 1080,
          thumbnailWidth: imgBanner.width || 1920,
          inviteLinkGroupTypeV2: 0,
          contextInfo: {
            mentionedJid: [senderJid].filter(Boolean),
          },
        },
      };

      const waMsg = generateWAMessageFromContent(chatJid, content as any, {
        userJid: sock.user?.id,
        quoted: msg,
      });
      await sock.relayMessage(chatJid, waMsg.message!, { messageId: waMsg.key.id! });
    } catch (error) {
      console.error('Error crítico en el comando menu:', error);
    }
  },
};

export default menu;
