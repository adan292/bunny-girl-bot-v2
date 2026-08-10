# Bunny Girl Bot v2

Framework ESM para un bot de WhatsApp Multi-Device resiliente sobre Baileys. Este repositorio es la nueva línea de desarrollo; el repositorio privado `Bunny-girl-bot-` no forma parte de este árbol y no se modifica.

> **Aviso de uso:** Baileys implementa una conexión no oficial con WhatsApp Web. Usa únicamente un número que controles, respeta los términos de WhatsApp y no automatices spam, acoso, mensajes masivos ni contactos que no hayan dado consentimiento. La limitación de velocidad de este proyecto protege recursos y reduce errores; no garantiza evitar bloqueos.

## Estado actual

La primera entrega construye el core limpio, sin copiar archivos ni sesiones del proyecto anterior:

- ESM estricto sobre Node.js 20+.
- Autenticación por código de vinculación, con validación de número internacional.
- Estado de autenticación propio, con cola serial, escritura temporal + `rename`, `fsync` y permisos restrictivos.
- Adaptador SQLite con WAL, transacciones, cooldowns, economía, experiencia y configuración por grupo.
- Supervisor de socket con una sola conexión activa, backoff exponencial con jitter y clasificación explícita de desconexiones.
- Pipeline de plugins asíncrono y recargable en caliente, con aislamiento de errores por plugin.
- Normalización de mensajes con comandos, prefijos personalizados por grupo, argumentos, menciones, citas e interacciones de botones/listas.
- Builders para listas InteractiveMessage, fallback legacy y polls con mapas de comandos.
- Router con permisos de usuario, admin, bot-admin y owner mediante metadatos de grupos, además de cooldown persistente por usuario/comando.
- Listener de eventos de grupos para bienvenidas, despedidas, anti-link y administración modular.
- Cola de salida con token bucket global y por chat, límites de cola y backpressure.
- Plugin de descargas HTTP(S) con validación SSRF básica, límites de bytes, redirects controlados y streams sin archivos temporales.
- Plugin de economía con `.bal`, `.work` y `.daily`, cooldowns y persistencia atómica aislada.
- Servidor HTTP de salud para despliegues.
- Utilidad de media preparada para `fluent-ffmpeg`, `stream.pipeline`, `AbortSignal`, timeouts estrictos y `node-webpmux`.
- Pruebas unitarias de las piezas que no requieren una cuenta de WhatsApp ni un binario FFmpeg.

El adaptador de archivos es seguro para un solo proceso y sirve como base local/despliegue inicial. Para escalar a varias réplicas, el siguiente adaptador debe usar Redis o MongoDB con un lock distribuido y la misma interfaz de estado; no se simula una garantía distribuida con archivos locales.

## Arquitectura

```text
src/main.js
  ├─ config/env.js                 Configuración y validación
  ├─ auth/atomic-file-auth-state.js Estado creds + Signal keys
  ├─ core/connection-supervisor.js  Ciclo de vida del socket Baileys
  ├─ core/diagnostic-engine.js      Clasificación y recuperación
  ├─ core/worker-task-runner.js     CPU-bound fuera del Event Loop
  ├─ messaging/message-router.js    Backpressure + aislamiento de plugins
  ├─ plugins/plugin-manager.js      Import dinámico y hot reload
  ├─ messaging/outbound-queue.js    Rate limit y backpressure de salida
  ├─ media/ffmpeg-pipeline.js       Streams, timeout y metadata WebP
  └─ http/health-server.js           /healthz y /readyz
```

## Instalación

Requisitos:

- Node.js `>=20.0.0`.
- FFmpeg instalado y disponible en `PATH` si se usa el pipeline de media.
- SQLite nativo mediante `better-sqlite3` compatible con Node.js 20.
- Un número propio con capacidad de vincular dispositivos.

```bash
cp .env.example .env
npm install
```

Configura `PAIRING_PHONE` con el número internacional, incluyendo código de país. Se aceptan separadores comunes, pero se envía a Baileys únicamente la cadena de dígitos E.164 sin `+`.

```bash
PAIRING_PHONE="+52 771 000 0000" npm start
```

Al arrancar por primera vez, el código de vinculación aparecerá en el log. En WhatsApp abre **Dispositivos vinculados → Vincular un dispositivo → Vincular con número de teléfono**.

## Comandos incluidos

- `.menu` y `/menu` muestran el menú del core.
- `.ping` devuelve la latencia de la respuesta.
- `.bal`, `.work` y `.daily` gestionan economía y experiencia.
- `.download URL` descarga un recurso multimedia seguro.
- `.kick`, `.promote`, `.demote`, `.tagall` y `.hidetag` administran grupos.
- `.antilink`, `.welcome`, `.goodbye` y `.prefix` configuran grupos.

Los plugins se cargan desde `src/plugins`. Cada archivo `*.plugin.js` debe exportar un objeto default con `name`, `priority`, `match` y `execute`. El gestor mantiene el plugin anterior si una edición nueva tiene un error de sintaxis o contrato.

## Endpoints

- `GET /healthz`: el proceso HTTP está vivo.
- `GET /readyz`: el proceso está vivo y el socket está conectado.
- `GET /`: metadatos mínimos del servicio.

## Validación local

```bash
npm test
npm run check
```

No se incluyen sesiones, tokens, números reales, archivos `.env`, `node_modules` ni datos de WhatsApp en el repositorio público.
