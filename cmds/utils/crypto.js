/**
 * .btc / .crypto [moneda]  →  precio de criptomonedas en USD y MXN (CoinGecko).
 * Por defecto: bitcoin, ethereum, solana.
 */
const PREDETERMINADOS = ['bitcoin', 'ethereum', 'solana'];
const ALIAS = {
  btc: 'bitcoin', bitcoin: 'bitcoin',
  eth: 'ethereum', ethereum: 'ethereum',
  sol: 'solana', solana: 'solana',
  doge: 'dogecoin', dogecoin: 'dogecoin',
  xrp: 'ripple', ripple: 'ripple',
  ada: 'cardano', cardano: 'cardano',
  ton: 'the-open-network',
  usdt: 'tether', tether: 'tether',
};

export default {
  command: ['btc', 'crypto', 'precio'],
  category: 'utils',
  description: 'Precio de criptomonedas (BTC, ETH, SOL...).',
  run: async ({ msg, args, usedPrefix, command }) => {
    const raw = (args.join(' ') || '').trim().toLowerCase();
    let ids = PREDETERMINADOS;
    if (raw) {
      const pedido = raw.split(/[\s,]+/).filter(Boolean);
      ids = pedido.map(p => ALIAS[p] || p);
    }
    try {
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd,mxn`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data || Object.keys(data).length === 0) {
        return msg.reply(`《✧》 No encontré la(s) moneda(s) *${raw}*.\n> Ejemplos válidos: bitcoin, ethereum, solana, doge, xrp, ada.`);
      }
      const lineas = ['💹 *Criptomonedas*', ''];
      const nombreBonito = {
        bitcoin: '₿ Bitcoin (BTC)',
        ethereum: 'Ξ Ethereum (ETH)',
        solana: '◎ Solana (SOL)',
        dogecoin: 'Ð Dogecoin (DOGE)',
        ripple: '✕ Ripple (XRP)',
        cardano: '₳ Cardano (ADA)',
        'the-open-network': '💎 Toncoin (TON)',
        tether: '₮ Tether (USDT)',
      };
      for (const [id, precios] of Object.entries(data)) {
        const usd = precios.usd; const mxn = precios.mxn;
        const nombre = nombreBonito[id] || '• ' + id;
        const usdStr = typeof usd === 'number' ? '$' + usd.toLocaleString('en-US', { maximumFractionDigits: usd < 1 ? 6 : 2 }) : '—';
        const mxnStr = typeof mxn === 'number' ? '$' + mxn.toLocaleString('es-MX', { maximumFractionDigits: mxn < 1 ? 4 : 2 }) + ' MXN' : '—';
        lineas.push(`*${nombre}*`);
        lineas.push(`  🇺🇸 USD: ${usdStr}`);
        lineas.push(`  🇲🇽 MXN: ${mxnStr}`);
        lineas.push('');
      }
      lineas.push(`_Fuente: CoinGecko_`);
      msg.reply(lineas.join('\n').trim());
    } catch (e) {
      msg.reply(`《✧》 No pude consultar los precios.\n> ${e.message}`);
    }
  },
};
