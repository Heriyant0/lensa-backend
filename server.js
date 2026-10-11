import express from 'express';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';
import { attachWebSocket } from './ws-server.js';
import { startAggregator } from './aggregator/index.js';
import { getSnapshot } from './calculator/spread.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || '*' }));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() });
});

app.get('/api/snapshot', (req, res) => {
  res.json(getSnapshot());
});

const server = http.createServer(app);
attachWebSocket(server);

server.listen(PORT, () => {
  console.log('[Lensa] Server jalan di port ' + PORT);
  startAggregator();
});

const SELF_URL = process.env.SELF_URL;
const PING_INTERVAL = Number(process.env.PING_INTERVAL_MS || 600000);

if (SELF_URL) {
  setInterval(async () => {
    try {
      const res = await fetch(SELF_URL + '/health');
      console.log('[Self-ping] ' + res.status + ' @ ' + new Date().toISOString());
    } catch (err) {
      console.warn('[Self-ping] gagal: ' + err.message);
    }
  }, PING_INTERVAL);
}

process.on('SIGTERM', () => {
  console.log('[Lensa] SIGTERM - shutdown');
  server.close(() => process.exit(0));
});