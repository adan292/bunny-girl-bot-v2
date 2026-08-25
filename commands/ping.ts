import type { CommandDefinition } from './types';

function pingLine(line: string): string {
  return `˚₊‧꒰ა 🐰 ${line} ໒꒱ ‧₊˚`;
}

const ping: CommandDefinition = {
  name: 'ping',
  description: 'Mide la latencia del bot',
  handler: async ({ sock, chatJid, msg }) => {
    const start = Date.now();
    const sent = await sock.sendMessage(chatJid, { text: pingLine('Calculando...') }, { quoted: msg });
    const elapsed = Date.now() - start;

    if (sent?.key) {
      await sock.sendMessage(chatJid, { text: pingLine(`Pong! *${elapsed}ms*`), edit: sent.key });
    }
  },
};

export default ping;
