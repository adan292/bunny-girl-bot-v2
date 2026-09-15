import { execSync } from "child_process";
import { loadPlugins } from "../../core/pluginLoader.js";

export default {
  name: ["update", "actualizar", "gitpull"],
  description: "Fuerza la actualización desde GitHub y recarga plugins",
  category: 'owner',
  ownerOnly: true,

  async run({ reply, react }) {
    try {
      await react("🔄");

      execSync("git fetch --all");

      const localSha = execSync("git rev-parse HEAD").toString().trim();
      const remoteSha = execSync("git rev-parse origin/main").toString().trim();

      if (localSha === remoteSha) {
        await react("✅");
        return await reply({ text: "✅ *Ya está todo actualizado, no hay cambios nuevos.*" });
      }

      // 📋 Lista real de archivos modificados ANTES de aplicar el reset
      const archivosCambiados = execSync(`git diff --stat ${localSha} ${remoteSha}`).toString().trim();

      // 📝 Lista de commits nuevos que se van a aplicar
      const commitsNuevos = execSync(`git log ${localSha}..${remoteSha} --oneline`).toString().trim();

      execSync("git reset --hard origin/main");

      await loadPlugins();

      let textoUpdate = `✅ *Actualización Forzada Exitosa*\n\n`;
      textoUpdate += `📦 *Commits nuevos:*\n\`\`\`${commitsNuevos || "(sin detalles de commits)"}\`\`\`\n\n`;
      textoUpdate += `📋 *Archivos modificados:*\n\`\`\`${archivosCambiados || "(sin cambios de archivos detectados)"}\`\`\`\n\n`;
      textoUpdate += `🔄 _Plugins recargados en memoria sin conflictos._`;

      await react("✅");
      await reply({ text: textoUpdate });

    } catch (err) {
      await react("❌");
      await reply({
        text: `❌ *Error crítico en el update:* ${err.message}\n\`\`\`${err.stderr?.toString() || ""}\`\`\``
      });
    }
  },
};