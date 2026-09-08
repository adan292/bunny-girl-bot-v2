import path from 'node:path';

export const config = {
  // Prefijo de comandos.
  prefix: '.',
  // Número del dueño del bot (sin +, sin espacios). Es quien puede usar
  // .setname, .serbot, .delbot, etc. Cámbialo por tu número real.
  owner: '573000000000',
  // Nombre por defecto que llevará cualquier bot (main o subbot) hasta que se edite con .setname.
  defaultBotName: 'Mai Sakurajima',
  // Ruta del archivo sqlite (se comparte entre el main y todos los subbots).
  dbPath: path.resolve(process.cwd(), './bot.db'),
  // Método de login: 'qr' o 'code'.
  loginMethod: 'code' as 'qr' | 'code',
} as const;
