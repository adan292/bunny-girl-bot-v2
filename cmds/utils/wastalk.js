/**
 * .wastalk [@usuario|número|citado]
 *
 * Muestra información pública de un número en WhatsApp:
 * foto de perfil, nombre, biografía/estado, país y formato.
 * Todo con métodos nativos de Baileys, sin APIs externas.
 */
export default {
  command: ['wastalk', 'stalknum', 'numbstalk', 'perfilwa', 'infowa'],
  category: 'utils',
  description: 'Ver información pública de un número de WhatsApp.',
  run: async ({ msg, sock, usedPrefix, command, text }) => {
    let who =
      msg.mentionedJid?.[0] ||
      msg.quoted?.sender ||
      (text && text.trim() ? text.trim().replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null);

    if (!who) {
      return msg.reply(
        `《✧》 Etiqueta, cita o escribe el *número* a consultar.\n`
        + `> Ejemplos:\n`
        + `• ${usedPrefix}wastalk @usuario\n`
        + `• ${usedPrefix}wastalk 5215574370309\n`
        + `• Responde a un mensaje con ${usedPrefix}wastalk`
      );
    }

    try {
      // Validar que exista en WhatsApp
      let registered = false;
      let vname = null;
      try {
        const res = await sock.onWhatsApp(who);
        const info = Array.isArray(res) ? res[0] : res;
        if (info?.exists) {
          registered = true;
          who = info.jid || who;
          vname = info.subscriber || info.name || info.notify || null;
        }
      } catch (_) {}
      if (!registered) {
        return msg.reply(`《✧》 El número *${who.split('@')[0]}* no está registrado en WhatsApp.`);
      }

      // Foto de perfil
      const pfp = await sock.profilePictureUrl(who, 'image').catch(() => null);

      // Estado/bio
      let bio = '(sin biografía)';
      let bioDate = '';
      try {
        const status = await sock.fetchStatus(who);
        if (status?.status) {
          bio = status.status;
          if (status.setAt) {
            try {
              const d = typeof status.setAt === 'object' && status.setAt.toDate ? status.setAt.toDate() : new Date(status.setAt);
              bioDate = ` (actualizado ${d.toLocaleDateString('es-MX')})`;
            } catch (_) {}
          }
        }
      } catch (_) {}

      // Formatear número y país (intl nativo)
      let pais = '—';
      let formato = who.split('@')[0];
      try {
        const num = '+' + who.split('@')[0];
        const pn = new (await import('awesome-phonenumber')).default(num);
        if (pn.isPossible()) {
          pais = typeof pn.getRegionCode === 'function' ? pn.getRegionCode() : '—';
          formato = pn.getNumber('international') || num;
        }
      } catch (_) {}
      const regionNombre = pais !== '—'
        ? new Intl.DisplayNames(['es'], { type: 'region' }).of(pais)
        : 'Desconocido';

      // Business profile
      let empresa = '';
      try {
        const biz = await sock.getBusinessProfile(who).catch(() => null);
        if (biz) {
          const cat = biz.category || 'Empresa';
          const web = biz.website?.[0] ? `\n🌐 Web: ${biz.website[0]}` : '';
          const correo = biz.email ? `\n📧 Email: ${biz.email}` : '';
          const dir = biz.address ? `\n📍 Dirección: ${biz.address}` : '';
          empresa = `\n\n💼 *Cuenta de empresa*\n• Categoría: ${cat}${web}${correo}${dir}`;
        }
      } catch (_) {}

      const txt =
        `📱 *Info de WhatsApp*\n\n`
        + `• 📞 *Número:* ${formato}\n`
        + `• 👤 *Nombre:* ${vname || '—'}\n`
        + `• 🌍 *País:* ${regionNombre} (${pais})\n`
        + `• 🔗 *Enlace:* https://wa.me/${who.split('@')[0]}\n`
        + `• 📝 *Biografía:* ${bio}${bioDate}`
        + empresa;

      if (pfp) {
        await sock.sendMessage(msg.chat, { image: { url: pfp }, caption: txt, mentions: [who] }, { quoted: msg });
      } else {
        await msg.reply(txt, { mentions: [who] });
      }
    } catch (e) {
      msg.reply(`《✧》 No pude consultar el número.\n> ${e.message || 'error'}`);
    }
  },
};
