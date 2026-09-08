// Igual que index.js: existe por si el panel arranca "index.ts" en la raíz
// en vez de "index.js". Mismo mecanismo ESM, mismo resultado.
import { register } from 'tsx/esm/api';

register();

try {
  await import('./app.ts');
} catch (err) {
  console.error('Error fatal al iniciar:', err);
  process.exit(1);
}
