/**
 * .morse <texto>       → codifica texto a código morse.
 * .demorse <código>    → decodifica código morse a texto.
 */
const MORSE = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....',
  I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.',
  Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
  Y: '-.--', Z: '--..',
  0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-',
  5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--',
  '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...',
  ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-',
  '"': '.-..-.', '$': '...-..-', '@': '.--.-.',
};
const REV = {};
for (const [k, v] of Object.entries(MORSE)) REV[v] = k;
REV['/'] = ' ';

export default {
  command: ['morse', 'demorse'],
  category: 'utils',
  description: 'Convertir texto a código morse (y viceversa).',
  run: async ({ msg, command, usedPrefix, text }) => {
    if (!text) {
      return msg.reply(
        `《✧》 Escribe el texto.\n`
        + `• ${usedPrefix}morse hola mundo\n`
        + `• ${usedPrefix}demorse .... --- .-.. .- / -- ..- -. -.. ---`
      );
    }
    if (command === 'demorse') {
      const out = text
        .trim()
        .split(/\s+/)
        .map(s => REV[s] ?? (s === '/' ? ' ' : '?'))
        .join('')
        .toLowerCase();
      return msg.reply(`📡 *DEMORSE*\n\n> ${out}`);
    }
    const out = text
      .toUpperCase()
      .split('')
      .map(c => (c === ' ' ? '/' : MORSE[c] ?? c))
      .join(' ');
    msg.reply(`📡 *CÓDIGO MORSE*\n\n\`\`\`${out}\`\`\`\n\n_Para decodificar usa: ${usedPrefix}demorse ${out}_`);
  },
};
