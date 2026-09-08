const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "data");
const file = path.join(dir, "database.json");

const DEFAULT_USER = {
  coins: 100,
  bank: 0,
  xp: 0,
  level: 1,
  warns: 0,
  dailyAt: 0,
  weeklyAt: 0,
  workAt: 0,
  robAt: 0,
  lastXpAt: 0,
  affinity: 0,
  inventory: [],
  stats: {
    wins: 0,
    losses: 0,
    games: 0,
    messages: 0
  },
  rpg: {
    hp: 100,
    maxHp: 100,
    attack: 15,
    defense: 10,
    weapon: "Espada de principiante"
  }
};

const DEFAULT_GROUP = {
  welcome: true,
  goodbye: true,
  antilink: false,
  antiflood: true,
  antispam: true,
  antiparoles: false,
  blockedWords: [],
  maxWarnings: 3,
  flood: {},
  spam: {},
  warnings: {}
};

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

function ensure() {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify({
      users: {},
      groups: {}
    }, null, 2));
  }
}

function load() {
  ensure();
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return { users: {}, groups: {} };
  }
}

function save(db) {
  ensure();
  fs.writeFileSync(file, JSON.stringify(db, null, 2));
}

function normalizeUser(user) {
  const base = clone(DEFAULT_USER);
  return {
    ...base,
    ...user,
    stats: { ...base.stats, ...(user?.stats || {}) },
    rpg: { ...base.rpg, ...(user?.rpg || {}) },
    inventory: Array.isArray(user?.inventory) ? user.inventory : []
  };
}

function normalizeGroup(group) {
  const base = clone(DEFAULT_GROUP);
  return {
    ...base,
    ...group,
    blockedWords: Array.isArray(group?.blockedWords) ? group.blockedWords : [],
    warnings: group?.warnings || {}
  };
}

function getUser(id) {
  const db = load();
  const user = normalizeUser(db.users[id] || {});
  if (!db.users[id]) {
    db.users[id] = user;
    save(db);
  }
  return user;
}

function updateUser(id, patch) {
  const db = load();
  const user = normalizeUser(db.users[id] || {});
  db.users[id] = normalizeUser({
    ...user,
    ...patch,
    stats: { ...user.stats, ...(patch.stats || {}) },
    rpg: { ...user.rpg, ...(patch.rpg || {}) }
  });
  save(db);
  return db.users[id];
}

function mutateUser(id, fn) {
  const db = load();
  const user = normalizeUser(db.users[id] || {});
  fn(user);
  db.users[id] = normalizeUser(user);
  save(db);
  return db.users[id];
}

function getGroup(id) {
  const db = load();
  const group = normalizeGroup(db.groups[id] || {});
  if (!db.groups[id]) {
    db.groups[id] = group;
    save(db);
  }
  return group;
}

function updateGroup(id, patch) {
  const db = load();
  const group = normalizeGroup(db.groups[id] || {});
  db.groups[id] = normalizeGroup({ ...group, ...patch });
  save(db);
  return db.groups[id];
}

function getAllUsers() {
  const db = load();
  return Object.entries(db.users).map(([id, data]) => [id, normalizeUser(data)]);
}

module.exports = {
  DEFAULT_USER,
  DEFAULT_GROUP,
  load, save,
  getUser, updateUser, mutateUser,
  getGroup, updateGroup, getAllUsers
};
