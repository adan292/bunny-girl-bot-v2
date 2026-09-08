import { proto, BufferJSON, initAuthCreds } from '@whiskeysockets/baileys';
import { get, run, runRaw, transaction } from '../db/database';

/**
 * Distintos forks/versiones de Baileys no siempre exportan los mismos
 * nombres de tipos para el auth state. Como nosotros mismos controlamos
 * toda la lectura/escritura, definimos aquí la forma mínima que en verdad
 * usamos, sin depender de esos tipos.
 */
export interface AuthState {
  creds: any;
  keys: {
    get: (type: string, ids: string[]) => Promise<{ [id: string]: any }>;
    set: (data: { [type: string]: { [id: string]: any } }) => Promise<void>;
  };
}

/**
 * Reemplazo directo de `useMultiFileAuthState` pero guardando todo en SQLite
 * en vez de un archivo .json por cada credencial/llave. Esto evita el bug
 * clásico de escrituras a medias / archivos .json corruptos cuando el
 * proceso se cae justo mientras se guardan las creds.
 */

function readValue<T>(botId: string, key: string): T | undefined {
  const row: any = get('SELECT value FROM auth_state WHERE bot_id = ? AND key = ?', [botId, key]);
  if (!row) return undefined;
  return JSON.parse(row.value, BufferJSON.reviver) as T;
}

function writeValue(botId: string, key: string, value: unknown, raw = false): void {
  if (value === undefined || value === null) {
    (raw ? runRaw : run)('DELETE FROM auth_state WHERE bot_id = ? AND key = ?', [botId, key]);
    return;
  }
  (raw ? runRaw : run)(
    `INSERT INTO auth_state (bot_id, key, value) VALUES (?, ?, ?)
     ON CONFLICT(bot_id, key) DO UPDATE SET value = excluded.value`,
    [botId, key, JSON.stringify(value, BufferJSON.replacer)],
  );
}

/** Borra TODAS las credenciales guardadas de un bot puntual (fuerza a que la
 * próxima conexión arranque desde cero, como si nunca se hubiera vinculado). */
export function resetAuth(botId: string): void {
  run('DELETE FROM auth_state WHERE bot_id = ?', [botId]);
}

export async function useSQLiteAuthState(
  botId: string,
): Promise<{ state: AuthState; saveCreds: () => Promise<void> }> {
  const creds: any = readValue(botId, 'creds') ?? initAuthCreds();

  const keys: AuthState['keys'] = {
    get: async (type, ids) => {
      const out: { [id: string]: any } = {};
      for (const id of ids) {
        let value = readValue<any>(botId, `${String(type)}-${id}`);
        if (type === 'app-state-sync-key' && value) {
          value = proto.Message.AppStateSyncKeyData.fromObject(value);
        }
        if (value) out[id] = value;
      }
      return out;
    },
    set: async (data) => {
      // Una sola transacción por lote (un solo persist() al final): evita
      // cuellos de botella al sincronizar muchas llaves de golpe (típico
      // al emparejar un bot).
      transaction(() => {
        for (const type in data) {
          for (const id in data[type]) {
            writeValue(botId, `${type}-${id}`, data[type][id], true);
          }
        }
      });
    },
  };

  const state: AuthState = { creds, keys };

  const saveCreds = async () => {
    writeValue(botId, 'creds', state.creds);
  };

  return { state, saveCreds };
}
