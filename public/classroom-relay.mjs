// NEON DASH local classroom relay
//
// Setup on the teacher computer:
//   1. Install Node.js from https://nodejs.org
//   2. Open a terminal in this file's folder
//   3. Run: npm install ws
//   4. Run: node classroom-relay.mjs
//   5. Enter the printed address in NEON DASH Classroom -> Setup

import { WebSocketServer } from 'ws';
import { networkInterfaces } from 'os';

const PORT = 8080;
const server = new WebSocketServer({ port: PORT });

server.on('connection', (socket) => {
  socket.on('message', (data) => {
    for (const client of server.clients) {
      if (client !== socket && client.readyState === 1) {
        client.send(data.toString());
      }
    }
  });
});

console.log('\nNEON DASH classroom relay is running.');
console.log('Enter one of these addresses in the Classroom Setup screen:\n');

for (const list of Object.values(networkInterfaces())) {
  for (const network of list ?? []) {
    if (network.family === 'IPv4' && !network.internal) {
      console.log(`  ws://${network.address}:${PORT}`);
    }
  }
}

console.log('\nKeep this window open during the lesson.');
console.log('Press Ctrl+C when the lesson is finished.\n');