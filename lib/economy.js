const db = require("../database");
const { randomInt, msLeft, formatTime, calculateLevel } = require("../utils");

const SHOP = [
  { id: "pocion", name: "🧪 Poción", price: 150, desc: "Objeto RPG." },
  { id: "espada", name: "⚔️ Espada", price: 700, desc: "Aumenta tu ataque RPG." },
  { id: "escudo", name: "🛡️ Escudo", price: 600, desc: "Aumenta tu defensa RPG." },
  { id: "corazon", name: "💜 Corazón", price: 250, desc: "Aumenta afinidad con Bunny." }
];

function daily(id) {
  const u = db.getUser(id);
  const left = msLeft(u.dailyAt, 86400000);
  if (left) return { ok: false, message: `⏳ Vuelve en ${formatTime(left)}.` };
  const amount = randomInt(150, 400);
  db.updateUser(id, { coins: u.coins + amount, dailyAt: Date.now() });
  return { ok: true, amount };
}

function weekly(id) {
  const u = db.getUser(id);
  const left = msLeft(u.weeklyAt, 604800000);
  if (left) return { ok: false, message: `⏳ Vuelve en ${formatTime(left)}.` };
  const amount = randomInt(800, 1800);
  db.updateUser(id, { coins: u.coins + amount, weeklyAt: Date.now() });
  return { ok: true, amount };
}

function work(id) {
  const u = db.getUser(id);
  const left = msLeft(u.workAt, 3600000);
  if (left) return { ok: false, message: `⏳ Podrás trabajar de nuevo en ${formatTime(left)}.` };
  const amount = randomInt(80, 250);
  db.updateUser(id, { coins: u.coins + amount, workAt: Date.now() });
  return { ok: true, amount };
}

function transfer(from, to, amount) {
  if (!Number.isInteger(amount) || amount <= 0) return { ok: false, message: "Cantidad inválida." };
  const a = db.getUser(from), b = db.getUser(to);
  if (a.coins < amount) return { ok: false, message: "💸 No tienes suficientes monedas." };
  db.updateUser(from, { coins: a.coins - amount });
  db.updateUser(to, { coins: b.coins + amount });
  return { ok: true };
}

function deposit(id, amount) {
  const u = db.getUser(id);
  if (!Number.isInteger(amount) || amount <= 0 || u.coins < amount) return { ok: false };
  db.updateUser(id, { coins: u.coins - amount, bank: u.bank + amount });
  return { ok: true };
}

function withdraw(id, amount) {
  const u = db.getUser(id);
  if (!Number.isInteger(amount) || amount <= 0 || u.bank < amount) return { ok: false };
  db.updateUser(id, { coins: u.coins + amount, bank: u.bank - amount });
  return { ok: true };
}

function rob(from, to) {
  const a = db.getUser(from), b = db.getUser(to);
  const left = msLeft(a.robAt, 3600000);
  if (left) return { ok: false, message: `⏳ Espera ${formatTime(left)}.` };
  if (b.coins < 10) return { ok: false, message: "😐 Ese usuario tiene muy poco dinero." };
  db.updateUser(from, { robAt: Date.now() });
  if (Math.random() < 0.45) {
    const amount = Math.min(randomInt(20, 150), b.coins);
    db.updateUser(from, { coins: a.coins + amount, robAt: Date.now() });
    db.updateUser(to, { coins: b.coins - amount });
    return { ok: true, success: true, amount };
  }
  const fine = Math.min(randomInt(10, 80), a.coins);
  db.updateUser(from, { coins: a.coins - fine, robAt: Date.now() });
  return { ok: true, success: false, amount: fine };
}

function buy(id, itemId) {
  const item = SHOP.find(x => x.id === itemId);
  if (!item) return { ok: false, message: "Producto no encontrado." };
  const u = db.getUser(id);
  if (u.coins < item.price) return { ok: false, message: "💸 No tienes suficientes monedas." };
  const inv = [...u.inventory, item.id];
  const patch = { coins: u.coins - item.price, inventory: inv };
  if (item.id === "espada") patch.rpg = { ...u.rpg, attack: u.rpg.attack + 10, weapon: "Espada Bunny" };
  if (item.id === "escudo") patch.rpg = { ...u.rpg, defense: u.rpg.defense + 10 };
  if (item.id === "corazon") patch.affinity = Math.min(100, u.affinity + 10);
  db.updateUser(id, patch);
  return { ok: true, item };
}

function addXp(id, amount) {
  const u = db.getUser(id);
  const before = calculateLevel(u.xp);
  const newXp = u.xp + amount;
  const after = calculateLevel(newXp);
  db.updateUser(id, { xp: newXp, level: after.level });
  return { amount, levelUp: after.level > before.level, level: after.level };
}

module.exports = {
  SHOP, daily, weekly, work, transfer, deposit, withdraw, rob, buy, addXp
};
