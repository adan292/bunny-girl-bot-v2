import { BoundedTaskPool } from './serial-queue.js';
import { normalizeIncomingMessage } from './message-normalizer.js';

export class MessageRouter {
  constructor({ pluginManager, outboundQueue, diagnostics, logger, maxTextLength, maxBatch, concurrency, maxQueue }) {
    this.pluginManager = pluginManager;
    this.outboundQueue = outboundQueue;
    this.diagnostics = diagnostics;
    this.logger = logger;
    this.maxTextLength = maxTextLength;
    this.maxBatch = maxBatch;
    this.pool = new BoundedTaskPool({ concurrency, maxQueue });
  }

  handleEvent({ socket, event, signal }) {
    if (!event || !Array.isArray(event.messages)) {
      return Promise.resolve();
    }

    const messages = event.messages.slice(0, this.maxBatch);
    if (event.messages.length > messages.length) {
      this.logger.warn({ received: event.messages.length, accepted: messages.length }, 'Inbound batch truncated');
    }

    const tasks = messages.map((raw) => this.pool.run(() => this.#handleOne({ socket, raw, signal })));
    return Promise.allSettled(tasks).then((results) => {
      for (const result of results) {
        if (result.status === 'rejected') {
          this.logger.error({ err: result.reason }, 'Inbound message task failed outside plugin boundary');
        }
      }
    });
  }

  async #handleOne({ socket, raw, signal }) {
    const normalized = normalizeIncomingMessage(raw, { maxTextLength: this.maxTextLength });
    if (!normalized.accepted) {
      this.diagnostics.malformedMessage({
        reason: normalized.reason,
        messageId: normalized.id,
        jid: normalized.remoteJid,
      });
      return;
    }

    const message = normalized.message;
    if (message.fromMe || !message.text) {
      return;
    }

    const context = {
      socket,
      raw,
      message,
      signal,
      reply: (payload) => this.outboundQueue.enqueue({
        jid: message.remoteJid,
        signal,
        task: () => socket.sendMessage(message.remoteJid, payload),
      }),
    };

    await this.pluginManager.dispatch(context, this.diagnostics);
  }

  close() {
    this.pool.close();
  }
}
