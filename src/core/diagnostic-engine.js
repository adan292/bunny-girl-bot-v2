export class DiagnosticEngine {
  constructor({ logger }) {
    this.logger = logger;
  }

  socketClosed({ error, classification }) {
    this.logger.warn({
      event: 'socket.closed',
      statusCode: classification.statusCode,
      reason: classification.reason,
      action: classification.action,
      err: error instanceof Error ? { name: error.name, message: error.message } : error,
    }, 'WhatsApp socket closed');
  }

  mediaFailure({ error, messageId, operation }) {
    this.logger.warn({
      event: 'media.failure',
      operation,
      messageId,
      err: this.#safeError(error),
    }, 'Media operation failed; stream isolated');
  }

  pluginFailure({ error, pluginName, messageId, jid }) {
    this.logger.error({
      event: 'plugin.failure',
      pluginName,
      messageId,
      jid,
      err: this.#safeError(error),
    }, 'Plugin failure isolated from the socket event loop');
  }

  malformedMessage({ reason, messageId, jid }) {
    this.logger.warn({
      event: 'message.rejected',
      reason,
      messageId,
      jid,
    }, 'Inbound message rejected by safety boundary');
  }

  processFailure({ error, kind }) {
    this.logger.fatal({
      event: `process.${kind}`,
      err: this.#safeError(error),
    }, 'Process-level failure received');
  }

  #safeError(error) {
    if (!(error instanceof Error)) {
      return { value: String(error) };
    }

    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
    };
  }
}
