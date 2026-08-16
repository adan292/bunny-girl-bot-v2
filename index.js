import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { config as loadDotenv } from 'dotenv';

const root = dirname(fileURLToPath(import.meta.url));
const envPath = join(root, '.env');
if (existsSync(envPath)) {
  loadDotenv({ path: envPath });
}

await import(join(root, 'src', 'main.js'));
