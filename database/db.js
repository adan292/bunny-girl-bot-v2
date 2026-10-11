import fs from "fs";
import path from "path";

const STORAGE_PATH = path.resolve(process.cwd(), "database/data.json");

const DEFAULT_STORE = {
  users: {},
  groups: {},
  bots: {}
};

function normalizeJid(jid = "") {
  if (!jid || typeof jid !== "string") return "";
  const cleaned = jid.split(":")[0].trim();
  return cleaned || "";
}

function ensureStore() {
  const dir = path.dirname(STORAGE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (!fs.existsSync(STORAGE_PATH)) {
    fs.writeFileSync(STORAGE_PATH, JSON.stringify(DEFAULT_STORE, null, 2), "utf8");
    return { ...DEFAULT_STORE };
  }

  try {
    const raw = fs.readFileSync(STORAGE_PATH, "utf8");
    if (!raw.trim()) {
      fs.writeFileSync(STORAGE_PATH, JSON.stringify(DEFAULT_STORE, null, 2), "utf8");
      return { ...DEFAULT_STORE };
    }

    const parsed = JSON.parse(raw);
    return {
      users: parsed.users || {},
      groups: parsed.groups || {},
      bots: parsed.bots || {}
    };
  } catch (err) {
    fs.writeFileSync(STORAGE_PATH, JSON.stringify(DEFAULT_STORE, null, 2), "utf8");
    return { ...DEFAULT_STORE };
  }
}

function saveStore(store) {
  fs.writeFileSync(STORAGE_PATH, JSON.stringify(store, null, 2), "utf8");
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}

function getUserEntry(jid) {
  const clean = normalizeJid(jid);
  if (!clean) return {};
  const store = ensureStore();
  const user = store.users[clean] || {};
  return { jid: clean, ...deepClone(user) };
}

function getGroupEntry(jid) {
  const clean = normalizeJid(jid);
  if (!clean) return {};
  const store = ensureStore();
  const group = store.groups[clean] || {};
  return { jid: clean, ...deepClone(group) };
}

function getBotEntry(jid) {
  const clean = normalizeJid(jid);
  if (!clean) return {};
  const store = ensureStore();
  const bot = store.bots[clean] || {};
  return { jid: clean, ...deepClone(bot) };
}

export function getUser(jid) {
  return getUserEntry(jid);
}

export function setUser(jid, patch = {}) {
  const clean = normalizeJid(jid);
  if (!clean) return {};

  const store = ensureStore();
  const previous = store.users[clean] || {};
  const next = { ...previous, ...deepClone(patch) };
  store.users[clean] = next;
  saveStore(store);
  return next;
}

export function getGroup(jid) {
  return getGroupEntry(jid);
}

export function setGroup(jid, patch = {}) {
  const clean = normalizeJid(jid);
  if (!clean) return {};

  const store = ensureStore();
  const previous = store.groups[clean] || {};
  const next = { ...previous, ...deepClone(patch) };
  store.groups[clean] = next;
  saveStore(store);
  return next;
}

export function getBot(jid) {
  return getBotEntry(jid);
}

export function setBot(jid, patch = {}) {
  const clean = normalizeJid(jid);
  if (!clean) return {};

  const store = ensureStore();
  const previous = store.bots[clean] || {};
  const next = { ...previous, ...deepClone(patch) };
  store.bots[clean] = next;
  saveStore(store);
  return next;
}

export function hasRole(jid, role) {
  const user = getUser(jid);
  const roles = Array.isArray(user.roles) ? user.roles : [];
  const roleName = String(role || "").toLowerCase();
  return roles.some((r) => String(r).toLowerCase() === roleName) || user.role === roleName;
}

export function setRole(jid, role) {
  const user = getUser(jid);
  const roles = Array.isArray(user.roles) ? [...new Set(user.roles)] : [];
  if (!roles.includes(role)) roles.push(role);
  return setUser(jid, { roles, role: String(role).toLowerCase() });
}

export function getGenero(jid) {
  return getUser(jid).genero || "";
}

export function setGenero(jid, genero) {
  return setUser(jid, { genero });
}

export function getPushName(jid) {
  return getUser(jid).pushName || "";
}

export function setPushName(jid, pushName) {
  return setUser(jid, { pushName });
}

export function getMarriage(jid) {
  return getUser(jid).marriedTo || null;
}

export function marry(a, b) {
  const first = normalizeJid(a);
  const second = normalizeJid(b);
  if (!first || !second || first === second) return null;

  setUser(first, { marriedTo: second });
  setUser(second, { marriedTo: first });
  return { first, second };
}

export function divorce(jid) {
  const clean = normalizeJid(jid);
  if (!clean) return null;

  const partner = getMarriage(clean);
  if (partner) {
    const user = getUser(partner);
    if (user.marriedTo === clean) setUser(partner, { marriedTo: null });
  }

  return setUser(clean, { marriedTo: null });
}

export const db = {
  getUser,
  setUser,
  getGroup,
  setGroup,
  getBot,
  setBot,
  hasRole,
  setRole,
  getGenero,
  setGenero,
  getPushName,
  setPushName,
  getMarriage,
  marry,
  divorce,

  getEco(jid) {
    const user = getUser(jid);
    return {
      bolsillo: Number(user.bolsillo ?? 0),
      banco: Number(user.banco ?? 0),
      inventario: Array.isArray(user.inventario) ? user.inventario : [],
      lastWork: Number(user.lastWork ?? 0)
    };
  },

  setEco(jid, patch = {}) {
    const user = getUser(jid);
    const next = {
      ...user,
      bolsillo: Number(patch.bolsillo ?? user.bolsillo ?? 0),
      banco: Number(patch.banco ?? user.banco ?? 0),
      inventario: Array.isArray(patch.inventario) ? patch.inventario : (Array.isArray(user.inventario) ? user.inventario : []),
      lastWork: Number(patch.lastWork ?? user.lastWork ?? 0)
    };
    return setUser(jid, next);
  },

  getGroupUser(jid, groupJid) {
    const group = getGroup(groupJid);
    const users = group.users || {};
    return users[jid] || {};
  },

  setGroupUser(jid, groupJid, patch = {}) {
    const group = getGroup(groupJid);
    const users = { ...(group.users || {}) };
    const cleanJid = normalizeJid(jid);
    users[cleanJid] = { ...(users[cleanJid] || {}), ...patch };
    return setGroup(groupJid, { users });
  }
};

export default db;
