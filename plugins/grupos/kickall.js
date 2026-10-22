function cleanJid(jid = "") {
  if (!jid) return "";
  const atIndex = jid.lastIndexOf("@");
  if (atIndex === -1) return jid.split(":")[0];
  const userPart = jid.slice(0, atIndex).split(":")[0];
  const domainPart = jid.slice(atIndex + 1);
  return `${userPart}@${domainPart}`;
}

export default {
  name: ["kickall", "expulsartodos", "removeall"],
  description: "Expulsa a todos los miembros del grupo (solo owners)",
  category: "grupos",
  groupOnly: true,
  botAdmin: true,
  ownerOnly: true,

  async run({ sock, from, groupMeta, clearGroupCache, reply, react }) {
    const participants = groupMeta?.participants || [];
    const botJid = cleanJid(sock.user?.id || "");

    const targets = participants
      .map((p) => cleanJid(p.id))
      .filter((jid) => {
        if (!jid) return false;
        if (jid === botJid) return false;
        if (groupMeta?.participants?.find((p) => cleanJid(p.id) === jid)?.admin === "superadmin") {
          return false;
        }
        return true;
      });

    if (!targets.length) {
      await react("❓");
      return await reply({ text: "❌ No hay miembros para expulsar en este grupo." });
    }

    await react("💥");

    for (let i = 0; i < targets.length; i += 50) {
      const batch = targets.slice(i, i + 50);
      await sock.groupParticipantsUpdate(from, batch, "remove");
    }

    clearGroupCache();

    await reply({
      text: `✅ Se expulsó a *${targets.length}* miembros del grupo.\n> Solo quedaron los miembros protegidos por WhatsApp y el bot.`
    });
  },
};
