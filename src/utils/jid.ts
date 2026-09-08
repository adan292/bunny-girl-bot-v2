import type { proto } from '@whiskeysockets/baileys';
import type { WASocket } from '../types/wa';
import { getLidMapping, saveLidMapping } from '../db/lidRepo';

/**
 * WhatsApp reciente identifica a algunos usuarios (sobre todo en grupos con
 * privacidad activada) con un JID del tipo `xxxxxxxx@lid` en lugar del
 * clásico `numero@s.whatsapp.net`. Si el bot no resuelve ese `@lid` a un
 * número real, se rompen cosas como: menciones, comparaciones de "es el
 * owner", guardado de contactos duplicados, respuestas a comandos por
 * privilegios, etc. Este archivo centraliza la resolución para que el
 * resto del código nunca tenga que pensar en esto.
 */

export function stripDevice(jid: string): string {
  // 573001234567:12@s.whatsapp.net -> 573001234567@s.whatsapp.net
  return jid.replace(/:\d+(?=@)/, '');
}

export function isLid(jid: string): boolean {
  return jid.endsWith('@lid');
}

export function isGroup(jid: string): boolean {
  return jid.endsWith('@g.us');
}

export function jidNumber(jid: string): string {
  return stripDevice(jid).split('@')[0];
}

/**
 * Intenta resolver un @lid a su número real (@s.whatsapp.net).
 * Orden de resolución:
 *  1. Cache en SQLite (persistente entre reinicios).
 *  2. API nativa de la librería (signalRepository.lidMapping), si el fork
 *     la expone.
 *  3. Si no se puede resolver, se devuelve el @lid tal cual (nunca se
 *     lanza una excepción por esto: es mejor degradar que romper el bot).
 */
export async function resolveJid(sock: WASocket, jid: string): Promise<string> {
  const clean = stripDevice(jid);
  if (!isLid(clean)) return clean;

  const cached = getLidMapping(clean);
  if (cached) return cached;

  try {
    // API presente en versiones recientes de Baileys / forks derivados.
    const repo = (sock as any).signalRepository;
    const lidNum = jidNumber(clean);
    const pn: string | undefined =
      (await repo?.lidMapping?.getPNForLID?.(lidNum)) ??
      (await repo?.lidMapping?.getPNForLID?.(clean));

    if (pn) {
      const resolved = pn.includes('@') ? pn : `${pn}@s.whatsapp.net`;
      saveLidMapping(clean, resolved);
      return resolved;
    }
  } catch {
    // Fork sin esa API todavía: se ignora y se degrada sin romper el flujo.
  }

  return clean;
}

/**
 * Extrae el JID "real" del emisor de un mensaje, prefiriendo campos que
 * algunos forks ya traen resueltos (participantAlt / senderPn) antes de
 * caer a la resolución manual por @lid.
 */
export async function getSenderJid(
  sock: WASocket,
  key: proto.IMessageKey,
): Promise<string> {
  const candidate =
    (key as any).participantPn ||
    (key as any).participantAlt ||
    key.participant ||
    key.remoteJid ||
    '';

  return resolveJid(sock, stripDevice(candidate));
}

export function formatNumber(jid: string): string {
  const num = jidNumber(jid);
  if (!/^\d{8,15}$/.test(num)) return `+${num}`;
  // Formato legible simple: +57 300 123 4567 (agrupa de a 3 tras el indicativo)
  const rest = num.slice(2);
  const groups = rest.match(/.{1,3}/g) ?? [rest];
  return `+${num.slice(0, 2)} ${groups.join(' ')}`;
}
