export default {
  name: 'core/status',
  priority: 30,
  match: /^(?:[./!]status)$/iu,
  async execute({ reply, socket }) {
    const connection = socket?.ws?.isOpen ? 'open' : 'not-open';
    await reply({ text: `Estado del socket: ${connection}` });
    return { handled: true };
  },
};
