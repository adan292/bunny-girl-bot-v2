/**
 * Comandos divertidos (offline, sin APIs):
 *   .chiste         → chiste corto
 *   .dato           → dato curioso
 *   .consejo        → consejo aleatorio
 *   .piropo         → piropo
 *   .8ball / .8bola → respuesta estilo bola 8 mágica
 *   .love @usuario  → calculadora de amor / compatibilidad
 *   .ship @usuario  → alias de love
 *   .dado [caras]   → lanzar un dado
 *   .moneda / .coin → cara o cruz
 */

const chistes = [
  '¿Qué le dice un jaguar a otro jaguar? Jaguar you! 🐆',
  '¿Por qué el libro de matemáticas está triste? Porque tiene demasiados problemas. 📚',
  '¿Qué hace una abeja en el gimnasio? ¡Zum-ba! 🐝',
  '¿Cómo se dice "pez" en inglés? Fish. ¿Y cómo se dice "pez" que viaja? Fishcamino. 🐟',
  '¿Qué le dice un techo a otro? Te echo de menos. 🏠',
  '¿Por qué los pájaros no usan Facebook? Porque ya tienen Twitter. 🐦',
  '¿Qué hace una vaca con los ojos cerrados? Leche condensada. 🐄',
  'Se abre el telón y aparece un gato con una ametralladora. ¿Cómo se llama la película? Miaw-seros. 🐱',
  '¿Qué hace un perro con un taladro? ¡Ta-ladrando! 🐶',
  '¿Qué hace un pez sin ojos? ¡Nada! 🐟',
];
const datos = [
  '🐙 Los pulpos tienen 3 corazones y sangre azul.',
  '🍌 Las bananas son ligeramente radiactivas.',
  '🐜 Las hormigas pueden levantar hasta 50 veces su propio peso.',
  '🌍 La Tierra es el único planeta que no lleva nombre de un dios.',
  '🧠 Tu cerebro usa alrededor del 20% de la energía total del cuerpo.',
  '🦒 Las jirafas no tienen cuerdas vocales.',
  '💧 El agua caliente se congela más rápido que la fría (efecto Mpemba).',
  '🦉 Las lechuzas no pueden mover los ojos, giran la cabeza hasta 270°.',
  '🐳 La ballena azul puede pesar tanto como 30 elefantes.',
  '🌱 Los árboles se comunican entre sí mediante hongos subterráneos.',
  '🍫 Se necesitan unos 400 granos de cacao para hacer una libra de chocolate.',
  '👃 Tu nariz puede recordar más de 50,000 olores diferentes.',
];
const consejos = [
  '💧 Toma agua antes de sentir sed.',
  '😴 Dormir 7-8 horas mejora tu memoria y ánimo.',
  '📱 Toma descansos de la pantalla cada 20 min.',
  '🏃 Caminar 30 min al día hace una gran diferencia.',
  '🙏 Agradece algo cada día: mejora tu estado de ánimo.',
  '🥦 Come más vegetales y menos comida procesada.',
  '🧘 Respira profundo cuando estés estresado.',
  '📚 Lee 10 páginas al día: en un año son más de 20 libros.',
  '🎵 Escucha música nueva: tu cerebro lo agradece.',
  '📝 Anota tus pendientes para no llevarlos en la cabeza.',
];
const piropos = [
  'Si la belleza fuera un crimen, te sentenciarían a cadena perpetua 😍',
  '¿Tienes un mapa? Porque me pierdo en tus ojos 🗺️',
  'Si fueras un boomerang, nunca volverías porque te irías conmigo 😏',
  '¿Eres de azúcar? Porque estás endulzando mi vida 🍬',
  '¿Crees en el amor a primera vista o vuelvo a pasar? 💕',
  '¿Tienes fuego? Porque me has encendido el corazón 🔥',
  'Si la luna es de queso, tú eres la estrella de mi cielo 🌙',
];
const respuestas8 = [
  'Es cierto ✅',
  'Definitivamente sí 💯',
  'Sin duda 🌟',
  'Sí, definitivamente 👍',
  'Puedes confiar en ello 🔮',
  'Como yo lo veo, sí 👀',
  'Probablemente 🤔',
  'Buena perspectiva 💭',
  'No cuentes con ello ❌',
  'Mi respuesta es no 🙅',
  'Mis fuentes dicen que no 🚫',
  'No puedo predecirlo ahora 🌫️',
  'Pregunta más tarde ⏳',
  'Mejor no te lo digo ahora 🤫',
  'Muy dudoso 🤨',
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export default {
  command: ['chiste', 'dato', 'datointeresante', 'consejo', 'piropo', '8ball', '8bola', 'ship', 'pareja', 'dado', 'moneda', 'coin'],
  category: 'fun',
  description: 'Comandos divertidos: chistes, datos, piropos, bola 8, love, dado, moneda.',
  run: async ({ msg, sock, command, usedPrefix, text, args }) => {
    const senderName = msg.pushName || msg.sender.split('@')[0];

    // CHISTE
    if (command === 'chiste') return msg.reply(`😂 *Chiste*\n\n${pick(chistes)}`);

    // DATO CURIOSO
    if (command === 'dato' || command === 'datointeresante') {
      return msg.reply(`🤓 *Dato curioso*\n\n${pick(datos)}`);
    }

    // CONSEJO
    if (command === 'consejo') return msg.reply(`💡 *Consejo del día*\n\n${pick(consejos)}`);

    // PIROPO
    if (command === 'piropo') {
      return msg.reply(`💘 *Piropo* para @${msg.sender.split('@')[0]}\n\n${pick(piropos)}`, { mentions: [msg.sender] });
    }

    // BOLA 8
    if (command === '8ball' || command === '8bola') {
      if (!text) return msg.reply(`《✧》 Hazme una *pregunta de sí/no*.`);
      return msg.reply(`🎱 *Bola 8*\n\nPregunta: ${text}\n\n» ${pick(respuestas8)}`);
    }

    // SHIP / PAREJA
    if (command === 'ship' || command === 'pareja') {
      const target = msg.mentionedJid?.[0] || (text && text.trim() + '@s.whatsapp.net');
      if (!target) {
        return msg.reply(`《✧》 Etiqueta a alguien para calcular compatibilidad.\n> Ej: ${usedPrefix}love @amigo`);
      }
      const porcentaje = Math.floor(Math.random() * 101);
      let comentario;
      if (porcentaje >= 85) comentario = '💞 ¡Almas gemelas! Boda a la vista.';
      else if (porcentaje >= 60) comentario = '😍 Hay mucha química entre ustedes.';
      else if (porcentaje >= 35) comentario = '😊 Hay potencial, inténtenlo.';
      else comentario = '😬 Mejor quedan como amigos...';
      return msg.reply(
        `💕 *Test de amor*\n\n`
        + `@${msg.sender.split('@')[0]}  💘  @${target.split('@')[0]}\n`
        + `\nCompatibilidad: *${porcentaje}%*\n\n${comentario}`,
        { mentions: [msg.sender, target] }
      );
    }

    // DADO
    if (command === 'dado') {
      const caras = Math.max(2, Math.min(100, parseInt(args[0], 10) || 6));
      const n = Math.floor(Math.random() * caras) + 1;
      return msg.reply(`🎲 *Dado* de ${caras} caras\n\n» Salió *${n}*`);
    }

    // MONEDA
    if (command === 'moneda' || command === 'coin') {
      const lado = Math.random() < 0.5 ? '🪙 Cara' : '🪙 Cruz';
      return msg.reply(`🪙 *Lanzamiento de moneda*\n\n» ${lado}`);
    }
  },
};
