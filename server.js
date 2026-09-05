import express from "express";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Endpoint raíz: información del bot (útil para paneles como BoxMine/Railway/Render).
app.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    bot: global.botname || "Bunny Girl",
    connected: !!(global.sock && global.sock.user),
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});

// Health check simple: los paneles esperan un "OK" plano.
app.get("/health", (req, res) => res.status(200).send("OK"));

// Respuesta rápida para favicon (evita errores 404 en logs).
app.get("/favicon.ico", (req, res) => res.status(204).end());

export function startServer() {
  try {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[ ✿ ] Servidor HTTP escuchando en 0.0.0.0:${PORT}`);
    });
  } catch (e) {
    // Si el puerto está ocupado o falla, NO queremos tirar el bot.
    console.log(`[ ! ] No se pudo iniciar el servidor HTTP: ${e?.message || e}`);
  }
}
