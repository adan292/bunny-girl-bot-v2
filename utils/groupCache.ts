import type { WASocket } from '../types/wa';

interface Entry {
  name: string;
  expires: number;
}

const TTL_MS = 10 * 60 * 1000; // 10 minutos: suficiente para no golpear la API en cada mensaje
const cache = new Map<string, Entry>();

export async function getChatName(sock: WASocket, chatJid: string): Promise<string> {
  if (!chatJid.endsWith('@g.us')) return 'Privado';

  const hit = cache.get(chatJid);
  if (hit && hit.expires > Date.now()) return hit.name;

  try {
    const meta = await sock.groupMetadata(chatJid);
    cache.set(chatJid, { name: meta.subject, expires: Date.now() + TTL_MS });
    return meta.subject;
  } catch {
    // Si falla (rate limit, grupo recién creado, etc.) no bloqueamos el log.
    return hit?.name ?? chatJid;
  }
}
