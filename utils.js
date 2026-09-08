function jidNumber(jid = "") {
  return jid.split("@")[0].split(":")[0];
}

function mention(jid) {
  return "@" + jidNumber(jid);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function isUrl(text = "") {
  return /https?:\/\/|www\.|chat\.whatsapp\.com\//i.test(text);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function msLeft(last, cooldown) {
  return Math.max(0, cooldown - (Date.now() - Number(last || 0)));
}

function formatTime(ms) {
  const sec = Math.ceil(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.ceil(sec / 60);
  if (min < 60) return `${min}m`;
  return `${Math.ceil(min / 60)}h`;
}

function xpForLevel(level) {
  return 100 + ((level - 1) * 75);
}

function totalXpForLevel(level) {
  let total = 0;
  for (let i = 1; i < level; i++) total += xpForLevel(i);
  return total;
}

function calculateLevel(xp) {
  let level = 1;
  let required = xpForLevel(level);
  let current = xp;
  while (current >= required && level < 100) {
    current -= required;
    level++;
    required = xpForLevel(level);
  }
  return { level, current, required };
}

module.exports = {
  jidNumber, mention, randomInt, pick, isUrl, sleep,
  msLeft, formatTime, xpForLevel, totalXpForLevel, calculateLevel
};
