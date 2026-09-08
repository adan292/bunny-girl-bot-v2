import { run, get, all } from './database';
import { config } from '../config';

export type BotType = 'main' | 'sub';

export interface BotRow {
  id: string;
  type: BotType;
  name: string;
  status: string;
  created_at: number;
  connected_at: number | null;
}

export function ensureBot(id: string, type: BotType): BotRow {
  run(
    `INSERT INTO bots (id, type, name, status, created_at)
     VALUES (?, ?, ?, 'disconnected', ?)
     ON CONFLICT(id) DO NOTHING`,
    [id, type, config.defaultBotName, Date.now()],
  );
  return get('SELECT * FROM bots WHERE id = ?', [id]) as BotRow;
}

export function getBot(id: string): BotRow | undefined {
  return get('SELECT * FROM bots WHERE id = ?', [id]) as BotRow | undefined;
}

export function setBotName(id: string, name: string): void {
  run('UPDATE bots SET name = ? WHERE id = ?', [name, id]);
}

export function setBotStatus(id: string, status: 'connected' | 'disconnected' | 'connecting'): void {
  run(
    `UPDATE bots SET status = ?, connected_at = CASE WHEN ? = 'connected' THEN ? ELSE connected_at END WHERE id = ?`,
    [status, status, Date.now(), id],
  );
}

export function listSubbots(): BotRow[] {
  return all('SELECT * FROM bots WHERE type = ?', ['sub']) as BotRow[];
}

export function getMainBot(): BotRow | undefined {
  return (all('SELECT * FROM bots WHERE type = ?', ['main']) as BotRow[])[0];
}

export function removeBot(id: string): void {
  run('DELETE FROM bots WHERE id = ?', [id]);
  run('DELETE FROM auth_state WHERE bot_id = ?', [id]);
}
