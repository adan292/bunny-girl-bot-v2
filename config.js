const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

// Número por defecto para vincular con código de 8 dígitos.
// Se puede sobrescribir con PAIRING_PHONE en .env.
const DEFAULT_PAIRING_PHONE = "584242773183";

module.exports = {
  prefix: process.env.PREFIX || "#",
  owner: (process.env.OWNER_NUMBER || "").replace(/\D/g, ""),
  phoneNumber: (process.env.PHONE_NUMBER || DEFAULT_PAIRING_PHONE).replace(/\D/g, ""),
  pairingPhone: (process.env.PAIRING_PHONE || DEFAULT_PAIRING_PHONE).replace(/\D/g, ""),
  authMethod: (process.env.AUTH_METHOD || "").toLowerCase(),
  port: Number(process.env.PORT || 3000),
  botName: process.env.BOT_NAME || "Bunny Bot",
  version: "2.1.0",
  currency: "BunnyCoins",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  aiModel: process.env.AI_MODEL || "gpt-4.1-mini",
  aiEnabled: (process.env.AI_ENABLED || "true").toLowerCase() === "true",
  aiMaxChars: Number(process.env.AI_MAX_CHARS || 5000),
  aiAutoPrivate: (process.env.AI_AUTO_PRIVATE || "false").toLowerCase() === "true",

  // GIFs / interacciones
  giphyApiKey: process.env.GIPHY_API_KEY || "",
  interactionGif: (process.env.INTERACTION_GIF || "true").toLowerCase() === "true"
};
