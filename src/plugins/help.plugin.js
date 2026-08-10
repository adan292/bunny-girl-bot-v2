export default {
  name: 'core/help',
  priority: 10,
  commands: ['menu'],
  cooldownMs: 1500,
  match: /^(?:[./!]menu|menu)$/iu,
  async execute({ reply, replyInteractiveList }) {
    const options = {
      body: '🐰 Bunny Girl Bot v2\nSelecciona una categoría para continuar.',
      footer: 'Multi-Device ESM Core',
      header: {
        title: 'Bunny Girl Bot',
        subtitle: 'Menú principal',
      },
      buttonText: 'Abrir menú',
      sections: [
        {
          title: 'Core',
          rows: [
            {
              title: 'Ping',
              description: 'Mide la latencia del bot.',
              id: '.ping',
            },
            {
              title: 'Estado',
              description: 'Consulta el estado del socket.',
              id: '.status',
            },
          ],
        },
        {
          title: 'Economía',
          rows: [
            {
              title: 'Saldo',
              description: 'Consulta tus monedas.',
              id: '.bal',
            },
            {
              title: 'Trabajar',
              description: 'Obtén experiencia y monedas.',
              id: '.work',
            },
            {
              title: 'Recompensa diaria',
              description: 'Reclama tu recompensa diaria.',
              id: '.daily',
            },
          ],
        },
        {
          title: 'Herramientas',
          rows: [
            {
              title: 'Descargar',
              description: 'Descarga una URL multimedia segura.',
              id: '.download https://ejemplo.com/archivo.jpg',
            },
          ],
        },
      ],
    };

    if (typeof replyInteractiveList === 'function') {
      try {
        await replyInteractiveList(options);
        return { handled: true };
      } catch {
        // Some WhatsApp clients restrict native-flow lists; use text fallback.
      }
    }

    await reply({
      text: [
        '🐰 *BUNNY GIRL BOT V2*',
        '',
        'Core ESM conectado.',
        '',
        'Comandos:',
        '• .ping — latencia',
        '• .status — estado',
        '• .bal — saldo',
        '• .work — trabajar',
        '• .daily — recompensa diaria',
        '• .download URL — descargar multimedia',
      ].join('\n'),
    });

    return { handled: true };
  },
};
