# wa-bot

Bot de WhatsApp en TypeScript sobre `@whiskeysockets/baileys` (el paquete oficial, publicado en el registro normal de npm), con SQLite (`sql.js`, compilado a WebAssembly) como única fuente de datos (sin archivos `.json` de estado) y soporte de subbots en el mismo proceso.

## Instalación

Requiere **Node 18 o superior**. No hay requisitos especiales de versión para la base de datos: `sql.js` es SQLite compilado a WebAssembly, corre igual en cualquier Node sin importar arquitectura del CPU ni si trae o no módulos de SQLite integrados.

```bash
cp .env.example .env   # edita al menos OWNER
npm install
npm run dev             # desarrollo (recarga automática con tsx watch)
npm start                    # producción
```

El número del bot **principal** no se configura en `.env`: la primera vez que corres el bot, la consola te lo pregunta directamente (`Número del bot principal (sin +, ej. 573001234567): `) y queda guardado en `data/bot.db`. En los arranques siguientes ya no vuelve a preguntar — se reconecta solo con lo que ya tiene registrado. Los subbots se crean después con `.serbot <numero>`, no por consola.

## Despliegue en paneles tipo Pterodactyl (console.akirax.net y similares)

Estos paneles suelen correr `npm install` y luego arrancar un archivo en la raíz. Algunos bloquean que npm descargue dependencias directo de una URL o de git (`EALLOWGIT` / `EALLOWREMOTE`) — como el proyecto usa `@whiskeysockets/baileys` desde el registro normal de npm (no `github:usuario/repo`), no debería toparse con ese bloqueo. Si en algún momento vuelves a necesitar un fork por git específico, el cambio implica actualizar el `import` en cada archivo de `src/` que referencia `@whiskeysockets/baileys` y la línea correspondiente en `package.json`.

**Sobre SQLite y este proyecto en particular:** se probaron tres motores antes de llegar a este. `better-sqlite3` es un addon nativo — necesita un binario `.node` compilado para la arquitectura exacta del contenedor, y en paneles corriendo sobre arm64 ese binario prebuilt puede no existir (`Could not locate the bindings file`). `node:sqlite` (integrado en Node desde la 22.5) evita ese problema, pero en algunos builds de Node de ciertos hostings el módulo directamente no está disponible, con o sin bandera (`No such built-in module: node:sqlite` / `bad option: --experimental-sqlite`, según la versión). `sql.js` (SQLite compilado a WebAssembly) no depende de ninguno de los dos: corre igual sin importar arquitectura de CPU ni qué trae Node integrado, a cambio de manejar la persistencia a mano (exportar y escribir a disco después de cada cambio, ver `src/db/database.ts`).

**Sobre el archivo de arranque:** ya no hay paso de compilación con `tsc` ni carpeta `dist/`. El proyecto corre directo con [`tsx`](https://github.com/privatenumber/tsx), que quita los tipos de TypeScript sin revisarlos — así que un error de tipos entre distintas versiones/forks de una dependencia nunca vuelve a bloquear la instalación (antes `tsc` sí la bloqueaba). Tanto `index.js` como `index.ts` en la raíz registran `tsx` y cargan `src/index.ts` directo, así que no importa cuál de los dos tenga configurado el panel como archivo principal.

## Problemas conocidos

**Error `405: Method Not Allowed` / `401` al conectar (causa confirmada).** La versión de WhatsApp Web que Baileys trae hardcodeada por defecto queda desactualizada con el tiempo; WhatsApp deja de aceptarla y corta la conexión con `405` en el upgrade a WebSocket, antes de llegar al login (confirmado en varios issues abiertos del repo oficial de Baileys, afecta v6 y v7 por igual — no es específico de este proyecto). Por eso `WhatsBot.ts` llama a `fetchLatestBaileysVersion()` antes de crear el socket, para pedir la versión vigente en vez de usar la hardcodeada. Si vuelve a pasar, revisa que esa llamada no esté fallando silenciosamente (sale un aviso en la consola si falla).

## Decisiones de diseño y por qué

**Sin JSON de por medio.** `useMultiFileAuthState` (el default de Baileys) escribe un `.json` por cada credencial/llave en disco. Si el proceso muere a mitad de una escritura, ese archivo queda corrupto y el bot no vuelve a levantar la sesión — el clásico "bug de creds". Aquí todo el estado de auth vive en la tabla `auth_state` de SQLite (`src/db/authState.ts`), con `journal_mode = WAL`, lo que hace cada escritura atómica.

**Bug de `@lid` resuelto de raíz.** WhatsApp identifica a algunos usuarios en grupos con `xxxxx@lid` en vez de `numero@s.whatsapp.net`. `src/utils/jid.ts` centraliza la resolución: primero revisa una cache persistente en SQLite (`lid_map`), y si no la tiene, intenta resolver con `signalRepository.lidMapping` (si el fork lo expone) y guarda el resultado para no repetir el trabajo. Si nada resuelve, se degrada devolviendo el `@lid` crudo en vez de lanzar una excepción — nunca rompe el flujo de mensajes.

**DB compartida entre main y subbots.** Un solo archivo SQLite (`data/bot.db`). La tabla `bots` guarda un registro por bot (`id`, `type` main/sub, `name`, `status`). Todos arrancan con el mismo `DEFAULT_BOT_NAME` hasta que se edite con `.setname`, que solo actualiza el registro de ese bot puntual.

**Subbots en un solo proceso, no procesos separados.** Cada subbot es una instancia de `WhatsBot` (`src/core/WhatsBot.ts`) corriendo en el mismo proceso Node — un socket de Baileys inactivo ronda ~10MB. Lanzar un proceso Node por subbot multiplicaría eso por el overhead fijo del motor (bastante más que 10MB cada uno), así que se evita a propósito.

**Bajo consumo de recursos:**
- `syncFullHistory: false` — no descarga el historial completo al conectar.
- `logger` de Baileys en `silent` — pino en modo verboso cuesta CPU/alloc por cada evento interno.
- `cache_size` de SQLite limitado a ~2MB por conexión, para no acaparar RAM con varios bots activos.
- `markOnlineOnConnect: false` y sin generación de previews de enlaces (`generateHighQualityLinkPreview: false`).

**Consola en bloque, sin decoraciones exageradas.** `src/utils/logger.ts` imprime un bloque de campos por mensaje recibido (`BOT`, `TIPO`, `HORARIO`, `USUARIO`, `CHAT`, `ID`, `COMANDO`), separado del siguiente por una línea simple y tenue — no las líneas onduladas/emoji de otros bots. El campo `BOT` siempre muestra `Main`/`Subbot` + el nombre registrado (nunca el número crudo tipo `...@s.whatsapp.net`), y se actualiza solo con `.setname`. Ejemplo:

```
  BOT      » Main Megumi
  TIPO     » text
  HORARIO  » 23/7/2026, 4:38:42 p. m.
  USUARIO  » Juan Pérez  (+57 300 123 4567)
  CHAT     » Seguidores de la segunda orden
  ID       » 120363402163730347@g.us
  COMANDO  » ping
──────────────────────────────────────────
```

## Comandos incluidos

| Comando | Descripción |
|---|---|
| `.ping` | Responde con la latencia de envío. |
| `.setname <nombre>` | Cambia el nombre registrado del bot que recibió el comando (solo owner). |
| `.serbot <numero>` | Crea un subbot y pide su código de vinculación (solo owner). |
| `.delbot <numero>` | Elimina un subbot y borra sus credenciales (solo owner). |
| `.listbots` | Lista los subbots activos y su estado. |

Agregar un comando nuevo: crea un archivo en `src/commands/`, expórtalo con la firma `CommandHandler` y regístralo en `src/commands/index.ts`.

## Estructura

```
src/
  config/        variables de entorno centralizadas
  db/            conexión sqlite, schema, auth state, repos (bots, lid)
  core/          WhatsBot (una conexión) y SubbotManager (pool de subbots)
  handlers/      messageHandler: detecta tipo, resuelve remitente, loggea, despacha comando
  commands/      un archivo por comando
  utils/         logger, jid (lid), messageType
```

## Nota sobre el fork de Baileys

## Nota sobre el paquete de Baileys

El proyecto usa el paquete oficial `@whiskeysockets/baileys` desde el registro normal de npm. Algunas llamadas (`signalRepository.lidMapping`, `requestPairingCode`) quedaron protegidas con `try/catch` y *feature-detection* de cuando se probó con forks no oficiales — no estorban con el paquete oficial, y sirven de red de seguridad si en el futuro se vuelve a cambiar de paquete.
