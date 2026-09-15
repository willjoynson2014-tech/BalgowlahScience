// ------------------------------------------------------------------
// Pre-rendered sprites with baked glow. Expensive blur work happens
// ONCE at init; the frame loop only does drawImage. This is the key
// to 60fps on mobile GPUs (shadowBlur per-frame is a killer).
// ------------------------------------------------------------------

export interface Sprites {
  cube: HTMLCanvasElement;
  cubeSize: number;        // logical size (world px) of the visible cube
  ship: HTMLCanvasElement;
  spike: HTMLCanvasElement;
  block: HTMLCanvasElement;
  orbCyan: HTMLCanvasElement;
  orbPink: HTMLCanvasElement;
  orbLime: HTMLCanvasElement;
  orbGold: HTMLCanvasElement;
  vignette: HTMLCanvasElement;
}

function mkCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.round(w));
  c.height = Math.max(2, Math.round(h));
  return [c, c.getContext('2d')!];
}

const SS = 3; // supersample factor for crisp sprites

// -- the player cube ------------------------------------------------
function makeCube(cell: number): HTMLCanvasElement {
  const s = cell * SS;
  const pad = s * 0.9;
  const size = s + pad * 2;
  const [cv, ctx] = mkCanvas(size, size);
  const cxy = size / 2;

  // outer glow
  ctx.shadowColor = '#2ef2ff';
  ctx.shadowBlur = s * 0.55;
  ctx.fillStyle = 'rgba(20, 190, 215, 0.95)';
  roundRect(ctx, cxy - s / 2, cxy - s / 2, s, s, s * 0.16);
  ctx.fill();
  ctx.shadowBlur = s * 0.28;
  ctx.fill();

  // body gradient
  ctx.shadowBlur = 0;
  const g = ctx.createLinearGradient(cxy - s / 2, cxy - s / 2, cxy + s / 2, cxy + s / 2);
  g.addColorStop(0, '#8ef9ff');
  g.addColorStop(0.45, '#21d5ea');
  g.addColorStop(1, '#0d7f96');
  ctx.fillStyle = g;
  roundRect(ctx, cxy - s / 2, cxy - s / 2, s, s, s * 0.16);
  ctx.fill();

  // inner face plate
  const i2 = s * 0.66;
  const gi = ctx.createLinearGradient(cxy - i2 / 2, cxy - i2 / 2, cxy + i2 / 2, cxy + i2 / 2);
  gi.addColorStop(0, 'rgba(3, 32, 44, 0.92)');
  gi.addColorStop(1, 'rgba(5, 66, 84, 0.92)');
  ctx.fillStyle = gi;
  roundRect(ctx, cxy - i2 / 2, cxy - i2 / 2, i2, i2, s * 0.1);
  ctx.fill();
  ctx.strokeStyle = 'rgba(160, 255, 255, 0.85)';
  ctx.lineWidth = s * 0.035;
  roundRect(ctx, cxy - i2 / 2, cxy - i2 / 2, i2, i2, s * 0.1);
  ctx.stroke();

  // eyes
  ctx.fillStyle = '#d9ffff';
  const ew = s * 0.09;
  const ey = cxy - s * 0.1;
  roundRect(ctx, cxy - s * 0.2 - ew / 2, ey - ew / 2, ew, ew * 1.45, ew * 0.4);
  ctx.fill();
  roundRect(ctx, cxy + s * 0.2 - ew / 2, ey - ew / 2, ew, ew * 1.45, ew * 0.4);
  ctx.fill();
  // mouth
  ctx.strokeStyle = '#d9ffff';
  ctx.lineWidth = s * 0.045;
  ctx.beginPath();
  ctx.moveTo(cxy - s * 0.14, cxy + s * 0.15);
  ctx.lineTo(cxy + s * 0.14, cxy + s * 0.15);
  ctx.stroke();

  // top shine
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  roundRect(ctx, cxy - s / 2 + s * 0.1, cxy - s / 2 + s * 0.06, s * 0.5, s * 0.07, s * 0.035);
  ctx.fill();

  return cv;
}

// -- a neon spike ----------------------------------------------------
function makeSpike(cell: number): HTMLCanvasElement {
  const s = cell * SS;
  const padX = s * 0.5;
  const padY = s * 0.6;
  const w = s + padX * 2;
  const h = s + padY * 1.4;
  const [cv, ctx] = mkCanvas(w, h);
  const bx = padX;
  const by = padY * 0.5;

  ctx.shadowColor = '#ff3d81';
  ctx.shadowBlur = s * 0.42;
  const grad = ctx.createLinearGradient(0, by + s, 0, by);
  grad.addColorStop(0, '#7a0d3a');
  grad.addColorStop(0.55, '#e8256a');
  grad.addColorStop(1, '#ffd7e8');
  ctx.fillStyle = grad;
  tri(ctx, bx, by + s, bx + s / 2, by, bx + s, by + s);
  ctx.fill();
  ctx.shadowBlur = s * 0.2;
  ctx.fill();
  ctx.shadowBlur = 0;

  // white-hot tip
  const tip = ctx.createLinearGradient(0, by + s * 0.25, 0, by);
  tip.addColorStop(0, 'rgba(255,255,255,0)');
  tip.addColorStop(1, 'rgba(255,255,255,0.95)');
  ctx.fillStyle = tip;
  tri(ctx, bx + s * 0.36, by + s * 0.26, bx + s / 2, by, bx + s * 0.64, by + s * 0.26);
  ctx.fill();

  // rim light
  ctx.strokeStyle = 'rgba(255, 130, 180, 0.9)';
  ctx.lineWidth = s * 0.03;
  tri(ctx, bx, by + s, bx + s / 2, by, bx + s, by + s);
  ctx.stroke();
  return cv;
}

// -- a block tile ----------------------------------------------------
function makeBlock(cell: number): HTMLCanvasElement {
  const s = cell * SS;
  const pad = s * 0.22;
  const size = s + pad * 2;
  const [cv, ctx] = mkCanvas(size, size);

  ctx.shadowColor = '#8b5cff';
  ctx.shadowBlur = s * 0.16;

  const g = ctx.createLinearGradient(0, pad, 0, pad + s);
  g.addColorStop(0, '#4b2fb0');
  g.addColorStop(0.5, '#342066');
  g.addColorStop(1, '#241547');
  ctx.fillStyle = g;
  ctx.fillRect(pad, pad, s, s);
  ctx.shadowBlur = 0;

  // top face highlight
  const tg = ctx.createLinearGradient(0, pad, 0, pad + s * 0.24);
  tg.addColorStop(0, 'rgba(200, 170, 255, 0.95)');
  tg.addColorStop(1, 'rgba(139, 92, 255, 0.08)');
  ctx.fillStyle = tg;
  ctx.fillRect(pad, pad, s, s * 0.2);

  // inner square detail
  ctx.strokeStyle = 'rgba(170, 140, 255, 0.32)';
  ctx.lineWidth = s * 0.03;
  ctx.strokeRect(pad + s * 0.22, pad + s * 0.26, s * 0.56, s * 0.52);

  // border
  ctx.strokeStyle = '#7d5cff';
  ctx.lineWidth = s * 0.045;
  ctx.strokeRect(pad + s * 0.02, pad + s * 0.02, s * 0.96, s * 0.96);

  return cv;
}

// -- the rocket ship --------------------------------------------------
function makeShip(cell: number): HTMLCanvasElement {
  const s = cell * SS;
  const pad = s * 0.75;
  const w = s * 2.3;
  const h = s * 2.0;
  const [cv, ctx] = mkCanvas(w + pad * 2, h + pad * 2);
  const cx = (w + pad * 2) / 2;
  const cy = (h + pad * 2) / 2;

  // glow pass
  ctx.shadowColor = '#2ef2ff';
  ctx.shadowBlur = s * 0.5;

  // fuselage: sleek dart pointing right
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.78, cy);                 // nose
    ctx.lineTo(cx + s * 0.1, cy - s * 0.34);       // top hull
    ctx.lineTo(cx - s * 0.62, cy - s * 0.42);      // tail top
    ctx.lineTo(cx - s * 0.38, cy);                 // tail notch
    ctx.lineTo(cx - s * 0.62, cy + s * 0.42);      // tail bottom
    ctx.lineTo(cx + s * 0.1, cy + s * 0.34);       // bottom hull
    ctx.closePath();
  };
  ctx.fillStyle = 'rgba(18, 178, 205, 0.95)';
  body();
  ctx.fill();
  ctx.shadowBlur = s * 0.24;
  ctx.fill();
  ctx.shadowBlur = 0;

  // body gradient
  const g = ctx.createLinearGradient(cx, cy - s * 0.45, cx, cy + s * 0.45);
  g.addColorStop(0, '#a9f7ff');
  g.addColorStop(0.45, '#21d5ea');
  g.addColorStop(1, '#0b7d94');
  ctx.fillStyle = g;
  body();
  ctx.fill();

  // wings (rear fins, violet)
  ctx.shadowColor = '#8b5cff';
  ctx.shadowBlur = s * 0.2;
  ctx.fillStyle = '#7b4df0';
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.1, cy - s * 0.3);
  ctx.lineTo(cx - s * 0.62, cy - s * 0.62);
  ctx.lineTo(cx - s * 0.58, cy - s * 0.36);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.1, cy + s * 0.3);
  ctx.lineTo(cx - s * 0.62, cy + s * 0.62);
  ctx.lineTo(cx - s * 0.58, cy + s * 0.36);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  // canopy — little cube pilot inside
  const r = s * 0.26;
  const gc = ctx.createRadialGradient(cx + s * 0.06, cy - s * 0.1, r * 0.2, cx + s * 0.06, cy - s * 0.1, r);
  gc.addColorStop(0, '#e8ffff');
  gc.addColorStop(0.5, '#58e6f5');
  gc.addColorStop(1, '#0a4d63');
  ctx.fillStyle = gc;
  ctx.beginPath();
  ctx.arc(cx + s * 0.06, cy - s * 0.1, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(230,255,255,0.9)';
  ctx.lineWidth = s * 0.04;
  ctx.stroke();
  // pilot eyes
  ctx.fillStyle = '#053240';
  const ew = s * 0.055;
  ctx.fillRect(cx - s * 0.02 - ew, cy - s * 0.16, ew, ew * 1.5);
  ctx.fillRect(cx + s * 0.1, cy - s * 0.16, ew, ew * 1.5);

  // nose tip + belly line
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = s * 0.05;
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.18, cy + s * 0.3);
  ctx.lineTo(cx + s * 0.72, cy + s * 0.02);
  ctx.stroke();

  return cv;
}

// -- soft radial orb (background nebulas) ----------------------------
function makeOrb(color: string): HTMLCanvasElement {
  const s = 420;
  const [cv, ctx] = mkCanvas(s, s);
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, color + '38');
  g.addColorStop(0.4, color + '1c');
  g.addColorStop(1, color + '00');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  return cv;
}

// -- vignette ---------------------------------------------------------
function makeVignette(): HTMLCanvasElement {
  const s = 512;
  const [cv, ctx] = mkCanvas(s, s);
  const g = ctx.createRadialGradient(s / 2, s / 2, s * 0.32, s / 2, s / 2, s * 0.72);
  g.addColorStop(0, 'rgba(3,0,14,0)');
  g.addColorStop(1, 'rgba(3,0,14,0.62)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  return cv;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function tri(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.closePath();
}

export function buildSprites(cell: number): Sprites {
  const cube = makeCube(cell * 3); // rendered at 1/3 scale -> supersampled
  // logical size is `cell`; canvas is (cell*3 + pads). drawImage scales down.
  return {
    cube,
    cubeSize: cell,
    ship: makeShip(cell * 3),
    spike: makeSpike(cell * 3),
    block: makeBlock(cell * 3),
    orbCyan: makeOrb('#2ef2ff'),
    orbPink: makeOrb('#ff3d81'),
    orbLime: makeOrb('#b6ff3a'),
    orbGold: makeOrb('#ffb531'),
    vignette: makeVignette(),
  };
}
