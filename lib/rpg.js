const db = require("../database");
const { randomInt } = require("../utils");

function stats(id) {
  return db.getUser(id).rpg;
}

function heal(id) {
  const u = db.getUser(id);
  db.updateUser(id, { rpg: { ...u.rpg, hp: u.rpg.maxHp } });
}

function duel(aId, bId) {
  const a = db.getUser(aId), b = db.getUser(bId);
  let ahp = a.rpg.hp, bhp = b.rpg.hp;
  const rounds = [];
  let turn = 0;
  while (ahp > 0 && bhp > 0 && turn < 20) {
    const dmgA = Math.max(1, a.rpg.attack - Math.floor(b.rpg.defense / 3) + randomInt(-3, 5));
    bhp -= dmgA;
    rounds.push(`⚔️ Turno ${turn + 1}: ${aId === bId ? "A" : "Jugador 1"} hace ${dmgA} daño.`);
    if (bhp <= 0) break;
    const dmgB = Math.max(1, b.rpg.attack - Math.floor(a.rpg.defense / 3) + randomInt(-3, 5));
    ahp -= dmgB;
    rounds.push(`🛡️ Respuesta: ${dmgB} daño.`);
    turn++;
  }
  const winner = ahp > 0 ? aId : bId;
  const loser = winner === aId ? bId : aId;
  db.updateUser(winner, { stats: { ...db.getUser(winner).stats, wins: db.getUser(winner).stats.wins + 1 } });
  db.updateUser(loser, { stats: { ...db.getUser(loser).stats, losses: db.getUser(loser).stats.losses + 1 } });
  return { winner, rounds, ahp: Math.max(0, ahp), bhp: Math.max(0, bhp) };
}

module.exports = { stats, heal, duel };
