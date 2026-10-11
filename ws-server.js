import { WebSocketServer } from 'ws';
import { getSnapshot } from './calculator/spread.js';

let wss = null;

export function attachWebSocket(httpServer) {
  wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress;
    console.log('[WS] Client connect: ' + ip + ' (total: ' + wss.clients.size + ')');
    ws.send(JSON.stringify({ type: 'snapshot', data: getSnapshot() }));

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'ping') ws.send(JSON.stringify({ type: 'pong', t: Date.now() }));
        else if (msg.type === 'snapshot') ws.send(JSON.stringify({ type: 'snapshot', data: getSnapshot() }));
      } catch (e) {}
    });

    ws.on('close', () => console.log('[WS] Client disconnect (total: ' + wss.clients.size + ')'));
    ws.on('error', (err) => console.warn('[WS] Error: ' + err.message));
  });

  console.log('[WS] WebSocket server siap di /ws');
}

export function broadcast() {
  const snapshot = getSnapshot();
  const payload = JSON.stringify({ type: 'update', data: snapshot });
  if (wss) {
    for (const client of wss.clients) {
      if (client.readyState === 1) client.send(payload);
    }
  }
  return snapshot;
}