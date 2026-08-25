import makeWASocket, {
  DisconnectReason,
  Browsers,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import qrcodeTerminal from 'qrcode-terminal';

import { config } from '../config';
import { useSQLiteAuthState, resetAuth } from '../auth/authState';
import { ensureBot, getBot, setBotStatus, type BotType } from '../db/botsRepo';
import { logStatus, logError, logPairingCode } from '../utils/logger';
import { handleMessage } from '../handlers/messageHandler';
import type { WASocket } from '../types/wa';

const silentLogger = pino({ level: 'silent' });

const MAX_BACKOFF_MS = 60_000;
// Ventana en la que un código de vinculación sigue siendo válido. Pasado
// esto sin haberse registrado, avisamos en vez de seguir reintentando en
// silencio para siempre.
const PAIRING_TIMEOUT_MS = 60_000;
// Cuánto esperar tras crear el socket antes de pedir el código de
// vinculación. Pedirlo de inmediato revienta la conexión con 428 porque el
// WebSocket todavía no terminó el handshake con WhatsApp.
const PAIRING_REQUEST_DELAY_MS = 3_000;

export class WhatsBot {
  readonly id: string;
  readonly type: BotType;
  sock: WASocket | null = null;
  private stopped = false;
  private everConnected = false;
  private didReset = false;
  private failCount = 0;
  // Una vez pedido el código de vinculación, no se vuelve a pedir otro en
  // los reintentos automáticos — eso invalidaba el anterior antes de que
  // diera tiempo de usarlo. Si el usuario quiere uno nuevo, reinicia.
  private pairingRequested = false;
  private pairingTimedOutWarned = false;

  constructor(id: string, type: BotType) {
    this.id = id;
    this.type = type;
    ensureBot(id, type);
  }

  get label(): string {
    return this.type === 'main' ? 'Main' : 'Subbot';
  }

  get name(): string {
    return getBot(this.id)?.name ?? config.defaultBotName;
  }

  async start(pairingNumber?: string): Promise<void> {
    const { state, saveCreds } = await useSQLiteAuthState(this.id);

    // La versión de WhatsApp Web que trae Baileys "de fábrica" queda
    // desactualizada con el tiempo — WhatsApp deja de aceptarla y corta la
    // conexión con 405 (Method Not Allowed) en el upgrade a WebSocket,
    // antes de siquiera llegar al login. Pedirla en vivo evita justo eso.
    let version: number[] | undefined;
    try {
      const fetched = await fetchLatestBaileysVersion();
      version = fetched.version;
    } catch {
      // Si falla, se usa la versión que trae el paquete de fábrica.
    }

    const sock = makeWASocket({
      ...(version ? { version } : {}),
      auth: {
        creds: state.creds,
        keys: state.keys,
      },
      logger: silentLogger,
      printQRInTerminal: false,
      syncFullHistory: false,
      markOnlineOnConnect: false,
      generateHighQualityLinkPreview: false,
      browser: Browsers.ubuntu('Chrome'),
    });

    this.sock = sock;
    setBotStatus(this.id, 'connecting');

    sock.ev.on('creds.update', saveCreds);

    const shouldRequestPairing =
      !state.creds.registered && config.loginMethod === 'code' && pairingNumber && !this.pairingRequested;

    if (shouldRequestPairing) {
      this.pairingRequested = true;
      // OJO: pedir el código apenas se crea el socket revienta la conexión
      // con 428 (Connection Closed) — el WebSocket todavía no terminó el
      // handshake con WhatsApp. Es un problema muy conocido y documentado
      // en el repo de Baileys (issues #369, #1242, #1382, #1774, entre
      // otros): la solución de la comunidad es esperar unos segundos antes
      // de llamar a requestPairingCode.
      setTimeout(async () => {
        if (state.creds.registered) return; // ya se conectó por otra vía mientras esperábamos
        try {
          const code = await (sock as any).requestPairingCode(pairingNumber);
          logPairingCode(this.label, this.name, code);
          logStatus(
            this.label,
            this.name,
            `Tienes ~1 minuto para ingresarlo (WhatsApp > Dispositivos vinculados > Vincular con número de teléfono). Si se te pasa, corre "rm -rf data" y reinicia para pedir uno nuevo.`,
            'info',
          );
          setTimeout(() => {
            if (!state.creds.registered && !this.pairingTimedOutWarned) {
              this.pairingTimedOutWarned = true;
              logStatus(
                this.label,
                this.name,
                'El código ya venció y no se usó a tiempo. Corre "rm -rf data" y reinicia para pedir uno nuevo — no se va a generar otro solo.',
                'warn',
              );
            }
          }, PAIRING_TIMEOUT_MS);
        } catch (err) {
          logError(this.label, this.name, err);
        }
      }, PAIRING_REQUEST_DELAY_MS);
    }

    sock.ev.on('connection.update', (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr && config.loginMethod === 'qr') {
        qrcodeTerminal.generate(qr, { small: true });
      }

      if (connection === 'open') {
        this.everConnected = true;
        this.failCount = 0;
        setBotStatus(this.id, 'connected');
        logStatus(this.label, this.name, 'Conectado', 'ok');
      }

      if (connection === 'close') {
        setBotStatus(this.id, 'disconnected');
        const boomError = lastDisconnect?.error as Boom | undefined;
        const statusCode = boomError?.output?.statusCode;
        const loggedOut = statusCode === DisconnectReason.loggedOut;
        this.failCount += 1;

        logStatus(
          this.label,
          this.name,
          `Conexión cerrada (código ${statusCode ?? 'desconocido'}: ${boomError?.message ?? 'sin mensaje'})`,
          'warn',
        );

        if (loggedOut && !this.everConnected && !this.didReset) {
          this.didReset = true;
          logStatus(this.label, this.name, 'Nunca conectó: reseteando credenciales una vez y reintentando...', 'warn');
          resetAuth(this.id);
        } else if (loggedOut && this.everConnected) {
          logStatus(this.label, this.name, 'Sesión cerrada, requiere nuevo emparejamiento', 'error');
          return;
        }

        // El código de vinculación queda atado a ESTA conexión: si
        // reconectamos automáticamente mientras el usuario todavía no lo ha
        // ingresado, WhatsApp lo invalida por detrás sin avisar — y el
        // usuario ve "código vencido" segundos después de haberlo tirado.
        // En vez de reconectar solo en este punto, cortamos y avisamos: que
        // reinicie para pedir uno nuevo, ya con la conexión estable.
        const waitingOnPairingCode =
          this.pairingRequested && !state.creds.registered && !this.everConnected;

        if (waitingOnPairingCode) {
          logStatus(
            this.label,
            this.name,
            'La conexión se cayó mientras esperaba que ingresaras el código — eso lo invalida. Corre "rm -rf data" y reinicia para pedir uno nuevo, e ingrésalo apenas aparezca.',
            'error',
          );
          return;
        }

        if (this.failCount === 5) {
          logStatus(
            this.label,
            this.name,
            'Varios intentos fallidos seguidos: si el código de error se repite igual cada vez, probablemente la red del hosting no deja salir hacia los servidores de WhatsApp (no es un problema de credenciales).',
            'error',
          );
        }

        if (!this.stopped) {
          const delay = Math.min(2000 * 2 ** Math.min(this.failCount - 1, 5), MAX_BACKOFF_MS);
          // OJO: ya NO pasamos pairingNumber aquí a propósito. El código ya
          // se pidió una vez (arriba); estos reintentos automáticos solo
          // reconectan el socket, no vuelven a pedir un código nuevo.
          setTimeout(() => this.start(), delay);
        }
      }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }: any) => {
      if (type !== 'notify') return;
      for (const msg of messages) {
        handleMessage(this, msg).catch((err) => logError(this.label, this.name, err));
      }
    });
  }

  async stop(): Promise<void> {
    this.stopped = true;
    await this.sock?.end(undefined);
  }
}
