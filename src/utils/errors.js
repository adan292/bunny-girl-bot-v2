export class QueueLimitError extends Error {
  constructor(message = 'Queue limit exceeded') {
    super(message);
    this.name = 'QueueLimitError';
    this.code = 'QUEUE_LIMIT_EXCEEDED';
  }
}

export class AuthStateCorruptionError extends Error {
  constructor(filePath, cause) {
    super(`Authentication state is corrupt: ${filePath}`, { cause });
    this.name = 'AuthStateCorruptionError';
    this.code = 'AUTH_STATE_CORRUPT';
    this.filePath = filePath;
  }
}

export class InputValidationError extends Error {
  constructor(message, code = 'INVALID_INPUT') {
    super(message);
    this.name = 'InputValidationError';
    this.code = code;
  }
}
