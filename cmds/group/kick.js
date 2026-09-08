const { delay } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'kick',
    category: 'group',
    desc: 'Expulsa a un miembro del grupo.',
    admin: true,
    botAdmin: true,
    group: true,
    async execute(m, { sock, text }) {
        try {
            // 1. Obtener el usuario a eliminar (mencionado, replicado o por texto)
            let user = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null);
            
            if (!user && text) {
                // Limpiar el texto si ponen el número con símbolos
                let cleanNumber = text.replace(/[^0-9]/g, '');
                if (cleanNumber) user = `${cleanNumber}@s.whatsapp.net`;
            }

            if (!user) {
                return sock.sendMessage(m.from, { text: '⚠️ Por favor, menciona a un usuario, responde a su mensaje o escribe su número para expulsarlo.' }, { quoted: m });
            }

            // 2. Verificar que el bot no intente expulsarse a sí mismo o al dueño
            const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            if (user === botId) {
                return sock.sendMessage(m.from, { text: '❌ No puedo expulsarme a mí mismo.' }, { quoted: m });
            }

            // 3. Ejecutar la acción de expulsión en la API de Baileys
            await sock.groupParticipantsUpdate(m.from, [user], 'remove');
            
            // 4. Confirmación visual
            return sock.sendMessage(m.from, { text: `✅ El usuario @${user.split('@')[0]} ha sido eliminado correctamente.`, mentions: [user] }, { quoted: m });

        } catch (error) {
            console.error('Error en el comando kick:', error);
            return sock.sendMessage(m.from, { text: '❌ Hubo un error al intentar expulsar al usuario. Asegúrate de que el bot sea administrador.' }, { quoted: m });
        }
    }
};
