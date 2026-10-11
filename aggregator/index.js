import { fetchIndodax } from './indodax.js';
import { fetchBinance } from './binance.js';
import { updateTickers } from '../calculator/spread.js';
import { broadcast } from '../ws-server.js';

const POLL_INTERVAL = 8000;

const REST_SOURCES = [
  { name: 'Indodax', fetch: fetchIndodax },
  { name: 'Binance', fetch: fetchBinance }
];

let timer = null;

async function pollAll() {
  const allTickers = [];

  await Promise.all(
    REST_SOURCES.map(async (src) => {
      const t0 = Date.now();
      const tickers = await src.fetch();
      const dt = Date.now() - t0;
      if (tickers.length > 0) {
        console.log('[Poll] ' + src.name + ': ' + tickers.length + ' ticker (' + dt + 'ms)');
        allTickers.push.apply(allTickers, tickers);
      } else {
        console.warn('[Poll] ' + src.name + ': 0 ticker (' + dt + 'ms)');
      }
    })
  );

  if (allTickers.length > 0) {
    updateTickers(allTickers);
    const snapshot = broadcast();
    console.log('[Broadcast] ' + (snapshot.spreads ? snapshot.spreads.length : 0) + ' spread');
  }
}

export function startAggregator() {
  console.log('[Aggregator] Mulai polling tiap ' + POLL_INTERVAL + ' ms');
  pollAll();
  timer = setInterval(pollAll, POLL_INTERVAL);
}

export function stopAggregator() {
  if (timer) clearInterval(timer);
}