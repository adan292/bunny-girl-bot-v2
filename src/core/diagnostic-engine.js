import { classifyDisconnect } from './reconnect-policy.js';
import {
  MediaProcessingError,
  PluginExecutionError,
} from '../utils/errors.js';

const APP_STATE_COLLECTIONS = Object.freeze([
  'critical_unblock_low',
  'regular_high',
  'regular_low',
  'critical_block',
  'regular',
]);

function errorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function safeStatus(error) {
  return error instanceof Error
    ? {
        name: error.name,
        code: error.code,
        message: error.message,
      }
    : { value: String(error) };
}

/**
 * Runtime diagnostic state machine. It does not mutate a socket directly on a
 * close event: it returns a recovery plan, allowing the supervisor to perform
 * socket disposal and reconnection in one serialized lifecycle loop.
 */
export class DiagnosticEngine {
  constructor({ logger, maxResyncAttempts = 2, appStateCollections = APP_STATE_COLLECTIONS }) {
    if (!logger || typeof logger.warn !== 'function' || typeof logger.error !== 'function') {
      throw new TypeError('DiagnosticEngine requires warn and error logger methods');
    }
    if (!Number.isSafeInteger(maxResyncAttempts) || maxResyncAttempts < 1) {
      throw new RangeError('maxResyncAttempts must be a positive integer');
    }
    if (!Array.isArray(appStateCollections) || appStateCollections.length === 0) {
      throw new TypeError('appStateCollections must be a non-empty array');
    }

    this.logger = logger;
    this.maxResyncAttempts = maxResyncAttempts;
    this.appStateCollections = Object.freeze([...appStateCollections]);
    this.resyncAttempts = new WeakMap();
  }

  /**
   * Evaluate a socket failure and produce an explicit recovery plan.
   */
  diagnoseSocket({ error, context = 'socket' } = {}) {
    const classification = classifyDisconnect(error);
    const plan = Object.freeze({
      kind: 'socket',
      context,
      ...classification,
      requiresAuthPurge: classification.purgeAuth === true,
      requiresAppStateResync: classification.resyncAppState === true,
    });

    this.logger.warn({
      event: 'diagnostic.socket',
      statusCode: plan.statusCode,
      reason: plan.reason,
      action: plan.action,
      requiresAuthPurge: plan.requiresAuthPurge,
      requiresAppStateResync: plan.requiresAppStateResync,
    }, 'Socket failure classified');

    return plan;
  }

  /**
   * Backward-compatible supervisor hook that logs and returns the plan.
   */
  socketClosed({ error, classification } = {}) {
    const plan = classification ?? this.diagnoseSocket({ error, context: 'connection.update' });

    this.logger.warn({
      event: 'socket.closed',
      statusCode: plan.statusCode,
      reason: plan.reason,
      action: plan.action,
      requiresAuthPurge: plan.purgeAuth === true,
      requiresAppStateResync: plan.resyncAppState === true,
      err: safeStatus(error),
    }, 'WhatsApp socket closed');

    return plan;
  }

  /**
   * Re-sync app-state collections on a fresh socket. This is intentionally
   * bounded and isolated; a failed resync never throws into the socket loop.
   */
  async resyncAppState(socket, { isInitialSync = false, reason = 'diagnostic' } = {}) {
    if (!socket || typeof socket.resyncAppState !== 'function') {
      return {
        attempted: false,
        succeeded: false,
        reason: 'socket-does-not-support-resync',
      };
    }

    const previousAttempts = this.resyncAttempts.get(socket) ?? 0;
    if (previousAttempts >= this.maxResyncAttempts) {
      this.logger.warn({
        event: 'diagnostic.app-state-resync-skipped',
        attempts: previousAttempts,
        reason,
      }, 'App-state resync attempt limit reached');
      return {
        attempted: false,
        succeeded: false,
        reason: 'resync-attempt-limit',
      };
    }

    this.resyncAttempts.set(socket, previousAttempts + 1);

    try {
      await socket.resyncAppState(this.appStateCollections, isInitialSync);
      this.logger.info?.({
        event: 'diagnostic.app-state-resync-success',
        attempt: previousAttempts + 1,
        reason,
      }, 'App-state synchronized');
      return {
        attempted: true,
        succeeded: true,
        reason: 'resync-complete',
      };
    } catch (error) {
      this.logger.error({
        event: 'diagnostic.app-state-resync-failure',
        attempt: previousAttempts + 1,
        reason,
        err: this.#safeError(error),
      }, 'App-state resync failed; socket lifecycle remains isolated');
      return {
        attempted: true,
        succeeded: false,
        reason: 'resync-failed',
        error,
      };
    }
  }

  diagnoseMedia({ error, messageId, operation = 'media' } = {}) {
    const message = errorMessage(error).toLowerCase();
    const isKeyOrMacFailure = /pre[- ]?key|app[- ]?state|invalid mac|decrypt|cipher|signal/u.test(message);
    const plan = Object.freeze({
      kind: 'media',
      action: isKeyOrMacFailure ? 'resync-and-retry' : 'retry-range-download',
      retryDownload: true,
      resyncAppState: isKeyOrMacFailure,
      messageId,
      operation,
    });

    this.logger.warn({
      event: 'diagnostic.media',
      action: plan.action,
      resyncAppState: plan.resyncAppState,
      messageId,
      operation,
      err: this.#safeError(error),
    }, 'Media failure classified');

    return plan;
  }

  mediaFailure({ error, messageId, operation } = {}) {
    const normalized = error instanceof MediaProcessingError
      ? error
      : new MediaProcessingError('Media operation failed', {
          operation: operation ?? 'unknown',
          cause: error,
        });

    this.logger.warn({
      event: 'media.failure',
      operation,
      messageId,
      err: this.#safeError(normalized),
    }, 'Media operation failed; stream isolated');

    return this.diagnoseMedia({
      error: normalized,
      messageId,
      operation,
    });
  }

  pluginFailure({ error, pluginName, messageId, jid } = {}) {
    const normalized = error instanceof PluginExecutionError
      ? error
      : new PluginExecutionError('Plugin execution failed', {
          pluginName,
          messageId,
          jid,
          cause: error,
        });

    this.logger.error({
      event: 'plugin.failure',
      pluginName,
      messageId,
      jid,
      err: this.#safeError(normalized),
    }, 'Plugin failure isolated from the socket event loop');

    return normalized;
  }

  malformedMessage({ reason, messageId, jid } = {}) {
    this.logger.warn({
      event: 'message.rejected',
      reason,
      messageId,
      jid,
    }, 'Inbound message rejected by safety boundary');
  }

  processFailure({ error, kind } = {}) {
    const log = this.logger.fatal ?? this.logger.error;
    log.call(this.logger, {
      event: `process.${kind ?? 'unknown'}`,
      err: this.#safeError(error),
    }, 'Process-level failure received');
  }

  resetSocket(socket) {
    if (socket && typeof socket === 'object') {
      this.resyncAttempts.delete(socket);
    }
  }

  #safeError(error) {
    if (!(error instanceof Error)) {
      return { value: String(error) };
    }

    return {
      name: error.name,
      code: error.code,
      message: error.message,
      stack: error.stack,
      cause: error.cause instanceof Error ? {
        name: error.cause.name,
        code: error.cause.code,
        message: error.cause.message,
      } : undefined,
    };
  }
}

export { APP_STATE_COLLECTIONS };
