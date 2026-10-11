import axios from 'axios';

const BASE = 'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search';

const WATCHED = ['BTC','ETH','BNB','SOL','XRP','ADA','DOGE','MATIC','AVAX','USDT'];

export const binanceMeta = {
  name: 'Binance',
  type: 'global',
  quote: 'IDR',
  feeMaker: 0,
  feeTaker: 0
};

export async function fetchBinance() {
  const now = Date.now();
  const results = [];

  const tasks = WATCHED.map(async (symbol) => {
    try {
      const payload = {
        page: 1, rows: 5,
        payTypes: [], asset: symbol,
        fiat: 'IDR', tradeType: 'SELL'
      };
      const resp = await axios.post(BASE, payload, {
        timeout: 8000,
        headers: { 'Content-Type': 'application/json' }
      });
      const ads = (resp.data && resp.data.data) ? resp.data.data : [];
      if (ads.length === 0) return;

      const prices = ads.map(function(a){ return Number(a.adv.price); }).filter(Boolean);
      if (prices.length === 0) return;

      const ask = Math.min.apply(null, prices);
      const adv = ads.find(function(a){ return Number(a.adv.price) === ask; });
      const vol = adv && adv.adv ? Number(adv.adv.surplusAmount || adv.adv.tradableQuantity || 0) : 0;

      results.push({
        exchange: binanceMeta.name,
        exchangeType: binanceMeta.type,
        symbol: symbol,
        pair: symbol + '/IDR',
        quote: 'IDR',
        last: ask,
        bid: ask,
        ask: ask,
        volume24h: vol * ask,
        volume24hQuote: vol * ask,
        feeMaker: binanceMeta.feeMaker,
        timestamp: now
      });
    } catch (err) {
      console.warn('[Binance] ' + symbol + ': ' + err.message);
    }
  });

  await Promise.all(tasks);
  return results;
}