import { db } from "../../database/db.js";
import axios from "axios";

const tttGames = new Map();
const winLines = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

function renderBoard(board) {
  return board.map((cell, index) => {
    if (cell === "X") return "❌";
    if (cell === "O") return "⭕";
    return `${index + 1}`;
  }).reduce((acc, cell, index) => {
    acc += cell;
    if ((index + 1) % 3 === 0) acc += "\n";
    else acc += " | ";
    return acc;
  }, "");
}

function checkWin(board, mark) {
  return winLines.some(line => line.every(index => board[index] === mark));
}

function isFull(board) {
  return board.every(Boolean);
}

function parseAIMove(text) {
  if (!text) return null;

  try {
    const parsed = JSON.parse(text);
    if (Number.isInteger(parsed?.move)) return parsed.move;
  } catch {}

  const match = text.match(/[0-8]/);
  if (match) return Number(match[0]);

  const alt = text.match(/[1-9]/);
  if (alt) return Number(alt[0]) - 1;

  return null;
}

async function askChatGPT(prompt) {
  const { data } = await axios.get("https://api.alyacore.xyz/ai/chatgpt", {
    params: {
      text: prompt,
      key: "Duarte-zz12"
    }
  });

  if (!data?.status || !data?.result) {
    throw new Error("Sin respuesta de la IA");
  }

  return data.result;
}

export async function handleTttTurn(sender, text, ctx) {
  const game = tttGames.get(sender);
  if (!game || game.turn !== "player") return false;

  const move = Number(String(text || "").trim());
  if (!Number.isInteger(move) || move < 1 || move > 9) {
    await ctx.reply({ text: `🎮 Debés elegir un número del 1 al 9.\n\n${renderBoard(game.board)}` });
    return true;
  }

  const index = move - 1;
  if (game.board[index]) {
    await ctx.reply({ text: `❌ Esa casilla ya está ocupada.\n\n${renderBoard(game.board)}` });
    return true;
  }

  game.board[index] = "X";

  if (checkWin(game.board, "X")) {
    const eco = db.getEco(sender);
    const premio = game.bet * 2;
    db.setEco(sender, { bolsillo: (eco.bolsillo || 0) + premio });
    tttGames.delete(sender);
    await ctx.reply({ text: `🎉 ¡Ganaste! Te llevás *${premio}* Fragmentos.\n\n${renderBoard(game.board)}` });
    return true;
  }

  if (isFull(game.board)) {
    const eco = db.getEco(sender);
    db.setEco(sender, { bolsillo: (eco.bolsillo || 0) + game.bet });
    tttGames.delete(sender);
    await ctx.reply({ text: `🤝 Empate. Te devolvemos tu apuesta de *${game.bet}* Fragmentos.\n\n${renderBoard(game.board)}` });
    return true;
  }

  try {
    const prompt = `Eres un jugador experto de tres en raya. Debes jugar con "O". El tablero actual es: ${JSON.stringify(game.board.map(v => v || "-"))}. Devuelve SOLO JSON con la propiedad "move" indicando el índice 0-8 donde vas a jugar. No agregues texto extra.`;
    const aiReply = await askChatGPT(prompt);
    let aiMove = parseAIMove(aiReply);

    if (aiMove === null || aiMove < 0 || aiMove > 8 || game.board[aiMove]) {
      const empty = game.board.map((cell, idx) => (!cell ? idx : null)).filter(v => v !== null);
      aiMove = empty[Math.floor(Math.random() * empty.length)] ?? null;
    }

    if (aiMove === null) {
      const eco = db.getEco(sender);
      db.setEco(sender, { bolsillo: (eco.bolsillo || 0) + game.bet });
      tttGames.delete(sender);
      await ctx.reply({ text: `🤝 Empate. Te devolvemos tu apuesta de *${game.bet}* Fragmentos.\n\n${renderBoard(game.board)}` });
      return true;
    }

    game.board[aiMove] = "O";

    if (checkWin(game.board, "O")) {
      tttGames.delete(sender);
      await ctx.reply({ text: `💥 La IA ganó. Perdiste *${game.bet}* Fragmentos.\n\n${renderBoard(game.board)}` });
      return true;
    }

    if (isFull(game.board)) {
      const eco = db.getEco(sender);
      db.setEco(sender, { bolsillo: (eco.bolsillo || 0) + game.bet });
      tttGames.delete(sender);
      await ctx.reply({ text: `🤝 Empate. Te devolvemos tu apuesta de *${game.bet}* Fragmentos.\n\n${renderBoard(game.board)}` });
      return true;
    }

    await ctx.reply({ text: `🎮 Tu turno.\n\n${renderBoard(game.board)}` });
    return true;
  } catch (err) {
    tttGames.delete(sender);
    await ctx.reply({ text: "❌ La IA falló y se canceló la partida." });
    return true;
  }
}

export default {
  name: ["ttt", "tresenraya"],
  description: "Juega 3 en raya contra la IA apostando Fragmentos",
  category: "economy",
  groupOnly: false,

  async run({ sender, args, reply, react }) {
    const bet = Number(args[0]);

    if (!Number.isFinite(bet) || bet <= 0) {
      return await reply({ text: "🎮 *Uso:* .ttt <cantidad>\nEjemplo: *.ttt 20*" });
    }

    const eco = db.getEco(sender);
    if ((eco.bolsillo || 0) < bet) {
      return await reply({ text: `❌ No tenés suficientes Fragmentos.\n*Bolsillo:* ${eco.bolsillo || 0}` });
    }

    db.setEco(sender, { bolsillo: (eco.bolsillo || 0) - bet });

    const game = {
      sender,
      bet,
      board: Array(9).fill(null),
      turn: "player"
    };

    tttGames.set(sender, game);
    await react("🎮");
    await reply({ text: `🎮 *Apuesta:* ${bet} Fragmentos\n\n${renderBoard(game.board)}\n\nTu turno: escribí un número del 1 al 9.` });
  }
};
