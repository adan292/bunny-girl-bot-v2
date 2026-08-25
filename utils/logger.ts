/**
 * Logger en bloque: cada mensaje entrante imprime varias líneas con sus
 * campos (BOT, TIPO, HORARIO, USUARIO, CHAT, ID, COMANDO), en vez de una
 * sola línea comprimida. Entre un bloque y otro va un separador simple
 * (una línea corta y tenue), no las líneas onduladas/decoradas de otros
 * bots: eso es justo lo que se pidió evitar por "exagerado" — pero sí con
 * algo de color y personalidad para que no se vea plano.
 *
 * Todo lo que imprime la consola (no solo los mensajes entrantes) pasa por
 * aquí, para que el arranque, los estados de conexión y el prompt del
 * número también tengan color y no se vean como texto plano perdido entre
 * los warnings de npm.
 */

export const color = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  violet: '\x1b[38;5;141m',
};

function time(): string {
  return new Date().toLocaleString('es-CO', { hour12: true });
}

function field(label: string, value: string): string {
  const tag = `${color.bold}${color.cyan}${label.padEnd(8)}${color.reset}`;
  return `  ${tag} ${color.dim}»${color.reset} ${value}`;
}

function separator(): void {
  console.log(`${color.violet}${color.dim}${'─'.repeat(42)}${color.reset}`);
}

export function logIncoming(opts: {
  botLabel: string;      // "Main" | "Subbot"
  botName: string;       // nombre registrado del bot (nunca el número)
  senderName: string;
  senderNumber: string;
  chatName: string;      // nombre del grupo, o "Privado"
  chatId: string;
  command: string | null;
  type: string;          // text, image, sticker, video, audio, document, etc.
}): void {
  const lines = [
    `  ${color.violet}●${color.reset} ${field('BOT', `${color.green}${opts.botLabel} ${opts.botName}${color.reset}`).trim()}`,
    field('TIPO', `${color.magenta}${opts.type}${color.reset}`),
    field('HORARIO', time()),
    field('USUARIO', `${opts.senderName}  ${color.dim}(${opts.senderNumber})${color.reset}`),
    field('CHAT', opts.chatName),
    field('ID', `${color.dim}${opts.chatId}${color.reset}`),
  ];
  if (opts.command) lines.push(field('COMANDO', `${color.yellow}${opts.command}${color.reset}`));

  console.log(lines.join('\n'));
  separator();
}

/**
 * Estados de conexión con su propio color: verde para "ya quedó", amarillo
 * para "en proceso", rojo para "se cayó". Así de un vistazo se distingue
 * qué está pasando sin tener que leer el mensaje completo.
 */
export function logStatus(
  botLabel: string,
  botName: string,
  message: string,
  kind: 'ok' | 'warn' | 'error' | 'info' = 'info',
): void {
  const tone =
    kind === 'ok' ? color.green : kind === 'warn' ? color.yellow : kind === 'error' ? color.red : color.cyan;
  const who = `${color.bold}${tone}${botLabel} ${botName}${color.reset}`;
  console.log(`${color.dim}${time()}${color.reset}  ${who}  ${message}`);
}

export function logError(botLabel: string, botName: string, error: unknown): void {
  const msg = error instanceof Error ? error.message : String(error);
  console.log(
    `${color.dim}${time()}${color.reset}  ${color.bold}${color.red}${botLabel} ${botName}${color.reset}  ${color.red}ERROR:${color.reset} ${msg}`,
  );
}

/** Código de vinculación bien resaltado: es lo primero que el usuario necesita copiar. */
export function logPairingCode(botLabel: string, botName: string, code: string): void {
  console.log(
    `${color.dim}${time()}${color.reset}  ${color.bold}${color.green}${botLabel} ${botName}${color.reset}  Código de vinculación: ${color.bold}${color.yellow}${code}${color.reset}`,
  );
}

/** Banner corto al arrancar: dos líneas con color, sin ascii-art de cajas. */
export function logBanner(): void {
  console.log(`${color.bold}${color.violet}✦ wa-bot${color.reset} ${color.dim}· sistema de subbots para WhatsApp${color.reset}`);
  console.log(`${color.dim}${'─'.repeat(42)}${color.reset}`);
}
