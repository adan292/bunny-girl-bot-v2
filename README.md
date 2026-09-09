# 🐰 Mai Sakurajima Bot — WhatsApp Multi-Device

<p align="center">
  <img src="https://telegra.ph" alt="Mai Sakurajima Bot" width="200" height="200"/>
</p>

<p align="center">
  <strong>Un bot de WhatsApp multifuncional e interactivo basado en el personaje Mai Sakurajima de *Seishun Buta Yarou*.</strong>
</p>

<p align="center">
  <a href="https://github.com"><img alt="Stars" src="https://shields.io"></a>
  <a href="https://github.com"><img alt="Forks" src="https://shields.io"></a>
  <a href="https://github.com"><img alt="Issues" src="https://shields.io"></a>
</p>

<p align="center">
  <a href="https://whatsapp.com/channel/0029Vb7OVMwJf05bKntqZx1G" target="_blank">
    <img src="https://shields.io" alt="Canal de WhatsApp">
  </a>
  <a href="https://chat.whatsapp.com/C8H8MfeVGCCF6qu7v0YsNl" target="_blank">
    <img src="https://shields.io" alt="Grupo de WhatsApp">
  </a>
</p>

---

## 📢 ¡Apoya al Proyecto!

¿Te gusta el bot? Apoya el desarrollo del proyecto y mantente al tanto de todas las novedades:

*   📢 **Canal Oficial:** [Únete aquí](https://whatsapp.com/channel/0029Vb7OVMwJf05bKntqZx1G) para enterarte de actualizaciones, mantenimiento y corrección de errores.
*   👥 **Grupo de la Comunidad:** [Entra aquí](https://chat.whatsapp.com/C8H8MfeVGCCF6qu7v0YsNl) para resolver dudas, reportar fallos y compartir con otros usuarios.
*   👨‍💻 **Creador:** Adán (Contacto: [+58 4120299482](https://wa.me))

---

## 🌟 Características Principales

*   **🎰 Sistema Gacha:** Colecciona personajes, administra tu inventario y prueba tu suerte.
*   **💰 Economía Virtual:** Gana monedas, realiza transferencias, compra en la tienda y compite en el ranking.
*   **🎉 Diversión y Juegos:** Comandos interactivos, juegos en grupo, trivias y respuestas dinámicas.
*   **🧠 Inteligencia Artificial:** Integración de IA para responder preguntas y conversar con los usuarios.
*   **📥 Descargas:** Baja música, videos, fotos y contenido de redes sociales directamente en tu chat.
*   **⚙️ Multi-Device:** Construido sobre la base estable de **Ginko-MD** con soporte para múltiples dispositivos.

---

## 🚀 Requisitos

*   [Node.js](https://nodejs.org) v16 o superior
*   [FFmpeg](https://ffmpeg.org) (para el manejo de multimedia y stickers)
*   [Git](https://git-scm.com)

---

## 🛠️ Instalación y Configuración

Sigue estos pasos para clonar e instalar el bot en tu entorno local:

### 1. Clonar el repositorio
```bash
git clone https://github.com
cd bunny-girl-bot-v2
```

### 2. Instalar las dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Copia el archivo de ejemplo para crear tu configuración personal:
```bash
cp .env.example .env
```
> 📄 Abre el archivo `.env` y rellena los datos necesarios (claves de API, número de creador, etc.). También puedes ajustar las configuraciones globales directamente en `settings.js`.

### 4. Iniciar el bot
```bash
npm start
```
> 📱 Escanea el código QR que aparecerá en la terminal desde tu aplicación de WhatsApp (Dispositivos vinculados) para conectar el bot.

---

## 📁 Estructura del Proyecto

*   `cmds/`: Contiene todos los comandos del bot organizados por módulos.
*   `lib/`: Funciones y herramientas de utilidad compartidas.
*   `index.js` / `handler.js`: Archivos principales de inicio y control de eventos/mensajes.
*   `database.json`: Almacenamiento local para la economía, gacha y usuarios.
*   `settings.js`: Archivo de configuración general del bot.

---

## 🤝 Contribuciones

Las contribuciones, reportes de errores y sugerencias son bienvenidos. 
1. Haz un **Fork** del proyecto.
2. Crea una rama con tu nueva función (`git checkout -b feature/NuevaFuncion`).
3. Haz un commit de tus cambios (`git commit -m 'Añade una nueva función'`).
4. Sube la rama (`git push origin feature/NuevaFuncion`).
5. Abre un **Pull Request**.

---

## 👤 Desarrolladores
*   **Adán✯** — [GitHub Profile](https://github.com/adan292)
*   **DuarteXV**

---

## 📝 Licencia
Este proyecto es de uso libre. Dale una ⭐️ al repositorio si te ha sido de utilidad.
