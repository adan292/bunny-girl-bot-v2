// Algunos paneles de hosting arrancan siempre "node index.js" en la raíz.
// El proyecto es 100% ESM (obligatorio: Baileys v7 es "type": "module" puro,
// sin build CJS, y su dependencia whatsapp-rust-bridge tampoco tiene forma
// de cargarse con require()). Gracias a "type": "module" en package.json,
// este archivo YA se ejecuta como ESM nativo — no hace falta ningún hook de
// require ni tsx/cjs. Solo registramos el transformador de tsx (quita los
// tipos de TypeScript al vuelo, sin revisarlos) y hacemos import real del
// código fuente.
import { register } from 'tsx/esm/api';

register();

try {
  await import('./app.ts');
} catch (err) {
  console.error('Error fatal al iniciar:', err);
  process.exit(1);
}
