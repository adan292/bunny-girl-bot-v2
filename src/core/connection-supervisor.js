import makeWASocket, { Browsers } from '@whiskeysockets/baileys';
import { join } from 'node:path';
import { createAtomicFileAuthState } from '../auth/atomic-file-auth-state.js';
import { computeReconnectDelay } from './reconnect-policy.js';
import {
  ConnectionTimeoutError,
} from '../utils/errors.js';
import { sleep } from '../utils/abort.js';

function normalizeLifecycleError(value, { phase = 'socket', timeoutMs } = {}) {
  if (value instanceof ConnectionTimeoutError) {
    return value;
  }

  if (
    value?.code === 'ETIMEDOUT'
    || value?.name === 'TimeoutError'
    || value?.code === 'UND_ERR_CONNECT_TIMEOUT'
  ) {
    return new ConnectionTimeoutError(`${phase} timed out`, {
      timeoutMs,
      phase,
      cause: value,
    });
  }

  return value instanceof Error ? value : new Error(String(value));
}

function pairCodeForDisplay(code) {
  const value = String(code ?? '').replace(/\s|-/gu, '');
  if (value.length === 8) {
    return `${value.slice(0, 4)}-${value.slice(4)}`;
  }
  return String(code ?? '');
}

/**
 * Owns exactly one Baileys socket at a time. The lifecycle is a serialized
 * loop: a socket is created, observed until close, classified, disposed and
 * only then is a replacement created.
 */
export class ConnectionSupervisor {
  constructor({ config, logger, diagnostics, router, groupHandler }) {
    if (!config || !logger || !diagnostics) {
      throw new TypeError('ConnectionSupervisor requires config, logger and diagnostics');
    }

    this.config = config;
    this.logger = logger;
    this.baileysLogger = logger.child({ component: 'baileys' });
    this.diagnostics = diagnostics;
    this.router = router;
    this.groupHandler = groupHandler ?? null;
    this.abortController = new AbortController();
    this.authState = null;
    this.socket = null;
    this.runPromise = null;
    this.activeCloseResolve = null;
    this.stopped = false;
    this.connection = 'idle';
    this.lastError = null;
    this.reconnectAttempt = 0;
    this.pairingSockets = new WeakSet();
    this.missingPairingPhoneLogged = false;
    this.pendingAppStateResync = false;
    this.pendingResyncReason = null;
  }

  async start() {
    if (this.runPromise) {
      return;
    }

    this.stopped = false;
    this.abortController = new AbortController();
    this.runPromise = this.#runLoop();

    this.runPromise.catch((error) => {
      this.diagnostics.processFailure({ error, kind: 'supervisor' });
      this.connection = 'fatal';
    });
  }

  async #runLoop() {
    while (!this.stopped) {
      let active = null;

      try {
        if (!this.authState) {
          this.connection = 'loading-auth';
          this.authState = await createAtomicFileAuthState({
            directory: join(this.config.authDirectory, this.config.sessionId),
            logger: this.baileysLogger,
          });
        }

        active = await this.#createSocket();
        this.socket = active.socket;
        this.connection = 'connecting';

        const result = await active.closed;

        if (this.stopped || result.shutdown) {
          break;
        }

        const classification = this.diagnostics.socketClosed({
          error: result.error,
          classification: this.diagnostics.diagnoseSocket({
            error: result.error,
            context: 'connection.update',
          }),
        });

        this.lastError = classification;
        this.connection = 'closed';

        if (classification.requiresAppStateResync) {
          this.pendingAppStateResync = true;
          this.pendingResyncReason = classification.reason;
        }

        this.socket = null;
        active.dispose?.();
        await this.#endSocket(active.socket, result.error);
        this.diagnostics.resetSocket?.(active.socket);

        if (classification.requiresAuthPurge || classification.action === 'purge-session') {
          this.connection = 'needs-pairing';
          await this.#purgeAuthState();
          this.reconnectAttempt = 0;
          this.connection = 'pairing';
          continue;
        }

        if (!classification.shouldReconnect || classification.action === 'stop') {
          this.connection = 'stopped';
          break;
        }

        this.reconnectAttempt += 1;
        const delayMs = this.#reconnectDelay(this.reconnectAttempt);
        this.connection = 'reconnecting';

        this.logger.info({
          attempt: this.reconnectAttempt,
          delayMs,
          reason: classification.reason,
          statusCode: classification.statusCode,
        }, 'Scheduling socket reconnect');

        await sleep(delayMs, this.abortController.signal);
      } catch (error) {
        if (this.stopped || this.abortController.signal.aborted) {
          break;
        }

        const normalizedError = normalizeLifecycleError(error, {
          phase: 'socket-lifecycle',
          timeoutMs: this.config.connectTimeoutMs ?? 30000,
        });

        this.lastError = {
          reason: 'supervisor-error',
          message: normalizedError.message,
          code: normalizedError.code,
        };
        this.connection = 'reconnecting';

        this.logger.error({ err: normalizedError }, 'Socket lifecycle error; entering backoff');

        this.reconnectAttempt += 1;

        try {
          await sleep(
            this.#reconnectDelay(this.reconnectAttempt),
            this.abortController.signal,
          );
        } catch {
          break;
        }
      } finally {
        if (active && this.socket === active.socket && !this.stopped) {
          this.socket = null;
          active.dispose?.();
          await this.#endSocket(active.socket);
          this.diagnostics.resetSocket?.(active.socket);
        }
      }
    }
  }

  #reconnectDelay(attempt) {
    return this.config.reconnectDelay
      ? this.config.reconnectDelay(attempt)
      : this.#defaultReconnectDelay(attempt);
  }

  #defaultReconnectDelay(attempt) {
    return computeReconnectDelay(attempt, {
      baseMs: this.config.reconnectBaseMs ?? 1000,
      maxMs: this.config.reconnectMaxMs ?? 60000,
      jitterRatio: this.config.reconnectJitterRatio ?? 0.25,
      seed: this.config.sessionId ?? 'primary',
    });
  }

  async #createSocket() {
    const auth = this.authState;
    if (!auth) {
      throw new Error('Authentication state was not initialized');
    }

    const socket = makeWASocket({
      auth: auth.state,
      logger: this.baileysLogger,
      browser: Browsers.ubuntu('Bunny Girl Bot v2'),
      printQRInTerminal: false,
      connectTimeoutMs: this.config.connectTimeoutMs ?? 30000,
      defaultQueryTimeoutMs: this.config.defaultQueryTimeoutMs ?? 60000,
      keepAliveIntervalMs: this.config.keepAliveIntervalMs ?? 25000,
      markOnlineOnConnect: false,
      syncFullHistory: false,
      fireInitQueries: true,
      generateHighQualityLinkPreview: false,
      retryRequestDelayMs: 250,
      maxMsgRetryCount: 3,
      transactionOpts: {
        maxCommitRetries: 3,
        delayBetweenTriesMs: 100,
      },
      appStateMacVerification: {
        patch: true,
        snapshot: true,
      },
      getMessage: async () => undefined,
      cachedGroupMetadata: async () => undefined,
    });

    let settled = false;

    const closed = new Promise((resolve) => {
      const settle = (result) => {
        if (settled) {
          return;
        }

        settled = true;

        if (this.activeCloseResolve === settle) {
          this.activeCloseResolve = null;
        }

        resolve(result);
      };

      this.activeCloseResolve = settle;

      socket.ev.on('connection.update', (update) => {
        void this.#handleConnectionUpdate(socket, update);

        if (update.connection === 'close') {
          settle({
            error: update.lastDisconnect?.error,
            shutdown: false,
          });
        }
      });
    });

    socket.ev.on('creds.update', () => {
      void auth.saveCreds().catch((error) => {
        this.logger.error({ err: error }, 'Failed to persist authentication update');
      });
    });

    socket.ev.on('messages.upsert', (event) => {
      if (!this.router?.handleEvent) {
        return;
      }

      void this.router.handleEvent({
        socket,
        event,
        signal: this.abortController.signal,
      }).catch((error) => {
        this.logger.error({ err: error }, 'Message router escaped its isolation boundary');
      });
    });

    socket.ev.on('messages.media-update', (updates) => {
      for (const update of Array.isArray(updates) ? updates : []) {
        if (!update?.error) {
          continue;
        }

        this.diagnostics.mediaFailure({
          error: update.error,
          messageId: update.key?.id,
          operation: 'messages.media-update',
        });
      }
    });

    const disposeGroupHandlers = this.groupHandler?.attach(socket) ?? (() => {});
    return {
      socket,
      closed,
      dispose: disposeGroupHandlers,
    };
  }

  async #handleConnectionUpdate(socket, update) {
    if (this.socket && this.socket !== socket) {
      return;
    }

    if (update.connection === 'connecting') {
      this.connection = 'connecting';
      await this.#requestPairingCode(socket);
    } else if (update.connection === 'open') {
      this.connection = 'open';
      this.lastError = null;
      this.reconnectAttempt = 0;

      this.logger.info({
        user: socket.user?.id ? '[linked]' : '[unknown]',
      }, 'WhatsApp socket connected');

      if (this.pendingAppStateResync) {
        const reason = this.pendingResyncReason ?? 'socket-recovery';
        this.pendingAppStateResync = false;
        this.pendingResyncReason = null;

        void this.diagnostics.resyncAppState(socket, {
          isInitialSync: false,
          reason,
        });
      }
    } else if (update.connection === 'close') {
      this.connection = 'closed';
    }

    if (update.qr && !this.authState?.state.creds.registered) {
      this.logger.warn(
        'Baileys emitted a QR but QR output is disabled; configure PAIRING_PHONE for pairing-code authentication',
      );
    }
  }

  async #requestPairingCode(socket) {
    if (
      !this.authState
      || this.authState.state.creds.registered
      || this.pairingSockets.has(socket)
    ) {
      return;
    }

    if (!this.config.pairingPhone) {
      if (!this.missingPairingPhoneLogged) {
        this.missingPairingPhoneLogged = true;
        this.logger.error(
          'No saved session and PAIRING_PHONE is not configured; pairing cannot start',
        );
      }
      return;
    }

    this.pairingSockets.add(socket);

    try {
      await sleep(1500, this.abortController.signal);

      if (
        this.stopped
        || this.socket !== socket
        || this.authState.state.creds.registered
      ) {
        return;
      }

      const code = await socket.requestPairingCode(this.config.pairingPhone);

      this.logger.warn({
        pairingCode: pairCodeForDisplay(code),
      }, 'Pairing code generated; enter it in WhatsApp linked devices');
    } catch (error) {
      if (!this.stopped) {
        const normalizedError = normalizeLifecycleError(error, {
          phase: 'pairing-code-request',
          timeoutMs: this.config.defaultQueryTimeoutMs ?? 60000,
        });

        this.logger.error({ err: normalizedError }, 'Pairing code request failed');
      }
    }
  }

  async #purgeAuthState() {
    const auth = this.authState;
    if (!auth) {
      return;
    }

    try {
      await auth.clear();
    } finally {
      await auth.close();
      this.authState = null;
    }
  }

  async #endSocket(socket, error) {
    try {
      if (socket?.ws && !socket.ws.isClosed) {
        await socket.ws.close();
      }
    } catch (closeError) {
      this.logger.debug?.({ err: closeError }, 'WebSocket close returned an error');
    }

    try {
      socket?.end?.(error instanceof Error ? error : undefined);
    } catch (endError) {
      this.logger.debug?.({ err: endError }, 'Baileys socket end returned an error');
    }
  }

  getStatus() {
    return {
      connection: this.connection,
      reconnectAttempt: this.reconnectAttempt,
      pairingRequired: this.connection === 'needs-pairing'
        || this.connection === 'pairing'
        || Boolean(this.authState && !this.authState.state.creds.registered),
      lastError: this.lastError,
    };
  }

  async shutdown() {
    if (this.stopped) {
      await this.runPromise;
      return;
    }

    this.stopped = true;
    this.connection = 'stopping';
    this.abortController.abort(new Error('Process shutdown'));
    this.activeCloseResolve?.({
      error: new Error('Process shutdown'),
      shutdown: true,
    });

    await this.#endSocket(this.socket);
    await this.runPromise;

    this.socket = null;
    await this.authState?.close();
    this.authState = null;
    this.connection = 'stopped';
  }
}

export { pairCodeForDisplay };
