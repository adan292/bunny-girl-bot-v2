import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function reloadCommands(dir = path.join(__dirname, '..')) {
  const commandsMap = new Map();
  async function readCommands(folder) {
    const files = fs.readdirSync(folder);
    for (const file of files) {
      const fullPath = path.join(folder, file);
      if (fs.lstatSync(fullPath).isDirectory()) {
        await readCommands(fullPath);
      } else if (file.endsWith('.js')) {
        try {
          const { default: cmd } = await import(fullPath + '?update=' + Date.now());
          if (cmd?.command) {
            cmd.command.forEach((c) => {
              commandsMap.set(c.toLowerCase(), cmd);
            });
          }
        } catch (err) {
          console.error(`Error recargando comando ${file}:`, err);
        }
      }
    }
  }
  await readCommands(dir);
  global.comandos = commandsMap;
}

export default {
  command: ['fix', 'update'],
  category: 'owner',
  description: 'Actualizar y recargar los comandos del bot. Usa "update restart" para reiniciar el proceso.',
  isOwner: true,
  run: async ({ msg, sock, text }) => {
    const args = (text || '').trim().split(/\s+/).filter(Boolean);

    // Si se solicita reiniciar el servidor
    if (args[0] && ['restart', 'reboot'].includes(args[0].toLowerCase())) {
      try {
        await sock.sendMessage(msg.key.remoteJid, { text: '⌛ Reiniciando servidor... (process.exit)'} , { quoted: msg });
      } catch (e) {
        console.error('Failed to send restart message:', e);
      }
      // Esperar un momento para que el mensaje se envíe y luego salir para que el process manager lo reinicie.
      setTimeout(() => process.exit(0), 1200);
      return;
    }

    exec('git pull', async (error, stdout, stderr) => {
      await reloadCommands(path.join(__dirname, '..'));
      let replyMsg = '';
      if (error) {
        replyMsg = `❌ Error al ejecutar git pull:\n${error.message}\n${stderr || ''}`;
      } else if (stdout && stdout.includes('Already up to date.')) {
        replyMsg = 'ꕥ *Estado:* Todo está actualizado';
      } else {
        replyMsg = `*Actualización completada*\n\n${stdout}`;
      }
      try {
        await sock.sendMessage(msg.key.remoteJid, { text: replyMsg }, { quoted: msg });
      } catch (e) {
        console.error('Failed to send update reply:', e);
      }
    });
  }
};
