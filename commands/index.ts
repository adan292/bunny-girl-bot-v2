import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CommandContext, CommandDefinition } from './types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IGNORED_FILES = new Set(['index.ts', 'types.ts']);

const registry = new Map<string, CommandDefinition>();

async function loadCommands(): Promise<void> {
  const files = fs
    .readdirSync(__dirname)
    .filter((file) => file.endsWith('.ts') && !IGNORED_FILES.has(file));

  for (const file of files) {
    const mod = await import(`./${file}`);
    const exported = mod.default;
    if (!exported) continue;

    const defs = Array.isArray(exported) ? exported : [exported];
    for (const def of defs) {
      if (!def?.name || !def?.handler) continue;

      registry.set(def.name.toLowerCase(), def);

      if (Array.isArray(def.aliases)) {
        for (const alias of def.aliases) {
          registry.set(alias.toLowerCase(), def);
        }
      }
    }
  }
}

const ready = loadCommands();

export async function runCommand(name: string, ctx: Omit<CommandContext, 'commands'>): Promise<void> {
  await ready;
  const def = registry.get(name.toLowerCase());
  if (!def) return;
  await def.handler({ ...ctx, commands: registry });
}
