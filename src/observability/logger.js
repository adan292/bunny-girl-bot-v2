import pino from 'pino';

export function createLogger(config) {
  const options = {
    level: config.logLevel,
    base: {
      service: 'bunny-girl-bot-v2',
      pid: process.pid,
    },
    redact: {
      paths: [
        'authorization',
        'token',
        'accessToken',
        'refreshToken',
        'password',
        'secret',
        'apiKey',
        'headers.authorization',
        'req.headers.authorization',
      ],
      censor: '[REDACTED]',
    },
  };

  if (config.prettyLogs && config.nodeEnv !== 'test') {
    options.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        singleLine: true,
        translateTime: 'SYS:standard',
      },
    };
  }

  return pino(options);
}
