/**
 * .carbon  (citando un mensaje con código o con texto) → imagen bonita de código (estilo carbon.now.sh).
 * Usa carbonara.solopov.dev, API gratuita sin key.
 */
const TEMAS = {
  verde: '#1F816D',
  negro: '#0f172a',
  azul: '#253b7d',
  morado: '#7c3aed',
  rojo: '#b91c1c',
  rosa: '#db2777',
  naranja: '#ea580c',
  gris: '#2d3748',
};

export default {
  command: ['carbon', 'codigoimg', 'codeimg'],
  category: 'utils',
  description: 'Convertir código en una imagen bonita (carbon).',
  run: async ({ msg, sock, args, usedPrefix, command, text }) => {
    const temaRaw = args[0]?.toLowerCase();
    const color = TEMAS[temaRaw] || null;
    const codigo = color
      ? args.slice(1).join(' ') || (msg.quoted?.text || '')
      : text || (msg.quoted?.text || '');
    if (!codigo) {
      return msg.reply(
        `《✧》 Responde a un mensaje con código, o escribe el código a convertir.\n`
        + `> Colores disponibles: ${Object.keys(TEMAS).join(', ')}\n`
        + `> Ejemplo: ${usedPrefix}carbon verde console.log("hola")`
      );
    }
    await msg.react('🎨');
    const statusMsg = await sock.sendMessage(msg.chat, { text: '🎨 *Carbon* generando imagen...' }, { quoted: msg }).catch(() => null);
    try {
      const body = { code: codigo, backgroundColor: color || '#1F816D' };
      const res = await fetch('https://carbonara.solopov.dev/api/cook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 500) throw new Error('Imagen vacía.');
      await sock.sendMessage(msg.chat, {
        image: buf,
        caption: `🎨 *Carbon*${color ? ` · tema ${temaRaw}` : ''}`,
      }, { quoted: msg });
      if (statusMsg?.key) {
        try { await sock.sendMessage(msg.chat, { text: '', edit: statusMsg.key, delete: true }); } catch (_) {}
      }
      await msg.react('✔️');
    } catch (e) {
      await msg.react('❌');
      if (statusMsg?.key) {
        try { await sock.sendMessage(msg.chat, { text: `《✧》 No pude generar la imagen.\n> ${e.message}`, edit: statusMsg.key }); return; } catch (_) {}
      }
      msg.reply(`《✧》 No pude generar la imagen.\n> ${e.message}`);
    }
  },
};
