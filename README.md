# 🐰 Bunny Bot V2 + IA

Bot modular de WhatsApp para Node.js + Baileys con IA conversacional.

## 🤖 IA

Configura en `.env`:
```env
OPENAI_API_KEY=tu_clave
AI_MODEL=gpt-4.1-mini
AI_ENABLED=true
AI_MAX_CHARS=5000
```

Comandos:
- `#ia pregunta`
- `#ai pregunta`
- `#bunny pregunta`

Ejemplos:
```text
#ia explícame qué es Node.js
#ia crea un comando JavaScript para mi bot
#ai dame ideas para mejorar Bunny Bot
```

En privado Bunny puede responder sin prefijo. En grupos responde cuando la mencionan:
`@Bunny ¿qué es JavaScript?`

La memoria conversacional conserva las últimas interacciones por chat en RAM y se borra al reiniciar.

## Instalación
```bash
npm install
npm start
```

## ⚠️ Seguridad
No compartas `OPENAI_API_KEY` ni subas `.env` a GitHub. El uso de una API de IA puede generar costos en la cuenta del proveedor.

## Sistemas
Administración, welcome/goodbye, anti-link, anti-spam, anti-palabras, economía, banco, tienda, inventario, XP, niveles, casino, juegos, RPG, afinidad, frases anime e IA.


## 💜 Interacciones

Comandos incluidos: `#punch`, `#kiss`, `#hug`, `#cafe`, `#pat`, `#slap`, `#bite`, `#cuddle`, `#poke`, `#tickle`, `#dance`, `#cry`, `#happy`, `#angry`, `#baka`, `#run`, `#sleep`, `#eat`, `#drink`, `#love`, `#jealous`, `#shy`, `#laugh`, `#highfive`, `#handhold`, `#bonk`, `#stare`, `#smile`, `#shoot`.

Los GIF son opcionales. Bunny intenta, en este orden: 1) GIF/MP4 local en `media/interactions/`; 2) GIPHY si configuras `GIPHY_API_KEY`; 3) texto como respaldo.

## 🧪 Comprobación

El proyecto incluye `index.js` en la raíz y todos los módulos necesarios. Antes de iniciar: `npm install` y luego `npm start`.
