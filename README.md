# 🐰 Bunny Girl Bot

Bot de WhatsApp **Multi-Device** basado en `baileys`, ligero y fácil de usar. Trae muchas funciones: gacha, economía, diversión, gestión de grupos, stickers, descargas, IA y más.

> **🍁 Créditos:** creado por **Ginko-MD** — [Instagram @__ikg.05](https://www.instagram.com/__ikg.05) · [GitHub riokuroxi-svg](https://github.com/riokuroxi-svg)

> **Aviso de uso:** Baileys es una conexión no oficial con WhatsApp Web. Usa únicamente un número que controles, respeta los términos de WhatsApp y no automatices spam, acoso ni mensajes masivos.

---

## 🥦 Características

- 🎮 Comandos **Gacha** (y más juegos)
- 💰 Comandos de **economía**
- 😄 Comandos de **diversión** (chistes, 8ball, ship, dado, moneda…)
- 🛠️ **Utilidades**: QR, acortar enlaces, morse, recordatorios, TTS (notas de voz), letras, cripto, carbon, GitHub stalk, encuestas…
- 📥 **Descargas**: TikTok, YouTube, Instagram, Twitter/X, Pinterest, Deezer…
- 🧠 **IA** (Gemini) con memoria
- 🖼️ Gestión de **grupos**, **stickers**, **perfil** y más

---

## 📦 Requisitos

- **Node.js** `>= 22.5.0` (necesario por la base de datos SQLite nativa `node:sqlite`)
- **npm** `>= 10`
- **FFmpeg** e **ImageMagick** instalados y disponibles en `PATH` (para stickers/media)
- Un número de WhatsApp propio para vincular

---

## 🚀 Instalación en Termux (Android)

```bash
termux-setup-storage
```

```bash
pkg update && pkg upgrade -y
pkg install -y git nodejs-lts ffmpeg imagemagick yarn
```

```bash
git clone https://github.com/adan292/bunny-girl-bot-v2
cd bunny-girl-bot-v2
npm install
npm start
```

> Si durante la instalación aparece **(Y/I/N/O/D/Z) [default=N] ?** escribe **"y"** y luego **ENTER** para continuar.

---

## 💻 Instalación en VPS / Linux (PC o servidor)

```bash
# 1. Instalar Node.js 22+ (recomendado con nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22

# 2. FFmpeg e ImageMagick
sudo apt update && sudo apt install -y ffmpeg imagemagick

# 3. Clonar e instalar
git clone https://github.com/adan292/bunny-girl-bot-v2
cd bunny-girl-bot-v2
npm install
npm start
```

---

## ⚙️ Configuración (owner y .env)

### 1. Pon tu número de owner
Edita `settings.js` y cambia el número de `global.owner` (solo dígitos, con código de país, sin `+`):

```js
global.owner = ['5217710000000'];   // ejemplo México
```

> Sin este número no podrás usar los comandos exclusivos de owner (`exec`, `restart`, `update`, etc.).

### 2. Variables de entorno (opcional)
Copia `.env.example` a `.env` y edita según necesites:

```bash
cp .env.example .env
```

Variables disponibles:

| Variable | Uso |
|:---|:---|
| `PORT` | Puerto del servidor HTTP de health check (para hosting/paneles) |
| `PAIRING_METHOD` | `code` para vincular por código de 8 dígitos en vez de QR |
| `PAIRING_NUMBER` | Tu número para vincular automáticamente por código |
| `GEMINI_API_KEY` | Clave de Google Gemini para el comando de IA |
| `GEMINI_MODEL` | Modelo de Gemini (por defecto `gemini-flash-latest`) |

> También puedes crear `config.private.js` (no se sube a GitHub) exportando `geminiKey` y `geminiModel`.

---

## 📱 Vincular WhatsApp

- Ejecuta `npm start`.
- Si no hay sesión, te pedirá elegir: **1 = QR**, **2 = código de 8 dígitos**.
- En WhatsApp abre **Dispositivos vinculados → Vincular un dispositivo → Vincular con número de teléfono**.

### Para servidores / hosting (sin consola interactiva)
Configura `.env` con tu número y método:

```bash
PAIRING_METHOD=code
PAIRING_NUMBER=5217710000000
npm start
```

El bot también levanta un **servidor HTTP** en el puerto `PORT` (por defecto `3000`) con `/` y `/health`, útil para paneles como **BoxMine / Railway / Render**.

---

## 🛠️ Comandos incluidos (algunos)

- `.menu` / `.help` — menú de comandos · `.ping` — latencia
- **Diversión**: `.chiste`, `.dato`, `.8ball`, `.ship`, `.dado`, `.moneda`
- **Utilidades**: `.qr`, `.acortar`, `.morse`, `.recordar`, `.tts`, `.letra`, `.crypto`, `.carbon`, `.gh`, `.encuesta`
- **IA**: `.ai <texto>` · **Descargas**: `.play`, `.tiktok`, `.ytmp3`, `.instagram`…
- **Economía**: `.work`, `.daily`, `.bal`… · **Gacha**: `.claim`, `.roll`, `.harem`…
- **Grupos**: `.kick`, `.promote`, `.welcome`, `.antilink`… · **Stickers**: `.sticker`, `.qc`, `.brat`…

---

## 📄 Licencia

Proyecto de código abierto bajo la licencia **MIT** (consulta el archivo `LICENSE`).

> Este proyecto usa **APIs y servicios externos** de terceros para descargas, IA e imágenes. Esos servicios son independientes de este bot y pueden cambiar o requerir sus propias claves.
