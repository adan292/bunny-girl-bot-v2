import { db } from "../../database/db.js";

function getColorFromNumber(number) {
  if (number === 0) return "verde";
  return number % 2 === 0 ? "negro" : "rojo";
}

export default {
  name: ["ruleta", "rt", "roulette"],
  description: "Prueba tu suerte con una ruleta y apuesta Fragmentos",
  category: "economy",
  groupOnly: true,

  async run({ sender, args, reply }) {
    const apuestaRaw = args[0];
    const guessRaw = (args[1] || "").toLowerCase();

    let apuesta = null;
    try {
      apuesta = BigInt(apuestaRaw);
    } catch {
      apuesta = null;
    }

    const normalizado = {
      rojo: "rojo",
      r: "rojo",
      negro: "negro",
      n: "negro",
      verde: "verde",
      v: "verde"
    }[guessRaw];

    if (apuesta === null || apuesta <= 0n || !normalizado) {
      return await reply({
        text: "🎰 *Uso:* .ruleta <cantidad> <rojo|negro|verde>\n\nEjemplo: *.ruleta 50 rojo*"
      });
    }

    const eco = db.getEco(sender);
    const bolsilloActual = eco.bolsillo ?? 0n;

    if (bolsilloActual < apuesta) {
      return await reply({
        text: `❌ No tenés suficientes Fragmentos para apostar *${apuesta.toString()}*.`
      });
    }

    const numero = Math.floor(Math.random() * 37); // 0..36
    const color = getColorFromNumber(numero);
    const gano = color === normalizado;
    const ganancia = gano ? apuesta * 2n : -apuesta;

    db.setEco(sender, { bolsillo: bolsilloActual + ganancia });

    const resultado = gano
      ? `🎉 ¡Ganaste! La bola cayó en *${numero}* (${color}).\n💰 Ganaste *${apuesta.toString()}* Fragmentos.`
      : `💥 ¡Perdiste! La bola cayó en *${numero}* (${color}).\n💸 Apostaste *${apuesta.toString()}* Fragmentos.`;

    await reply({ text: resultado });
  }
};
