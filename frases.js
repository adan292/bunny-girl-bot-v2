const frases = {
  kick: [
    "🐰 @usuario ha sido expulsado. Procura comportarte mejor.",
    "👋 @usuario, parece que ya no eres bienvenido aquí.",
    "🚫 Decisión tomada. @usuario ha sido expulsado.",
    "🐰 No me hagas repetirlo. @usuario queda fuera."
  ],
  ban: [
    "🚫 @usuario ha sido bloqueado.",
    "🐰 Algunas oportunidades se terminan. @usuario ha sido bloqueado.",
    "⛔ @usuario ha sido retirado del grupo."
  ],
  mute: [
    "🤫 @usuario necesita un pequeño descanso de sus propias palabras.",
    "🔇 @usuario queda en silencio.",
    "🐰 Creo que hablar menos te vendrá bien, @usuario."
  ],
  warn: [
    "⚠️ @usuario ha recibido una advertencia.",
    "🐰 Primera advertencia para @usuario. La próxima vez no seré tan amable.",
    "😐 Advertencia registrada. Compórtate."
  ],
  close: [
    "🔒 El grupo queda cerrado. Solo los administradores podrán hablar.",
    "🐰 Silencio en la sala. Grupo cerrado."
  ],
  open: [
    "🔓 Pueden volver a hablar.",
    "🐰 Se acabó el silencio. Pueden continuar."
  ],
  promote: [
    "👑 @usuario ha recibido permisos de administrador.",
    "✨ Felicidades, @usuario. Ahora tienes responsabilidades."
  ],
  demote: [
    "👑 @usuario ha perdido sus privilegios de administrador.",
    "🐰 Esas responsabilidades eran demasiado para ti, @usuario."
  ],
  welcome: [
    "🐰 Bienvenido/a, @usuario. Espero que disfrutes tu estancia aquí.",
    "💜 @usuario acaba de llegar. Sean amables con él/ella.",
    "✨ Bienvenido/a al grupo."
  ],
  goodbye: [
    "👋 @usuario se ha marchado. Que te vaya bien.",
    "🐰 Hasta luego, @usuario."
  ],
  daily: [
    "💰 Tu recompensa diaria ha llegado.",
    "🐰 Toma tus monedas. Intenta ahorrar un poco."
  ],
  work: [
    "💼 Has trabajado duro. Aquí está tu recompensa.",
    "💰 Trabajo terminado."
  ],
  hug: [
    "🤍 *Mai te da un pequeño abrazo.*",
    "💜 *Te abraza suavemente.*"
  ],
  kiss: [
    "💋 ¿Un beso? Qué atrevido eres...",
    "😳 *Mai te da un pequeño beso.*"
  ],
  pat: [
    "🐰 *Mai te da unas palmaditas en la cabeza.*",
    "✨ *Pat pat*."
  ],
  love: [
    "❤️ Tal vez seas más importante para mí de lo que imaginas.",
    "😳 No me hagas decirlo directamente..."
  ],
  slap: [
    "🐰 *Mai te da un pequeño golpe en la cabeza.* Compórtate.",
    "😐 Eso fue por decir una tontería."
  ],
  ship: [
    "💘 Analizando compatibilidad...",
    "✨ Calculando compatibilidad romántica..."
  ],
  mai: [
    "🐰 ¿Me estabas buscando?",
    "😏 ¿Qué quieres?",
    "💜 Aquí estoy."
  ],
  sakuta: [
    "🐷 ¿Buscas a Sakuta?",
    "😐 Probablemente esté metiéndose en problemas otra vez."
  ],
  futaba: [
    "🔬 Consultando a Futaba...",
    "📚 Futaba probablemente pueda explicar esto mejor."
  ],
  tomoe: [
    "🌸 Parece que Tomoe está cerca.",
    "🐰 Tomoe es más sensible de lo que aparenta."
  ],
  shoko: [
    "🌸 Shoko es una persona bastante especial.",
    "💜 Hay historias que necesitan tiempo para ser comprendidas."
  ],
  kaede: [
    "🐱 Kaede merece una sonrisa.",
    "💜 Hay que tratar a Kaede con cariño."
  ],
  nodoka: [
    "🎤 Nodoka tiene una personalidad bastante fuerte.",
    "✨ La vida de una idol no parece tan sencilla."
  ]
};

function frase(tipo, usuario = "@usuario") {
  const list = frases[tipo];
  if (!list?.length) return "🐰 Acción realizada.";
  return list[Math.floor(Math.random() * list.length)].replace(/@usuario/g, usuario);
}


// Frases adicionales para interacciones
const EXTRA_INTERACTIONS = {
  punch: (x="tú") => `🥊 Bunny le dio un puñetazo a ${x} 💥`,
  kiss: (x="tú") => `💋 Bunny le dio un besito a ${x} ❤️`,
  hug: (x="tú") => `🤗 Bunny abrazó a ${x} con cariño 💜`,
  cafe: () => `☕ Bunny se tomó un cafecito tranquilamente ✨`,
  pat: (x="tú") => `🐰 Bunny le hizo pat pat a ${x} 🥰`,
  slap: (x="tú") => `👋 Bunny le dio una cachetadita a ${x} 💫`,
  bite: (x="tú") => `🦷 Bunny mordió a ${x} suavemente 😈`,
  cuddle: (x="tú") => `🫂 Bunny se acurrucó con ${x} 💕`,
  poke: (x="tú") => `👉 Bunny le hizo poke a ${x} 👀`,
  tickle: (x="tú") => `😂 Bunny le hizo cosquillas a ${x}`,
  dance: () => `💃 Bunny se puso a bailar ✨`,
  cry: () => `😭 Bunny está llorando... dale un abrazo 💜`,
  happy: () => `🥰 Bunny está muy feliz hoy ✨`,
  angry: () => `😤 Bunny se puso enojada... cuidado 👀`,
  baka: (x="tú") => `😳 Bunny llamó baka a ${x} 💢`,
  run: () => `🏃 Bunny salió corriendo a toda velocidad 💨`,
  sleep: () => `😴 Bunny se quedó dormida... shhh 🤫`,
  eat: () => `🍜 Bunny está comiendo felizmente 😋`,
  drink: () => `🥤 Bunny se tomó algo refrescante ✨`,
  love: () => `❤️ Bunny está repartiendo amor por el grupo`,
  jealous: (x="tú") => `😒 Bunny está celosa de ${x} 👀`,
  shy: () => `👉👈 Bunny se puso tímida...`,
  laugh: () => `🤣 Bunny no puede parar de reír`,
  highfive: (x="tú") => `✋ Bunny chocó los cinco con ${x} ✨`,
  handhold: (x="tú") => `🤝 Bunny tomó la mano de ${x} 💕`,
  bonk: (x="tú") => `🔨 Bunny hizo bonk a ${x} 💫`,
  stare: (x="tú") => `👀 Bunny se quedó mirando a ${x}...`,
  smile: () => `😊 Bunny sonrió dulcemente`,
  shoot: (x="tú") => `🔫 Bunny disparó una ráfaga de confeti a ${x} 🎉`
};

const _oldExports = { frases, frase };
module.exports = { ..._oldExports, EXTRA_INTERACTIONS };
