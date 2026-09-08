import { initDb } from './db/database';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

import { WhatsBot } from './core/WhatsBot';
import { subbotManager } from './core/SubbotManager';
import { getMainBot } from './db/botsRepo';
import { logStatus, logBanner, color } from './utils/logger';

async function askMainNumber(): Promise<string> {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  let number = '';
  while (!number) {
    // El texto explicativo va en su propia línea completa (con salto de
    // línea al final) — algunos paneles de hosting solo muestran la salida
    // del proceso por líneas completas, y un prompt sin \n al final (como
    // el que usa rl.question por diseño) se puede quedar invisible en el
    // buffer aunque el proceso sí esté esperando la respuesta.
    console.log(
      `${color.bold}${color.cyan}Número del bot principal${color.reset} ${color.dim}(sin +, ej. 573001234567)${color.reset}`,
    );
    const answer = await rl.question('');
    number = answer.replace(/\D/g, '');
    if (!number) console.log(`${color.red}Número inválido, intenta de nuevo.${color.reset}`);
  }
  rl.close();
  return number;
}

async function main(): Promise<void> {
  logBanner();
  await initDb();

  // El número del bot principal NO vive en el .env: la primera vez se
  // pregunta por consola y queda guardado en la base de datos. En los
  // siguientes arranques se reconecta solo, sin volver a preguntar.
  const existing = getMainBot();
  const mainNumber = existing ? existing.id : await askMainNumber();

  const main = new WhatsBot(mainNumber, 'main');
  await main.start(existing ? undefined : mainNumber);

  await subbotManager.loadExisting();

  logStatus('Main', main.name, 'Bot iniciado', 'ok');
}

main().catch((err) => {
  console.error('Error fatal al iniciar:', err);
  process.exit(1);
});
