import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { config as loadDotenv } from 'dotenv';
import figlet from 'figlet';
import { validatePairingPhone } from './src/utils/phone-validation.js';

const root = dirname(fileURLToPath(import.meta.url));

const envPath = join(root, '.env');
if (existsSync(envPath)) {
  loadDotenv({ path: envPath });
}

const readline = createInterface({ input: process.stdin, output: process.stdout });

function ask(question) {
  return new Promise((resolve) => {
    readline.question(question, (answer) => resolve(answer.trim()));
  });
}

function closePrompt() {
  readline.close();
}

let version = '0.0.0';
try {
  version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
} catch {}

function printBanner() {
  const title = figlet.textSync('Bunny Girl Bot', { font: 'Standard' });
  console.log(title);
  console.log([
    '   Versión     : ' + version,
    '   Node        : ' + process.version,
    '   NODE_ENV    : ' + (process.env.NODE_ENV ?? 'development'),
    '   Puerto HTTP : ' + (process.env.PORT ?? 3000),
  ].join('\n'));
}

function printOwners() {
  const owners = (process.env.OWNER_JIDS ?? '')
    .split(',')
    .map((owner) => owner.trim())
    .filter(Boolean);

  if (owners.length > 0) {
    console.log('   👑 Owners     : ' + owners.join(', '));
  } else {
    console.warn('   ⚠️ Sin owners configurados: define OWNER_JIDS en .env');
  }
}

function explainNumberFormat() {
  console.log('\n   📱 Cómo colocar el número de teléfono:');
  console.log('   Escribe el número CON código de país, sin "+", sin espacios ni guiones.');
  console.log('   Ejemplo Venezuela: 584242773183   (58 + 4242773183)');
  console.log('   Ejemplo México   : 527711234567   (52 + 7711234567)');
  console.log('   Solo dígitos, entre 8 y 15. Un número local sin código de país se rechaza.\n');
}

async function choosePairingMode() {
  console.log('\n   ───────────────────────────────────────────────');
  console.log('   Modo de vinculación con WhatsApp:');
  console.log('   [1] Escanear código QR (Dispositivos vinculados)');
  console.log('   [2] Usar número de teléfono (código de vinculación)');
  console.log('   ───────────────────────────────────────────────');

  while (true) {
    const choice = await ask('   Elige una opción (1 o 2): ');
    if (choice === '1') {
      console.log('   📱 Modo QR: escanea el código que aparecerá con WhatsApp.\n');
      return 'qr';
    }
    if (choice === '2') {
      return 'phone';
    }
    console.log('   ⚠️ Opción inválida: escribe 1 o 2.');
  }
}

async function collectPhoneNumber() {
  explainNumberFormat();

  while (true) {
    const raw = await ask('   📞 Número de teléfono: ');
    if (!raw) {
      console.log('   ⚠️ No escribiste ningún número. Inténtalo de nuevo.');
      continue;
    }

    const result = validatePairingPhone(raw);
    if (!result.ok) {
      console.log(`   🔴 Número rechazado: ${result.reason}`);
      console.log('      Recuerda el formato: código de país + número, sin "+" ni espacios.');
      continue;
    }

    const country = result.countryName
      ? ` (${result.countryName})`
      : '';
    console.log(`   🟢 Número válido: ${result.normalized}${country}`);
    for (const warning of result.warnings) {
      console.log(`   🟡 Aviso: ${warning}`);
    }
    console.log('      El código de vinculación aparecerá en el log del bot.\n');

    const confirm = await ask('   ¿Vincular con este número? (s/n): ');
    if (confirm.toLowerCase() === 's') {
      return result.normalized;
    }
    console.log('   Reintentando...\n');
  }
}

async function preparePairing() {
  const authDirectory = join(root, process.env.AUTH_DIR ?? 'data/auth');
  const hasSession = existsSync(join(authDirectory, 'creds.json'));

  if (hasSession) {
    console.log('   🔑 Sesión de WhatsApp encontrada, iniciando sesión...\n');
    return;
  }

  if (process.env.PAIRING_PHONE) {
    console.log(`   🔗 Sesión guardada en PAIRING_PHONE: ${process.env.PAIRING_PHONE}`);
    console.log('   (Para cambiarlo, edita el valor en .env o borra ./data/auth)\n');
    return;
  }

  const mode = await choosePairingMode();

  if (mode === 'qr') {
    process.env.PAIRING_MODE = 'qr';
    console.log('   ✅ Modo QR activado.\n');
    return;
  }

  const phone = await collectPhoneNumber();
  process.env.PAIRING_MODE = 'phone';
  process.env.PAIRING_PHONE = phone;
}

async function main() {
  printBanner();
  printOwners();
  await preparePairing();
  closePrompt();

  try {
    await import(join(root, 'src', 'main.js'));
  } catch (error) {
    console.error('   ❌ Error fatal al iniciar el bot:', error);
    process.exit(1);
  }
}

try {
  await main();
} catch (error) {
  console.error('   ❌ Error al iniciar el bot:', error);
  process.exit(1);
}