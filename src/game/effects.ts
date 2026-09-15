// ------------------------------------------------------------------
// FX: pooled particles, screen shake, flashes, floating toasts.
// Rendered in world/screen space by the engine.
// ------------------------------------------------------------------

export type PShape = 'rect' | 'circle' | 'tri' | 'line' | 'ring';

export interface Particle {
  on: boolean;
  x: number; y: number;
  vx: number; vy: number;
  g: number; drag: number;
  life: number; max: number;
  size: number; size2: number;
  rot: number; vr: number;
  color: string;
  shape: PShape;
  add: boolean;
  lw: number;
}

export interface Toast {
  text: string;
  color: string;
  t: number;
  dur: number;
  size: number;
  yOff: number;
}

const MAX_P = 340;

export class FX {
  parts: Particle[] = [];
  toasts: Toast[] = [];
  shakeMag = 0;
  shakeDur = 0;
  shakeT = 0;
  shakeX = 0;
  shakeY = 0;
  flashA = 0;
  flashColor = '#ffffff';
  redPulse = 0;

  constructor(private cap = MAX_P) {
    for (let i = 0; i < cap; i++) {
      this.parts.push({
        on: false, x: 0, y: 0, vx: 0, vy: 0, g: 0, drag: 0,
        life: 0, max: 1, size: 4, size2: 0, rot: 0, vr: 0,
        color: '#fff', shape: 'rect', add: true, lw: 2,
      });
    }
  }

  private spawn(): Particle | null {
    for (let i = 0; i < this.cap; i++) {
      if (!this.parts[i].on) return this.parts[i];
    }
    return null;
  }

  count(): number {
    let n = 0;
    for (const p of this.parts) if (p.on) n++;
    return n;
  }

  p(o: Partial<Particle>) {
    const pt = this.spawn();
    if (!pt) return;
    pt.on = true;
    pt.x = o.x ?? 0; pt.y = o.y ?? 0;
    pt.vx = o.vx ?? 0; pt.vy = o.vy ?? 0;
    pt.g = o.g ?? 0; pt.drag = o.drag ?? 0;
    pt.max = pt.life = o.life ?? 0.6;
    pt.size = o.size ?? 4; pt.size2 = o.size2 ?? 0;
    pt.rot = o.rot ?? 0; pt.vr = o.vr ?? 0;
    pt.color = o.color ?? '#fff';
    pt.shape = o.shape ?? 'rect';
    pt.add = o.add ?? true;
    pt.lw = o.lw ?? 2;
  }

  burst(x: number, y: number, n: number, o: Partial<Particle>, spread = Math.PI * 2, baseAngle = 0, pow = [80, 260]) {
    for (let i = 0; i < n; i++) {
      const a = baseAngle + (Math.random() - 0.5) * spread;
      const sp = pow[0] + Math.random() * (pow[1] - pow[0]);
      this.p({
        ...o,
        x, y,
        vx: Math.cos(a) * sp + (o.vx ?? 0),
        vy: Math.sin(a) * sp + (o.vy ?? 0),
        life: (o.life ?? 0.6) * (0.6 + Math.random() * 0.7),
        size: (o.size ?? 4) * (0.6 + Math.random() * 0.9),
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 12,
      });
    }
  }

  ring(x: number, y: number, color: string, size = 6, dur = 0.4, lw = 3) {
    this.p({ x, y, color, shape: 'ring', size, size2: size * 7, life: dur, lw, add: true });
  }

  shake(mag: number, dur = 0.3) {
    if (mag > this.shakeMag * (this.shakeT / Math.max(this.shakeDur, 0.0001))) {
      this.shakeMag = mag;
      this.shakeDur = this.shakeT = dur;
    }
  }

  flash(a: number, color = '#ffffff') {
    this.flashA = Math.max(this.flashA, a);
    this.flashColor = color;
  }

  toast(text: string, color = '#ffffff', size = 56, dur = 1.25, yOff = 0) {
    // keep max ~3
    if (this.toasts.length > 2) this.toasts.shift();
    this.toasts.push({ text, color, t: 0, dur, size, yOff });
  }

  clear() {
    for (const p of this.parts) p.on = false;
    this.toasts.length = 0;
    this.flashA = 0;
    this.shakeT = 0;
    this.shakeMag = 0;
  }

  update(dt: number) {
    for (const p of this.parts) {
      if (!p.on) continue;
      p.life -= dt;
      if (p.life <= 0) { p.on = false; continue; }
      const d = 1 - (p.drag * dt);
      p.vx *= d; p.vy = p.vy * d + p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      const t = this.toasts[i];
      t.t += dt;
      if (t.t >= t.dur) this.toasts.splice(i, 1);
    }
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const k = Math.max(this.shakeT, 0) / this.shakeDur;
      const m = this.shakeMag * k * k;
      this.shakeX = (Math.random() * 2 - 1) * m;
      this.shakeY = (Math.random() * 2 - 1) * m;
    } else {
      this.shakeX = this.shakeY = 0;
    }
    this.flashA = Math.max(0, this.flashA - dt * 3.2);
    this.redPulse = Math.max(0, this.redPulse - dt * 1.4);
  }

  // World coords use y-up relative to the ground plane. `groundY` is the
  // screen-space y of the world y=0 line; camX is the camera world x.
  drawParticles(ctx: CanvasRenderingContext2D, camX: number, groundY: number) {
    let additive = false;
    for (const p of this.parts) {
      if (!p.on) continue;
      if (!additive) { ctx.globalCompositeOperation = 'lighter'; additive = true; }
      const k = p.life / p.max;
      const alpha = k < 0.6 ? k / 0.6 : 1;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;
      const size = p.size + (p.size2 - p.size) * (1 - k);
      const sx = p.x - camX;
      const sy = groundY - p.y;
      switch (p.shape) {
        case 'rect':
          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(p.rot);
          ctx.fillRect(-size / 2, -size / 2, size, size);
          ctx.restore();
          break;
        case 'tri':
          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(p.rot);
          ctx.beginPath();
          ctx.moveTo(0, -size * 0.6);
          ctx.lineTo(-size * 0.55, size * 0.45);
          ctx.lineTo(size * 0.55, size * 0.45);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          break;
        case 'circle':
          ctx.beginPath();
          ctx.arc(sx, sy, size / 2, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'line': {
          ctx.lineWidth = p.lw;
          const ang = Math.atan2(p.vy, p.vx);
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx - Math.cos(ang) * size, sy + Math.sin(ang) * size);
          ctx.stroke();
          break;
        }
        case 'ring':
          ctx.lineWidth = p.lw * k + 0.5;
          ctx.beginPath();
          ctx.arc(sx, sy, Math.max(size, 0.1), 0, Math.PI * 2);
          ctx.stroke();
          break;
      }
    }
    if (additive) ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
}
