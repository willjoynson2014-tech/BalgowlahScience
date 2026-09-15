// ==================================================================
// LEVEL LAB — kid-authored levels
// Placements on a fixed grid → a playable Level. Includes validation
// (gentle, kid-readable), save slots and share codes. No accounts,
// no personal data — everything stays on the device.
// ==================================================================

import { BLOCK, Level } from './level';

export const LAB_COLS = 120;        // grid length in cells
export const RUNWAY = 6;            // locked empty cells at the start
export const GOAL_RUNWAY = 6;       // locked empty cells before the goal

export type ToolId = 's1' | 's2' | 's3' | 'b1' | 'b2' | 'pit' | 'ship' | 'cube';

export interface Placement { t: ToolId; col: number }

export interface ToolDef {
  id: ToolId;
  name: string;
  w: number;             // cells occupied
  hint: string;
}

export const TOOLS: ToolDef[] = [
  { id: 's1', name: 'SPIKE', w: 1, hint: 'The classic. Jump it!' },
  { id: 's2', name: 'DUO', w: 2, hint: 'Two spikes — a bigger hop.' },
  { id: 's3', name: 'TRIO', w: 3, hint: 'Three! Only for brave dashers.' },
  { id: 'b1', name: 'BLOCK', w: 1, hint: 'Hop on top and ride it.' },
  { id: 'b2', name: 'TOWER', w: 1, hint: 'Two blocks high — leap high!' },
  { id: 'pit', name: 'GAP', w: 3, hint: 'A hole in the floor. Jump over!' },
  { id: 'ship', name: 'SHIP GATE', w: 1, hint: 'Flying starts here. Hold to rise!' },
  { id: 'cube', name: 'CUBE GATE', w: 1, hint: 'Back to jumping here.' },
];

const c = (n: number) => n * BLOCK;

// ------------------------------------------------------------------
// validation — friendly warnings and errors (errors block Test Play)
// ------------------------------------------------------------------
export interface LabIssue { level: 'warn' | 'error'; msg: string }

export function validate(p: Placement[]): LabIssue[] {
  const issues: LabIssue[] = [];
  const ships = p.filter((x) => x.t === 'ship').sort((a, b) => a.col - b.col);
  const cubes = p.filter((x) => x.t === 'cube').sort((a, b) => a.col - b.col);

  if (ships.length > 0 && cubes.length === 0) {
    issues.push({ level: 'error', msg: 'Your Ship Gate needs a Cube Gate after it, so dashers can land!' });
  }
  if (cubes.length > 0 && ships.length === 0) {
    issues.push({ level: 'error', msg: 'The Cube Gate needs a Ship Gate before it — otherwise nothing flies in!' });
  }
  if (ships.length && cubes.length && cubes[0].col < ships[ships.length - 1].col) {
    issues.push({ level: 'error', msg: 'The Cube Gate must come AFTER the Ship Gate (left → right).' });
  }
  if (ships.length && cubes.length) {
    for (let i = 0; i < Math.min(ships.length, cubes.length); i++) {
      if (cubes[i].col - ships[i].col < 8) {
        issues.push({ level: 'warn', msg: 'That flying zone is tiny! Give ships at least 8 cells of sky.' });
        break;
      }
    }
  }

  const hazards = p.filter((x) => x.t !== 'ship' && x.t !== 'cube');
  if (hazards.length === 0) {
    issues.push({ level: 'warn', msg: 'No obstacles yet — walk in the park! Add some spikes.' });
  }
  // spike wall check
  const sorted = hazards.slice().sort((a, b) => a.col - b.col);
  let run = 0;
  for (const h of sorted) {
    if (h.t.startsWith('s')) run += Number(h.t[1]); else run = 0;
    if (run > 4) {
      issues.push({ level: 'warn', msg: 'Five spikes in a row is impossible to jump! Leave landing room (~5 cells).' });
      break;
    }
  }
  if (ships.length) {
    const tooClose = hazards.find((h) => Math.abs(h.col - ships[0].col) < 2);
    if (tooClose) issues.push({ level: 'warn', msg: 'Give pilots a moment! Keep obstacles 2+ cells from the Ship Gate.' });
  }
  return issues;
}

// ------------------------------------------------------------------
// build a playable Level
// ------------------------------------------------------------------
export function buildCustomLevel(placements: Placement[]): Level {
  const p = placements.slice().sort((a, b) => a.col - b.col);
  const spikes: Level['spikes'] = [];
  const blocks: Level['blocks'] = [];
  const pits: Level['pits'] = [];
  const portals: Level['portals'] = [];

  for (const pl of p) {
    switch (pl.t) {
      case 's1': spikes.push({ x: c(pl.col), y: 0, dir: 'up' }); break;
      case 's2': spikes.push({ x: c(pl.col), y: 0, dir: 'up' }, { x: c(pl.col + 1), y: 0, dir: 'up' }); break;
      case 's3': spikes.push({ x: c(pl.col), y: 0, dir: 'up' }, { x: c(pl.col + 1), y: 0, dir: 'up' }, { x: c(pl.col + 2), y: 0, dir: 'up' }); break;
      case 'b1': blocks.push({ x: c(pl.col), h: 1 }); break;
      case 'b2': blocks.push({ x: c(pl.col), h: 2 }); break;
      case 'pit': pits.push({ x: c(pl.col), w: c(3) }); break;
      case 'ship': portals.push({ x: c(pl.col), to: 'ship' }); break;
      case 'cube': portals.push({ x: c(pl.col), to: 'cube' }); break;
    }
  }
  spikes.sort((a, b) => a.x - b.x);
  blocks.sort((a, b) => a.x - b.x);
  pits.sort((a, b) => a.x - b.x);
  portals.sort((a, b) => a.x - b.x);

  // pair gates into ship zones
  const shipZones: Level['shipZones'] = [];
  let pending: number | null = null;
  for (const pt of portals) {
    if (pt.to === 'ship') pending = pt.x;
    else if (pt.to === 'cube' && pending !== null) {
      shipZones.push({ x0: pending, x1: pt.x });
      pending = null;
    }
  }

  const endX = c(LAB_COLS - GOAL_RUNWAY);
  // gentle speed ramp each quarter — keeps tint/act moments alive
  const actStarts = [Math.floor(endX * 0.25), Math.floor(endX * 0.5), Math.floor(endX * 0.75)];
  const bounds = [0, ...actStarts, Infinity];
  const speeds = [430, 448, 460, 472];
  const speedAt = (x: number) => {
    for (let i = 0; i < 4; i++) if (x < bounds[i + 1]) return speeds[i];
    return speeds[3];
  };
  const actAt = (x: number) => {
    for (let i = 0; i < 4; i++) if (x < bounds[i + 1]) return i + 1;
    return 4;
  };

  return {
    spikes, blocks, pits, portals, shipZones,
    floats: [], spamZones: [],
    endX, speedAt, actAt, actStarts,
  };
}

// ------------------------------------------------------------------
// share codes — base64url of a tiny JSON payload
// ------------------------------------------------------------------
export function encodeLevel(placements: Placement[]): string {
  const payload = { v: 1, c: placements.map((x) => [x.t, x.col]) };
  const json = JSON.stringify(payload);
  return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeLevel(code: string): Placement[] | null {
  try {
    const b64 = code.trim().replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
    const payload = JSON.parse(json) as { v: number; c: [ToolId, number][] };
    if (!Array.isArray(payload.c)) return null;
    const out: Placement[] = [];
    for (const [t, col] of payload.c) {
      if (TOOLS.some((tool) => tool.id === t) && Number.isInteger(col) && col >= RUNWAY && col < LAB_COLS - GOAL_RUNWAY) {
        out.push({ t, col });
      }
    }
    return out;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------
// save slots
// ------------------------------------------------------------------
export interface SavedLevel { name: string; data: Placement[]; date: string }
const K_LAB = 'neon-dash:lab';

export function loadSavedLevels(): SavedLevel[] {
  try {
    const raw = localStorage.getItem(K_LAB);
    const list = raw ? (JSON.parse(raw) as SavedLevel[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveNamedLevel(name: string, data: Placement[]): SavedLevel[] {
  const list = loadSavedLevels();
  const entry: SavedLevel = { name: name.slice(0, 24) || 'UNTITLED', data, date: new Date().toISOString() };
  const idx = list.findIndex((l) => l.name === entry.name);
  if (idx >= 0) list[idx] = entry; else list.unshift(entry);
  const trimmed = list.slice(0, 12);
  try { localStorage.setItem(K_LAB, JSON.stringify(trimmed)); } catch { /* ignore */ }
  return trimmed;
}

export function deleteSavedLevel(name: string): SavedLevel[] {
  const trimmed = loadSavedLevels().filter((l) => l.name !== name);
  try { localStorage.setItem(K_LAB, JSON.stringify(trimmed)); } catch { /* ignore */ }
  return trimmed;
}
