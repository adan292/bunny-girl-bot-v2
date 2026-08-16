const fs = require('fs');
const path = require('path');
const config = require('../config');

const MEDIA_DIR = path.join(__dirname, '..', 'media', 'interactions');

const ALIASES = {
  punch: ['punch', 'anime punch'],
  kiss: ['kiss', 'anime kiss'],
  hug: ['hug', 'anime hug'],
  cafe: ['cafe', 'anime cafe'],
  pat: ['pat', 'anime headpat'],
  slap: ['slap', 'anime slap'],
  bite: ['bite', 'anime bite'],
  cuddle: ['cuddle', 'anime cuddle'],
  poke: ['poke', 'anime poke'],
  tickle: ['tickle', 'anime tickle'],
  dance: ['dance', 'anime dance'],
  cry: ['cry', 'anime cry'],
  happy: ['happy', 'anime happy'],
  angry: ['angry', 'anime angry'],
  baka: ['baka', 'anime baka'],
  run: ['run', 'anime run'],
  sleep: ['sleep', 'anime sleep'],
  eat: ['eat', 'anime eat'],
  drink: ['drink', 'anime drink'],
  love: ['love', 'anime love'],
  jealous: ['jealous', 'anime jealous'],
  shy: ['shy', 'anime shy'],
  laugh: ['laugh', 'anime laugh'],
  highfive: ['highfive', 'anime high five'],
  handhold: ['handhold', 'anime hand holding'],
  bonk: ['bonk', 'anime bonk'],
  stare: ['stare', 'anime stare'],
  smile: ['smile', 'anime smile'],
  shoot: ['shoot', 'anime shoot']
};

function localCandidates(command) {
  return [
    path.join(MEDIA_DIR, `${command}.gif`),
    path.join(MEDIA_DIR, `${command}.mp4`)
  ];
}

async function findGiphyUrl(command) {
  if (!config.giphyApiKey) return null;
  const q = encodeURIComponent((ALIASES[command] || [command])[1] || command);
  const url = `https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(config.giphyApiKey)}&q=${q}&limit=12&rating=pg`;
  const r = await fetch(url);
  if (!r.ok) return null;
  const data = await r.json();
  const items = Array.isArray(data.data) ? data.data : [];
  if (!items.length) return null;
  const item = items[Math.floor(Math.random() * items.length)];
  return item?.images?.original?.url || item?.images?.downsized?.url || null;
}

async function fetchBuffer(url) {
  const r = await fetch(url, { redirect: 'follow' });
  if (!r.ok) throw new Error(`GIF HTTP ${r.status}`);
  const type = r.headers.get('content-type') || '';
  if (!type.includes('gif') && !type.includes('video')) throw new Error('Recurso no es GIF/video');
  const arr = await r.arrayBuffer();
  return Buffer.from(arr);
}

async function sendInteraction(sock, jid, command, caption, mentions = []) {
  if (!config.interactionGif) {
    return sock.sendMessage(jid, { text: caption, mentions });
  }

  try {
    const local = localCandidates(command).find(fs.existsSync);
    if (local) {
      const data = fs.readFileSync(local);
      if (local.endsWith('.mp4')) {
        return sock.sendMessage(jid, { video: data, gifPlayback: true, caption, mentions });
      }
      return sock.sendMessage(jid, { video: data, gifPlayback: true, caption, mentions });
    }

    const url = await findGiphyUrl(command);
    if (url) {
      const data = await fetchBuffer(url);
      return sock.sendMessage(jid, { video: data, gifPlayback: true, caption, mentions });
    }
  } catch (e) {
    console.warn(`⚠️ GIF ${command}: ${e.message}`);
  }

  return sock.sendMessage(jid, { text: caption, mentions });
}

module.exports = { sendInteraction };
