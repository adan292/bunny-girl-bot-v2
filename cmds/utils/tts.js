// TTS (Texto a nota de voz) con voz femenina Dalia (Microsoft Edge, GRATIS, sin key).
// Uso: .tts <texto>
import { synthesize } from '#lib/edgeTTS';
import fs from 'fs';
import path from 'path';
import os from 'os';

export default {
  command: ['tts', 'voz', 'decirvoz', 'speak'],
  category: 'utils',
  description: 'Convierte texto a nota de voz con voz femenina en español.',
  run: async ({ msg, sock, args, usedPrefix }) => {
    if (!args[0]) {
      return msg.reply(`🎙️ *Texto a nota de voz*\n\nEscribe: *${usedPrefix}tts <texto>*\n\nEjemplo: *${usedPrefix}tts Hola, soy Bunny Girl*`);
    }

    const raw = args.join(' ').trim();
    if (!raw) return msg.reply('⚠️ Escribe el texto que quieres convertir en nota de voz.');

    await msg.react('🎙️');

    try {
      const mp3Buf = await synthesize(raw);
      if (!mp3Buf || mp3Buf.length < 500) throw new Error('Audio vacío');

      const tmp = path.join(os.tmpdir(), `ginko_tts_${Date.now()}.mp3`);
      fs.writeFileSync(tmp, mp3Buf);

      await sock.sendMessage(msg.chat, {
        audio: { url: tmp },
        mimetype: 'audio/mpeg',
        ptt: true
      }, { quoted: msg });

      fs.unlinkSync(tmp);
      await msg.react('✅');
    } catch (e) {
      await msg.reply(`❌ No pude generar el audio: ${e.message || e}`);
      await msg.react('❌');
    }
  }
};
