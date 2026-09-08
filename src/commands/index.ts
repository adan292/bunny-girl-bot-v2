import type { CommandContext, CommandHandler } from './types';
import { ping } from './ping';
import { setname } from './setname';
import { serbot, delbot, listbots } from './subbot';

const registry = new Map<string, CommandHandler>([
  ['ping', ping],
  ['setname', setname],
  ['serbot', serbot],
  ['delbot', delbot],
  ['listbots', listbots],
]);

export async function runCommand(name: string, ctx: CommandContext): Promise<void> {
  const handler = registry.get(name);
  if (!handler) return;
  await handler(ctx);
}
