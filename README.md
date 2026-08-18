# 🐰 Bunny Girl Bot

Bot de WhatsApp **Multi-Device** basado en `baileys`, con muchas funciones: gacha, economía, gestión de grupos, stickers, descargas, perfil y más.

> **Aviso de uso:** Baileys es una conexión no oficial con WhatsApp Web. Usa únicamente un número que controles, respeta los términos de WhatsApp y no automatices spam, acoso ni mensajes masivos.

---

## 🥦 Características

- Comandos Gacha (y más juegos)
- Comandos de economía
- Respuestas automáticas
- Gestión de grupos
- Stickers
- Descargas (TikTok, YouTube, Instagram, Twitter/X, etc.)
- Integración con APIs externas

---

## 📦 Requisitos

- **Node.js** `>= 22.13.0`
- **npm** `>= 10.9.4`
- **FFmpeg** e **ImageMagick** instalados y disponibles en `PATH` (para stickers/media)
- Un número de WhatsApp propio para vincular

---

## 🚀 Instalación

```bash
git clone https://github.com/adan292/bunny-girl-bot-v2
```

```bash
cd bunny-girl-bot-v2
```

```bash
npm install
```

```bash
npm start
```

> Si durante la instalación aparece **(Y/I/N/O/D/Z) [default=N] ?** escribe **"y"** y luego **ENTER** para continuar.

---

## 📱 Vincular WhatsApp

- Ejecuta `npm start`.
- Al iniciar aparecerá en el log un **código de vinculación** (o el QR con la opción `--qr`).
- En WhatsApp abre **Dispositivos vinculados → Vincular un dispositivo → Vincular con número de teléfono**.

### Obtener una nueva sesión

Detén el bot (Ctrl + Z, luego `z` + ENTER hasta ver el prompt) y ejecuta:

```bash
cd && cd bunny-girl-bot-v2 && rm -rf Sessions/Owner && npm start
```

---

## ⚙️ Configuración

Edita `settings.js` y pon **tu número de WhatsApp** con código de país en `global.owner`:

```js
global.owner = ['5217710000000'];
```

> Sin este número no podrás usar los comandos exclusivos de owner (`exec`, `restart`, `update`, etc.).

---

## 🛠️ Comandos incluidos

- `.menu` / `.help` — menú de comandos.
- `.ping` — latencia.
- Comandos de **economía**: `.work`, `.daily`, `.bal`, `.dep`, `.withdraw`, etc.
- Comandos de **gacha**: `.claim`, `.roll`, `.harem`, `.sell`, etc.
- Comandos de **grupo**: `.kick`, `.promote`, `.demote`, `.welcome`, `.antilink`, etc.
- Comandos de **stickers**: `.sticker`, `.qc`, `.brat`, etc.
- Comandos de **descargas**: `.tiktok`, `.play`, `.ytmp3`, `.instagram`, etc.

---

## 📄 Licencia

Proyecto de código abierto bajo la licencia **MIT** (consulta el archivo `LICENSE`).

> Este proyecto usa varias **APIs y servicios externos** de terceros para funciones de descarga, IA e imágenes. Esos servicios son independientes de este bot y pueden cambiar o requerir sus propias claves. Si dejas de usar una API, el comando correspondiente dejará de funcionar.
