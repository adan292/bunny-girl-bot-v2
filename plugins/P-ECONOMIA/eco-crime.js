import User from '../../lib/database/models/zen-users.js'
import config from '../../config.js'

const crimes = [
    { t: "🏦 Robo al Banco Central", g: 4000, p: 0.15, h: "Entraste con un equipo de hackers y saliste por la puerta grande." },
    { t: "🏧 Hackeo de Cajero", g: 1800, p: 0.35, h: "Instalaste un malware y el cajero empezó a escupir billetes." },
    { t: "🍭 Robo a un niño", g: 120, p: 0.95, h: "Fue fácil, pero te sientes un poco mal... o no, el dulce estaba rico." },
    { t: "🎭 Estafa Piramidal", g: 5000, p: 0.10, h: "Les vendiste criptomonedas inexistentes. Eres un genio del mal." },
    { t: "🧥 Hurto en Shopping", g: 700, p: 0.65, h: "Le quitaste el sensor a una campera cara y saliste silbando." },
    { t: "🚗 Robo de un Tesla", g: 2500, p: 0.25, h: "Hackeaste el modo autónomo y el auto vino solo a tu casa." },
    { t: "💎 Joyería de Lujo", g: 3500, p: 0.20, h: "Rompiste el cristal, agarraste los diamantes y escapaste en moto." },
    { t: "📱 iPhone de Exhibición", g: 900, p: 0.55, h: "Cortaste el cable de seguridad con una pinza y desapareciste." },
    { t: "⛽ Nafta sin pagar", g: 400, p: 0.80, h: "Llenaste el tanque y aceleraste antes de que el playero reaccionara." },
    { t: "🚲 Bici de Repartidor", g: 300, p: 0.85, h: "El pobre repartidor subió al 5to piso y se quedó a pie." },
    { t: "🚢 Yate abandonado", g: 3200, p: 0.20, h: "Lo remolcaste hasta un puerto clandestino para desguazarlo." },
    { t: "🛰️ Datos Militares", g: 4500, p: 0.12, h: "Interceptaste una señal de satélite y vendiste los secretos." },
    { t: "🖼️ Museo de Arte", g: 3800, p: 0.18, h: "Cambiaste un Picasso original por un dibujo de tu primo." },
    { t: "👜 Cartera de marca", g: 600, p: 0.70, h: "Un tirón rápido en el metro y te hiciste con una Gucci." },
    { t: "⌚ Reloj de Turista", g: 1100, p: 0.45, h: "Le preguntaste la hora y se lo quitaste sin que se diera cuenta." },
    { t: "🧪 Fórmula Secreta", g: 2200, p: 0.30, h: "Robaste la receta de la Coca-Cola, pero solo era agua con azúcar." },
    { t: "🗳️ Votos Falsos", g: 1400, p: 0.40, h: "Alteraste los resultados de un concurso de belleza de perros." },
    { t: "🍿 Colada en el Cine", g: 150, p: 0.90, h: "Pasaste por la puerta de salida y viste la peli gratis." },
    { t: "🐕 Perro con Pedigree", g: 2000, p: 0.30, h: "Lo devolviste a cambio de la recompensa. Negocio redondo." },
    { t: "🎸 Guitarra de Rock", g: 2600, p: 0.25, h: "Era la guitarra de una leyenda, o eso decía el anuncio de venta." },
    { t: "🍇 Uvas en el Super", g: 50, p: 0.98, h: "Te comiste medio kilo antes de llegar a la caja." },
    { t: "📬 Correo del Vecino", g: 200, p: 0.80, h: "Había un cheque de regalo de Amazon. ¡Gracias, vecino!" },
    { t: "🚓 Ruedas de Patrullero", g: 500, p: 0.60, h: "Dejaste a la policía sobre ladrillos. Épico." },
    { t: "📉 Fraude Fiscal", g: 3100, p: 0.22, h: "Declaraste que el bot es una ONG sin fines de lucro." },
    { t: "🧀 Queso en Fiambrería", g: 250, p: 0.85, h: "Un trozo de parmesano de 2kg bajo la campera." },
    { t: "🍗 Pollo Asado", g: 180, p: 0.88, h: "Te fuiste de la rotisería con el almuerzo en la mano." },
    { t: "🕶️ Lentes Ray-Ban", g: 550, p: 0.75, h: "Te los probaste, te miraste al espejo y saliste caminando." },
    { t: "🎮 PlayStation 5", g: 1300, p: 0.40, h: "Te hiciste pasar por personal de correo y te llevaste una." },
    { t: "📦 Paquete de Amazon", g: 450, p: 0.78, h: "Estaba en el porche de alguien. Contenía algo valioso." },
    { t: "🎅 Regalos de Navidad", g: 800, p: 0.65, h: "Te llevaste las cajas de abajo del árbol. Eres el Grinch." },
    { t: "🥂 Cena de Gala", g: 1200, p: 0.40, h: "Comiste langosta y te escapaste por la ventana del baño." },
    { t: "🧹 Escoba de Barrendero", g: 80, p: 0.92, h: "No sirve de mucho, pero por algo la vendiste." },
    { t: "🧸 Oso Gigante", g: 350, p: 0.80, h: "Lo ganaste en un puesto de feria usando dardos trucados." },
    { t: "💊 Farmacia de Noche", g: 1600, p: 0.35, h: "Robaste suministros y los vendiste en el mercado negro." },
    { t: "🎫 Reventa de Entradas", g: 2100, p: 0.28, h: "Entradas falsas para el concierto del momento." },
    { t: "🧺 Ropa del Tendedero", g: 150, p: 0.90, h: "Te llevaste 3 calzoncillos y un vestido de seda." },
    { t: "🛶 Canoa del Lago", g: 750, p: 0.60, h: "La desataste y te la llevaste remando a otro pueblo." },
    { t: "📻 Radio de Auto Viejo", g: 300, p: 0.82, h: "Forzaste la puerta con una percha. Un clásico criminal." },
    { t: "🧴 Perfumes en Duty Free", g: 1400, p: 0.38, h: "Te llenaste los bolsillos de fragancias de diseñador." },
    { t: "🍕 Pizza ajena", g: 120, p: 0.95, h: "El delivery se confundió de casa y tú no dijiste nada." },
    { t: "🛹 Skate de un Skater", g: 400, p: 0.75, h: "Se cayó haciendo un truco y tú te fuiste con su tabla." },
    { t: "🔧 Caja de Herramientas", g: 650, p: 0.68, h: "Robada del garage de un mecánico jubilado." },
    { t: "🔦 Linterna Táctica", g: 200, p: 0.85, h: "La sacaste de una mochila en el camping municipal." },
    { t: "🪁 Cometa de un Niño", g: 50, p: 0.98, h: "Se le voló, tú la agarraste y nunca se la devolviste." },
    { t: "🧥 Abrigo de Piel", g: 2800, p: 0.20, h: "Pertenecía a una señora rica que se distrajo tomando té." },
    { t: "📚 Libros de Texto", g: 950, p: 0.50, h: "Los estudiantes pagan caro por estas cosas usadas hoy." },
    { n: "🎤 Micrófono de Karaoke", g: 450, p: 0.72, h: "Te lo llevaste después de cantar tu canción favorita." },
    { t: "🥃 Botella de Whisky", g: 1100, p: 0.42, h: "Una reserva de 18 años que sacaste del mueble bar." },
    { t: "🛴 Monopatín Eléctrico", g: 850, p: 0.58, h: "No tenía candado. Ahora es tu medio de transporte." },
    { t: "🛐 Reliquia del Templo", g: 5000, p: 0.08, h: "Una estatuilla de jade pura. Los monjes te maldicen." }
]

const handler = async (m, { userDb }) => {
    if (!userDb) return
    const cooldown = 1200000 
    const now = Date.now()
    const remaining = cooldown - (now - (userDb.lastCrime || 0))

    if (remaining > 0) {
        return m.reply(`*⌬┤ ⏳ ├⌬ BAJO VIGILANCIA.*\n\n> Los testigos están declarando ante la policía.\n> Escondete por: *${Math.floor(remaining / 60000)}m ${Math.floor((remaining % 60000) / 1000)}s*.`)
    }

    let usedBuff = false
    let successChance = 0.45
    const update = { $inc: {}, $set: { lastCrime: now } }

    if (userDb.inventory.mask && !userDb.dailyStats.maskUsed) {
        successChance = 1.0 
        update.$set['dailyStats.maskUsed'] = true
        userDb.dailyStats.maskUsed = true
        usedBuff = true
    }

    const plan = crimes[Math.floor(Math.random() * crimes.length)]
    userDb.lastCrime = now

    if (Math.random() < successChance) {
        const botin = plan.g + (userDb.level * 40)
        userDb.zenCoins += botin
        update.$inc.zenCoins = botin

        let txt = `*⌬┤ 🔫 ├⌬ GOLPE EXITOSO*\n\n> 🕵️ *Delito:* ${plan.t || plan.n}\n> 💰 *Botín:* ${botin} ${config.CURRENCY_NAME}s\n`
        if (usedBuff) txt += `> 👺 *Buff Máscara (1/1):* ✅ ACTIVADO (Éxito garantizado)\n`
        txt += `\n> 📖 *Historia:* ${plan.h}`
        m.reply(txt)
    } else {
        const multa = Math.floor(plan.g / 2)
        const loss = Math.min(userDb.zenCoins, multa)
        userDb.zenCoins -= loss
        update.$inc.zenCoins = -loss
        m.reply(`*⌬┤ 👮 ├⌬ ¡ALTO AHÍ!*\n\n> Te atraparon cometiendo: ${plan.t || plan.n}.\n> 💸 *Pagaste una multa de:* ${loss} ${config.CURRENCY_NAME}s.\n> _¡Mejor suerte la próxima vez, criminal!_`)
    }

    await User.updateOne({ jid: m.sender }, update)
}

handler.help = ['crimen']
handler.tags = ['eco']
handler.command = ['crime', 'crimen']
handler.register = true
export default handler