# Bunny Girl Bot — yta proxy (fix/yta-proxy)

Este cambio añade un pequeño proxy para las llamadas a `https://api.lempi.lat/dl/yta` de forma que la API key no quede expuesta al frontend.

Archivos añadidos:
- `server.js` — servidor Express que reenvía la petición a Lempi usando LEMPI_API_KEY desde variables de entorno.
- `public/play.js` — cliente simple que llama a `/api/yta`.
- `package.json` — scripts y dependencias mínimas.
- `.env.example` — ejemplo de variables de entorno.

Requisitos:
- Node 18+ recomendado (incluye fetch global). Si usas Node <18 instala `node-fetch` y adáptalo.
- Instalar dependencias: `npm install`
- Configurar variable de entorno: `export LEMPI_API_KEY="tu_api_key"`
- Ejecutar: `npm start` (o `npm run dev` con nodemon)

Notas de seguridad:
- No pongas la API key en el frontend ni en commits.
- En producción, cambia el CORS de `'*'` al dominio de tu frontend.
