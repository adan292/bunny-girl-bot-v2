import { get, run } from './database';

export function getLidMapping(lid: string): string | undefined {
  const row = get('SELECT pn FROM lid_map WHERE lid = ?', [lid]) as { pn: string } | undefined;
  return row?.pn;
}

export function saveLidMapping(lid: string, pn: string): void {
  run(
    'INSERT INTO lid_map (lid, pn) VALUES (?, ?) ON CONFLICT(lid) DO UPDATE SET pn = excluded.pn',
    [lid, pn],
  );
}
