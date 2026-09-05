/**
 * .encuesta <pregunta>|opción1|opción2|...
 * Crea una encuesta (poll) nativa de WhatsApp.
 */
export default {
  command: ['encuesta', 'poll', 'votacion'],
  category: 'utils',
  description: 'Crear una encuesta interactiva de WhatsApp.',
  run: async ({ msg, usedPrefix, command, text }) => {
    if (!text || !text.includes('|')) {
      return msg.reply(
        `《✧》 Crea una *encuesta*.\n`
        + `> Formato: ${usedPrefix}encuesta <pregunta>|<opción1>|<opción2>|[más]\n`
        + `> Ejemplo: ${usedPrefix}encuesta ¿Qué pizza prefiero?|Pepperoni|Hawaiana|4 Quesos`
      );
    }
    const partes = text.split('|').map(s => s.trim()).filter(Boolean);
    const name = partes.shift();
    const values = partes.slice(0, 12); // WhatsApp permite hasta 12 opciones
    if (!name || values.length < 2) {
      return msg.reply(`《✧》 Debes poner una pregunta y al menos 2 opciones separadas por | (pleca).`);
    }
    try {
      await msg.react('📊');
      await msg.reply({ poll: { name, values, selectableCount: 1 } });
      // También podríamos permitir multi-opción: selectableCount > 1, pero por defecto 1 (single choice)
    } catch (e) {
      await msg.react('❌');
      msg.reply(`《✧》 No pude crear la encuesta.\n> ${e.message}`);
    }
  },
};
