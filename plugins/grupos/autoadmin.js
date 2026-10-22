import { db } from "../../database/db.js";

export default {
  name: ["autoadmin", "autoadmin"],
  description: "Activa el modo auto-admin para que el owner pueda usar permisos de administrador del bot sin ser admin real del grupo",
  category: "grupos",
  groupOnly: true,
  ownerOnly: true,

  async run({ from, args, react, reply }) {
    const accion = (args[0] || "").toLowerCase();
    const grupo = db.getGroup(from);

    if (accion === "on") {
      db.setGroup(from, { autoAdminOwners: true });
      await react("✅");
      return await reply({
        text: `✅ *AutoAdmin activado.*\n\nAhora el owner del bot será tratado como administrador del grupo para las reglas internas del bot, sin necesidad de ser admin real de WhatsApp.`
      });
    }

    if (accion === "off") {
      db.setGroup(from, { autoAdminOwners: false });
      await react("🔒");
      return await reply({
        text: `🔒 *AutoAdmin desactivado.*\n\nEl owner volverá a seguir las reglas normales del grupo.`
      });
    }

    await react("❓");
    return await reply({
      text: `💡 *Uso correcto:*\n• _.autoadmin on_\n• _.autoadmin off_\n\n> Esto activa permisos de administrador del bot para el owner sin necesidad de que el bot sea admin real.`
    });
  }
};
