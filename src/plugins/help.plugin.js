export default {
  name: 'core/help',
  priority: 10,
  match: /^(?:[./!]menu|menu)$/iu,
  async execute({ reply }) {
    await reply({
      text: [
        '🐰 *BUNNY GIRL BOT V2*',
        '',
        'Core ESM conectado.',
        '',
        'Comandos disponibles:',
        '• .menu — muestra este menú',
        '• .ping — mide la latencia de respuesta',
        '',
        'Los plugins se recargan sin reiniciar el proceso.',
      ].join('\n'),
    });
    return { handled: true };
  },
};
