const STALE_THRESHOLD = Number(process.env.STALE_THRESHOLD_MS || 30000);
const tickerStore = new Map();

export function updateTickers(tickers) {
  for (let i = 0; i < tickers.length; i++) {
    const t = tickers[i];
    tickerStore.set(t.exchange + ':' + t.symbol, t);
  }
}

export function getAllTickers() {
  return Array.from(tickerStore.values());
}

export function computeSpreads() {
  const tickers = getAllTickers();
  if (tickers.length === 0) return [];

  const bySymbol = new Map();
  for (let i = 0; i < tickers.length; i++) {
    const t = tickers[i];
    if (!bySymbol.has(t.symbol)) bySymbol.set(t.symbol, []);
    bySymbol.get(t.symbol).push(t);
  }

  const spreads = [];
  const now = Date.now();

  bySymbol.forEach(function(list, symbol){
    if (list.length < 2) return;
    for (let i = 0; i < list.length; i++) {
      for (let j = 0; j < list.length; j++) {
        if (i === j) continue;
        const buySide = list[i];
        const sellSide = list[j];
        if (buySide.exchange === sellSide.exchange) continue;

        const buyPrice = buySide.ask > 0 ? buySide.ask : buySide.last;
        const sellPrice = sellSide.bid > 0 ? sellSide.bid : sellSide.last;
        if (!buyPrice || !sellPrice || buyPrice <= 0) continue;
        if (sellPrice <= buyPrice) continue;

        const grossPct = ((sellPrice - buyPrice) / buyPrice) * 100;
        const totalFeePct = (buySide.feeMaker + sellSide.feeMaker) * 100;
        const netPct = grossPct - totalFeePct;
        if (netPct <= 0) continue;

        const buyAge = now - buySide.timestamp;
        const sellAge = now - sellSide.timestamp;
        const isStale = buyAge > STALE_THRESHOLD || sellAge > STALE_THRESHOLD;

        spreads.push({
          symbol: symbol,
          pair: buySide.pair,
          quote: buySide.quote,
          buyExchange: buySide.exchange,
          sellExchange: sellSide.exchange,
          buyPrice: buyPrice,
          sellPrice: sellPrice,
          grossSpreadPct: round(grossPct),
          totalFeePct: round(totalFeePct),
          netProfitPct: round(netPct),
          volume24h: Math.min(buySide.volume24h || 0, sellSide.volume24h || 0),
          timestamp: Math.min(buySide.timestamp, sellSide.timestamp),
          isStale: isStale,
          staleAgeMs: Math.max(buyAge, sellAge)
        });
      }
    }
  });

  spreads.sort(function(a,b){ return b.netProfitPct - a.netProfitPct; });
  return spreads;
}

export function getSnapshot() {
  const spreads = computeSpreads();
  const tickers = getAllTickers();
  const now = Date.now();
  const exchanges = {};

  for (let i = 0; i < tickers.length; i++) {
    const t = tickers[i];
    if (!exchanges[t.exchange]) {
      exchanges[t.exchange] = {
        name: t.exchange, type: t.exchangeType,
        lastUpdate: t.timestamp, ageMs: now - t.timestamp,
        status: (now - t.timestamp) > STALE_THRESHOLD ? 'stale' : 'connected',
        tickerCount: 0
      };
    }
    exchanges[t.exchange].tickerCount++;
    if (t.timestamp > exchanges[t.exchange].lastUpdate) {
      exchanges[t.exchange].lastUpdate = t.timestamp;
      exchanges[t.exchange].ageMs = now - t.timestamp;
      exchanges[t.exchange].status = (now - t.timestamp) > STALE_THRESHOLD ? 'stale' : 'connected';
    }
  }

  return {
    timestamp: now,
    exchanges: Object.keys(exchanges).map(function(k){ return exchanges[k]; }),
    spreads: spreads,
    totalSpreads: spreads.length
  };
}

function round(n, digits) {
  digits = digits || 4;
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}