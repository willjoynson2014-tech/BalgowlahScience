// ==================================================================
// CLASSROOM NET — teacher ↔ 30 students
//
// Two transports, used together:
//  1) BroadcastChannel — instant, zero setup. Works between tabs/windows
//     on the SAME computer + same origin (great for a teacher laptop,
//     a projector demo, or a lab of tabs).
//  2) WebSocket relay — for real cross-device classrooms. The teacher
//     runs a tiny relay on their own laptop (script downloadable from
//     the console) and pupils connect to ws://<teacher-ip>:8080.
//     Stays entirely on the school network — no third party, no
//     accounts, no personal data.
// ==================================================================

export const CHANNEL = 'neon-dash-classroom';
export const SEATS = 30;

const K_ROLE = 'neon-dash:role';
const K_SEAT = 'neon-dash:seat';
const K_RELAY = 'neon-dash:relay';

export type Role = 'student' | 'teacher' | null;

export interface StudentState {
  seat: number;
  screen: string;
  levelName: string;
  pct: number;
  best: number;
  attempts: number;
  pieces: number;
  code: string;     // their Level Lab share code
  locked: boolean;
  ts: number;
}

export type Command =
  | { c: 'lock'; on: boolean; text?: string }
  | { c: 'goto'; screen: 'menu' | 'lab' | 'teachers' }
  | { c: 'message'; text: string }
  | { c: 'pushLevel'; code: string; text?: string }
  | { c: 'spotlight'; code: string; from: number }
  | { c: 'clearSpotlight' }
  | { c: 'collect' };

export type Msg =
  | { t: 'hello'; seat: number }
  | { t: 'who' }
  | { t: 'state'; s: StudentState }
  | { t: 'cmd'; target: number | 'all'; cmd: Command };

// ---------------- identity ----------------
export function readRole(): Role {
  const q = new URLSearchParams(location.search);
  if (q.has('teacher')) return 'teacher';
  const qs = q.get('seat');
  if (qs && Number(qs) >= 1 && Number(qs) <= SEATS) return 'student';
  const w = (window as unknown as { __SEAT__?: number; __TEACHER__?: boolean });
  if (w.__TEACHER__) return 'teacher';
  if (typeof w.__SEAT__ === 'number') return 'student';
  const saved = localStorage.getItem(K_ROLE);
  return saved === 'teacher' || saved === 'student' ? saved : null;
}

export function readSeat(): number {
  const q = new URLSearchParams(location.search);
  const qs = Number(q.get('seat'));
  if (qs >= 1 && qs <= SEATS) return qs;
  const w = (window as unknown as { __SEAT__?: number });
  if (typeof w.__SEAT__ === 'number') return w.__SEAT__;
  const saved = Number(localStorage.getItem(K_SEAT));
  return saved >= 1 && saved <= SEATS ? saved : 0;
}

export function saveIdentity(role: Role, seat: number) {
  try {
    if (role) localStorage.setItem(K_ROLE, role);
    if (seat) localStorage.setItem(K_SEAT, String(seat));
  } catch { /* ignore */ }
}

export function clearIdentity() {
  try {
    localStorage.removeItem(K_ROLE);
    localStorage.removeItem(K_SEAT);
  } catch { /* ignore */ }
}

export function readRelay(): string {
  const q = new URLSearchParams(location.search);
  const qr = q.get('relay');
  if (qr) return qr;
  const w = (window as unknown as { __RELAY__?: string });
  if (w.__RELAY__) return w.__RELAY__;
  return localStorage.getItem(K_RELAY) || '';
}

export function saveRelay(url: string) {
  try {
    if (url) localStorage.setItem(K_RELAY, url);
    else localStorage.removeItem(K_RELAY);
  } catch { /* ignore */ }
}

// ---------------- transport ----------------
export type NetStatus = 'local' | 'connecting' | 'online' | 'error';

export class Net {
  private bc: BroadcastChannel | null = null;
  private ws: WebSocket | null = null;
  private relayUrl = '';
  private retry: number | null = null;
  private closed = false;

  onMessage: (m: Msg) => void = () => undefined;
  onStatus: (s: NetStatus) => void = () => undefined;

  constructor(relayUrl: string) {
    this.relayUrl = relayUrl;
    try {
      this.bc = new BroadcastChannel(CHANNEL);
      this.bc.onmessage = (e) => this.handle(e.data);
    } catch {
      this.bc = null;
    }
    if (relayUrl) this.connect();
    else this.onStatus('local');
  }

  private connect() {
    if (this.closed || !this.relayUrl) return;
    this.onStatus('connecting');
    try {
      const ws = new WebSocket(this.relayUrl);
      this.ws = ws;
      ws.onopen = () => this.onStatus('online');
      ws.onmessage = (e) => {
        try { this.handle(JSON.parse(String(e.data))); } catch { /* ignore */ }
      };
      ws.onclose = () => {
        this.ws = null;
        if (this.closed) return;
        this.onStatus('error');
        this.retry = window.setTimeout(() => this.connect(), 2500);
      };
      ws.onerror = () => { this.onStatus('error'); };
    } catch {
      this.onStatus('error');
    }
  }

  setRelay(url: string) {
    this.relayUrl = url;
    if (this.retry !== null) { clearTimeout(this.retry); this.retry = null; }
    if (this.ws) { this.ws.onclose = null; this.ws.close(); this.ws = null; }
    if (url) this.connect(); else this.onStatus('local');
  }

  private handle(m: Msg) {
    if (!m || typeof m !== 'object') return;
    this.onMessage(m);
  }

  send(m: Msg) {
    try { this.bc?.postMessage(m); } catch { /* ignore */ }
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try { this.ws.send(JSON.stringify(m)); } catch { /* ignore */ }
    }
  }

  destroy() {
    this.closed = true;
    if (this.retry !== null) clearTimeout(this.retry);
    try { this.bc?.close(); } catch { /* ignore */ }
    if (this.ws) { this.ws.onclose = null; this.ws.close(); }
  }
}

// ---------------- the relay server (downloadable) ----------------
export const RELAY_SOURCE = `// NEON DASH — classroom relay
// Runs on the TEACHER's laptop. Keeps everything on your local network:
// no internet, no accounts, no pupil data leaves the room.
//
//   1. Install Node.js (nodejs.org)
//   2. Save this file, open a terminal in the same folder, then run:
//        npm install ws
//        node classroom-relay.mjs
//   3. It prints your address, e.g.  ws://192.168.1.24:8080
//   4. Put that address in the Classroom panel on every device.

import { WebSocketServer } from 'ws';
import { networkInterfaces } from 'os';

const PORT = 8080;
const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (socket) => {
  socket.on('message', (data) => {
    const text = data.toString();
    for (const client of wss.clients) {
      if (client !== socket && client.readyState === 1) client.send(text);
    }
  });
});

const nets = networkInterfaces();
const ips = [];
for (const name of Object.keys(nets)) {
  for (const net of nets[name] ?? []) {
    if (net.family === 'IPv4' && !net.internal) ips.push(net.address);
  }
}
console.log('NEON DASH relay running!');
console.log('Give pupils one of these addresses:');
for (const ip of ips) console.log('   ws://' + ip + ':' + PORT);
console.log('Press Ctrl+C to stop.');
`;
