export default {
  name: 'core/ping',
  priority: 20,
  commands: ['ping'],
  match: /^(?:[./!]ping)$/iu,
  async execute({ reply }) {
    const startedAt = performance.now();
    await reply({ text: '🐇 Calculando latencia...' });
    const elapsed = Math.round(performance.now() - startedAt);
    await reply({ text: `📶 *Ping:* ${elapsed} ms` });
    return { handled: true };
  },
};
