import makeWASocket, { Browsers } from '@whiskeysockets/baileys';
import { createAtomicFileAuthState } from '../auth/atomic-file-auth-state.js';
import { computeReconnectDelay, classifyDisconnect } from './reconnect-policy.js';
import { sleep } from '../utils/abort.js';

function safeError(value) {
  return value instanceof Error ? value : new Error(String(value));
}

export class ConnectionSupervisor {
  constructor({ config, logger, diagnostics, router }) {
    this.config = config;
    this.logger = logger;
    this.baileysLogger = logger.child({ component: 'baileys' });
    this.diagnostics = diagnostics;
    this.router = router;
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
            directory: `${this.config.authDirectory}/${this.config.sessionId}`,
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

        const classification = classifyDisconnect(result.error);
        this.diagnostics.socketClosed({ error: result.error, classification });
        this.lastError = classification;
        this.connection = 'closed';

        await this.#endSocket(active.socket, result.error);
        this.socket = null;

        if (classification.action === 'purge-session') {
          this.connection = 'needs-pairing';
          await this.authState.clear();
          await this.authState.close();
          this.authState = null;
          this.reconnectAttempt = 0;
          break;
        }

        if (classification.action === 'stop') {
          this.connection = 'stopped';
          break;
        }

        this.reconnectAttempt += 1;
        const delayMs = computeReconnectDelay(this.reconnectAttempt, {
          baseMs: this.config.reconnectBaseMs,
          maxMs: this.config.reconnectMaxMs,
          jitterRatio: this.config.reconnectJitterRatio,
        });
        this.connection = 'reconnecting';
        this.logger.info({ attempt: this.reconnectAttempt, delayMs, reason: classification.reason }, 'Scheduling socket reconnect');
        await sleep(delayMs, this.abortController.signal);
      } catch (error) {
        if (this.stopped || this.abortController.signal.aborted) {
          break;
        }

        const normalizedError = safeError(error);
        this.lastError = { reason: 'supervisor-error', message: normalizedError.message };
        this.connection = 'reconnecting';
        this.logger.error({ err: normalizedError }, 'Socket lifecycle error; entering backoff');
        this.reconnectAttempt += 1;
        const delayMs = computeReconnectDelay(this.reconnectAttempt, {
          baseMs: this.config.reconnectBaseMs,
          maxMs: this.config.reconnectMaxMs,
          jitterRatio: this.config.reconnectJitterRatio,
        });
        try {
          await sleep(delayMs, this.abortController.signal);
        } catch {
          break;
        }
      } finally {
        if (active && this.socket === active.socket && !this.stopped) {
          await this.#endSocket(active.socket);
          this.socket = null;
        }
      }
    }
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
      connectTimeoutMs: 30000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
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
          settle({ error: update.lastDisconnect?.error, shutdown: false });
        }
      });
    });

    socket.ev.on('creds.update', () => {
      void auth.saveCreds().catch((error) => {
        this.logger.error({ err: error }, 'Failed to persist authentication update');
      });
    });

    socket.ev.on('messages.upsert', (event) => {
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
        if (update?.error) {
          this.diagnostics.mediaFailure({
            error: update.error,
            messageId: update.key?.id,
            operation: 'messages.media-update',
          });
        }
      }
    });

    return { socket, closed };
  }

  async #handleConnectionUpdate(socket, update) {
    if (this.socket && this.socket !== socket && this.connection !== 'connecting') {
      return;
    }

    if (update.connection === 'connecting') {
      this.connection = 'connecting';
      await this.#requestPairingCode(socket);
    } else if (update.connection === 'open') {
      this.connection = 'open';
      this.lastError = null;
      this.reconnectAttempt = 0;
      this.logger.info({ user: socket.user?.id ? '[linked]' : '[unknown]' }, 'WhatsApp socket connected');
    } else if (update.connection === 'close') {
      this.connection = 'closed';
    }

    if (update.qr && !this.authState?.state.creds.registered) {
      this.logger.warn('Baileys emitted a QR but QR output is disabled; configure PAIRING_PHONE for pairing-code authentication');
    }
  }

  async #requestPairingCode(socket) {
    if (this.authState?.state.creds.registered || !this.config.pairingPhone || this.pairingSockets.has(socket)) {
      if (!this.authState?.state.creds.registered && !this.config.pairingPhone) {
        this.logger.error('No saved session and PAIRING_PHONE is not configured; pairing cannot start');
      }
      return;
    }

    this.pairingSockets.add(socket);
    try {
      await sleep(1500, this.abortController.signal);
      if (this.stopped || this.socket !== socket || this.authState.state.creds.registered) {
        return;
      }
      const code = await socket.requestPairingCode(this.config.pairingPhone);
      this.logger.warn({ pairingCode: code }, 'Pairing code generated; enter it in WhatsApp linked devices');
    } catch (error) {
      if (!this.stopped) {
        this.logger.error({ err: error }, 'Pairing code request failed');
      }
    }
  }

  async #endSocket(socket, error) {
    try {
      if (socket?.ws && !socket.ws.isClosed) {
        await socket.ws.close();
      }
    } catch (closeError) {
      this.logger.debug({ err: closeError }, 'WebSocket close returned an error');
    }
    try {
      socket?.end?.(error instanceof Error ? error : undefined);
    } catch (endError) {
      this.logger.debug({ err: endError }, 'Baileys socket end returned an error');
    }
  }

  getStatus() {
    return {
      connection: this.connection,
      reconnectAttempt: this.reconnectAttempt,
      pairingRequired: Boolean(this.authState && !this.authState.state.creds.registered),
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
    this.activeCloseResolve?.({ error: new Error('Process shutdown'), shutdown: true });
    await this.#endSocket(this.socket);
    await this.runPromise;
    this.socket = null;
    await this.authState?.close();
    this.authState = null;
    this.connection = 'stopped';
  }
}
