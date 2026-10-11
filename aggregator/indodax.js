import axios from 'axios';

const BASE = 'https://indodax.com/api';

const WATCHED = [
  'btc_idr','eth_idr','usdt_idr','bnb_idr','sol_idr',
  'xrp_idr','ada_idr','doge_idr','matic_idr','avax_idr'
];

export const indodaxMeta = {
  name: 'Indodax',
  type: 'local',
  quote: 'IDR',
  feeMaker: 0.001,
  feeTaker: 0.002
};

export async function fetchIndodax() {
  try {
    const resp = await axios.get(BASE + '/summaries', { timeout: 8000 });
    const tickers = (resp.data && resp.data.tickers) ? resp.data.tickers : {};
    const now = Date.now();
    const result = [];

    for (let i = 0; i < WATCHED.length; i++) {
      const pairKey = WATCHED[i];
      const t = tickers[pairKey];
      if (!t) continue;
      const symbol = pairKey.split('_')[0].toUpperCase();
      const last = Number(t.last);
      if (!last || last <= 0) continue;

      result.push({
        exchange: indodaxMeta.name,
        exchangeType: indodaxMeta.type,
        symbol: symbol,
        pair: symbol + '/IDR',
        quote: 'IDR',
        last: last,
        bid: Number(t.buy) || last,
        ask: Number(t.sell) || last,
        volume24h: Number(t.vol_idr || 0),
        volume24hQuote: Number(t.vol_idr || 0),
        feeMaker: indodaxMeta.feeMaker,
        timestamp: now
      });
    }
    return result;
  } catch (err) {
    console.error('[Indodax] Error: ' + err.message);
    return [];
  }
}