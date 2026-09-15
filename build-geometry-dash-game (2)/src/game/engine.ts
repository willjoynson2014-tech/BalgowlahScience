// ==================================================================
// NEON DASH — engine
// Two vehicles:
//   CUBE — runner: tap = jump, hold = chain jumps. Coyote + buffer.
//   SHIP — flyer: hold = thrust up, release = fall. One-touch zero-G
//   corridors with floats, inverted spikes and an energy rail.
// World coords: y-up, ground plane y=0. Render maps sy = GY - y.
// ==================================================================

import {
  BLOCK, RAIL, Level, LevelDef, generateLevel, generateAttractLevel, ACT_NAMES,
} from './level';
import { buildSprites, Sprites } from './sprites';
import { FX } from './effects';
import { AudioSys } from './audio';

// ---------------- tuning ----------------
const VIRT_H = 720;
const GY = Math.round(VIRT_H * 0.76);
const PS = BLOCK;
// cube
const GRAV = 3400;
const JUMP_V = 905;
const AIR_TIME = (2 * JUMP_V) / GRAV;
const COYOTE = 0.07;
const BUFFER = 0.13;
const SPIN = 7.6;
// ship
const SHIP_GRAV = 2450;
const SHIP_THRUST = 2650;
const SHIP_VMAX_DOWN = -400;
const SHIP_VMAX_UP = 330;
const ATTRACT_SPEED = 352;

const TINTS = ['#2ef2ff', '#ff3d81', '#b6ff3a', '#ffb531'];
const CUBE_COLORS = ['#2ef2ff', '#ff3d81', '#8b5cff', '#ffffff'];

// sprite layout metadata (must match sprites.ts construction)
const SPK = { W: 2.0, H: 1.84, BASE_TOP: 1.3, LEFT: 0.5 };
const BLK = { SIZE: 1.44, PAD: 0.22 };
const CUBE_TOTAL = 2.8;
const SHIP_W = 2.3;
const SHIP_H = 2.0;

export interface EngineEvents {
  onDeath: (pct: number) => void;
  onWin: () => void;
  onProgress: (pct01: number, act: number) => void;
  onPauseChange: (paused: boolean) => void;
}

interface TrailPt { x: number; y: number; rot: number }

interface BgShape {
  x: number; y: number; s: number; rot: number; vr: number;
  kind: number; alpha: number; layer: number;
}

function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export class Engine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private events: EngineEvents;
  private sprites: Sprites;
  private fx = new FX();
  private audio = new AudioSys();

  private level: Level;
  private levelDef: LevelDef;

  private raf = 0;
  private lastT = 0;
  private dpr = 1;
  private scale = 1;
  private virW = 1280;

  mode: 'attract' | 'play' = 'attract';
  paused = false;
  private vehicle: 'cube' | 'ship' = 'cube';

  // player state
  private px = 0;
  private py = 0;
  private vy = 0;
  private grounded = true;
  private lastGroundT = -1;
  private bufferedT = 0;
  private held = false;
  private angle = 0;
  private snapFrom = 0;
  private snapT = 1;
  private sx = 1; private sy = 1;
  private wasGrounded = true;

  // run state
  private simT = 0;
  private camX = 0;
  private dead = false;
  private deadT = 0;
  private won = false;
  private winT = 0;
  private winEmitted = false;
  private hitstopT = 0;
  private timeScale = 1;
  private speed = ATTRACT_SPEED;
  private act = 1;
  private bestMark = -1;
  private tintCur: [number, number, number] = hexRgb(TINTS[0]);
  private tintTarget = 0;
  private milestones = [false, false, false];
  private passed = new Set<number>();
  private portalIdx = 0;
  private spamIdx = 0;
  private shipHintShown = false;
  private shipGrace = 0;
  private flameT = 0;
  private nearCd = 0;
  private groundDustT = 0;
  private streakT = 0;
  private respawnFlashT = 0;
  private trail: TrailPt[] = [];
  private deathPos = { x: 0, y: 0 };

  // background
  private shapes: BgShape[] = [];
  private stars: { x: number; y: number; s: number; tw: number }[] = [];
  private bgGrad: CanvasGradient | null = null;
  private groundGrad: CanvasGradient | null = null;

  private playerScreenX = 320;

  constructor(canvas: HTMLCanvasElement, events: EngineEvents, def: LevelDef) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.events = events;
    this.levelDef = def;
    this.level = generateAttractLevel();
    this.sprites = buildSprites(BLOCK);
    this.resize();
    this.seeding();
    this.bind();
    this.lastT = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  // ---------------- public API ----------------
  unlockAudio() { this.audio.unlock(); }

  setMuted(m: boolean) { this.audio.setMuted(m); }

  isDead() { return this.dead; }

  setLevel(def: LevelDef) {
    this.levelDef = def;
    if (this.mode === 'play') {
      this.level = generateLevel(def);
    } else {
      this.level = generateAttractLevel(); // menu demo always the cube level
    }
    this.resetRun();
  }

  startPlay(attempt = 1, bestPct = 0) {
    this.mode = 'play';
    this.level = generateLevel(this.levelDef);
    this.bestMark = bestPct > 3 && bestPct < 100 ? (bestPct / 100) * this.level.endX : -1;
    this.resetRun();
    if (attempt <= 3) {
      this.fx.toast('TAP TO JUMP', '#ffffff', 38, 1.6, 20);
    }
    this.audio.startMusic();
  }

  startCustom(level: Level) {
    this.mode = 'play';
    this.level = level;
    this.bestMark = -1;
    this.resetRun();
    this.fx.toast('TEST FLIGHT', '#b6ff3a', 40, 1.2, 60);
    this.audio.startMusic();
  }

  restart(bestPct?: number) {
    if (this.mode !== 'play') return;
    if (bestPct !== undefined) {
      this.bestMark = bestPct > 3 && bestPct < 100 ? (bestPct / 100) * this.level.endX : -1;
    }
    this.resetRun();
  }

  toMenu() {
    this.mode = 'attract';
    this.paused = false;
    this.bestMark = -1;
    this.level = generateAttractLevel();
    this.audio.setMuffled(false);
    this.resetRun();
    this.events.onPauseChange(false);
  }

  setPaused(p: boolean) {
    if (this.mode !== 'play') return;
    if (this.dead || this.won) return;
    this.paused = p;
    this.audio.setMuffled(p);
    this.events.onPauseChange(p);
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.scale = h / VIRT_H;
    this.virW = w / this.scale;
    this.playerScreenX = Math.min(Math.max(this.virW * 0.3, 150), 470);
    this.bgGrad = null;
    this.groundGrad = null;
    this.seeding();
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.unbind();
    this.audio.destroy();
  }

  // ---------------- setup helpers ----------------
  private seeding() {
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    this.shapes = [];
    for (let i = 0; i < 34; i++) {
      this.shapes.push({
        x: rnd(0, this.virW + 400),
        y: rnd(20, VIRT_H * 0.6),
        s: rnd(26, 120),
        rot: rnd(0, Math.PI),
        vr: rnd(-0.4, 0.4),
        kind: i % 4,
        alpha: rnd(0.04, 0.13),
        layer: i % 2 === 0 ? 0.22 : 0.45,
      });
    }
    this.stars = [];
    for (let i = 0; i < 80; i++) {
      this.stars.push({ x: rnd(0, this.virW + 400), y: rnd(0, VIRT_H * 0.62), s: rnd(0.6, 2.2), tw: rnd(0, 6) });
    }
  }

  private resetRun() {
    this.px = 0; this.py = 0; this.vy = 0;
    this.vehicle = 'cube';
    this.grounded = true; this.wasGrounded = true;
    this.lastGroundT = -1; this.bufferedT = 0; this.held = false;
    this.angle = 0; this.snapT = 1; this.sx = this.sy = 1;
    this.camX = this.px - this.playerScreenX;
    this.dead = false; this.deadT = 0;
    this.won = false; this.winT = 0; this.winEmitted = false;
    this.hitstopT = 0; this.timeScale = 1;
    this.simT = 0;
    this.act = 1; this.tintTarget = 0;
    this.milestones = [false, false, false];
    this.passed.clear();
    this.portalIdx = 0;
    this.spamIdx = 0;
    this.shipHintShown = false;
    this.shipGrace = 0;
    this.nearCd = 0;
    this.trail.length = 0;
    this.fx.clear();
    this.respawnFlashT = 0;
    this.speed = this.mode === 'play' ? this.level.speedAt(0) : ATTRACT_SPEED;
    if (this.mode === 'play') this.fx.flash(0.32, '#ffffff');
  }

  // ---------------- input ----------------
  private onPointerDown = (e: PointerEvent) => {
    e.preventDefault();
    this.audio.unlock();
    this.press();
  };
  private onPointerUp = () => { this.held = false; };
  private onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      if (this.mode !== 'play' || this.paused) return;
      e.preventDefault();
      this.audio.unlock();
      this.press();
    }
  };
  private onKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') this.held = false;
  };
  private onBlur = () => { this.held = false; };

  private bind() {
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }
  private unbind() {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
  }

  private press() {
    if (this.mode !== 'play' || this.paused || this.dead || this.won) return;
    this.held = true;
    if (this.vehicle === 'ship') return; // thrust handled via held
    this.bufferedT = BUFFER;
    this.tryJump();
  }

  private tryJump(): boolean {
    const can = this.grounded || (this.simT - this.lastGroundT) < COYOTE;
    if (!can) return false;
    this.doJump();
    this.bufferedT = 0;
    return true;
  }

  private doJump() {
    this.vy = JUMP_V;
    this.grounded = false;
    this.sx = 0.78; this.sy = 1.22;
    this.audio.jump();
    this.fx.burst(this.px - PS * 0.3, this.py + 4, 5, {
      color: TINTS[this.tintTarget], shape: 'rect', size: 5, life: 0.5,
      g: 1500, drag: 1.5,
    }, Math.PI * 0.7, Math.PI * 0.45, [60, 190]);
  }

  private land(impact: number) {
    this.grounded = true;
    this.lastGroundT = this.simT;
    this.snapFrom = this.angle;
    this.snapT = 0;
    this.sx = 1.26; this.sy = 0.72;
    this.audio.land();
    this.fx.shake(1.6, 0.12);
    this.fx.burst(this.px, this.py + 2, 7, {
      color: '#9adfff', shape: 'rect', size: 4.5, life: 0.45, g: 900, drag: 2.4,
    }, Math.PI * 0.9, Math.PI / 2, [70, 220]);
    if (impact < -1150) {
      this.fx.ring(this.px, this.py + 4, TINTS[this.tintTarget], 8, 0.35, 3);
    }
  }

  // ---------------- portals / vehicles ----------------
  private switchVehicle(to: 'ship' | 'cube') {
    this.vehicle = to;
    this.vy = to === 'ship' ? 40 : this.vy;
    this.grounded = false;
    this.sx = 1; this.sy = 1;
    if (to === 'ship') this.shipGrace = 0.34;
    const col = to === 'ship' ? '#2ef2ff' : '#ff3d81';
    this.fx.ring(this.px, this.py + PS / 2, col, 10, 0.5, 4);
    this.fx.ring(this.px, this.py + PS / 2, '#ffffff', 4, 0.4, 2);
    this.fx.flash(0.16, col);
    this.fx.toast(to === 'ship' ? 'SHIP MODE' : 'CUBE MODE', col, 34, 1.0, 40);
    if (to === 'ship' && !this.shipHintShown) {
      this.shipHintShown = true;
      this.fx.toast('HOLD TO RISE — RELEASE TO FALL', '#ffffff', 22, 2.2, -6);
    }
    this.fx.burst(this.px, this.py + PS / 2, 14, {
      color: col, shape: 'rect', size: 5, life: 0.6, g: 500, drag: 1,
    });
    this.audio.near();
    this.audio.chime();
  }

  // ---------------- death / win ----------------
  private die() {
    if (this.dead || this.won) return;
    this.dead = true;
    this.deadT = 0;
    this.deathPos = { x: this.px, y: this.py + PS / 2 };
    this.hitstopT = 0.09;
    this.timeScale = 1;
    this.fx.shake(17, 0.5);
    this.fx.flash(0.5, '#ff2d6f');
    this.fx.redPulse = 1;
    this.audio.death();

    if (this.mode === 'play') {
      this.audio.duck();
      this.events.onDeath(Math.min(100, Math.round((this.px / this.level.endX) * 100)));
    }

    if (this.mode === 'attract') {
      this.fx.burst(this.px, this.py + PS / 2, 12, {
        color: '#9adfff', shape: 'rect', size: 6, life: 0.7, g: 1500, drag: 0.6,
      });
      return;
    }

    for (const col of CUBE_COLORS) {
      this.fx.burst(this.deathPos.x, this.deathPos.y, 7, {
        color: col, shape: Math.random() > 0.5 ? 'tri' : 'rect',
        size: 8, life: 1.1, g: 2400, drag: 0.5,
      }, Math.PI * 2, 0, [140, 560]);
    }
    this.fx.burst(this.deathPos.x, this.deathPos.y, 34, {
      color: '#ffffff', shape: 'circle', size: 3.4, life: 0.8, g: 700, drag: 1.2,
    }, Math.PI * 2, 0, [220, 780]);
    this.fx.ring(this.deathPos.x, this.deathPos.y, '#ff3d81', 10, 0.6, 5);
    this.fx.ring(this.deathPos.x, this.deathPos.y, '#ffffff', 4, 0.45, 3);
  }

  private win() {
    if (this.won || this.dead) return;
    this.won = true;
    this.winT = 0;
    this.timeScale = 0.25;
    this.audio.win();
    this.fx.toast('LEVEL COMPLETE', '#ffb531', 58, 2.2, 60);
    this.fx.flash(0.35, '#ffe9b0');
  }

  // ---------------- main loop ----------------
  private loop = (t: number) => {
    this.raf = requestAnimationFrame(this.loop);
    let dt = (t - this.lastT) / 1000;
    this.lastT = t;
    if (dt > 1 / 20) dt = 1 / 20;
    if (dt <= 0) { this.render(); return; }

    if (!this.paused) {
      if (this.hitstopT > 0) {
        this.hitstopT -= dt;
      } else {
        const sdt = dt * this.timeScale;
        let acc = sdt;
        while (acc > 0) {
          const h = Math.min(acc, 1 / 120);
          this.step(h);
          acc -= h;
        }
        this.fx.update(sdt);
      }
    }
    this.render();
  };

  // ---------------- simulation ----------------
  private step(dt: number) {
    this.simT += dt;
    this.nearCd = Math.max(0, this.nearCd - dt);
    this.respawnFlashT = Math.max(0, this.respawnFlashT - dt);
    this.shipGrace = Math.max(0, this.shipGrace - dt);

    if (this.dead) {
      this.deadT += dt;
      if (this.mode === 'attract' && this.deadT > 0.55) {
        this.resetRun();
        this.respawnFlashT = 0.25;
      }
      return;
    }

    if (this.won) {
      this.winT += dt;
      this.px += this.speed * dt;
      if (!this.grounded) {
        this.vy -= GRAV * dt;
        this.py += this.vy * dt;
        const support = this.supportAt(this.px - PS * 0.34, this.px + PS * 0.34, this.py);
        if (this.vy <= 0 && support > -Infinity && this.py <= support) {
          this.py = support;
          this.vy = 0;
          this.grounded = true;
          this.angle = Math.round(this.angle / (Math.PI / 2)) * (Math.PI / 2);
        }
      }
      this.camX = this.px - this.playerScreenX;
      if (Math.random() < dt * 9) {
        const cx = this.camX + Math.random() * this.virW;
        this.fx.burst(cx, 300 + Math.random() * 260, 8, {
          color: CUBE_COLORS[Math.floor(Math.random() * 4)],
          shape: 'rect', size: 6, life: 1.8, g: 520, drag: 0.4,
        }, Math.PI * 2, 0, [40, 160]);
      }
      if (!this.winEmitted && this.winT > 0.5) {
        this.winEmitted = true;
        this.events.onWin();
      }
      return;
    }

    const lvl = this.level;
    const targetSpeed = this.mode === 'play' ? lvl.speedAt(this.px) : ATTRACT_SPEED;
    this.speed += (targetSpeed - this.speed) * Math.min(1, dt * 2.2);

    if (this.mode === 'play') {
      const newAct = lvl.actAt(this.px);
      if (newAct !== this.act) {
        this.act = newAct;
        this.tintTarget = newAct - 1;
        this.fx.toast(`ACT ${['I', 'II', 'III', 'IV'][newAct - 1]} — ${ACT_NAMES[newAct - 1]}`, TINTS[newAct - 1], 40, 1.5, 90);
        this.fx.flash(0.14, TINTS[newAct - 1]);
        this.audio.chime();
      }
    }

    const target = hexRgb(TINTS[this.tintTarget]);
    const k = Math.min(1, dt * 2.4);
    this.tintCur = [
      this.tintCur[0] + (target[0] - this.tintCur[0]) * k,
      this.tintCur[1] + (target[1] - this.tintCur[1]) * k,
      this.tintCur[2] + (target[2] - this.tintCur[2]) * k,
    ];

    // ---------- vehicle-specific control + physics ----------
    const prevPx = this.px;

    if (this.vehicle === 'cube') {
      // buffered / held jumping
      if (this.bufferedT > 0) this.bufferedT -= dt;
      if (this.bufferedT > 0 && (this.grounded || this.simT - this.lastGroundT < COYOTE)) {
        this.doJump();
        this.bufferedT = 0;
      } else if (this.held && this.grounded && this.mode === 'play') {
        this.doJump();
      }
      if (this.mode === 'attract') this.runCubeAI();

      this.px += this.speed * dt;

      const prevBottom = this.py;
      this.vy -= GRAV * dt;
      this.py += this.vy * dt;

      this.resolveGround(prevBottom);
      this.resolveBlockFaces();
      this.resolveSpikes();

      if (this.py < -BLOCK * 1.35) this.die(); // pit fall

      if (!this.grounded) {
        this.angle += SPIN * dt;
      } else if (this.snapT < 1) {
        this.snapT = Math.min(1, this.snapT + dt / 0.09);
        const targetAng = Math.round(this.snapFrom / (Math.PI / 2)) * (Math.PI / 2);
        const e = 1 - Math.pow(1 - this.snapT, 3);
        this.angle = this.snapFrom + (targetAng - this.snapFrom) * e;
      }
    } else {
      // ================= SHIP =================
      if (this.mode === 'attract') this.runShipAI();

      this.px += this.speed * dt;

      this.vy += (this.held ? SHIP_THRUST : -SHIP_GRAV) * dt;
      this.vy = Math.max(SHIP_VMAX_DOWN, Math.min(SHIP_VMAX_UP, this.vy));
      this.py += this.vy * dt;

      // tilt
      const targetAng = Math.max(-0.62, Math.min(0.62, -this.vy * 0.0016));
      this.angle += (targetAng - this.angle) * Math.min(1, dt * 10);

      // flame
      this.flameT -= dt;
      if (this.flameT <= 0) {
        this.flameT = this.held ? 0.011 : 0.02;
        const cols = ['#ffffff', TINTS[this.tintTarget], '#ff3d81'];
        this.fx.p({
          x: this.px - PS * 0.62 + (Math.random() - 0.5) * 6,
          y: this.py + PS * 0.5 + (Math.random() - 0.5) * 10,
          vx: -this.speed * (0.5 + Math.random() * 0.35), vy: (Math.random() - 0.5) * 120,
          size: 5 + Math.random() * 6, life: 0.24 + Math.random() * 0.16,
          color: cols[Math.floor(Math.random() * 3)], shape: 'tri', drag: 1.5, rot: Math.PI * 1.5,
          vr: 0,
        });
      }

      this.resolveShipCollisions();
    }

    // ---------- portals ----------
    if (this.mode === 'play' && !this.dead) {
      const portals = lvl.portals;
      while (this.portalIdx < portals.length && portals[this.portalIdx].x <= this.px) {
        const p = portals[this.portalIdx++];
        if (prevPx < p.x && this.px >= p.x && p.to !== this.vehicle) {
          this.switchVehicle(p.to);
        }
      }
      // spam stretch warning
      const sz = lvl.spamZones[this.spamIdx];
      if (sz && this.px >= sz.x0) {
        this.spamIdx++;
        this.fx.toast('MASH IT!', '#ff3d81', 40, 1.05, 60);
        this.fx.flash(0.1, '#ff3d81');
        this.audio.near();
      }
    }

    const ease = Math.min(1, dt * 11);
    this.sx += (1 - this.sx) * ease;
    this.sy += (1 - this.sy) * ease;

    this.camX = this.px - this.playerScreenX;

    this.trail.push({ x: this.px, y: this.py + PS / 2, rot: this.angle });
    if (this.trail.length > 14) this.trail.shift();

    // ambient dust while running (cube on ground)
    this.groundDustT -= dt;
    if (this.vehicle === 'cube' && this.grounded && this.groundDustT <= 0) {
      this.groundDustT = 0.16;
      this.fx.p({
        x: this.px - PS * 0.5, y: this.py + 4, vx: -this.speed * 0.25, vy: 40 + Math.random() * 60,
        size: 3.5, life: 0.5, color: 'rgba(140,190,255,0.5)', shape: 'circle', drag: 2,
      });
    }

    // speed streaks
    this.streakT -= dt;
    if (this.streakT <= 0 && this.speed > 430) {
      this.streakT = 0.09 + Math.random() * 0.1;
      this.fx.p({
        x: this.camX + this.virW + 60, y: 60 + Math.random() * (VIRT_H * 0.6),
        vx: -(650 + Math.random() * 500), vy: 0, size: 60 + Math.random() * 90,
        life: 0.5, color: `rgba(120,220,255,${0.1 + Math.random() * 0.12})`,
        shape: 'line', lw: 1.6, drag: 0,
      });
    }

    if (this.mode === 'play' && this.vehicle === 'cube') this.checkPassed();

    if (this.mode === 'play') {
      const p = this.px / lvl.endX;
      [0.25, 0.5, 0.75].forEach((m, i) => {
        if (!this.milestones[i] && p >= m) {
          this.milestones[i] = true;
          this.fx.toast(`${m * 100}%`, '#ffffff', 46, 0.9, 130);
          this.audio.chime();
          this.fx.burst(this.px, this.py + PS, 12, {
            color: TINTS[this.tintTarget], shape: 'rect', size: 5, life: 0.8, g: 1300, drag: 0.6,
          });
        }
      });
      this.events.onProgress(Math.min(1, p), this.act);
    }

    if (this.mode === 'play' && this.px >= lvl.endX) this.win();

    if (this.grounded) this.lastGroundT = this.simT;
    this.wasGrounded = this.grounded;
  }

  // ---------------- cube collisions ----------------
  private supportAt(left: number, right: number, bottom: number): number {
    let support = -Infinity;
    const cols = this.level.blocks;
    for (let i = 0; i < cols.length; i++) {
      const b = cols[i];
      if (b.x > right) break;
      if (b.x + BLOCK < left) continue;
      const top = b.h * BLOCK;
      if (bottom >= top - 6 && top > support) support = top;
    }
    const cx = (left + right) / 2;
    if (!this.overPit(cx) && 0 > support && bottom >= -6) support = 0;
    return support;
  }

  private overPit(x: number): boolean {
    const pits = this.level.pits;
    for (let i = 0; i < pits.length; i++) {
      const p = pits[i];
      if (p.x > x) return false;
      if (x < p.x + p.w) return true;
    }
    return false;
  }

  private resolveGround(prevBottom: number) {
    if (this.vehicle !== 'cube') return;
    const left = this.px - PS * 0.34;
    const right = this.px + PS * 0.34;
    const support = this.supportAt(left, right, Math.max(this.py, prevBottom));

    if (support === -Infinity) {
      this.grounded = false;
      return;
    }
    if (this.vy <= 0 && this.py <= support && prevBottom >= support - 2) {
      const wasAir = !this.grounded;
      const impact = this.vy;
      this.grounded = true;
      this.py = support;
      this.vy = 0;
      if (wasAir && !this.wasGrounded) this.land(impact);
    } else if (this.vy <= 0 && this.py <= support && this.grounded) {
      this.py = support;
      this.vy = 0;
    } else if (this.grounded && Math.abs(this.py - support) > 1.5) {
      this.grounded = false;
    }
  }

  private resolveBlockFaces() {
    if (this.dead || this.vehicle !== 'cube') return;
    const left = this.px - PS * 0.36;
    const right = this.px + PS * 0.36;
    const cols = this.level.blocks;
    for (let i = 0; i < cols.length; i++) {
      const b = cols[i];
      if (b.x > right) break;
      if (b.x + BLOCK < left) continue;
      const top = b.h * BLOCK;
      if (this.grounded && Math.abs(this.py - top) < 2) continue;
      if (this.py < top - 2.5 && this.py + PS > 2.5) {
        this.die();
        return;
      }
    }
  }

  private resolveSpikes() {
    if (this.dead || this.won) return;
    const hw = PS * 0.31;
    const bots = this.py + PS * 0.16;
    const tops = this.py + PS * 0.86;
    const ptsX = [this.px - hw, this.px, this.px + hw];
    const ptsY = [bots, (bots + tops) / 2, tops];
    const spikes = this.level.spikes;
    const left = this.px - PS * 0.5;
    const right = this.px + PS * 0.5;
    for (let i = 0; i < spikes.length; i++) {
      const s = spikes[i];
      if (s.x > right + BLOCK) break;
      if (s.x + BLOCK < left) continue;
      const cxs = s.x + BLOCK / 2;
      const halfBase = BLOCK * 0.33;
      if (s.dir === 'up') {
        if (this.py > s.y + BLOCK + 2) continue;
        if (this.py + PS < s.y + 2) continue;
        const apexY = s.y + BLOCK * 0.78;
        const baseY = s.y + BLOCK * 0.06;
        for (const sx of ptsX) for (const sy of ptsY) {
          if (pointInTri(sx, sy, cxs - halfBase, baseY, cxs + halfBase, baseY, cxs, apexY)) {
            this.die();
            return;
          }
        }
      } else {
        // hanging spike: base hangs from s.y, apex points down at s.y - BLOCK
        if (this.py + PS < s.y - BLOCK - 2) continue;
        if (this.py > s.y + 2) continue;
        const apexY = s.y - BLOCK * 0.78;
        const baseY = s.y - BLOCK * 0.06;
        for (const sx of ptsX) for (const sy of ptsY) {
          if (pointInTri(sx, sy, cxs - halfBase, baseY, cxs + halfBase, baseY, cxs, apexY)) {
            this.die();
            return;
          }
        }
      }
    }
  }

  // ---------------- ship collisions ----------------
  private resolveShipCollisions() {
    if (this.dead || this.won) return;

    // ground / rail kiss (grace window right after portal entry)
    if (this.shipGrace <= 0) {
      if (this.py <= 1) { this.die(); return; }
      if (this.py + PS >= RAIL - 1) { this.die(); return; }
    } else {
      // still clamp inside the world during grace
      if (this.py < 0) { this.py = 0; this.vy = Math.max(this.vy, 0); }
      if (this.py + PS > RAIL) { this.py = RAIL - PS; this.vy = Math.min(this.vy, 0); }
    }

    // floating structures: any touch = death
    const pl = this.px - PS * 0.42;
    const pr = this.px + PS * 0.42;
    const pb = this.py + PS * 0.1;
    const pt = this.py + PS * 0.9;
    const floats = this.level.floats;
    for (let i = 0; i < floats.length; i++) {
      const f = floats[i];
      if (f.x > pr) break;
      if (f.x + f.w < pl) continue;
      if (pr > f.x && pl < f.x + f.w && pt > f.y0 && pb < f.y1) {
        this.die();
        return;
      }
    }

    // solid ground blocks: any touch kills the ship too
    const cols = this.level.blocks;
    for (let i = 0; i < cols.length; i++) {
      const b = cols[i];
      if (b.x > pr) break;
      if (b.x + BLOCK < pl) continue;
      const top = b.h * BLOCK;
      if (pr > b.x && pl < b.x + BLOCK && pt > 0 && pb < top) {
        this.die();
        return;
      }
    }

    this.resolveSpikes(); // shared spike triangles (both dirs)
  }

  private checkPassed() {
    const spikes = this.level.spikes;
    const back = this.px - PS / 2;
    for (let i = 0; i < spikes.length; i++) {
      const s = spikes[i];
      if (s.x > this.px) break;
      if (s.dir !== 'up') continue;
      const idx = i;
      if (s.x + BLOCK < this.px - 300) continue;
      if (this.passed.has(idx) || s.x + BLOCK >= back) continue;
      this.passed.add(idx);
      if (!this.grounded && this.nearCd <= 0) {
        const clearance = this.py - (s.y + BLOCK);
        if (clearance > -6 && clearance < 30) {
          this.nearCd = 0.65;
          this.audio.near();
          this.fx.shake(2.4, 0.14);
          this.fx.burst(s.x + BLOCK / 2, s.y + BLOCK, 6, {
            color: '#ffffff', shape: 'circle', size: 2.6, life: 0.4, drag: 2,
          }, Math.PI, Math.PI / 2, [60, 200]);
        }
      }
    }
  }

  // ---------------- attract AI ----------------
  private runCubeAI() {
    if (!this.grounded) return;
    const trigger = this.speed * AIR_TIME * 0.6;
    const front = this.px + PS / 2;
    for (const s of this.level.spikes) {
      if (s.x + BLOCK < front) continue;
      if (s.dir === 'up' && s.y <= this.py + 1 && s.x - front < trigger && s.x - front > -10) { this.doJump(); return; }
      break;
    }
    for (const b of this.level.blocks) {
      if (b.x + BLOCK < front) continue;
      const top = b.h * BLOCK;
      if (top > this.py + 2 && b.x - front < trigger) { this.doJump(); return; }
      break;
    }
    for (const p of this.level.pits) {
      if (p.x + p.w < front) continue;
      if (p.x - front < trigger && this.py <= 1) { this.doJump(); return; }
      break;
    }
  }

  private runShipAI() {
    // bang-bang altitude controller for the menu demo
    this.held = this.py < BLOCK * 3.1 && this.vy <= 80;
  }

  // ================================================================
  // RENDER
  // ================================================================
  private render() {
    const ctx = this.ctx;
    const S = this.dpr * this.scale;
    const virW = this.virW;
    const cam = this.camX;
    const shakeX = this.fx.shakeX;
    const shakeY = this.fx.shakeY;

    ctx.setTransform(S, 0, 0, S, shakeX * S, shakeY * S);

    // ---------- background ----------
    if (!this.bgGrad) {
      const g = ctx.createLinearGradient(0, 0, 0, VIRT_H);
      g.addColorStop(0, '#0d0330');
      g.addColorStop(0.55, '#08021c');
      g.addColorStop(1, '#05010f');
      this.bgGrad = g;
    }
    ctx.fillStyle = this.bgGrad;
    ctx.fillRect(-20, -20, virW + 40, VIRT_H + 40);

    const tint = `rgb(${Math.round(this.tintCur[0])},${Math.round(this.tintCur[1])},${Math.round(this.tintCur[2])})`;

    // orbs
    ctx.globalCompositeOperation = 'screen';
    const orbSprites = [this.sprites.orbCyan, this.sprites.orbPink, this.sprites.orbLime, this.sprites.orbGold];
    const orb = orbSprites[this.tintTarget];
    const spanO = virW + 900;
    const ox1 = wrap(300 - cam * 0.08 + this.simT * 4, spanO) - 450;
    const ox2 = wrap(1400 - cam * 0.05 - this.simT * 2.5, spanO) - 450;
    ctx.globalAlpha = 0.6;
    ctx.drawImage(orb, ox1, -80, 620, 620);
    ctx.globalAlpha = 0.45;
    ctx.drawImage(this.sprites.orbPink, ox2, 60, 540, 540);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    // stars
    ctx.fillStyle = '#cfe9ff';
    for (const st of this.stars) {
      const sx = wrap(st.x - cam * 0.12, spanO) - 450;
      const a = 0.25 + 0.55 * Math.abs(Math.sin(this.simT * 1.3 + st.tw));
      ctx.globalAlpha = a * 0.5;
      ctx.fillRect(sx, st.y, st.s, st.s);
    }
    ctx.globalAlpha = 1;

    // parallax outline shapes
    const span = virW + 400;
    for (const sh of this.shapes) {
      const sx = wrap(sh.x - cam * sh.layer, span) - 200;
      const rot = sh.rot + this.simT * sh.vr;
      ctx.save();
      ctx.translate(sx, sh.y);
      ctx.rotate(rot);
      ctx.globalAlpha = sh.alpha;
      ctx.strokeStyle = tint;
      ctx.lineWidth = 1.6;
      const s = sh.s;
      ctx.beginPath();
      if (sh.kind === 0) ctx.strokeRect(-s / 2, -s / 2, s, s);
      else if (sh.kind === 1) {
        ctx.moveTo(0, -s / 2); ctx.lineTo(-s / 2, s / 2); ctx.lineTo(s / 2, s / 2); ctx.closePath(); ctx.stroke();
      } else if (sh.kind === 2) { ctx.arc(0, 0, s / 2, 0, Math.PI * 2); ctx.stroke(); }
      else {
        ctx.moveTo(0, -s / 2); ctx.lineTo(s / 2, 0); ctx.lineTo(0, s / 2); ctx.lineTo(-s / 2, 0); ctx.closePath(); ctx.stroke();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    // bg grid
    ctx.strokeStyle = 'rgba(122, 105, 255, 0.055)';
    ctx.lineWidth = 1;
    const gridOff = wrap(-cam * 0.5, BLOCK * 2);
    ctx.beginPath();
    for (let x = gridOff - BLOCK * 2; x < virW + BLOCK * 2; x += BLOCK * 2) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, GY);
    }
    ctx.stroke();

    // ---------- ship-zone energy rails ----------
    this.drawRails(ctx, cam, virW);

    // ---------- ground ----------
    if (!this.groundGrad) {
      const g = ctx.createLinearGradient(0, GY, 0, VIRT_H);
      g.addColorStop(0, '#150a3d');
      g.addColorStop(0.12, '#0b0526');
      g.addColorStop(1, '#060214');
      this.groundGrad = g;
    }
    ctx.fillStyle = this.groundGrad;
    ctx.fillRect(-20, GY, virW + 40, VIRT_H - GY + 20);

    ctx.save();
    ctx.beginPath();
    ctx.rect(-20, GY, virW + 40, VIRT_H - GY + 20);
    ctx.clip();
    ctx.strokeStyle = 'rgba(139, 92, 255, 0.10)';
    const go = wrap(-cam, BLOCK);
    ctx.beginPath();
    for (let x = go - BLOCK; x < virW + BLOCK; x += BLOCK) {
      ctx.moveTo(x, GY);
      ctx.lineTo(x, VIRT_H);
    }
    for (let y = GY + 38; y < VIRT_H; y += 38) {
      ctx.moveTo(-20, y);
      ctx.lineTo(virW + 20, y);
    }
    ctx.stroke();
    ctx.restore();

    // pits
    for (const p of this.level.pits) {
      const px0 = p.x - cam;
      if (px0 + p.w < -40 || px0 > virW + 40) continue;
      ctx.fillStyle = '#02000a';
      ctx.fillRect(px0, GY, p.w, VIRT_H - GY + 20);
      ctx.strokeStyle = tint;
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(px0, GY); ctx.lineTo(px0, GY + 26);
      ctx.moveTo(px0 + p.w, GY); ctx.lineTo(px0 + p.w, GY + 26);
      ctx.stroke();
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(px0, GY); ctx.lineTo(px0, GY + 12);
      ctx.moveTo(px0 + p.w, GY); ctx.lineTo(px0 + p.w, GY + 12);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    this.drawGroundLine(ctx, cam, virW, tint);

    // ---------- solid blocks ----------
    const blkImg = this.sprites.block;
    const bs = BLK.SIZE * BLOCK;
    const bPad = BLK.PAD * BLOCK;
    const cols = this.level.blocks;
    const viewL = cam - BLOCK * 2;
    const viewR = cam + virW + BLOCK * 2;
    for (let i = 0; i < cols.length; i++) {
      const b = cols[i];
      if (b.x > viewR) break;
      if (b.x + BLOCK < viewL) continue;
      const sx = b.x - cam - bPad;
      for (let j = 0; j < b.h; j++) {
        const syTop = GY - (j + 1) * BLOCK - bPad;
        ctx.drawImage(blkImg, sx, syTop, bs, bs);
      }
    }

    // ---------- floating structures ----------
    const floats = this.level.floats;
    for (let i = 0; i < floats.length; i++) {
      const f = floats[i];
      if (f.x > viewR) break;
      if (f.x + f.w < viewL) continue;
      const x0 = f.x - cam;
      // tile block sprites over the rect
      const colCount = Math.max(1, Math.ceil(f.w / BLOCK));
      const rowStart = Math.floor(f.y0 / BLOCK);
      const rowEnd = Math.ceil(f.y1 / BLOCK);
      for (let ccx = 0; ccx < colCount; ccx++) {
        for (let r = rowStart; r < rowEnd; r++) {
          const sx = x0 + ccx * BLOCK - bPad;
          const syTop = GY - (r + 1) * BLOCK - bPad;
          ctx.drawImage(blkImg, sx, syTop, bs, bs);
        }
      }
      // danger rim (top & bottom edges glow)
      ctx.strokeStyle = '#ff3d81';
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 2;
      const yTop = GY - f.y1;
      const yBot = GY - f.y0;
      ctx.beginPath();
      ctx.moveTo(x0, yTop); ctx.lineTo(x0 + f.w, yTop);
      ctx.moveTo(x0, yBot); ctx.lineTo(x0 + f.w, yBot);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // ---------- spikes (both orientations) ----------
    const spkImg = this.sprites.spike;
    const spW = SPK.W * BLOCK;
    const spH = SPK.H * BLOCK;
    const spikes = this.level.spikes;
    for (let i = 0; i < spikes.length; i++) {
      const s = spikes[i];
      if (s.x > viewR) break;
      if (s.x + BLOCK < viewL) continue;
      if (s.dir === 'up') {
        const baseScreenY = GY - s.y;
        ctx.drawImage(spkImg, s.x - cam - SPK.LEFT * BLOCK, baseScreenY - SPK.BASE_TOP * BLOCK, spW, spH);
      } else {
        ctx.save();
        ctx.translate(s.x - cam, GY - s.y);
        ctx.scale(1, -1);
        ctx.drawImage(spkImg, -SPK.LEFT * BLOCK, -SPK.BASE_TOP * BLOCK, spW, spH);
        ctx.restore();
      }
    }

    // ---------- portals ----------
    if (this.mode === 'play') {
      for (const p of this.level.portals) {
        const sx = p.x - cam;
        if (sx < -120 || sx > virW + 120) continue;
        const col = p.to === 'ship' ? '#2ef2ff' : '#ff3d81';
        const cy = GY - RAIL * 0.42;
        const pulse = 1 + Math.sin(this.simT * 5 + p.x * 0.01) * 0.06;
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = col;
        ctx.globalAlpha = 0.28;
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.ellipse(sx, cy, 26 * pulse, 120 * pulse, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.95;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(sx, cy, 26 * pulse, 120 * pulse, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.9;
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(sx, cy, 16 * pulse, 108 * pulse, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }
    }

    // ---------- ghost "best" marker ----------
    if (this.mode === 'play' && this.bestMark > 0) {
      const bx = this.bestMark - cam;
      if (bx > -40 && bx < virW + 40) {
        ctx.strokeStyle = 'rgba(255, 215, 106, 0.55)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 8]);
        ctx.beginPath();
        ctx.moveTo(bx, GY - 190);
        ctx.lineTo(bx, GY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = '700 13px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255, 215, 106, 0.85)';
        ctx.fillText('YOUR BEST', bx, GY - 200);
        ctx.beginPath();
        ctx.moveTo(bx, GY - 190);
        ctx.lineTo(bx + 16, GY - 183);
        ctx.lineTo(bx, GY - 176);
        ctx.closePath();
        ctx.fill();
      }
    }

    // ---------- finish line ----------
    if (this.mode === 'play') {
      const fx0 = this.level.endX - cam;
      if (fx0 > -60 && fx0 < virW + 60) {
        const t = this.simT;
        ctx.strokeStyle = '#ffb531';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t * 6);
        ctx.setLineDash([14, 10]);
        ctx.lineDashOffset = -t * 60;
        ctx.beginPath();
        ctx.moveTo(fx0, 0);
        ctx.lineTo(fx0, GY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }
    }

    // ---------- trail ----------
    const tl = this.trail;
    if (tl.length > 1 && !this.dead) {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < tl.length; i++) {
        const p = tl[i];
        const k = (i + 1) / tl.length;
        const size = PS * 0.62 * k;
        ctx.globalAlpha = 0.05 + k * 0.2;
        ctx.fillStyle = this.vehicle === 'ship' ? '#9be8ff' : '#2ef2ff';
        ctx.save();
        ctx.translate(p.x - cam, GY - p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-size / 2, -size / 2, size, size);
        ctx.restore();
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }

    // ---------- player ----------
    if (!this.dead) {
      const cx = this.px - cam;
      const cy = GY - (this.py + PS / 2);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(this.angle);
      if (this.vehicle === 'ship') {
        ctx.drawImage(this.sprites.ship, -(SHIP_W * PS) / 2, -(SHIP_H * PS) / 2, SHIP_W * PS, SHIP_H * PS);
      } else {
        ctx.scale(this.sx, this.sy);
        const total = CUBE_TOTAL * PS;
        ctx.drawImage(this.sprites.cube, -total / 2, -total / 2, total, total);
      }
      ctx.restore();
    }

    // ---------- particles ----------
    this.fx.drawParticles(ctx, cam, GY);

    // ---------- respawn flash ----------
    if (this.respawnFlashT > 0 && this.mode === 'attract') {
      ctx.globalAlpha = this.respawnFlashT / 0.25;
      ctx.strokeStyle = '#2ef2ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.px - cam, GY - PS / 2, PS * (1.6 - this.respawnFlashT * 3), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // ---------- toasts ----------
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of this.fx.toasts) {
      const inK = Math.min(1, t.t / 0.16);
      const outK = Math.min(1, Math.max(0, (t.dur - t.t) / 0.28));
      const pop = 1 + Math.sin(Math.min(t.t / 0.16, 1) * Math.PI) * 0.12;
      ctx.globalAlpha = Math.min(inK, outK);
      ctx.font = `800 ${t.size * pop}px Unbounded, "Space Grotesk", sans-serif`;
      ctx.fillStyle = t.color;
      ctx.shadowColor = t.color;
      ctx.shadowBlur = 26;
      ctx.fillText(t.text, virW / 2, VIRT_H * 0.3 - t.yOff);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;

    // ---------- vignette / overlays ----------
    ctx.setTransform(S, 0, 0, S, 0, 0);
    ctx.drawImage(this.sprites.vignette, 0, 0, virW, VIRT_H);

    if (this.fx.redPulse > 0) {
      ctx.globalAlpha = this.fx.redPulse * 0.4;
      ctx.fillStyle = '#ff2045';
      ctx.fillRect(0, 0, virW, VIRT_H);
      ctx.globalAlpha = 1;
    }

    if (this.fx.flashA > 0) {
      ctx.globalAlpha = Math.min(1, this.fx.flashA);
      ctx.fillStyle = this.fx.flashColor;
      ctx.fillRect(0, 0, virW, VIRT_H);
      ctx.globalAlpha = 1;
    }

    if (this.dead && this.mode === 'play') {
      const d = Math.min(0.5, this.deadT * 0.8);
      ctx.globalAlpha = d;
      ctx.fillStyle = '#03000c';
      ctx.fillRect(0, 0, virW, VIRT_H);
      ctx.globalAlpha = 1;
    }

    if (this.paused) {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#05010f';
      ctx.fillRect(0, 0, virW, VIRT_H);
      ctx.globalAlpha = 1;
    }
  }

  private drawRails(ctx: CanvasRenderingContext2D, cam: number, virW: number) {
    const railScreenY = GY - RAIL;
    for (const z of this.level.shipZones) {
      const x0 = z.x0 - cam;
      const x1 = z.x1 - cam;
      if (x1 < -40 || x0 > virW + 40) continue;
      const pulse = 0.75 + 0.25 * Math.sin(this.simT * 7 + z.x0 * 0.02);
      // soft band beneath the rail
      const grad = ctx.createLinearGradient(0, railScreenY - 26, 0, railScreenY + 4);
      grad.addColorStop(0, 'rgba(255,61,129,0)');
      grad.addColorStop(1, 'rgba(255,61,129,0.14)');
      ctx.fillStyle = grad;
      ctx.fillRect(x0, railScreenY - 26, x1 - x0, 30);
      // core line
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5 * pulse;
      ctx.strokeStyle = '#ff3d81';
      ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(x0, railScreenY); ctx.lineTo(x1, railScreenY); ctx.stroke();
      ctx.globalAlpha = 0.95;
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffd7e8';
      ctx.beginPath(); ctx.moveTo(x0, railScreenY); ctx.lineTo(x1, railScreenY); ctx.stroke();
      // ticks
      ctx.globalAlpha = 0.5 * pulse;
      ctx.strokeStyle = '#ff3d81';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const tickOff = wrap(-this.simT * 90, 22);
      for (let x = Math.max(x0, -20) + tickOff; x < Math.min(x1, virW + 20); x += 22) {
        ctx.moveTo(x, railScreenY - 2);
        ctx.lineTo(x - 6, railScreenY - 10);
      }
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
  }

  private drawGroundLine(ctx: CanvasRenderingContext2D, cam: number, virW: number, tint: string) {
    const pits = this.level.pits;
    const x0 = cam - 30;
    const x1 = cam + virW + 30;
    let segs: [number, number][] = [[x0, x1]];
    for (const p of pits) {
      if (p.x + p.w < x0 || p.x > x1) continue;
      const next: [number, number][] = [];
      for (const [a, b] of segs) {
        if (p.x + p.w <= a || p.x >= b) { next.push([a, b]); continue; }
        if (a < p.x) next.push([a, p.x]);
        if (p.x + p.w < b) next.push([p.x + p.w, b]);
      }
      segs = next;
    }
    ctx.lineCap = 'round';
    for (const [a, b] of segs) {
      const sa = a - cam;
      const sb = b - cam;
      ctx.strokeStyle = tint;
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(sa, GY); ctx.lineTo(sb, GY); ctx.stroke();
      ctx.globalAlpha = 0.95;
      ctx.lineWidth = 2.6;
      ctx.strokeStyle = '#eaffff';
      ctx.beginPath(); ctx.moveTo(sa, GY); ctx.lineTo(sb, GY); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

function wrap(v: number, span: number): number {
  return ((v % span) + span) % span;
}

function pointInTri(
  px: number, py: number,
  x1: number, y1: number, x2: number, y2: number, x3: number, y3: number,
): boolean {
  const d1 = (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
  const d2 = (px - x3) * (y2 - y3) - (x2 - x3) * (py - y3);
  const d3 = (px - x1) * (y3 - y1) - (x3 - x1) * (py - y1);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}
