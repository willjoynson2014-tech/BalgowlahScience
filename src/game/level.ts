// ==================================================================
// NEON DASH — level engineering
// Three scripted levels built from segments: cube pattern runs,
// machine-gun SPAM stretches, and SHIP corridors with portals.
// Deterministic (seeded) so mastery and high scores are meaningful.
// World coords: px, ground surface = y 0, positive y is UP.
// ==================================================================

export const BLOCK = 44;
export const AIR_TIME = 0.532;   // full cube jump duration, seconds
export const RAIL = 7 * BLOCK;   // ship-zone energy ceiling height

export interface Spike {
  x: number;             // left edge
  y: number;             // base y (ground 0; on blocks = h*BLOCK; rail spikes use RAIL)
  dir: 'up' | 'down';
}

export interface BlockCol { x: number; h: number }   // solid column from ground
export interface FloatRect { x: number; w: number; y0: number; y1: number } // floating structure, px heights
export interface Pit { x: number; w: number }
export interface Portal { x: number; to: 'ship' | 'cube' }
export interface ShipZone { x0: number; x1: number }

export interface SpamZone { x0: number; x1: number }

export interface Level {
  spikes: Spike[];
  blocks: BlockCol[];
  floats: FloatRect[];
  pits: Pit[];
  portals: Portal[];
  shipZones: ShipZone[];
  spamZones: SpamZone[];
  endX: number;
  speedAt(x: number): number;
  actAt(x: number): number;
  actStarts: number[];
}

export interface LevelDef {
  id: string;
  name: string;
  tagline: string;
  difficulty: number; // 1..5
  accent: string;
  seed: number;
}

export const ACT_NAMES = ['IGNITION', 'OVERDRIVE', 'HYPERSPACE', 'TERMINAL VELOCITY'];

// ------------------------------------------------------------------
// RNG
// ------------------------------------------------------------------
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ------------------------------------------------------------------
// Cube pattern bank (tuned: max jump ~2.7 cells, air ~0.532s)
// ------------------------------------------------------------------
const c = (n: number) => n * BLOCK;

interface Out {
  spikes: Spike[]; blocks: BlockCol[]; floats: FloatRect[];
  pits: Pit[]; portals: Portal[]; shipZones: ShipZone[]; spamZones: SpamZone[];
}
type Stamp = (cx: number, o: Out) => number;

const PATTERNS: Record<string, { w: number; stamp: Stamp }> = {
  single: { w: 1, stamp: (cx, o) => { o.spikes.push({ x: c(cx), y: 0, dir: 'up' }); return 1; } },
  double: { w: 2, stamp: (cx, o) => { o.spikes.push({ x: c(cx), y: 0, dir: 'up' }, { x: c(cx + 1), y: 0, dir: 'up' }); return 2; } },
  triple: { w: 3, stamp: (cx, o) => { o.spikes.push({ x: c(cx), y: 0, dir: 'up' }, { x: c(cx + 1), y: 0, dir: 'up' }, { x: c(cx + 2), y: 0, dir: 'up' }); return 3; } },
  hopPair: { w: 4, stamp: (cx, o) => { o.spikes.push({ x: c(cx), y: 0, dir: 'up' }, { x: c(cx + 3), y: 0, dir: 'up' }); return 4; } },
  stepUp: { w: 3, stamp: (cx, o) => { o.blocks.push({ x: c(cx), h: 1 }, { x: c(cx + 1), h: 1 }, { x: c(cx + 2), h: 1 }); return 3; } },
  stepRun: { w: 4, stamp: (cx, o) => { o.blocks.push({ x: c(cx), h: 1 }, { x: c(cx + 1), h: 1 }, { x: c(cx + 2), h: 2 }, { x: c(cx + 3), h: 2 }); return 4; } },
  pillar: { w: 2, stamp: (cx, o) => { o.blocks.push({ x: c(cx), h: 2 }, { x: c(cx + 1), h: 2 }); return 2; } },
  crown: {
    w: 2, stamp: (cx, o) => {
      o.blocks.push({ x: c(cx), h: 1 }, { x: c(cx + 1), h: 1 });
      o.spikes.push({ x: c(cx), y: BLOCK, dir: 'up' }, { x: c(cx + 1), y: BLOCK, dir: 'up' });
      return 2;
    },
  },
  sting: {
    w: 3, stamp: (cx, o) => {
      o.spikes.push({ x: c(cx), y: 0, dir: 'up' });
      o.blocks.push({ x: c(cx + 1), h: 1 }, { x: c(cx + 2), h: 1 });
      return 3;
    },
  },
  pit3: { w: 3, stamp: (cx, o) => { o.pits.push({ x: c(cx), w: c(3) }); return 3; } },
  pit4: { w: 4, stamp: (cx, o) => { o.pits.push({ x: c(cx), w: c(4) }); return 4; } },
  dive: {
    w: 6, stamp: (cx, o) => {
      o.blocks.push({ x: c(cx), h: 2 }, { x: c(cx + 1), h: 2 });
      o.pits.push({ x: c(cx + 2), w: c(4) });
      return 6;
    },
  },
  spikePit: {
    w: 4, stamp: (cx, o) => {
      o.spikes.push({ x: c(cx), y: 0, dir: 'up' });
      o.pits.push({ x: c(cx + 1.6), w: c(2.2) });
      return 4;
    },
  },
};

const T1 = ['single', 'single', 'double', 'hopPair', 'stepUp', 'pit3', 'double', 'sting'];
const T2 = ['double', 'triple', 'hopPair', 'stepRun', 'sting', 'crown', 'pit3', 'pillar', 'spikePit'];
const T3 = ['triple', 'crown', 'dive', 'sting', 'triple', 'stepRun', 'spikePit', 'pit4', 'crown', 'pillar'];
const WARMUP = ['single', 'single', 'double', 'stepUp', 'hopPair', 'single', 'double', 'pit3'];

function pickN(rng: () => number, pool: string[], n: number): string[] {
  const out: string[] = [];
  let bag: string[] = [];
  while (out.length < n) {
    if (bag.length === 0) bag = pool.slice();
    const i = Math.floor(rng() * bag.length);
    const key = bag.splice(i, 1)[0];
    if (out.length && out[out.length - 1] === key) { bag.push(key); continue; }
    out.push(key);
  }
  return out;
}

// ------------------------------------------------------------------
// Segment scripts per level
// ------------------------------------------------------------------
type Seg =
  | { type: 'cube'; tier: string[]; count: number; minGapT: number; speed: number }
  | { type: 'spam'; reps: number; speed: number; doubles?: boolean }
  | { type: 'ship'; len: number; speed: number; tight: number };

const SCRIPTS: Record<string, { acts: Seg[][]; speeds: number[] }> = {
  // -- LEVEL 1: PULSE RIDGE — pure cube, teaches rhythm, ends with spam
  pulse: {
    speeds: [392, 458, 514, 566],
    acts: [
      [
        { type: 'cube', tier: WARMUP, count: 8, minGapT: 0.62, speed: 392 },
        { type: 'cube', tier: T1, count: 6, minGapT: 0.6, speed: 392 },
      ],
      [
        { type: 'cube', tier: T2, count: 7, minGapT: 0.55, speed: 458 },
        { type: 'spam', reps: 7, speed: 458 },
        { type: 'cube', tier: T2, count: 5, minGapT: 0.55, speed: 458 },
      ],
      [
        { type: 'cube', tier: T3, count: 9, minGapT: 0.5, speed: 514 },
        { type: 'spam', reps: 10, speed: 514 },
      ],
      [
        { type: 'cube', tier: T3, count: 8, minGapT: 0.48, speed: 566 },
        { type: 'spam', reps: 12, speed: 566, doubles: true },
      ],
    ],
  },
  // -- LEVEL 2: NEON DIVE — cube + two ship corridors
  neon: {
    speeds: [400, 470, 524, 580],
    acts: [
      [
        { type: 'cube', tier: WARMUP, count: 8, minGapT: 0.6, speed: 400 },
        { type: 'cube', tier: T1, count: 5, minGapT: 0.58, speed: 400 },
      ],
      [
        { type: 'cube', tier: T2, count: 5, minGapT: 0.55, speed: 470 },
        { type: 'ship', len: 26, speed: 470, tight: 0 },
        { type: 'cube', tier: T2, count: 4, minGapT: 0.55, speed: 470 },
      ],
      [
        { type: 'cube', tier: T3, count: 6, minGapT: 0.5, speed: 524 },
        { type: 'spam', reps: 9, speed: 524 },
        { type: 'cube', tier: T3, count: 4, minGapT: 0.5, speed: 524 },
      ],
      [
        { type: 'ship', len: 30, speed: 580, tight: 1 },
        { type: 'cube', tier: T3, count: 6, minGapT: 0.48, speed: 580 },
        { type: 'spam', reps: 8, speed: 580 },
      ],
    ],
  },
  // -- LEVEL 3: APEX PROTOCOL — fast, dense, tight ship tunnels, long spam
  apex: {
    speeds: [430, 505, 556, 600],
    acts: [
      [
        { type: 'cube', tier: T1.concat(T2), count: 10, minGapT: 0.52, speed: 430 },
      ],
      [
        { type: 'spam', reps: 9, speed: 505 },
        { type: 'cube', tier: T3, count: 7, minGapT: 0.48, speed: 505 },
        { type: 'ship', len: 24, speed: 505, tight: 1 },
      ],
      [
        { type: 'ship', len: 30, speed: 556, tight: 2 },
        { type: 'cube', tier: T3, count: 6, minGapT: 0.46, speed: 556 },
        { type: 'spam', reps: 12, speed: 556 },
      ],
      [
        { type: 'cube', tier: T3, count: 8, minGapT: 0.45, speed: 600 },
        { type: 'ship', len: 26, speed: 600, tight: 2 },
        { type: 'spam', reps: 14, speed: 600, doubles: true },
        { type: 'cube', tier: T3, count: 4, minGapT: 0.46, speed: 600 },
      ],
    ],
  },
};

export const LEVELS: LevelDef[] = [
  {
    id: 'pulse', name: 'PULSE RIDGE',
    tagline: 'Pure cube. Learn the grid, survive the spam.', difficulty: 2,
    accent: '#2ef2ff', seed: 20240719,
  },
  {
    id: 'neon', name: 'NEON DIVE',
    tagline: 'Ship corridors meet spike rhythm.', difficulty: 3,
    accent: '#8b5cff', seed: 88123451,
  },
  {
    id: 'apex', name: 'APEX PROTOCOL',
    tagline: 'Max speed. Tight tunnels. No mercy.', difficulty: 5,
    accent: '#ff3d81', seed: 13371337,
  },
];

// ------------------------------------------------------------------
// Ship corridor sub-patterns
// Vertical band is 0..RAIL (7 cells). Ship is 1 cell. Keep >= 2.6
// cells of gap at choke points.
// ------------------------------------------------------------------
function shipSub(kind: string, cx: number, o: Out): number {
  switch (kind) {
    case 'floor': { // spike carpet — hover mid-band
      const w = 6;
      for (let i = 0; i < w; i++) o.spikes.push({ x: c(cx + i), y: 0, dir: 'up' });
      return w;
    }
    case 'ceil': { // hanging teeth — stay low
      const w = 6;
      for (let i = 0; i < w; i++) o.spikes.push({ x: c(cx + i), y: RAIL, dir: 'down' });
      // ground spikes scattered so the floor isn't free either
      o.spikes.push({ x: c(cx + 1), y: 0, dir: 'up' }, { x: c(cx + 4), y: 0, dir: 'up' });
      return w;
    }
    case 'gateTop': { // hanging pillar, dive low under it
      const w = 4;
      o.floats.push({ x: c(cx + 1), w: c(1.5), y0: c(3.6), y1: RAIL + 8 });
      o.spikes.push({ x: c(cx + 1), y: 0, dir: 'up' }, { x: c(cx + 2.5), y: 0, dir: 'up' });
      return w;
    }
    case 'gateBot': { // rising pillar, fly high over it
      const w = 4;
      o.floats.push({ x: c(cx + 1), w: c(1.5), y0: -8, y1: c(3.4) });
      o.spikes.push({ x: c(cx + 1), y: RAIL, dir: 'down' }, { x: c(cx + 2.5), y: RAIL, dir: 'down' });
      return w;
    }
    case 'needle': { // thin mid block — thread above or below
      const w = 3;
      o.floats.push({ x: c(cx + 1), w: c(1), y0: c(2.6), y1: c(4.4) });
      return w;
    }
    case 'snakeD': { // descend channel
      const w = 8;
      o.floats.push({ x: c(cx), w: c(2), y0: c(4.2), y1: RAIL + 8 });
      o.floats.push({ x: c(cx + 4), w: c(2), y0: -8, y1: c(2.2) });
      o.spikes.push({ x: c(cx + 6.5), y: 0, dir: 'up' }, { x: c(cx + 2.5), y: RAIL, dir: 'down' });
      return w;
    }
    case 'snakeU': { // climb channel
      const w = 8;
      o.floats.push({ x: c(cx), w: c(2), y0: -8, y1: c(2.2) });
      o.floats.push({ x: c(cx + 4), w: c(2), y0: c(4.2), y1: RAIL + 8 });
      o.spikes.push({ x: c(cx + 2.5), y: 0, dir: 'up' }, { x: c(cx + 6.5), y: RAIL, dir: 'down' });
      return w;
    }
  }
  return 0;
}

const SHIP_EASY = ['floor', 'gateBot', 'ceil', 'gateTop', 'floor', 'needle'];
const SHIP_MED = ['floor', 'snakeU', 'gateTop', 'needle', 'snakeD', 'gateBot', 'ceil'];
const SHIP_HARD = ['snakeU', 'needle', 'snakeD', 'gateTop', 'ceil', 'snakeU', 'needle', 'gateBot'];

// ------------------------------------------------------------------
// Builder
// ------------------------------------------------------------------
export function generateLevel(def: LevelDef): Level {
  const rng = mulberry32(def.seed);
  const script = SCRIPTS[def.id];
  const o: Out = { spikes: [], blocks: [], floats: [], pits: [], portals: [], shipZones: [], spamZones: [] };

  let cursor = 10;
  const actStarts: number[] = [];

  script.acts.forEach((segs, ai) => {
    if (ai > 0) {
      actStarts.push(c(cursor));
      cursor += 4;
    }
    for (const seg of segs) {
      if (seg.type === 'cube') {
        const keys = pickN(rng, seg.tier, seg.count);
        const gap = Math.ceil((seg.speed * seg.minGapT) / BLOCK) + Math.floor(rng() * 3) + Math.min(ai, 2);
        for (const key of keys) {
          PATTERNS[key].stamp(cursor, o);
          cursor += PATTERNS[key].w + gap;
        }
      } else if (seg.type === 'spam') {
        cursor += 2; // small breather before the storm
        const spamStart = c(cursor);
        // spacing just above flight distance so every spike needs its own tap
        const d = Math.max(6, Math.ceil((seg.speed * AIR_TIME * 1.06 + (seg.doubles ? 92 : 14)) / BLOCK));
        for (let r = 0; r < seg.reps; r++) {
          if (seg.doubles) {
            o.spikes.push({ x: c(cursor), y: 0, dir: 'up' }, { x: c(cursor + 1), y: 0, dir: 'up' });
          } else {
            o.spikes.push({ x: c(cursor), y: 0, dir: 'up' });
          }
          cursor += d;
        }
        o.spamZones.push({ x0: spamStart - 160, x1: c(cursor) });
        cursor += 3; // recovery runway
      } else {
        // -- ship zone --
        cursor += 3; // approach buffer
        const x0 = c(cursor);
        o.portals.push({ x: x0, to: 'ship' });
        const pool = seg.tight >= 2 ? SHIP_HARD : seg.tight === 1 ? SHIP_MED : SHIP_EASY;
        let zc = cursor + 2;
        const endCol = zc + seg.len;
        let li = Math.floor(rng() * pool.length);
        while (zc < endCol) {
          const kind = pool[li % pool.length];
          li++;
          const w = shipSub(kind, zc, o);
          zc += w + 1; // 1-cell breathing room between structures
        }
        cursor = endCol + 1;
        const x1 = c(cursor);
        o.portals.push({ x: x1, to: 'cube' });
        o.shipZones.push({ x0, x1 });
        cursor += 7; // generous landing buffer — the ship may exit near the rail
      }
    }
  });

  cursor += 8;
  const endX = c(cursor - 6);

  const bounds = [0, ...actStarts, Infinity];
  const speeds = script.speeds;
  const speedAt = (x: number) => {
    for (let i = 0; i < 4; i++) if (x < bounds[i + 1]) return speeds[i];
    return speeds[3];
  };
  const actAt = (x: number) => {
    for (let i = 0; i < 4; i++) if (x < bounds[i + 1]) return i + 1;
    return 4;
  };

  o.spikes.sort((a, b) => a.x - b.x);
  o.blocks.sort((a, b) => a.x - b.x);
  o.floats.sort((a, b) => a.x - b.x);
  o.pits.sort((a, b) => a.x - b.x);
  o.portals.sort((a, b) => a.x - b.x);

  return {
    spikes: o.spikes, blocks: o.blocks, floats: o.floats, pits: o.pits,
    portals: o.portals, shipZones: o.shipZones, spamZones: o.spamZones,
    endX, speedAt, actAt, actStarts,
  };
}

// A simple level used for the menu attract demo (cube only, level 1)
export function generateAttractLevel(): Level {
  return generateLevel(LEVELS[0]);
}
