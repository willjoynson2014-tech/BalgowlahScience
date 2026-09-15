// NEON DASH all-in-one classroom server
//
// Local school-network use:
//   npm install ws
//   node classroom-server.mjs
//
// Pupils then open the printed http:// address in Chrome or Edge.
// The same script can be deployed to Render/Railway/Fly; HTTPS hosting
// automatically upgrades classroom control to secure WSS.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { networkInterfaces } from 'node:os';
import { WebSocketServer, WebSocket } from 'ws';

const folder = dirname(fileURLToPath(import.meta.url));
const htmlPath = join(folder, 'neon-dash-classroom.html');
const port = Number(process.env.PORT || 8080);

const server = createServer(async (request, response) => {
  const path = new URL(request.url || '/', 'http://localhost').pathname;

  if (path === '/health') {
    response.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    response.end(JSON.stringify({ ok: true, app: 'neon-dash-classroom' }));
    return;
  }

  if (path === '/classroom-server.mjs') {
    const source = await readFile(fileURLToPath(import.meta.url), 'utf8');
    response.writeHead(200, {
      'content-type': 'text/javascript; charset=utf-8',
      'content-disposition': 'attachment; filename="classroom-server.mjs"',
      'cache-control': 'no-store',
    });
    response.end(source);
    return;
  }

  if (path !== '/' && path !== '/index.html' && path !== '/neon-dash-classroom.html') {
    response.writeHead(404, { 'content-type': 'text/plain' });
    response.end('Not found');
    return;
  }

  try {
    const source = await readFile(htmlPath, 'utf8');
    const html = source.replace(
      '</head>',
      '<script>window.__CLASSROOM_SERVER__=true;</script></head>',
    );
    response.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store, no-cache, must-revalidate',
      pragma: 'no-cache',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'same-origin',
    });
    response.end(html);
  } catch (error) {
    response.writeHead(500, { 'content-type': 'text/plain' });
    response.end(`Could not load neon-dash-classroom.html\n${String(error)}`);
  }
});

const sockets = new WebSocketServer({ server });

sockets.on('connection', (socket) => {
  socket.on('message', (data) => {
    const message = data.toString();
    // Reject oversized classroom messages before relaying them.
    if (message.length > 250_000) return;

    for (const client of sockets.clients) {
      if (client !== socket && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log('\nNEON DASH Classroom is ready.');
  console.log('\nTeacher: open one address below and choose I AM THE TEACHER.');
  console.log('Pupils: open the same address, type a name, and choose a seat.\n');
  console.log(`  http://localhost:${port}`);

  for (const list of Object.values(networkInterfaces())) {
    for (const network of list ?? []) {
      if (network.family === 'IPv4' && !network.internal) {
        console.log(`  http://${network.address}:${port}`);
      }
    }
  }

  console.log('\nKeep this window open during the lesson.');
  console.log('Press Ctrl+C when finished.\n');
});
