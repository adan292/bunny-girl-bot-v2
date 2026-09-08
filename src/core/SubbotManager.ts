import { WhatsBot } from './WhatsBot';
import { listSubbots, removeBot } from '../db/botsRepo';
import { logStatus } from '../utils/logger';

/**
 * Cada subbot es solo otra instancia de WhatsBot corriendo en el MISMO
 * proceso de Node (no un child_process ni un contenedor aparte). Un socket
 * de Baileys inactivo ronda ~10MB de RAM; lanzar N procesos de Node en vez
 * de N sockets en un solo proceso multiplicaría eso por el overhead fijo de
 * cada proceso (motor V8, event loop, etc.), que es justo lo que no queremos.
 */
export class SubbotManager {
  private bots = new Map<string, WhatsBot>();

  async loadExisting(): Promise<void> {
    const rows = listSubbots();
    for (const row of rows) {
      const bot = new WhatsBot(row.id, 'sub');
      this.bots.set(row.id, bot);
      await bot.start();
    }
    logStatus('Main', '', `Subbots cargados: ${rows.length}`);
  }

  async create(number: string): Promise<WhatsBot> {
    const bot = new WhatsBot(number, 'sub');
    this.bots.set(number, bot);
    await bot.start(number);
    return bot;
  }

  async remove(id: string): Promise<void> {
    const bot = this.bots.get(id);
    await bot?.stop();
    this.bots.delete(id);
    removeBot(id);
  }

  get(id: string): WhatsBot | undefined {
    return this.bots.get(id);
  }

  list(): WhatsBot[] {
    return [...this.bots.values()];
  }
}

export const subbotManager = new SubbotManager();
