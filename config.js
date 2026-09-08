require("dotenv").config();

module.exports = {
  prefix: process.env.PREFIX || "#",
  owner: (process.env.OWNER_NUMBER || "").replace(/\D/g, ""),
  phoneNumber: (process.env.PHONE_NUMBER || "").replace(/\D/g, ""),
  port: Number(process.env.PORT || 3000),
  botName: process.env.BOT_NAME || "Bunny Bot",
  version: "2.0.0",
  currency: "BunnyCoins"
};
