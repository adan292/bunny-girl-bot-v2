import { loadConfig } from './config/env.js';
import { createLogger } from './observability/logger.js';
import { DiagnosticEngine } from './core/diagnostic-engine.js';
import { ConnectionSupervisor } from './core/connection-supervisor.js';
import { PluginManager } from './plugins/plugin-manager.js';
import { OutboundQueue } from './messaging/outbound-queue.js';
import { MessageRouter } from './messaging/message-router.js';
import { createHealthServer } from './http/health-server.js';

let config;
let logger;
let diagnostics;
let pluginManager;
let outboundQueue;
let router;
let supervisor;
let healthServer;
let shuttingDown = false;

async function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  logger?.info({ exitCode }, 'Graceful shutdown started');

  try {
    await supervisor?.shutdown();
  } catch (error) {
    logger?.error({ err: error }, 'Supervisor shutdown failed');
  }
  try {
    router?.close();
    await outboundQueue?.onIdle();
    outboundQueue?.close();
  } catch (error) {
    logger?.error({ err: error }, 'Messaging shutdown failed');
  }
  try {
    await pluginManager?.close();
  } catch (error) {
    logger?.error({ err: error }, 'Plugin manager shutdown failed');
  }
  try {
    await healthServer?.close();
  } catch (error) {
    logger?.error({ err: error }, 'Health server shutdown failed');
  }

  if (exitCode !== 0) {
    process.exitCode = exitCode;
  }
}

async function main() {
  config = loadConfig();
  logger = createLogger(config);
  diagnostics = new DiagnosticEngine({ logger });

  pluginManager = new PluginManager({
    directory: config.pluginsDirectory,
    logger,
    watchEnabled: config.pluginWatch,
  });
  await pluginManager.loadAll();
  logger.info({ plugins: pluginManager.list().map(({ name, priority }) => ({ name, priority })) }, 'Plugins loaded');

  outboundQueue = new OutboundQueue({
    logger,
    globalPerSecond: config.outboundGlobalPerSecond,
    perChatPerSecond: config.outboundPerChatPerSecond,
    maxQueue: config.outboundQueueLimit,
  });

  router = new MessageRouter({
    config,
    ownerJids: config.ownerJids,
    permissionTimeoutMs: config.permissionTimeoutMs,
    pluginManager,
    outboundQueue,
    diagnostics,
    logger,
    maxTextLength: config.maxTextLength,
    maxBatch: config.maxInboundBatch,
    concurrency: config.maxPluginConcurrency,
    maxQueue: config.maxPluginQueue,
    prefixes: config.commandPrefixes,
  });

  supervisor = new ConnectionSupervisor({
    config,
    logger,
    diagnostics,
    router,
  });

  healthServer = createHealthServer({
    host: config.host,
    port: config.port,
    logger,
    getStatus: () => supervisor.getStatus(),
  });

  await healthServer.start();
  await supervisor.start();
  logger.info({ nodeEnv: config.nodeEnv, authDirectory: config.authDirectory }, 'Bunny Girl Bot v2 started');
}

process.once('SIGINT', () => void shutdown(0));
process.once('SIGTERM', () => void shutdown(0));
process.on('unhandledRejection', (error) => {
  diagnostics?.processFailure({ error, kind: 'unhandled-rejection' });
  void shutdown(1);
});
process.on('uncaughtException', (error) => {
  diagnostics?.processFailure({ error, kind: 'uncaught-exception' });
  void shutdown(1);
});

try {
  await main();
} catch (error) {
  if (!logger) {
    console.error(error);
  } else {
    logger.fatal({ err: error }, 'Startup failed');
  }
  await shutdown(1);
}
