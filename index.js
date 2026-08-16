import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { config as loadDotenv } from 'dotenv';

const root = dirname(fileURLToPath(import.meta.url));

const envPath = join(root, '.env');
if (existsSync(envPath)) {
  loadDotenv({ path: envPath });
}

let version = '0.0.0';
try {
  version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
} catch {}

console.log([
  '🐰 Bunny Girl Bot v2',
  `   Versión     : ${version}`,
  `   Node        : ${process.version}`,
  `   NODE_ENV    : ${process.env.NODE_ENV ?? 'development'}`,
  `   Puerto HTTP : ${process.env.PORT ?? 3000}`,
].join('\n'));

const owners = (process.env.OWNER_JIDS ?? '')
  .split(',')
  .map((owner) => owner.trim())
  .filter(Boolean);

if (owners.length > 0) {
  console.log(`👑 Owners      : ${owners.join(', ')}`);
} else {
  console.warn('⚠️ Sin owners configurados: define OWNER_JIDS en .env');
}

const authDirectory = join(root, process.env.AUTH_DIR ?? 'data/auth');
const hasSession = existsSync(join(authDirectory, 'creds.json'));
if (hasSession) {
  console.log('🔑 Sesión de WhatsApp encontrada, iniciando sesión...');
} else if (process.env.PAIRING_PHONE) {
  console.log(`🔗 Sin sesión: se vinculará con PAIRING_PHONE ${process.env.PAIRING_PHONE}`);
} else {
  console.warn('⚠️ Sin sesión guardada ni PAIRING_PHONE: configura el número en .env para vincular.');
}

try {
  await import(join(root, 'src', 'main.js'));
} catch (error) {
  console.error('❌ Error fatal al iniciar el bot:', error);
  process.exit(1);
}