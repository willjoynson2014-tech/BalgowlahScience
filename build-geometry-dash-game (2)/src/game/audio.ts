// ------------------------------------------------------------------
// AudioSys: zero-asset WebAudio synth — SFX + a minimal synthwave bed.
// Context is created lazily and unlocked by the first user gesture.
// ------------------------------------------------------------------

export class AudioSys {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private muffle: BiquadFilterNode | null = null;
  private noiseBuf: AudioBuffer | null = null;

  private muted = false;
  private musicOn = false;
  private schedTimer: number | null = null;
  private nextNote = 0;
  private step = 0;

  private readonly BPM = 128;
  // Dm — Bb — F — C : pads (triads) and bass roots
  private readonly CHORDS: number[][] = [
    [146.83, 174.61, 220.0],
    [116.54, 146.83, 174.61],
    [174.61, 220.0, 261.63],
    [130.81, 164.81, 196.0],
  ];
  private readonly ROOTS = [73.42, 58.27, 87.31, 65.41];

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(this.ctx.destination);

      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 0.9;
      this.sfxBus.connect(this.master);

      this.muffle = this.ctx.createBiquadFilter();
      this.muffle.type = 'lowpass';
      this.muffle.frequency.value = 16000;
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.42;
      this.musicBus.connect(this.muffle);
      this.muffle.connect(this.master);

      // white noise buffer
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.02);
    }
  }

  setMuffled(m: boolean) {
    if (this.muffle && this.ctx) {
      this.muffle.frequency.setTargetAtTime(m ? 380 : 16000, this.ctx.currentTime, 0.06);
      this.musicBus!.gain.setTargetAtTime(m ? 0.24 : 0.42, this.ctx.currentTime, 0.06);
    }
  }

  duck() {
    if (!this.ctx || !this.musicBus) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(t);
    this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, t);
    this.musicBus.gain.linearRampToValueAtTime(0.08, t + 0.05);
    this.musicBus.gain.linearRampToValueAtTime(0.42, t + 1.4);
  }

  // ----------------- music scheduler -----------------
  startMusic() {
    if (!this.ctx || this.musicOn) return;
    this.musicOn = true;
    this.step = 0;
    this.nextNote = this.ctx.currentTime + 0.08;
    this.schedTimer = window.setInterval(() => this.schedule(), 25);
  }

  stopMusic() {
    this.musicOn = false;
    if (this.schedTimer !== null) {
      clearInterval(this.schedTimer);
      this.schedTimer = null;
    }
  }

  private schedule() {
    if (!this.ctx || !this.musicOn) return;
    const stepDur = 60 / this.BPM / 2; // 8th notes
    while (this.nextNote < this.ctx.currentTime + 0.14) {
      this.scheduleStep(this.step, this.nextNote);
      this.nextNote += stepDur;
      this.step = (this.step + 1) % 16;
    }
  }

  private scheduleStep(step: number, t: number) {
    if (!this.ctx || !this.musicBus || !this.noiseBuf) return;
    const chord = Math.floor(this.stepCount / 16) % 4;
    if (step % 2 === 0) this.kick(t);
    if (step % 2 === 1) this.hat(t);
    this.bass(t, this.ROOTS[chord]);
    if (step === 0) this.pad(t, this.CHORDS[chord]);
    this.stepCount++;
  }

  private stepCount = 0;

  private kick(t: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.17);
    o.connect(g); g.connect(this.musicBus!);
    o.start(t); o.stop(t + 0.2);
  }

  private hat(t: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 6800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.07, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    src.connect(hp); hp.connect(g); g.connect(this.musicBus!);
    src.start(t, Math.random());
    src.stop(t + 0.06);
  }

  private bass(t: number, freq: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 520;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.13, t + 0.012);
    g.gain.setTargetAtTime(0.0001, t + 0.16, 0.03);
    o.connect(lp); lp.connect(g); g.connect(this.musicBus!);
    o.start(t); o.stop(t + 0.24);
  }

  private pad(t: number, freqs: number[]) {
    const ctx = this.ctx!;
    const barDur = (60 / this.BPM) * 4;
    for (const f of freqs) {
      for (const det of [-4, 4]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        o.detune.value = det;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 900;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.028, t + 0.5);
        g.gain.setValueAtTime(0.028, t + barDur - 0.4);
        g.gain.linearRampToValueAtTime(0.0001, t + barDur + 0.1);
        o.connect(lp); lp.connect(g); g.connect(this.musicBus!);
        o.start(t);
        o.stop(t + barDur + 0.15);
      }
    }
  }

  // ----------------- SFX -----------------
  private env(dur: number, peak = 0.3): GainNode | null {
    if (!this.ctx || !this.sfxBus) return null;
    const g = this.ctx.createGain();
    const t = this.ctx.currentTime;
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    g.connect(this.sfxBus);
    return g;
  }

  jump() {
    if (!this.ctx) return;
    const g = this.env(0.14, 0.16);
    if (!g) return;
    const o = this.ctx.createOscillator();
    o.type = 'square';
    const t = this.ctx.currentTime;
    o.frequency.setValueAtTime(200, t);
    o.frequency.exponentialRampToValueAtTime(480, t + 0.09);
    o.connect(g);
    o.start(t); o.stop(t + 0.15);
  }

  land() {
    if (!this.ctx) return;
    const g = this.env(0.08, 0.2);
    if (!g) return;
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    const t = this.ctx.currentTime;
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(60, t + 0.07);
    o.connect(g);
    o.start(t); o.stop(t + 0.09);
  }

  death() {
    if (!this.ctx || !this.noiseBuf) return;
    const t = this.ctx.currentTime;
    // noise blast
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(3600, t);
    lp.frequency.exponentialRampToValueAtTime(140, t + 0.42);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    src.connect(lp); lp.connect(g); g.connect(this.sfxBus!);
    src.start(t); src.stop(t + 0.55);
    // crunch tone
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.3);
    const g2 = this.ctx.createGain();
    g2.gain.setValueAtTime(0.32, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
    o.connect(g2); g2.connect(this.sfxBus!);
    o.start(t); o.stop(t + 0.36);
    this.duck();
  }

  near() {
    if (!this.ctx || !this.noiseBuf) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(900, t);
    bp.frequency.exponentialRampToValueAtTime(3200, t + 0.09);
    bp.Q.value = 2.5;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    src.connect(bp); bp.connect(g); g.connect(this.sfxBus!);
    src.start(t, Math.random()); src.stop(t + 0.14);
  }

  chime() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [523.25, 783.99].forEach((f, i) => {
      const o = this.ctx!.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      const g = this.ctx!.createGain();
      const t0 = t + i * 0.07;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.14, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.35);
      o.connect(g); g.connect(this.sfxBus!);
      o.start(t0); o.stop(t0 + 0.4);
    });
  }

  win() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const notes = [293.66, 349.23, 440, 587.33, 698.46, 880];
    notes.forEach((f, i) => {
      const o = this.ctx!.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      const g = this.ctx!.createGain();
      const t0 = t + i * 0.09;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.16, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.6);
      o.connect(g); g.connect(this.sfxBus!);
      o.start(t0); o.stop(t0 + 0.65);
    });
  }

  ui() {
    if (!this.ctx) return;
    const g = this.env(0.07, 0.1);
    if (!g) return;
    const o = this.ctx.createOscillator();
    o.type = 'triangle';
    const t = this.ctx.currentTime;
    o.frequency.setValueAtTime(700, t);
    o.frequency.exponentialRampToValueAtTime(500, t + 0.05);
    o.connect(g);
    o.start(t); o.stop(t + 0.08);
  }

  destroy() {
    this.stopMusic();
    if (this.ctx) void this.ctx.close();
    this.ctx = null;
  }
}
