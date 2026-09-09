# 🐰 Mai Sakurajima Bot — WhatsApp Multi-Device

<p align="center">
  <img src="https://tenor.com" width="75%" alt="Mai Sakurajima Bot">
</p>

> Bot de WhatsApp multifuncional, interactivo y totalmente modular. Optimizado con un sistema enfocado en gacha, economía virtual, juegos grupales, Inteligencia Artificial y descargas multimedia de alta velocidad.

<p align="center">
  <img src="https://shields.io" alt="JavaScript">
  <img src="https://shields.io" alt="Node.js">
  <img src="https://shields.io" alt="Status">
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
> **Mai Sakurajima Bot** está diseñado para ofrecer una experiencia fluida, rápida y sumamente entretenida dentro de tus grupos y chats privados de WhatsApp. Su temática visual y personalidad están inspiradas en el personaje Mai Sakurajima de *Seishun Buta Yarou*.

---

## 📢 ¡Apoya al Proyecto!

¿Te gusta el bot? Apoya el desarrollo constante del software y mantente al tanto de los últimos cambios:

*   📢 **Canal Oficial:** [Únete aquí](https://whatsapp.com) para recibir alertas instantáneas sobre actualizaciones, estados de mantenimiento y parches de errores.
*   👥 **Grupo de la Comunidad:** [Entra aquí](https://whatsapp.com) para interactuar, pedir soporte, sugerir comandos y convivir con otros usuarios.
*   👨‍💻 **Creador Principal:** Adán (Contacto Directo: [+58 4120299482](https://wa.me))

---

## 🌟 Características Detalladas

*   **🎰 Sistema Gacha Avanzado:** Colecciona una inmensa variedad de personajes de anime, administra tu inventario personal, evoluciona tus cartas y compite por armar el mejor mazo.
*   **💰 Economía Virtual Interactiva:** Sistema dinámico con monedero y banco. Gana monedas reclamando recompensas diarias, realizando transferencias seguras, comprando ítems exclusivos en la tienda y apostando en minijuegos.
*   **🎉 Entretenimiento y Juegos Grupales:** Desafía a tus amigos con juegos interactivos como trivias, juegos de rol cortos, ruletas, acertijos y comandos de interacción social (abrazar, besar, golpear, etc.).
*   **🧠 Inteligencia Artificial Integrada:** Conexión con modelos avanzados de IA para responder preguntas complejas, redactar textos, entablar conversaciones naturales y asistir a los miembros del grupo.
*   **📥 Descargas Multimedia Instantáneas:** Descarga música (MP3), videos (MP4), imágenes en alta definición y multimedia desde plataformas populares como YouTube, TikTok, Instagram y SoundCloud directamente al chat.

---

## 🚀 Requisitos de Entorno

Antes de proceder con la instalación, asegúrate de tener configuradas las siguientes dependencias en tu servidor o terminal:

| Requisito | Versión Mínima | Descripción |
|---|---|---|
| Git | Última estable | Necesario para clonar y actualizar el repositorio |
| Node.js | v16 o superior | Entorno de ejecución para el código JavaScript |
| FFmpeg | Última estable | Esencial para convertir audios, recortar videos y generar stickers |

---

## 🛠️ Guía de Instalación Pasó a Paso

<details>
<summary><strong>🐧 Servidores Linux / Ubuntu</strong></summary>

Actualiza los paquetes del sistema e instala las dependencias globales:
```bash
apt update && apt upgrade -y
apt install git nodejs ffmpeg -y
```

Clona este repositorio e ingresa al directorio del proyecto:
```bash
git clone https://github.com
cd bunny-girl-bot-v2
```

Instala todos los módulos locales necesarios:
```bash
npm install
```

Configura tus variables de entorno esenciales:
```bash
cp .env.example .env
```
> 📄 Abre el archivo `.env` utilizando tu editor de preferencia (como `nano .env`) y rellena tus credenciales, claves de API y número de propietario.

Inicia el proceso principal del bot:
```bash
npm start
```

</details>

<details>
<summary><strong>📱 Terminal Termux (Android)</strong></summary>

Concede los permisos de almacenamiento y actualiza el entorno:
```bash
termux-setup-storage
pkg update && pkg upgrade -y
```

Instala los binarios necesarios para ejecutar código JavaScript y procesar multimedia:
```bash
pkg install -y nodejs-lts git ffmpeg libwebp
```

Descarga el código fuente del bot e ingresa a la carpeta:
```bash
git clone https://github.com && cd bunny-girl-bot-v2
```

Instala las dependencias de Node de forma local:
```bash
npm install
```

Genera tu archivo de configuración personalizable:
```bash
cp .env.example .env
```
> 📄 Modifica los valores internos de `.env` con tus tokens y configuraciones antes de ejecutar.

Arranca el bot:
```bash
npm start
```

</details>

> 📱 Una vez inicializado en la consola, abre la aplicación de WhatsApp en tu teléfono, ve a **Dispositivos vinculados**, selecciona **Vincular un dispositivo** y escanea el código QR que se imprimirá en tu pantalla.

---

## 📁 Estructura Interna del Proyecto

El bot cuenta con una arquitectura limpia y segmentada para facilitar su expansión:

```txt
bunny-girl-bot-v2/
├── cmds/              # Módulos de comandos segmentados por categorías
├── lib/               # Funciones internas, utilidades de red y herramientas gráficas
├── .env.example       # Plantilla base para las variables de entorno confidenciales
├── database.json      # Base de datos local (perfiles, economía, inventarios gacha)
├── handler.js         # Middleware principal; gestiona eventos, prefijos y mensajes entrantes
├── index.js           # Punto de entrada de la aplicación y reconexión del socket
└── settings.js        # Ajustes globales de personalización del bot
```

---

## 👤 Equipo de Desarrollo

Agradecimientos especiales a quienes hacen posible el crecimiento de este software:

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

## ⚠️ Términos y Descargo de Responsabilidad

> Este software ha sido creado exclusivamente con fines educativos y de entretenimiento. **No está afiliado, respaldado ni asociado oficialmente con WhatsApp Inc. ni con Meta Platforms**. El uso de este bot queda bajo la total responsabilidad del usuario que aloja el servicio.

---

<p align="center">
  <a href="https://github.com">
    <img src="https://shields.io" alt="Powered by adan292">
  </a>
</p>
