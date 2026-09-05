// Safe dispatcher: usa el registro de comandos si existe o carga ./cmds dinámicamente.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '#db';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function extractTextFromMessage(msg) {
  try {
    if (!msg || !msg.message) return '';
    const m = msg.message;
    return (
      m.conversation ||
      m.extendedTextMessage?.text ||
      m.imageMessage?.caption ||
      m.videoMessage?.caption ||
      m.buttonsResponseMessage?.selectedButtonId ||
      m.listResponseMessage?.title ||
      ''
    ) || '';
  } catch {
    return '';
  }
}

function normalize(text = '') {
  return String(text || '').toLowerCase();
}

async function loadCommandsFromFolder() {
  const cmdsFolder = path.resolve(process.cwd(), 'cmds');
  const commands = [];
  try {
    if (!fs.existsSync(cmdsFolder)) return commands;
    const entries = fs.readdirSync(cmdsFolder, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(cmdsFolder, entry.name);
      try {
        if (entry.isDirectory()) {
          // try index.js inside directory
          const indexFile = path.join(full, 'index.js');
          if (fs.existsSync(indexFile)) {
            const mod = await import(indexFile);
            const obj = mod?.default || mod;
            if (obj) commands.push(obj);
          } else {
            // import all .js files in the dir
            const files = fs.readdirSync(full).filter(f => f.endsWith('.js'));
            for (const f of files) {
              const mod = await import(path.join(full, f));
              const obj = mod?.default || mod;
              if (obj) commands.push(obj);
            }
          }
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
          const mod = await import(full);
          const obj = mod?.default || mod;
          if (obj) commands.push(obj);
        }
      } catch (e) {
        console.warn('[cmd-loader] Error cargando', full, e?.message || e);
      }
    }
  } catch (e) {
    console.warn('[cmd-loader] Error leyendo carpeta cmds', e?.message || e);
  }
  return commands;
}

function findCommandInList(commandsList = [], name) {
  if (!name) return null;
  for (const cmd of commandsList) {
    const names = Array.isArray(cmd.command) ? cmd.command : (cmd.name ? [cmd.name] : []);
    for (const n of names) {
      if (!n) continue;
      if (normalize(n) === normalize(name)) return cmd;
    }
    // also check aliases property
    if (Array.isArray(cmd.aliases)) {
      if (cmd.aliases.map(normalize).includes(normalize(name))) return cmd;
    }
  }
  return null;
}

export default async function main(sock, msg, messages) {
  try {
    if (!sock || !msg) return;

    // Maintenance + admin bypass (igual que antes)
    const isMaintenance = (process.env.MAINTENANCE_MODE === '1' || String(process.env.MAINTENANCE_MODE || '').toLowerCase() === 'true');
    const adminEnv = process.env.ADMIN_IDS || '';
    const adminList = adminEnv.split(',').map(s => s.trim()).filter(Boolean);
    const sender = msg?.key?.participant || msg?.sender || msg?.from || '';
    const senderShort = sender ? sender.split('@')[0] : '';
    const isAdmin = adminList.length > 0 && (adminList.includes(sender) || adminList.includes(senderShort));
    if (isMaintenance && !isAdmin) {
      const text = 'Servicio temporalmente en mantenimiento. Intenta de nuevo más tarde.';
      try { if (typeof msg.reply === 'function') await msg.reply(text); else if (sock?.sendText) await sock.sendText(msg.chat, text); } catch {}
      return;
    }

    // Extraer texto
    const text = extractTextFromMessage(msg).trim();
    if (!text) return;

    // Detectar prefix configurable por bot
    const botId = sock?.user?.id ? sock.user.id.split(':')[0] + '@s.whatsapp.net' : '';
    const botSettings = botId ? (db.getSettings(botId) || {}) : {};
    const configuredPrefix = botSettings.prefix || '';
    const defaultPrefixes = ['!', '/', '.', '#'];
    let usedPrefix = '';
    if (configuredPrefix && text.startsWith(configuredPrefix)) usedPrefix = configuredPrefix;
    else {
      const p = defaultPrefixes.find(px => text.startsWith(px));
      if (p) usedPrefix = p;
    }

    // Si no tiene prefix conocido, salir
    if (!usedPrefix) return;

    // Extraer comando y args
    const after = text.slice(usedPrefix.length).trim();
    const [cmdNameRaw, ...rest] = after.split(/\s+/);
    const cmdName = cmdNameRaw ? cmdNameRaw.toLowerCase() : '';
    const args = rest;

    // 1) Intentar usar el registro central de comandos (si existe)
    try {
      const sys = await import('#system/commands').catch(() => null);
      if (sys) {
        // posibles exportaciones: default (obj), commands (array), getCommands, find
        const candidateList = sys.commands || sys.default?.commands || sys.getCommands?.() || null;
        if (Array.isArray(candidateList)) {
          const cmd = findCommandInList(candidateList, cmdName);
          if (cmd && typeof cmd.run === 'function') {
            try {
              await cmd.run({ msg, sock, args, usedPrefix });
            } catch (e) {
              console.error('[COMMAND ERROR]', e?.stack || e?.message || e);
              try { if (typeof msg.reply === 'function') await msg.reply(`> Ocurrió un error al ejecutar el comando *${cmdName}*.`); } catch {}
            }
            return;
          }
        }
      }
    } catch (e) {
      // continuar al siguiente mecanismo de carga
    }

    // 2) Cargar dinámicamente ./cmds y buscar el comando
    const loaded = await loadCommandsFromFolder();
    const cmd = findCommandInList(loaded, cmdName);
    if (cmd && typeof cmd.run === 'function') {
      try {
        await cmd.run({ msg, sock, args, usedPrefix });
      } catch (e) {
        console.error('[COMMAND ERROR]', e?.stack || e?.message || e);
        try { if (typeof msg.reply === 'function') await msg.reply(`> Ocurrió un error al ejecutar el comando *${cmdName}*.`); } catch {}
      }
      return;
    }

    // 3) Intentar cargar handlers "reales" como antes (compatibilidad)
    const candidates = [
      './_main.real.js',
      './main.handler.js',
      './handlers/main.js',
      './cmds/main/index.js',
      './cmds/main/main.js',
    ];
    for (const rel of candidates) {
      const full = path.join(process.cwd(), rel);
      if (fs.existsSync(full)) {
        try {
          const mod = await import(full);
          const fn = mod?.default || mod?.main || mod;
          if (typeof fn === 'function') {
            await fn(sock, msg, messages);
            return;
          }
        } catch (err) {
          console.error('[MAIN loader] Error al cargar handler real desde', rel, err?.message || err);
        }
      }
    }

    // Si no se encontró nada, no hacer auto-respuestas (evita spam).
    console.debug('[MAIN fallback] No se encontró comando ni handler. Comando:', cmdName);

  } catch (err) {
    console.error('[MAIN fallback error]', err?.stack || err?.message || err);
  }
}
