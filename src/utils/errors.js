export class BotError extends Error {
  constructor(message, { code = 'BOT_ERROR', details = {}, cause } = {}) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = new.target.name;
    this.code = code;
    this.details = Object.freeze({ ...details });

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, new.target);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

export class QueueLimitError extends BotError {
  constructor(message = 'Queue limit exceeded', details = {}) {
    super(message, {
      code: 'QUEUE_LIMIT_EXCEEDED',
      details,
    });
  }
}

export class AuthStateCorruptionError extends BotError {
  constructor(filePath, cause) {
    super(`Authentication state is corrupt: ${filePath}`, {
      code: 'AUTH_STATE_CORRUPT',
      details: { filePath },
      cause,
    });
    this.filePath = filePath;
  }
}

export class ConnectionTimeoutError extends BotError {
  constructor(message = 'Connection timed out', {
    timeoutMs,
    phase = 'socket-connection',
    cause,
  } = {}) {
    super(message, {
      code: 'CONNECTION_TIMEOUT',
      details: {
        timeoutMs,
        phase,
      },
      cause,
    });
    this.timeoutMs = timeoutMs;
    this.phase = phase;
  }
}

export class MediaProcessingError extends BotError {
  constructor(message = 'Media processing failed', {
    operation = 'unknown',
    mediaType,
    cause,
    code = 'MEDIA_PROCESSING_FAILED',
  } = {}) {
    super(message, {
      code,
      details: {
        operation,
        mediaType,
      },
      cause,
    });
    this.operation = operation;
    this.mediaType = mediaType;
  }
}

export class PluginExecutionError extends BotError {
  constructor(message = 'Plugin execution failed', {
    pluginName,
    messageId,
    jid,
    cause,
  } = {}) {
    super(message, {
      code: 'PLUGIN_EXECUTION_FAILED',
      details: {
        pluginName,
        messageId,
        jid,
      },
      cause,
    });
    this.pluginName = pluginName;
    this.messageId = messageId;
    this.jid = jid;
  }
}

export class InputValidationError extends BotError {
  constructor(message, code = 'INVALID_INPUT', details = {}) {
    super(message, {
      code,
      details,
    });
  }
}
