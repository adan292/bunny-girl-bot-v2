import User from '../../lib/database/models/zen-users.js'
import config from '../../config.js'

const jobs = [
    { n: "🧹 Limpiador de la NASA", h: "Limpiaste los cristales del telescopio James Webb y encontraste una moneda pegada." },
    { n: "🎭 Doble de riesgo", h: "Saltaste de un edificio de 20 pisos. Sobreviviste, pero el presupuesto solo alcanzó para esto." },
    { n: "👴 Instructor de abuelos", h: "Le explicaste a 10 abuelos que el Wi-Fi no es magia negra. Te dieron propina." },
    { n: "🌵 Vendedor de arena", h: "Lograste venderle arena a un jeque árabe. Eres un genio del marketing." },
    { n: "☣️ Moderador de grupos", h: "Sobreviviste 10 minutos en un grupo de 'Debates Políticos'. Te mereces un aumento." },
    { n: "🇷🇺 Traductor de hackers", h: "Ayudaste a descifrar un mensaje que decía 'Admin123'. Fue un trabajo duro." },
    { n: "🐕 Paseador de Pitbulls", h: "Los perros te pasearon a ti, pero al menos te pagaron el servicio." },
    { n: "🗿 Estatua viviente", h: "No te moviste en 8 horas. Un niño te confundió con un baño, pero la paga fue buena." },
    { n: "💌 Escritor de Tinder", h: "Escribiste la biografía de un feo y consiguió 3 matches. Eres un héroe." },
    { n: "💻 Guardián del Servidor", h: "Evitaste que el servidor explotara cuando el Owner intentó instalar un mod raro." },
    { n: "🎬 Extra de Marvel", h: "Hiciste de civil que sale corriendo. Tu actuación de 2 segundos fue épica." },
    { n: "👣 Podólogo de la Deep Web", h: "Mejor no preguntes qué tipo de pies viste. La paga es lo único bueno." },
    { n: "📱 Reparador de Nokia", h: "Intentaste arreglar un Nokia 1100 y rompiste la mesa. El celular sigue intacto." },
    { n: "🦄 Jinete de Unicornios", h: "Era un burro con un cono pegado, pero los niños no se dieron cuenta." },
    { n: "🎮 Streamer de Buscaminas", h: "Tuviste 2 espectadores, pero uno era un bot que te donó esto." },
    { n: "🌬️ Embotellador de aire", h: "Vendiste 'Esencia de la Montaña'. Realmente era aire de tu ventilador." },
    { n: "🧸 Niñero de peluches", h: "Cuidaste la colección de un coleccionista excéntrico. Ninguno se escapó." },
    { n: "🤡 Payaso gótico", h: "Hiciste globos con forma de ataúd en un cumpleaños. Fue... diferente." },
    { n: "🧪 Conejillo de indias", h: "Probaste una bebida energética nueva y ahora puedes ver el color de la música." },
    { n: "🍕 Crítico de piña", h: "Te pagaron por decidir si la piña va en la pizza. Dijiste que sí y te echaron." },
    { n: "🐜 Entrenador de hormigas", h: "Hicieron una pirámide humana. Fue el evento del año en el jardín." },
    { n: "🗳️ Contador de votos", h: "Contaste votos en una isla desierta. Ganó un coco llamado Wilson." },
    { n: "🦷 Hada de los dientes", h: "Se te acabó el cambio y tuviste que dejar un pagaré bajo la almohada." },
    { n: "🥑 Especialista en paltas", h: "Elegiste 10 paltas y todas estaban en su punto justo. Eres un dios." },
    { n: "🧙‍♂️ Aprendiz de mago", h: "Hiciste desaparecer tu sueldo en un segundo. Un truco asombroso." },
    { n: "🛸 Avistador de OVNIS", h: "Viste una luz extraña, resultó ser la linterna de un guardia echándote." },
    { n: "🧦 Buscador de medias", h: "Encontraste la media izquierda que perdiste en 2015. Es un milagro." },
    { n: "🧗 Limpiador de montañas", h: "Sacaste un chicle pegado en la cima del Everest." },
    { n: "🦓 Estilista de cebras", h: "Le pintaste las rayas a una cebra que se estaba quedando calva." },
    { n: "🐄 Masajista de vacas", h: "La leche salió con burbujas de lo relajada que estaba la vaca." },
    { n: "📦 Probador de cajas", h: "Te sentaste en 50 cajas para ver si aguantaban. Te quedaste dormido en la 5." },
    { n: "🧘 Gurú de piedras", h: "Le enseñaste meditación a una piedra. Fue el alumno más aplicado." },
    { n: "🌑 Minero lunar", h: "Trajiste un poco de polvo de luna en tus zapatos y lo vendiste." },
    { n: "🕯️ Fabricante de velas", h: "Hiciste velas con olor a 'Computadora nueva'. Se agotaron en un minuto." },
    { n: "🧴 Catador de perfumes", h: "Oliste tantas fragancias que ahora tu nariz solo detecta olor a cebolla." },
    { n: "📦 Delivery de pizza", h: "Llegaste en 29 minutos. El cliente quería que tardaras 31 para que sea gratis." },
    { n: "🛶 Gondolero de alcantarilla", h: "Llevaste a una rata a su primera cita romántica." },
    { n: "🎻 Músico de semáforo", h: "Tocaste el triángulo. Un conductor te dio dinero para que pararas." },
    { n: "🕵️ Espía de vecinos", h: "Descubriste que la vecina del 4to usa peluca. Información valiosa." },
    { n: "🧯 Apagafuegos de asados", h: "Salvaste la carne, pero quedaste cubierto de chimichurri." },
    { n: "🪁 Piloto de barriletes", h: "Llevaste un mensaje de amor a través del cielo. Rompieron a los dos días." },
    { n: "🧵 Tejedor de nubes", h: "Hiciste un suéter de algodón de azúcar. Se lo comió un pájaro." },
    { n: "👞 Lustrabotas de estatuas", h: "El General San Martín nunca tuvo los pies tan brillantes." },
    { n: "🍦 Probador de helados", h: "Te dio una parálisis cerebral por el frío, pero valió la pena cada bocado." },
    { n: "🎈 Inflador de globos", h: "Inflaste 500 globos con los pulmones. Ahora hablas como ardilla." },
    { n: "🧺 Cosechador de memes", h: "Encontraste un meme de 2012 que todavía da risa. Oro puro." },
    { n: "🧤 Taxista de caracoles", h: "Llevaste a uno de una hoja a otra. El viaje duró 4 días." },
    { n: "🧳 Maletero de hormigas", h: "Cargaste una miga de pan por 2 metros. Fue un esfuerzo titánico." },
    { n: "🛁 Bañador de gatos", h: "Saliste con más cicatrices que un veterano de guerra, pero limpio." },
    { n: "🛐 Becario del Bot", h: "Hiciste el café para los otros plugins. Te dejaron las sobras." }
]

const handler = async (m, { userDb }) => {
    if (!userDb) return
    const cooldown = 600000 
    const now = Date.now()
    const remaining = cooldown - (now - userDb.lastWork)

    if (remaining > 0) {
        return m.reply(`*⌬┤ ⏳ ├⌬ ESPERA.*\n\n> Estás muy cansado para chambear.\n> Tiempo restante: *${Math.floor(remaining / 60000)}m ${Math.floor((remaining % 60000) / 1000)}s*.`)
    }

    const job = jobs[Math.floor(Math.random() * jobs.length)]
    const base = Math.floor(Math.random() * 300) + 300
    const bonusLevel = userDb.level * 25
    let subtotal = base + bonusLevel

    let bonusSuit = 0
    let usedSuitBuff = false
    let bonusAmulet = 0
    const update = { $inc: {}, $set: { lastWork: now } }

    if (userDb.inventory?.suit && !userDb.dailyStats.suitUsed) {
        bonusSuit = Math.floor(subtotal * 0.20)
        update.$set['dailyStats.suitUsed'] = true
        userDb.dailyStats.suitUsed = true
        usedSuitBuff = true
    }

    if (userDb.inventory?.amulet === 'fortune') {
        bonusAmulet = Math.floor(subtotal * 0.10)
    }

    const total = subtotal + bonusSuit + bonusAmulet
    userDb.zenCoins += total
    userDb.lastWork = now
    update.$inc.zenCoins = total

    await User.updateOne({ jid: m.sender }, update)

    let txt = `*⌬┤ 💼 ├⌬ TRABAJO FINALIZADO*\n\n`
            + `> 👷 *Empleo:* ${job.n}\n`
            + `> 💰 *Ganancia:* ${total} ${config.CURRENCY_NAME}s\n`
    if (usedSuitBuff) txt += `> 👔 *Bono Traje (1/1):* ✅ APLICADO (+20%)\n`
    if (bonusAmulet > 0) txt += `> 🍀 *Bono Amuleto Fortuna:* +${bonusAmulet} (+10%)\n`
    txt += `> ✨ *Bono de Nivel:* +${bonusLevel}\n\n`
    txt += `> 📖 *Historia:* ${job.h}`

    m.reply(txt)
}

handler.help = ['trabajar']
handler.tags = ['eco']
handler.command = ['work', 'w', 'laburar', 'trabajar', 'chamba']
handler.register = true
export default handler
