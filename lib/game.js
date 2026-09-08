const { randomInt, pick } = require("../utils");

function dice() {
  return randomInt(1, 6);
}

function coinflip() {
  return pick(["🪙 Cara", "🪙 Cruz"]);
}

function slots() {
  const s = ["🍒", "🍋", "🍇", "⭐", "💎", "7️⃣"];
  const result = [pick(s), pick(s), pick(s)];
  const jackpot = result[0] === result[1] && result[1] === result[2];
  const pair = result[0] === result[1] || result[1] === result[2] || result[0] === result[2];
  return { result, jackpot, pair };
}

function roulette() {
  const n = randomInt(0, 36);
  return {
    number: n,
    color: n === 0 ? "🟢 Verde" : n % 2 ? "🔴 Rojo" : "⚫ Negro"
  };
}

function blackjack() {
  const cards = [2,3,4,5,6,7,8,9,10,10,10,10,11];
  const a = pick(cards), b = pick(cards);
  const total = a + b;
  return { a, b, total };
}

function rps(choice) {
  const choices = ["piedra", "papel", "tijera"];
  const bot = pick(choices);
  const user = choice.toLowerCase();
  if (!choices.includes(user)) return null;
  if (user === bot) return { user, bot, result: "empate" };
  const win =
    (user === "piedra" && bot === "tijera") ||
    (user === "papel" && bot === "piedra") ||
    (user === "tijera" && bot === "papel");
  return { user, bot, result: win ? "victoria" : "derrota" };
}

const trivia = [
  { q: "¿Cuál es el planeta conocido como planeta rojo?", a: "marte" },
  { q: "¿Cuántos lados tiene un hexágono?", a: "6" },
  { q: "¿Cuál es el océano más grande?", a: "pacifico" },
  { q: "¿Cuánto es 12 × 12?", a: "144" },
  { q: "¿Qué lenguaje se ejecuta directamente en el navegador?", a: "javascript" }
];

module.exports = { dice, coinflip, slots, roulette, blackjack, rps, trivia };
