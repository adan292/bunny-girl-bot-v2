module.exports = {
    name: 'kick',
    category: 'group',
    desc: 'Expulsa a un miembro del grupo.',
    admin: true,
    botAdmin: true,
    group: true,
    async execute(m, { sock, text }) {
        try {
            // 1. Identificar el chat actual usando las dos variables más comunes de tu bot
            const chatActual = m.chat || m.from;

            // 2. Obtener el usuario a eliminar (mención, respuesta a mensaje o texto)
            let user = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null);
            
            if (!user && text) {
                let cleanNumber = text.replace(/[^0-9]/g, '');
                if (cleanNumber) user = `${cleanNumber}@s.whatsapp.net`;
            }

            if (!user) {
                return sock.sendMessage(chatActual, { text: '⚠️ Por favor, menciona a un usuario, responde a su mensaje o escribe su número para expulsarlo.' }, { quoted: m });
            }

            // Limpiar el JID del usuario por si viene con identificador de dispositivo (:1)
            if (user.includes(':')) {
                user = user.split(':')[0] + '@s.whatsapp.net';
            }

            // 3. Evitar que el bot intente expulsarse a sí mismo
            const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            if (user === botId) {
                return sock.sendMessage(chatActual, { text: '❌ No puedo expulsarme a mí mismo.' }, { quoted: m });
            }

            // 4. Ejecutar la expulsión mediante la API nativa de Baileys
            await sock.groupParticipantsUpdate(chatActual, [user], 'remove');
            
            // 5. Enviar mensaje de confirmación
            return sock.sendMessage(chatActual, { text: `✅ El usuario @${user.split('@')[0]} ha sido eliminado correctamente del grupo.`, mentions: [user] }, { quoted: m });

        } catch (error) {
            // Esto imprimirá el error real en la terminal de tu bot para que puedas ver qué pasa por dentro
            console.error('--- ERROR DETECTADO EN KICK ---');
            console.error(error);
            console.error('--------------------------------');
            
            const chatActual = m.chat || m.from;
            return sock.sendMessage(chatActual, { text: '❌ Hubo un problema al ejecutar la expulsión. Asegúrate de que el bot tenga el rol de Administrador en este grupo.' }, { quoted: m });
        }
    }
};
                    
