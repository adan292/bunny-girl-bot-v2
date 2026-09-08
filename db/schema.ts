// El SQL vive aquí como string, no en un archivo .sql separado, porque
// `tsc` solo compila .ts a .js y NO copia otros archivos a `dist/` — un
// schema.sql aparte se quedaría en src/ y no existiría en producción.

export const schema = `
-- Un registro por bot (el main y cada subbot). El id es su número sin sufijo.
CREATE TABLE IF NOT EXISTS bots (
  id           TEXT PRIMARY KEY,
  type         TEXT NOT NULL CHECK (type IN ('main', 'sub')),
  name         TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'disconnected',
  created_at   INTEGER NOT NULL,
  connected_at INTEGER
);

-- Estado de autenticación de Baileys (reemplaza los .json de useMultiFileAuthState).
-- value guarda el dato ya serializado con BufferJSON (buffers/uint8array intactos).
CREATE TABLE IF NOT EXISTS auth_state (
  bot_id TEXT NOT NULL,
  key    TEXT NOT NULL,
  value  TEXT,
  PRIMARY KEY (bot_id, key)
);

-- Cache persistente de resolución @lid -> numero@s.whatsapp.net
CREATE TABLE IF NOT EXISTS lid_map (
  lid TEXT PRIMARY KEY,
  pn  TEXT NOT NULL
);
`;
