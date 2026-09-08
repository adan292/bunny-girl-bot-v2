import 'dotenv/config';
import path from 'node:path';

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Falta la variable de entorno ${name}`);
  return v;
}

export const config = {
  prefix: process.env.PREFIX ?? '.',
  owner: required('OWNER', '573000000000'),
  defaultBotName: process.env.DEFAULT_BOT_NAME ?? 'Megumi',
  dbPath: path.resolve(process.cwd(), process.env.DB_PATH ?? './bot.db'),
  loginMethod: (process.env.LOGIN_METHOD === 'qr' ? 'qr' : 'code') as 'qr' | 'code',
} as const;
