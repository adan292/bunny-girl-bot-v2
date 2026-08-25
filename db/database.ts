import Database, { type Database as BetterSqlite3Database } from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config';
import { schema } from './schema';

/**
 * SQLite vía better-sqlite3 (addon nativo). Escribe directo a disco en cada
 * sentencia — no hace falta exportar/persistir a mano como con sql.js.
 * La firma pública (run/get/all/runRaw/transaction/persist/initDb) se
 * mantiene idéntica para no tocar botsRepo.ts, lidRepo.ts ni authState.ts.
 */

let db: BetterSqlite3Database;

export async function initDb(): Promise<void> {
  fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
  db = new Database(config.dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(schema);
}

/** No-op: better-sqlite3 ya escribe a disco en cada sentencia. Se conserva
 * para no romper el resto del código que aún la invoca. */
export function persist(): void {}

/** Idéntica a run() — con better-sqlite3 no hay diferencia entre escribir
 * "crudo" y persistir, pero se mantiene el nombre por compatibilidad. */
export function runRaw(sql: string, params: any[] = []): void {
  db.prepare(sql).run(...params);
}

export function run(sql: string, params: any[] = []): void {
  runRaw(sql, params);
}

export function get(sql: string, params: any[] = []): any {
  return db.prepare(sql).get(...params);
}

export function all(sql: string, params: any[] = []): any[] {
  return db.prepare(sql).all(...params);
}

/** Varias escrituras en una sola transacción. */
export function transaction(fn: () => void): void {
  db.transaction(fn)();
}
