import db from '#db';
export default {
  command: ['kick', 'ban', 'bang'],
  category: 'group',
  description: 'Expulsar a un usuario del grupo.',
  isAdmin: true,
  botAdmin: true,
  run: async ({ msg, sock, args, usedPrefix, command, groupMetadata, participants }) => {
    const ownerGroup = groupMetadata?.owner || msg.chat.split('-')[0] + '@s.whatsapp.net';
    const ownerBot = global.owner + '@s.whatsapp.net';
    const botId = sock.decodeJid(sock.user.id);

    // Helper to send reply consistently
    const reply = async (text, extra = {}) => {
      try { return await msg.reply(text, extra); } catch (e) { try { return await sock.reply(msg.chat, text, msg, extra); } catch (_) { /* ignore */ } }
    };

    // Handle special subcommands (num, all, inactive...) - keep original behavior
    if (args[0] === 'num' || args[0] === 'listnum') {
      if (!args[1]) return reply(`《✧》 Ingrese algún prefijo de un país\n> ✎ Ejemplo: *${usedPrefix + command} num +54*`);
      const prefix = args[1].replace(/[+]/g, '');
      const allUsersWithPrefix = participants.map(p => p.id).filter(jid => jid && jid !== botId && jid.split('@')[0].startsWith(prefix));
      if (allUsersWithPrefix.length === 0) return reply(`《✧》 Aquí no hay ningún número con el prefijo +${prefix}`);
      if (args[0] === 'listnum') {
        const numeros = allUsersWithPrefix.map(v => '⭔ @' + v.replace(/@.+/, ''));
        return sock.reply(msg.chat, `《✧》 *Lista de usuarios con prefijo +${prefix}* (${allUsersWithPrefix.length})\n\n${numeros.join('\n')}`, msg, { mentions: allUsersWithPrefix });
      }
      const usersToKick = allUsersWithPrefix.filter(jid => {
        const p = participants.find(x => x.id === jid);
        if (!p) return false;
        if (p.admin === 'admin' || p.admin === 'superadmin') return false;
        if (jid === ownerGroup || jid === ownerBot) return false;
        return true;
      });
      if (usersToKick.length === 0) return reply(`《✧》 Hay usuarios con prefijo +${prefix} pero todos son admins o propietarios.`);
      await reply(`《✧》 *Eliminando usuarios con prefijo +${prefix}* (${usersToKick.length} de ${allUsersWithPrefix.length})\n> El proceso tomará unos segundos...`);
      let eliminados = 0, errores = [], noEliminados = allUsersWithPrefix.length - usersToKick.length;
      for (const jid of usersToKick) {
        try { await sock.groupParticipantsUpdate(msg.chat, [jid], 'remove'); eliminados++; await new Promise(r => setTimeout(r, 3000)); }
        catch (e) { errores.push(`@${jid.split('@')[0]}: ${e.message}`); }
      }
      let res = `《✧》 Proceso completado.\n> Usuarios eliminados: *${eliminados}*`;
      if (noEliminados > 0) res += `\n> Usuarios omitidos (admins/owners): *${noEliminados}*`;
      if (errores.length > 0) res += `\n> Errores: *${errores.length}*\n${errores.join('\n')}`;
      return reply(res);
    }

    if (args[0] === 'all') {
      const usersToKick = participants.filter(p => p.id && p.id !== botId && p.id !== ownerGroup && p.id !== ownerBot && p.admin !== 'admin' && p.admin !== 'superadmin').map(p => p.id);
      if (usersToKick.length === 0) return reply('《✧》 No hay usuarios para eliminar (todos son admins o propietarios).');
      await reply(`《✧》 *Eliminando todos los usuarios* (${usersToKick.length})\n> El proceso tomará unos segundos...`);
      let eliminados = 0, errores = [], noEliminados = participants.length - usersToKick.length;
      for (const jid of usersToKick) {
        try { await sock.groupParticipantsUpdate(msg.chat, [jid], 'remove'); eliminados++; await new Promise(r => setTimeout(r, 3000)); }
        catch (e) { errores.push(`@${jid.split('@')[0]}: ${e.message}`); }
      }
      let res = `《✧》 Proceso completado.\n> Usuarios eliminados: *${eliminados}*`;
      if (noEliminados > 0) res += `\n> Usuarios omitidos (admins/owners): *${noEliminados}*`;
      if (errores.length > 0) res += `\n> Errores: *${errores.length}*\n${errores.join('\n')}`;
      return reply(res);
    }

    if (args[0] === 'inactive' || args[0] === 'listinactive') {
      const allChatUsers = db.getChatUser(msg.chat);
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      let sider = [];
      for (const participant of participants) {
        const jid = participant.id;
        if (!jid || jid === botId || jid === ownerGroup || jid === ownerBot) continue;
        if (participant.admin === 'admin' || participant.admin === 'superadmin') continue;
        const userStats = allChatUsers.find(u => u.user_id === jid || u.user_id?.split('@')[0] === jid.split('@')[0]);
        if (userStats) {
          const days = Object.entries(userStats.stats || {}).filter(([date]) => new Date(date) >= cutoff);
          const totalMsgs = days.reduce((acc, [, d]) => acc + (d.msgs || 0), 0);
          if (totalMsgs === 0) sider.push(jid);
        } else {
          sider.push(jid);
        }
      }
      if (sider.length === 0) return reply('《✧》 Este grupo es activo, no tiene inactivos.');
      if (args[0] === 'listinactive')
        return sock.reply(msg.chat, `《✧》 *Lista de inactivos* (${sider.length})\n\n${sider.map(v => '⭔ @' + v.replace(/@.+/, '')).join('\n')}`, msg, { mentions: sider });
      await reply(`《✧》 *Eliminando inactivos* (${sider.length})\n> El proceso tomará unos segundos...`);
      let eliminados = 0, errores = [];
      for (const jid of sider) {
        try { await sock.groupParticipantsUpdate(msg.chat, [jid], 'remove'); eliminados++; await new Promise(r => setTimeout(r, 3000)); }
        catch (e) { errores.push(`@${jid.split('@')[0]}: ${e.message}`); }
      }
      let res = `《✧》 Proceso completado. usuarios eliminados: *${eliminados}*`;
      if (errores.length > 0) res += `\n> Errores: *[${errores.join('\n')}]*`;
      return reply(res);
    }

    // Single-target kick: support mentions, quoted messages, numbers and plain ids
    if (!msg.mentionedJid?.length && !msg.quoted && !args[0]) {
      return reply(`《✧》 Por favor, Etiqueta o responde al *mensaje* de la *persona* que quieres eliminar.\n\n✎ *Opciones especiales:*\n> *${usedPrefix + command} num +57* - Eliminar todos los usuarios con prefijo\n> *${usedPrefix + command} all* - Eliminar todos los usuarios no-admin\n> *${usedPrefix + command} inactive* - Eliminar inactivos`);
    }

    // Determine targets (allow multiple mentions)
    let targets = [];
    if (msg.mentionedJid && msg.mentionedJid.length > 0) targets = msg.mentionedJid.slice(0, 5); // limit to 5 at once
    else if (msg.quoted) targets = [msg.quoted.sender];
    else if (args[0]) {
      // parse number or jid
      const raw = args[0].replace(/[^0-9@.]/g, '');
      const possibleJid = raw.includes('@') ? raw : `${raw}@s.whatsapp.net`;
      targets = [possibleJid];
    }

    // Verify bot admin status
    const botParticipant = participants.find(p => p.id === botId || p.id === botId.replace(':', ''));
    if (!botParticipant || (botParticipant.admin !== 'admin' && botParticipant.admin !== 'superadmin')) {
      return reply('《✧》 Necesito ser administrador del grupo para poder expulsar usuarios. Por favor, otórgame permisos de administrador e intenta de nuevo.');
    }

    let results = { removed: [], skipped: [], errors: [] };

    for (const targetRaw of targets) {
      const userBase = (targetRaw || '').split('@')[0];
      const participant = participants.find(p => p.id?.split('@')[0] === userBase || p.lid?.split('@')[0] === userBase);
      if (!participant) {
        results.skipped.push(`@${userBase} (no está en el grupo)`);
        continue;
      }
      const realJid = participant.id || targetRaw;
      if (realJid === sock.decodeJid(sock.user.id)) { results.skipped.push(`@${userBase} (es el bot)`); continue; }
      if (realJid === ownerGroup) { results.skipped.push(`@${userBase} (es el propietario del grupo)`); continue; }
      if (realJid === ownerBot) { results.skipped.push(`@${userBase} (es el propietario del bot)`); continue; }
      if (participant.admin === 'admin' || participant.admin === 'superadmin') { results.skipped.push(`@${userBase} (es administrador)`); continue; }

      try {
        await sock.groupParticipantsUpdate(msg.chat, [realJid], 'remove');
        results.removed.push(`@${userBase}`);
      } catch (e) {
        results.errors.push(`@${userBase}: ${e.message}`);
      }
      // small delay to avoid hitting rate limits
      await new Promise(r => setTimeout(r, 1500));
    }

    // Build response message
    let resp = '';
    if (results.removed.length) resp += `✎ ${results.removed.join(', ')} *eliminado(s) correctamente*\n`;
    if (results.skipped.length) resp += `⚠️ Omitidos: ${results.skipped.join(', ')}\n`;
    if (results.errors.length) resp += `❌ Errores: ${results.errors.join('; ')}\n`;
    if (!resp) resp = 'No se realizó ninguna acción.';

    return sock.reply(msg.chat, resp, msg, { mentions: [...results.removed.map(u => u.replace('@', '').split(' ')[0] ? `${u.replace(/[^0-9]/g,'')}@s.whatsapp.net` : '')].filter(Boolean) });
  },
};
