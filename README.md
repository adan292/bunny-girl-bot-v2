# 🐰 Mai Sakurajima Bot — WhatsApp Multi-Device

<p align="center">
  <img src="https://tenor.com" width="75%" alt="Mai Sakurajima Bot">
</p>

> Bot de WhatsApp multifuncional, interactivo y entretenido, desarrollado sobre la base **Ginko-MD** con un sistema enfocado en gacha, economía virtual, IA y descargas.

<p align="center">
  ⭐ <b>2 Stars</b> &nbsp;&nbsp;|&nbsp;&nbsp; 🌿 <b>Base Ginko-MD</b> &nbsp;&nbsp;|&nbsp;&nbsp; 🚀 <b>Node.js v16+</b>
</p>

<p align="center">
  <a href="https://whatsapp.com" target="_blank">
    <img src="https://shields.io" alt="Canal de WhatsApp">
  </a>
  &nbsp;&nbsp;
  <a href="https://whatsapp.com" target="_blank">
    <img src="https://shields.io" alt="Grupo de WhatsApp">
  </a>
</p>

> [!NOTE]
> **Mai Sakurajima Bot** está diseñado para ofrecer una experiencia interactiva y divertida dentro de tus grupos y chats privados. Inspirado en el personaje Mai Sakurajima de *Seishun Buta Yarou*.

---

## 📢 ¡Apoya al Proyecto!

¿Te gusta el bot? Apoya el desarrollo del proyecto y mantente al tanto de todas las novedades:

*   📢 **Canal Oficial:** [Únete aquí](https://whatsapp.com) para enterarte de actualizaciones, mantenimiento y corrección de errores.
*   👥 **Grupo de la Comunidad:** [Entra aquí](https://whatsapp.com) para resolver dudas, reportar fallos y compartir con otros usuarios.
*   👨‍💻 **Creador:** Adán (Contacto: [+58 4120299482](https://wa.me))

---

## 🌟 Características Principales

*   **🎰 Sistema Gacha:** Colecciona personajes de anime, administra tu inventario y prueba tu suerte.
*   **💰 Economía Virtual:** Gana monedas, realiza transferencias, compra en la tienda y compite en el ranking.
*   **🎉 Diversión y Juegos:** Comandos interactivos, juegos en grupo, trivias y respuestas dinámicas.
*   **🧠 Inteligencia Artificial:** Integración de IA para responder preguntas y conversar con los usuarios de forma fluida.
*   **📥 Descargas:** Baja música, videos, fotos y contenido de tus redes sociales favoritas directamente en tu chat.

---

## 🚀 Requisitos

Antes de instalar el bot, asegúrate de contar con las siguientes herramientas en tu entorno:

| Requisito | Descripción |
|---|---|
| Git | Para clonar el repositorio |
| Node.js v16+ | Para ejecutar el entorno de JavaScript |
| FFmpeg | Para el correcto procesamiento de audio, video y stickers |

---

## 🛠️ Instalación y Configuración

<details>
<summary><strong>🐧 Linux / Ubuntu</strong></summary>

```bash
apt update && apt upgrade -y
```
```bash
apt install git nodejs ffmpeg -y
```
```bash
git clone https://github.com
```
```bash
cd bunny-girl-bot-v2
```
```bash
npm install
```
```bash
cp .env.example .env
```
> Configura el archivo `.env` antes de arrancar.
```bash
npm start
```

</details>

<details>
<summary><strong>📱 Termux</strong></summary>

```bash
termux-setup-storage
```
```bash
pkg update && pkg upgrade -y
```
```bash
pkg install -y nodejs-lts git ffmpeg libwebp
```
```bash
git clone https://github.com && cd bunny-girl-bot-v2
```
```bash
npm install
```
```bash
cp .env.example .env
```
> Configura tus datos y credenciales en el archivo `.env`.
```bash
npm start
```

</details>

> 📱 Al iniciar, escanea el código QR que aparecerá en tu terminal usando la opción de **Dispositivos vinculados** en tu aplicación de WhatsApp.

---

## 📁 Estructura del Proyecto

```txt
bunny-girl-bot-v2/
├── cmds/              # Módulos y comandos organizados
├── lib/               # Librerías y utilidades compartidas
├── .env.example       # Plantilla de variables de entorno
├── database.json      # Almacenamiento local (gacha, economía, usuarios)
├── handler.js         # Controlador de eventos y mensajes
├── index.js           # Archivo de inicio principal del sistema
└── settings.js        # Configuraciones globales del bot
```

---

## 👤 Desarrolladores y Créditos

Personas que han hecho posible el desarrollo y mantenimiento de **Mai Sakurajima Bot**:

<table align="center">
<tr>
<td align="center">
<a href="https://github.com">
<img src="https://github.com.png?size=120" width="110px" alt="Adán"><br>
<sub><b>Adán✯</b></sub>
</a>
</td>
<td align="center">
<a href="https://github.com">
<img src="https://github.com.png?size=120" width="110px" alt="DuarteXV"><br>
<sub><b>DuarteXV</b></sub>
</a>
</td>
</tr>
</table>

---

## ⚠️ Aclaración Legal

> Este proyecto **no está afiliado, asociado ni respaldado por WhatsApp Inc. o Meta Platforms**. 
> Ha sido desarrollado con fines recreativos y educativos utilizando librerías open-source.

---

<p align="center">
  <a href="https://github.com">
    <img src="https://shields.io" alt="Powered by adan292">
  </a>
</p>
