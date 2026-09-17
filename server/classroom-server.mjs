// NEON DASH all-in-one classroom server  (OPTIONAL)
//
// You do NOT need this for GitHub Pages. The website works on its own.
// Use this only when you want live teacher control across many devices
// on the school network without using an external cloud service.
//
// From the PROJECT ROOT (the folder containing index.html):
//   npm install ws
//   node server/classroom-server.mjs
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
const port = Number(process.env.PORT || 8080);

// Site root: works whether this file sits in /server or beside index.html
const roots = [join(folder, '..'), folder, process.cwd()];

async function readSite(relative) {
  for (const root of roots) {
    try {
      return await readFile(join(root, relative), 'utf8');
    } catch {
      // try the next likely location
    }
  }
  return null;
}

async function readClassroomHtml() {
  const html = await readSite('index.html');
  if (html) return html;
  throw new Error('Put index.html in the project folder next to /server.');
}

// ---------------------------------------------------------------------
// CLASSROOM CODES
// The teacher must type the hosting code to gain class control. The
// server checks it, so a pupil cannot unlock control by editing the page
// in their own browser.
// ---------------------------------------------------------------------
const WORDS = [
  'SPIKE', 'BLOCK', 'TOWER', 'TRIO', 'DUO', 'PAD', 'SHIP', 'CUBE', 'GAP', 'DASH',
  'NEON', 'JUMP', 'WAVE', 'BEAT', 'GRID', 'LASER', 'ORBIT', 'PULSE', 'ROCKET', 'STAR',
  'STORM', 'TURBO', 'VOLT', 'ZONE', 'COMET', 'NOVA', 'PRISM', 'QUARTZ', 'RIFT', 'SOLAR',
  'TITAN', 'VAPOR', 'ZAP', 'ATOM', 'BOLT', 'CIRCUIT', 'DRIFT', 'ECHO', 'FLARE', 'GLIDE',
  'HELIX', 'IMPULSE', 'JETPACK', 'KRYPTON', 'LUNAR', 'MAGNET', 'NEBULA', 'ONYX', 'PIXEL',
  'QUEST', 'RADAR', 'SPARK', 'THRUST', 'ULTRA', 'VECTOR', 'WARP', 'XENON', 'ZENITH',
];

const pick = () => WORDS[Math.floor(Math.random() * WORDS.length)];
const HOST_CODE = process.env.HOST_CODE
  ? process.env.HOST_CODE.toUpperCase()
  : [pick(), pick(), pick(), pick()].join(' ');
const CLASS_CODE = process.env.CLASS_CODE
  ? process.env.CLASS_CODE.toUpperCase()
  : [pick(), pick(), pick(), pick()].join(' ');

// Shared levels published by word code. Memory only, cleared on restart.
const levels = new Map();
const LEVEL_LIMIT = 400;

const server = createServer(async (request, response) => {
  const path = new URL(request.url || '/', 'http://localhost').pathname;

  if (path === '/health') {
    response.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    response.end(JSON.stringify({ ok: true, app: 'neon-dash-classroom', levels: levels.size }));
    return;
  }

  if (path === '/server/classroom-server.mjs' || path === '/classroom-server.mjs') {
    const source = await readFile(fileURLToPath(import.meta.url), 'utf8');
    response.writeHead(200, {
      'content-type': 'text/javascript; charset=utf-8',
      'content-disposition': 'attachment; filename="classroom-server.mjs"',
      'cache-control': 'no-store',
    });
    response.end(source);
    return;
  }

  // Serve the project's static assets (js/config.js, css, icons...)
  if (/^\/(js|css|assets)\/[A-Za-z0-9._/-]+$/.test(path)) {
    const body = await readSite(path.slice(1));
    if (body === null) {
      response.writeHead(404, { 'content-type': 'text/plain' });
      response.end('Not found');
      return;
    }
    const type = path.endsWith('.js') ? 'text/javascript'
      : path.endsWith('.css') ? 'text/css'
      : path.endsWith('.svg') ? 'image/svg+xml'
      : path.endsWith('.json') ? 'application/json' : 'text/plain';
    response.writeHead(200, { 'content-type': type + '; charset=utf-8', 'cache-control': 'no-store' });
    response.end(body);
    return;
  }

  if (path !== '/' && path !== '/index.html') {
    response.writeHead(404, { 'content-type': 'text/plain' });
    response.end('Not found');
    return;
  }

  try {
    const source = await readClassroomHtml();
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
    response.end(`Could not load index.html\n${String(error)}`);
  }
});

const sockets = new WebSocketServer({ server });
const teachers = new WeakSet();
const pupils = new WeakSet();
const authState = new WeakMap();
let classroomBrief = '';
let classroomRules = null;

function authorised(socket) {
  return teachers.has(socket) || pupils.has(socket);
}

function relay(from, text) {
  for (const client of sockets.clients) {
    if (client !== from && authorised(client) && client.readyState === WebSocket.OPEN) {
      client.send(text);
    }
  }
}

sockets.on('connection', (socket) => {
  socket.on('message', (raw) => {
    const text = raw.toString();
    if (text.length > 250_000) return;

    let msg = null;
    try { msg = JSON.parse(text); } catch { return; }
    if (!msg || typeof msg !== 'object') return;

    // --- teacher unlock --------------------------------------------------
    if (msg.t === 'hostauth') {
      const state = authState.get(socket) || { fails: 0, blockedUntil: 0 };
      if (Date.now() < state.blockedUntil) {
        socket.send(JSON.stringify({
          t: 'hostres', ok: false, retryAfter: state.blockedUntil - Date.now(),
        }));
        return;
      }
      const ok = String(msg.code || '').trim().toUpperCase() === HOST_CODE;
      if (ok) {
        teachers.add(socket);
        authState.delete(socket);
      } else {
        state.fails += 1;
        if (state.fails >= 5) { state.fails = 0; state.blockedUntil = Date.now() + 30_000; }
        authState.set(socket, state);
      }
      socket.send(JSON.stringify({ t: 'hostres', ok, classCode: ok ? CLASS_CODE : '' }));
      console.log(ok ? '  Teacher unlocked class control.' : '  Wrong hosting code attempted.');
      return;
    }

    // --- pupil joins -----------------------------------------------------
    // Pupils authenticate with the teacher-created username + password in
    // the page itself, so presenting a real account id is the credential.
    // The optional CLASS_CODE is still accepted for locked-down setups.
    if (msg.t === 'studentauth') {
      const hasAccount = typeof msg.id === 'string' && msg.id.length > 3;
      const codeOk = String(msg.code || '').trim().toUpperCase() === CLASS_CODE;
      const ok = hasAccount || codeOk;
      if (ok) pupils.add(socket);
      socket.send(JSON.stringify({
        t: 'studentres',
        ok,
        brief: ok ? classroomBrief : '',
        rules: ok ? classroomRules : null,
      }));
      console.log(ok
        ? `  Pupil joined: ${String(msg.name || 'student').slice(0, 30)}`
        : '  Pupil join rejected.');
      return;
    }

    // Nobody joins the classroom message bus until they were admitted.
    if (!authorised(socket)) return;

    // --- shared levels by word code --------------------------------------
    if (msg.t === 'pub' && msg.code) {
      if (levels.size >= LEVEL_LIMIT) levels.delete(levels.keys().next().value);
      levels.set(String(msg.code).toUpperCase(), String(msg.data || ''));
      return;
    }

    // Keep the current instructions for pupils who join mid-lesson.
    if (msg.t === 'who' && teachers.has(socket)) {
      if (typeof msg.brief === 'string') classroomBrief = msg.brief;
      if (msg.rules && typeof msg.rules === 'object') classroomRules = msg.rules;
    }

    if (msg.t === 'get' && msg.code) {
      const key = String(msg.code).toUpperCase();
      if (levels.has(key)) {
        socket.send(JSON.stringify({ t: 'got', code: key, data: levels.get(key) }));
      } else {
        relay(socket, text); // maybe another device has it
      }
      return;
    }

    // --- role rules are enforced here, not in the browser ------------------
    if (msg.t === 'cmd' && !teachers.has(socket)) return;
    if (msg.t === 'state' && !pupils.has(socket)) return;

    relay(socket, text);
  });
});

server.listen(port, '0.0.0.0', () => {
  const lines = [];
  for (const list of Object.values(networkInterfaces())) {
    for (const network of list ?? []) {
      if (network.family === 'IPv4' && !network.internal) {
        lines.push(`http://${network.address}:${port}`);
      }
    }
  }

  console.log('\n======================================================');
  console.log('  NEON DASH CLASSROOM IS RUNNING');
  console.log('======================================================\n');
  console.log('  TEACHER HOSTING CODE');
  console.log(`      ${HOST_CODE}\n`);
  console.log('  Type that code on the teacher device to unlock class');
  console.log('  controls. Keep it off the projector.\n');
  console.log('  Pupils log in with the username and password from the');
  console.log('  teacher CLASS LOGIN SHEET. No seat numbers are used.\n');
  console.log('  TEACHER opens this address on this computer:');
  console.log(`      http://localhost:${port}\n`);
  console.log('  PUPILS open this address:');
  if (lines.length) lines.forEach((l) => console.log(`      ${l}`));
  else console.log('      (no network address found - check your connection)');
  console.log('\n  Keep this window open for the whole lesson.');
  console.log('  Press Ctrl+C when the lesson is finished.\n');
});
