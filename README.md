# 🐰 Bunny Bot V2

Bot modular de WhatsApp para Node.js + Baileys.

## Requisitos
- Node.js 18.17+
- Una cuenta de WhatsApp para vincular el bot.

## Instalación
1. Copia `.env.example` a `.env`.
2. Configura `OWNER_NUMBER` y `PHONE_NUMBER`.
3. Ejecuta:
```bash
npm install
npm start
```
4. Escanea el QR mostrado en la terminal.

## Sistemas incluidos
- Administración de grupos
- Welcome/goodbye
- Anti-link, anti-flood, anti-spam y anti-palabras
- Warns
- Economía con banco
- Daily, weekly, work
- Transferencias
- Rob
- Tienda e inventario
- XP, niveles y ranking
- Casino: coinflip, dados, slots, ruleta y blackjack
- Juegos: RPS, adivina número, trivia
- RPG: personaje, estadísticas, duelo y batalla
- Afinidad con Bunny
- Frases anime originales
- Perfil de usuario
- Comandos de owner
- Arquitectura modular

## Nota sobre multimedia
Los comandos de sticker/media están preparados como base y algunos requieren integrar un proveedor o librería adicional. No se incluyen APIs externas ni credenciales inventadas.
