// Resuelve el JID real del canal oficial al conectar por primera vez.
// Usa sock.newsletterMetadata("invite", code) que devuelve el @newsletter JID correcto.
const CACHE_KEY = 'ginko:channelJid';
let triedOnce = false;

export async function resolveChannel(sock, db, force = false) {
  if (!sock || !global.links?.channelCode) return null;
  if (global.channelJid?.resolved && !force) return global.channelJid;
  const botId = sock?.user?.id?.split(':')[0] + '@s.whatsapp.net';
  // Si ya está guardado en la DB del bot, lo usamos
  if (botId && !force) {
    const st = db?.getSettings?.(botId);
    if (st?.newsletter_id && !String(st.newsletter_id).includes('yuki') && String(st.newsletter_id).endsWith('@newsletter')) {
      global.channelJid = {
        id: st.newsletter_id,
        name: st.nameid || global.links.channelName,
        resolved: true
      };
      return global.channelJid;
    }
  }
  if (triedOnce && !force) return global.channelJid;
  triedOnce = true;
  try {
    const info = await sock.newsletterMetadata('invite', global.links.channelCode);
    if (info?.id) {
      const name = info.thread_metadata?.name?.text || global.links.channelName;
      global.channelJid = { id: info.id, name, resolved: true };
      // Guardar en DB para futuros arranques
      if (botId && db) {
        try {
          db.setSettings(botId, 'newsletter_id', info.id);
          db.setSettings(botId, 'nameid', name);
        } catch (_) {}
      }
      return global.channelJid;
    }
  } catch (_) {
    // sin internet o sin permisos: lo intentamos más tarde
  }
  return null;
}

export function getChannelInfo() {
  return global.channelJid || { id: '', name: global.links?.channelName || '', resolved: false };
}
