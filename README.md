# 🐰 Mai Sakurajima Bot — WhatsApp Bot

<p align="center">
  <img src="https://i.pinimg.com/736x/db/9c/cc/db9cccef13d11c59fef91efea87e3bab.jpg" alt="Mai Sakurajima Bot" width="350"/>
</p>

<p align="center">
  <a href="https://github.com">
    <img src="https://shields.io" alt="License">
  </a>
  <a href="https://github.com">
    <img src="https://shields.io" alt="Stars">
  </a>
  <a href="https://wa.me">
    <img src="https://shields.io" alt="WhatsApp">
  </a>
</p>

---

Un bot de WhatsApp multipropósito, rápido y personalizable inspirado en el personaje **Mai Sakurajima** de *Seishun Buta Yarou*. Diseñado para automatizar tareas, entretener a los miembros de tus grupos y administrar comunidades de forma eficiente.

## ✨ Características Principales

* **Administración de Grupos:** Comandos para banear, advertir, silenciar, activar el modo bienvenida y gestionar enlaces de invitación.
* **Entretenimiento y Anime:** Comandos interactivos de reacciones (abrazar, bofetada, besar), búsqueda de información de anime, mangas y fondos de pantalla.
* **Herramientas Multimedia:** Conversión de imágenes, videos y GIFs a stickers (y viceversa), descarga de música/videos desde YouTube, TikTok e Instagram.
* **Inteligencia Artificial:** Integración de chat interactivo con respuestas inteligentes.
* **Juegos y Economía:** Minijuegos integrados, sistema de niveles y economía virtual para los usuarios del bot.

---

## 🚀 Requisitos Previos

Antes de instalar y arrancar el bot, asegúrate de tener instalado:

* [Node.js](https://nodejs.org) (Versión 16.x o superior recomendada)
* [Git](https://git-scm.com)
* [FFmpeg](https://ffmpeg.org) (Obligatorio para la gestión de stickers y contenido multimedia)

---

## 🛠️ Instalación y Despliegue

Sigue estos sencillos pasos para clonar y ejecutar el proyecto de forma local:

### 1. Clonar el repositorio
```bash
git clone https://github.com
cd mai-sakurajima-bot
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Renombra el archivo `.env.example` a `.env` (si está disponible) e introduce tus credenciales:
```env
NUMERO_PROPIETARIO=54911XXXXXXX
PREFIX=.
NOMBRE_BOT=Mai Sakurajima Bot
```

### 4. Iniciar el bot
```bash
npm start
```

> 💡 **Nota:** Escanea el **código QR** que aparecerá en la terminal utilizando la función "Dispositivos vinculados" desde tu aplicación de WhatsApp para conectar el bot.

---

## 📋 Comandos Populares

Una vez que el bot esté en línea, puedes usar los siguientes comandos en WhatsApp (usa el prefijo configurado, por ejemplo, `.`):

* `.menu` o `.help` - Muestra la lista completa de comandos disponibles.
* `.s` o `.sticker` - Convierte una imagen o video en sticker.
* `.play [nombre/link]` - Descarga y reproduce música de YouTube.
* `.kick @usuario` - Elimina a un miembro del grupo (Solo administradores).
* `.waifu` - Genera una imagen aleatoria de una waifu de anime.

---

## 🤝 Contribuciones

¡Las contribuciones, los reportes de errores (issues) y las sugerencias de nuevas funciones son bienvenidos!

1. Haz un **Fork** del proyecto.
2. Crea una rama para tu mejora (`git checkout -b feature/NuevaMejora`).
3. Realiza tus cambios y haz un commit (`git commit -m 'Añade una nueva función'`).
4. Sube la rama (`git push origin feature/NuevaMejora`).
5. Abre un **Pull Request**.

---

## 📄 Licencia

Este proyecto está bajo la Licencia **MIT**. Consulta el archivo [LICENSE](LICENSE) para obtener más detalles.
