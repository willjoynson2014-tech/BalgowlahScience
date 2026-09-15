import { useEffect, useRef, useState } from 'react';
import JSZip from 'jszip';
import {
  GraduationCap, User, Lock, Unlock, Send, Hammer, Home, MessageSquare,
  Radio, Wifi, WifiOff, Download, Package, X, Star, Eye, Users, ClipboardList,
  BookOpen, Trash2, Sparkles,
} from 'lucide-react';
import {
  SEATS, StudentState, Command, NetStatus, RELAY_SOURCE, saveRelay,
} from './net';
import { decodeLevel, Placement, LAB_COLS } from '../game/custom';

/* ================================================================
   SEAT PICKER — first run on each device
   ================================================================ */
export function SeatPicker({ onPick }: { onPick: (role: 'student' | 'teacher', seat: number) => void }) {
  const [mode, setMode] = useState<'ask' | 'seats'>('ask');
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#05010f]/95 p-4 backdrop-blur-xl">
      <div className="glass w-[min(94vw,560px)] rounded-3xl p-7">
        <h2 className="text-center font-display text-2xl font-black tracking-wide text-white">
          WELCOME TO <span className="title-shimmer">NEON DASH</span>
        </h2>
        {mode === 'ask' ? (
          <>
            <p className="mt-2 text-center text-sm text-white/50">Who is using this device?</p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => setMode('seats')}
                className="flex flex-col items-center gap-2 rounded-2xl border border-neon/40 bg-neon/10 px-5 py-7 transition-all hover:bg-neon/20 active:scale-95"
              >
                <User className="h-8 w-8 text-neon" />
                <span className="font-display text-sm font-black tracking-widest text-white">I'M A PUPIL</span>
                <span className="text-[11px] text-white/45">Pick your seat number</span>
              </button>
              <button
                onClick={() => onPick('teacher', 0)}
                className="flex flex-col items-center gap-2 rounded-2xl border border-gold/40 bg-gold/10 px-5 py-7 transition-all hover:bg-gold/20 active:scale-95"
              >
                <GraduationCap className="h-8 w-8 text-gold" />
                <span className="font-display text-sm font-black tracking-widest text-white">I'M THE TEACHER</span>
                <span className="text-[11px] text-white/45">Open the class console</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-center text-sm text-white/50">Tap your seat number</p>
            <div className="mt-6 grid grid-cols-5 gap-2 sm:grid-cols-6">
              {Array.from({ length: SEATS }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => onPick('student', n)}
                  className="rounded-xl border border-white/10 bg-white/5 py-3 font-display text-sm font-black text-white/80 transition-all hover:border-neon/50 hover:bg-neon/15 hover:text-neon active:scale-90"
                >
                  {n}
                </button>
              ))}
            </div>
            <button onClick={() => setMode('ask')} className="mt-5 w-full text-center text-xs text-white/40 hover:text-white">
              ← back
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   STUDENT SIDE — badge, lock screen, message, spotlight
   ================================================================ */
export function SeatBadge({ seat, status, onOpen }: { seat: number; status: NetStatus; onOpen: () => void }) {
  const dot = status === 'online' ? 'bg-lime' : status === 'local' ? 'bg-neon/70' : status === 'connecting' ? 'bg-gold' : 'bg-pulse';
  return (
    <button
      onClick={onOpen}
      className="glass pointer-events-auto absolute bottom-4 left-4 z-40 flex items-center gap-2 rounded-xl px-3 py-2 text-white/70 transition hover:text-white"
    >
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <span className="font-display text-[10px] font-black tracking-[0.2em]">SEAT {seat}</span>
    </button>
  );
}

export function LockOverlay({ text }: { text: string }) {
  return (
    <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-[#05010f]/96 p-6 backdrop-blur-xl">
      <div className="animate-pop-in flex flex-col items-center text-center">
        <div className="grid h-20 w-20 place-items-center rounded-3xl bg-gold/15 text-gold shadow-[0_0_50px_rgba(255,181,49,0.3)]">
          <Lock className="h-10 w-10" />
        </div>
        <h2 className="mt-6 font-display text-3xl font-black tracking-wide text-white sm:text-4xl">
          EYES ON THE TEACHER
        </h2>
        <p className="mt-4 max-w-md text-base leading-relaxed text-white/60">{text}</p>
        <p className="animate-blink mt-8 font-display text-[10px] font-bold tracking-[0.4em] text-gold/80">
          SCREENS PAUSED
        </p>
      </div>
    </div>
  );
}

export function TeacherMessage({ text, onClose }: { text: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 9000);
    return () => clearTimeout(t);
  }, [text, onClose]);
  return (
    <div className="animate-toastpop pointer-events-auto absolute left-1/2 top-20 z-50 w-[min(92vw,520px)] -translate-x-1/2">
      <div className="glass flex items-start gap-3 rounded-2xl border-gold/40 px-5 py-4" style={{ boxShadow: '0 0 40px rgba(255,181,49,0.2)' }}>
        <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-[9px] font-black tracking-[0.3em] text-gold">MESSAGE FROM YOUR TEACHER</p>
          <p className="mt-1 text-sm leading-relaxed text-white">{text}</p>
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white"><X className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

export function Spotlight({ code, from, onClose }: { code: string; from: number; onClose: () => void }) {
  const placements = decodeLevel(code) ?? [];
  return (
    <div className="absolute inset-0 z-[55] flex items-center justify-center bg-[#05010f]/90 p-5 backdrop-blur-md" onPointerDown={onClose}>
      <div className="glass w-[min(94vw,760px)] rounded-3xl p-6" onPointerDown={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-2">
          <Star className="h-5 w-5 text-gold" />
          <h3 className="font-display text-lg font-black tracking-wider text-white">
            SPOTLIGHT — <span className="text-gold">SEAT {from}</span>
          </h3>
          <button onClick={onClose} className="ml-auto text-white/50 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <MiniTrack placements={placements} height={130} />
        <p className="mt-4 text-center text-xs text-white/45">{placements.length} pieces · look at the rhythm of the gaps!</p>
      </div>
    </div>
  );
}

/* ================================================================
   PUPIL CONNECTION PANEL
   ================================================================ */
export function SeatConfig({
  seat, relay, status, onRelay, onClose,
}: {
  seat: number; relay: string; status: NetStatus;
  onRelay: (url: string) => void; onClose: () => void;
}) {
  const [draft, setDraft] = useState(relay);
  return (
    <div className="absolute inset-0 z-[65] flex items-center justify-center bg-[#05010f]/85 p-5 backdrop-blur-md" onPointerDown={onClose}>
      <div className="glass w-[min(94vw,420px)] rounded-3xl p-6" onPointerDown={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-neon" />
          <h3 className="font-display text-lg font-black tracking-wider text-white">SEAT {seat}</h3>
          <button onClick={onClose} className="ml-auto text-white/50 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-white/5 px-3.5 py-2.5">
          {status === 'online' ? <Wifi className="h-4 w-4 text-lime" /> : status === 'local' ? <Radio className="h-4 w-4 text-neon" /> : <WifiOff className="h-4 w-4 text-pulse" />}
          <span className="text-xs font-semibold text-white/70">
            {status === 'online' ? 'Connected to your teacher' : status === 'local' ? 'This device only' : status === 'connecting' ? 'Connecting…' : 'Not connected'}
          </span>
        </div>
        <label className="text-[10px] font-bold tracking-[0.2em] text-white/45">TEACHER ADDRESS</label>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="ws://192.168.1.24:8080"
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 font-mono text-xs text-white outline-none focus:border-neon/50"
        />
        <p className="mt-2 text-[11px] leading-relaxed text-white/40">
          Your teacher will read this address out. Type it in exactly, then tap Connect.
        </p>
        <button
          onClick={() => { saveRelay(draft.trim()); onRelay(draft.trim()); onClose(); }}
          className="mt-4 w-full rounded-xl bg-gradient-to-r from-neon to-vio px-4 py-3 font-display text-xs font-black tracking-[0.2em] text-[#05010f] active:scale-[0.98]"
        >
          CONNECT
        </button>
      </div>
    </div>
  );
}

/* ================================================================
   MINI TRACK PREVIEW
   ================================================================ */
export function MiniTrack({ placements, height = 46 }: { placements: Placement[]; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const w = cv.clientWidth || 240;
    const h = height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = w * dpr; cv.height = h * dpr;
    const ctx = cv.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const sc = w / LAB_COLS;
    const gy = h * 0.78;
    const unit = Math.max(3, h * 0.22);

    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();

    for (const p of placements) {
      const x = p.col * sc;
      if (p.t === 'pit') {
        ctx.clearRect(x, gy - 1, sc * 3, 3);
        ctx.fillStyle = '#02000a'; ctx.fillRect(x, gy - 1, sc * 3, 3);
        continue;
      }
      if (p.t === 's1' || p.t === 's2' || p.t === 's3') {
        const n = Number(p.t[1]);
        ctx.fillStyle = '#ff3d81';
        for (let i = 0; i < n; i++) {
          const sx = x + i * sc;
          ctx.beginPath();
          ctx.moveTo(sx, gy);
          ctx.lineTo(sx + sc / 2, gy - unit);
          ctx.lineTo(sx + sc, gy);
          ctx.closePath(); ctx.fill();
        }
      } else if (p.t === 'b1' || p.t === 'b2') {
        const hh = p.t === 'b1' ? 1 : 2;
        ctx.fillStyle = '#7d5cff';
        ctx.fillRect(x, gy - unit * hh, Math.max(sc, 1.5), unit * hh);
      } else if (p.t === 'ship' || p.t === 'cube') {
        ctx.fillStyle = p.t === 'ship' ? '#2ef2ff' : '#ff8ab5';
        ctx.fillRect(x, gy - unit * 3, Math.max(sc * 0.8, 1.5), unit * 3);
      }
    }
    // goal
    ctx.strokeStyle = '#ffb531';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo((LAB_COLS - 6) * sc, h * 0.1);
    ctx.lineTo((LAB_COLS - 6) * sc, gy);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [placements, height]);
  return <canvas ref={ref} className="w-full rounded-lg bg-black/30" style={{ height }} />;
}

/* ================================================================
   TEACHER CONSOLE
   ================================================================ */
interface ConsoleProps {
  students: Map<number, StudentState>;
  status: NetStatus;
  relay: string;
  onRelay: (url: string) => void;
  send: (target: number | 'all', cmd: Command) => void;
  onClose: () => void;
}

const SCREEN_LABEL: Record<string, string> = {
  menu: 'Menu', lab: 'Level Lab', teachers: 'Teacher pack',
  playing: 'Playing', paused: 'Paused', over: 'Game over', win: 'Complete!',
};

export function TeacherConsole({ students, status, relay, onRelay, send, onClose }: ConsoleProps) {
  const [sel, setSel] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const [lockText, setLockText] = useState('Look at the board, please!');
  const [pushCode, setPushCode] = useState('');
  const [tab, setTab] = useState<'class' | 'setup'>('class');
  const [busy, setBusy] = useState('');
  const [relayDraft, setRelayDraft] = useState(relay);

  const online = Array.from(students.values()).filter((s) => Date.now() - s.ts < 8000);
  const inLab = online.filter((s) => s.screen === 'lab').length;
  const playing = online.filter((s) => s.screen === 'playing').length;
  const lockedCount = online.filter((s) => s.locked).length;

  const collectAll = () => {
    const rows = Array.from(students.values()).sort((a, b) => a.seat - b.seat);
    const out = {
      exported: new Date().toISOString(),
      class: rows.map((s) => ({
        seat: s.seat, pieces: s.pieces, bestPercent: s.best,
        attempts: s.attempts, lastScreen: s.screen, levelCode: s.code,
      })),
    };
    downloadText('neon-dash-class-work.json', JSON.stringify(out, null, 2));
  };

  const downloadRelay = () => downloadText('classroom-relay.mjs', RELAY_SOURCE);

  const buildClassPack = async () => {
    setBusy('Building 31 files…');
    try {
      const res = await fetch(location.href, { cache: 'no-store' });
      let html = await res.text();
      if (!/<\/head>/i.test(html)) throw new Error('bad html');
      // strip any previously injected identity
      html = html.replace(/<script>window\.__(SEAT|TEACHER|RELAY)__[\s\S]*?<\/script>/g, '');
      const zip = new JSZip();
      const relayLine = relayDraft ? `window.__RELAY__=${JSON.stringify(relayDraft)};` : '';
      const inject = (body: string) =>
        html.replace(/<\/head>/i, `<script>${body}${relayLine}</script></head>`);
      zip.file('teacher.html', inject('window.__TEACHER__=true;'));
      for (let i = 1; i <= SEATS; i++) {
        zip.file(`student-${String(i).padStart(2, '0')}.html`, inject(`window.__SEAT__=${i};`));
      }
      zip.file('README.txt', README_TXT);
      zip.file('classroom-relay.mjs', RELAY_SOURCE);
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      downloadBlob('neon-dash-class-pack.zip', blob);
      setBusy('');
    } catch {
      setBusy('Could not read the page source — this works when the app is served over http (not opened as a local file).');
      setTimeout(() => setBusy(''), 6000);
    }
  };

  return (
    <div className="absolute inset-0 z-[70] flex flex-col bg-[#070214]/97 backdrop-blur-md">
      {/* header */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-3">
        <GraduationCap className="h-5 w-5 text-gold" />
        <span className="font-display text-sm font-black tracking-widest text-white">CLASS CONSOLE</span>
        <span className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-[10px] font-bold tracking-wider text-white/60">
          {status === 'online' ? <Wifi className="h-3 w-3 text-lime" /> : status === 'local' ? <Radio className="h-3 w-3 text-neon" /> : <WifiOff className="h-3 w-3 text-pulse" />}
          {status === 'online' ? 'RELAY ONLINE' : status === 'local' ? 'THIS DEVICE' : status === 'connecting' ? 'CONNECTING…' : 'RELAY OFFLINE'}
        </span>
        <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-white/50">
          <Users className="h-3.5 w-3.5" /> {online.length}/{SEATS} ONLINE
        </span>
        <div className="ml-auto flex gap-2">
          <Tab active={tab === 'class'} onClick={() => setTab('class')}>CLASS</Tab>
          <Tab active={tab === 'setup'} onClick={() => setTab('setup')}>SETUP</Tab>
          <button onClick={onClose} className="glass grid h-8 w-8 place-items-center rounded-lg text-white/60 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {tab === 'class' ? (
        <>
          {/* global controls */}
          <div className="flex flex-wrap items-center gap-2 border-b border-white/5 px-4 py-3">
            <Ctl onClick={() => send('all', { c: 'lock', on: true, text: lockText })} tone="gold">
              <Lock className="h-4 w-4" /> LOCK ALL
            </Ctl>
            <Ctl onClick={() => send('all', { c: 'lock', on: false })} tone="lime">
              <Unlock className="h-4 w-4" /> UNLOCK ALL
            </Ctl>
            <Ctl onClick={() => send('all', { c: 'goto', screen: 'lab' })}><Hammer className="h-4 w-4" /> ALL → LAB</Ctl>
            <Ctl onClick={() => send('all', { c: 'goto', screen: 'menu' })}><Home className="h-4 w-4" /> ALL → MENU</Ctl>
            <Ctl onClick={collectAll}><ClipboardList className="h-4 w-4" /> COLLECT WORK</Ctl>
            {lockedCount > 0 && (
              <span className="rounded-full bg-gold/15 px-3 py-1 text-[10px] font-bold tracking-wider text-gold">
                {lockedCount} LOCKED
              </span>
            )}
            <span className="ml-auto text-[10px] font-semibold tracking-wider text-white/35">
              {inLab} BUILDING · {playing} PLAYING
            </span>
          </div>

          {/* broadcast row */}
          <div className="flex flex-wrap items-center gap-2 border-b border-white/5 px-4 py-2.5">
            <input
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && msg.trim()) { send('all', { c: 'message', text: msg.trim() }); setMsg(''); } }}
              placeholder="Message the whole class…"
              className="min-w-[180px] flex-1 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs text-white outline-none focus:border-gold/50"
            />
            <Ctl onClick={() => { if (msg.trim()) { send('all', { c: 'message', text: msg.trim() }); setMsg(''); } }} tone="gold">
              <Send className="h-4 w-4" /> SEND
            </Ctl>
            <input
              value={pushCode}
              onChange={(e) => setPushCode(e.target.value)}
              placeholder="Paste a level code to push to everyone…"
              className="min-w-[180px] flex-1 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 font-mono text-[10px] text-white outline-none focus:border-lime/50"
            />
            <Ctl onClick={() => { if (pushCode.trim()) send('all', { c: 'pushLevel', code: pushCode.trim() }); }} tone="lime">
              <Download className="h-4 w-4" /> PUSH LEVEL
            </Ctl>
          </div>

          {/* seat grid */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
              {Array.from({ length: SEATS }, (_, i) => i + 1).map((seat) => {
                const s = students.get(seat);
                const live = s && Date.now() - s.ts < 8000;
                const placements = s?.code ? decodeLevel(s.code) ?? [] : [];
                return (
                  <button
                    key={seat}
                    onClick={() => setSel(sel === seat ? null : seat)}
                    className={[
                      'flex flex-col gap-1.5 rounded-2xl border p-2.5 text-left transition-all',
                      sel === seat ? 'border-gold/60 bg-gold/10' : live ? 'border-white/12 bg-white/[0.04] hover:bg-white/[0.08]' : 'border-white/[0.06] bg-white/[0.015] opacity-50',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${live ? (s?.locked ? 'bg-gold' : 'bg-lime') : 'bg-white/20'}`} />
                      <span className="font-display text-[11px] font-black text-white">{seat}</span>
                      {s?.locked && <Lock className="h-3 w-3 text-gold" />}
                      <span className="ml-auto truncate text-[9px] font-semibold tracking-wider text-white/40">
                        {live ? SCREEN_LABEL[s!.screen] ?? s!.screen : 'offline'}
                      </span>
                    </div>
                    <MiniTrack placements={placements} height={38} />
                    <div className="flex items-center gap-2 text-[9px] font-semibold text-white/45">
                      <span className="text-lime">{s?.pieces ?? 0} pcs</span>
                      <span className="text-neon">{s?.best ?? 0}%</span>
                      <span className="ml-auto text-white/25">#{s?.attempts ?? 0}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* per-student bar */}
          {sel !== null && (
            <div className="flex flex-wrap items-center gap-2 border-t border-white/10 bg-white/[0.03] px-4 py-3">
              <span className="font-display text-xs font-black tracking-widest text-gold">SEAT {sel}</span>
              <Ctl onClick={() => send(sel, { c: 'lock', on: true, text: lockText })}><Lock className="h-4 w-4" /> LOCK</Ctl>
              <Ctl onClick={() => send(sel, { c: 'lock', on: false })}><Unlock className="h-4 w-4" /> UNLOCK</Ctl>
              <Ctl onClick={() => send(sel, { c: 'goto', screen: 'lab' })}><Hammer className="h-4 w-4" /> TO LAB</Ctl>
              <Ctl
                onClick={() => {
                  const code = students.get(sel)?.code;
                  if (code) send('all', { c: 'spotlight', code, from: sel });
                }}
                tone="gold"
              >
                <Star className="h-4 w-4" /> SPOTLIGHT TO CLASS
              </Ctl>
              <Ctl onClick={() => send('all', { c: 'clearSpotlight' })}><Eye className="h-4 w-4" /> CLEAR</Ctl>
              <Ctl
                onClick={() => {
                  const code = students.get(sel)?.code;
                  if (code) void navigator.clipboard?.writeText(code).catch(() => undefined);
                }}
              >
                <ClipboardList className="h-4 w-4" /> COPY THEIR CODE
              </Ctl>
              <button onClick={() => setSel(null)} className="ml-auto text-white/40 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
          )}
        </>
      ) : (
        /* ---------------- SETUP TAB ---------------- */
        <div className="flex-1 overflow-y-auto p-5">
          <div className="mx-auto flex max-w-2xl flex-col gap-4">
            <Card title="1 · HOW DEVICES CONNECT" icon={<Radio className="h-4 w-4 text-neon" />}>
              <p className="text-xs leading-relaxed text-white/60">
                <b className="text-white">Same computer</b> (tabs/windows) works instantly with no setup — great for trying it out
                or running the console beside a demo.
              </p>
              <p className="mt-2 text-xs leading-relaxed text-white/60">
                <b className="text-white">Real classroom (30 devices)</b> needs a tiny relay running on your laptop. It keeps
                everything on the school network: no internet, no accounts, no pupil data leaves the room.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Ctl onClick={downloadRelay} tone="lime"><Download className="h-4 w-4" /> DOWNLOAD RELAY SCRIPT</Ctl>
              </div>
              <ol className="mt-3 flex flex-col gap-1 text-[11px] text-white/50">
                <li>1. Install Node.js, then in that folder run <code className="rounded bg-black/40 px-1.5 py-0.5 text-lime">npm install ws</code></li>
                <li>2. Run <code className="rounded bg-black/40 px-1.5 py-0.5 text-lime">node classroom-relay.mjs</code></li>
                <li>3. Copy the address it prints and paste it below (and into the pupils' devices, or bake it into the class pack).</li>
              </ol>
            </Card>

            <Card title="2 · RELAY ADDRESS" icon={<Wifi className="h-4 w-4 text-lime" />}>
              <div className="flex flex-wrap gap-2">
                <input
                  value={relayDraft}
                  onChange={(e) => setRelayDraft(e.target.value)}
                  placeholder="ws://192.168.1.24:8080"
                  className="min-w-[200px] flex-1 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 font-mono text-xs text-white outline-none focus:border-lime/50"
                />
                <Ctl onClick={() => { saveRelay(relayDraft.trim()); onRelay(relayDraft.trim()); }} tone="lime">
                  CONNECT
                </Ctl>
                <Ctl onClick={() => { saveRelay(''); setRelayDraft(''); onRelay(''); }}><Trash2 className="h-4 w-4" /></Ctl>
              </div>
            </Card>

            <Card title="3 · CLASS PACK — 31 HTML FILES" icon={<Package className="h-4 w-4 text-gold" />}>
              <p className="text-xs leading-relaxed text-white/60">
                Downloads a zip with <b className="text-white">teacher.html</b> and <b className="text-white">student-01 … student-30.html</b>.
                Each file already knows its seat number, so pupils just open their file — no picking, no logins.
                The relay address above gets baked in too.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Ctl onClick={buildClassPack} tone="gold"><Package className="h-4 w-4" /> DOWNLOAD CLASS PACK (.ZIP)</Ctl>
                {busy && <span className="text-[11px] text-white/50">{busy}</span>}
              </div>
            </Card>

            <Card title="4 · LOCK SCREEN MESSAGE" icon={<MessageSquare className="h-4 w-4 text-gold" />}>
              <input
                value={lockText}
                onChange={(e) => setLockText(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs text-white outline-none focus:border-gold/50"
              />
              <p className="mt-2 text-[11px] text-white/40">Shown full-screen on pupil devices when you press LOCK ALL.</p>
            </Card>

            <Card title="TEACHING FLOW" icon={<BookOpen className="h-4 w-4 text-vio" />}>
              <ul className="flex flex-col gap-1.5 text-[11px] leading-relaxed text-white/55">
                <li className="flex gap-2"><Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lime" /> Starter: LOCK ALL while you explain, then UNLOCK.</li>
                <li className="flex gap-2"><Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lime" /> Task: ALL → LAB pushes every pupil into the editor at once.</li>
                <li className="flex gap-2"><Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lime" /> Modelling: PUSH LEVEL sends your example design to all 30 devices.</li>
                <li className="flex gap-2"><Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lime" /> Praise: pick a seat → SPOTLIGHT TO CLASS shows their track to everyone.</li>
                <li className="flex gap-2"><Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lime" /> Plenary: COLLECT WORK downloads every pupil's level as one JSON file.</li>
              </ul>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- bits ---------------- */
function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 font-display text-[10px] font-black tracking-widest transition ${
        active ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function Ctl({ children, onClick, tone }: { children: React.ReactNode; onClick: () => void; tone?: 'gold' | 'lime' }) {
  const col = tone === 'gold'
    ? 'border-gold/40 bg-gold/10 text-gold hover:bg-gold/20'
    : tone === 'lime'
      ? 'border-lime/40 bg-lime/10 text-lime hover:bg-lime/20'
      : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white';
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 font-display text-[10px] font-black tracking-widest transition-all active:scale-95 ${col}`}
    >
      {children}
    </button>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="mb-3 flex items-center gap-2 font-display text-[11px] font-black tracking-[0.2em] text-white">
        {icon} {title}
      </h3>
      {children}
    </div>
  );
}

function downloadText(name: string, text: string) {
  downloadBlob(name, new Blob([text], { type: 'text/plain' }));
}

function downloadBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const README_TXT = `NEON DASH — CLASS PACK
======================

WHAT'S INSIDE
  teacher.html          Open this on YOUR laptop. Press T for the class console.
  student-01..30.html   One file per pupil. Each already knows its seat number.
  classroom-relay.mjs   Tiny relay so all the devices can see each other.

QUICK START (one computer, testing)
  Just open teacher.html and a couple of student files in tabs of the SAME
  browser. They find each other automatically. No setup needed.

REAL CLASSROOM (30 devices)
  1. Install Node.js on the teacher laptop.
  2. In this folder:   npm install ws
  3. Then:             node classroom-relay.mjs
  4. It prints an address like ws://192.168.1.24:8080
  5. On each device, open the student file, tap the SEAT badge (bottom-left)
     and paste that address. (Or re-export the pack with the address baked in
     from the console's SETUP tab, so pupils never type anything.)

TEACHER CONTROLS  (press T in teacher.html)
  LOCK ALL / UNLOCK ALL   freeze every pupil screen with your message
  ALL -> LAB / MENU       move the whole class to the editor or menu
  SEND                    broadcast a message to every device
  PUSH LEVEL              send a level code straight into everyone's Lab
  SPOTLIGHT               show one pupil's design to the whole class
  COLLECT WORK            download every pupil's level as one JSON file

PRIVACY
  Everything runs on your local network. There are no accounts, no sign-ins,
  and no pupil names. Level codes describe track geometry only. Nothing is
  sent to the internet.
`;
