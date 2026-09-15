import { useEffect, useState } from 'react';
import {
  Play, RotateCcw, Home, Trophy, Keyboard, MousePointerClick,
  Pause, Crown, Sparkles, Pointer, Volume2, VolumeX, Zap, Rocket, Skull,
  Hammer, GraduationCap, FlaskConical,
} from 'lucide-react';
import type { ScoreEntry } from '../game/storage';
import { bestFor } from '../game/storage';
import type { LevelDef } from '../game/level';

export type Screen = 'menu' | 'lab' | 'teachers' | 'playing' | 'paused' | 'over' | 'win';

interface ScreensProps {
  screen: Screen;
  score: number;
  best: number;
  newBest: boolean;
  attempt: number;
  scores: ScoreEntry[];
  muted: boolean;
  isTouch: boolean;
  inLab: boolean;
  levels: LevelDef[];
  levelId: string;
  levelDef: LevelDef;
  onSelectLevel: (id: string) => void;
  onOpenLab: () => void;
  onOpenTeachers: () => void;
  onStart: () => void;
  onResume: () => void;
  onRetry: () => void;
  onMenu: () => void;
  onToggleMute: () => void;
}

export function Screens(p: ScreensProps) {
  switch (p.screen) {
    case 'menu': return <Menu {...p} />;
    case 'paused': return <Paused {...p} />;
    case 'over': return <GameOver {...p} />;
    case 'win': return <Win {...p} />;
    default: return null;
  }
}

/* ---------------------------------------------------------------- */

const LEVEL_ICONS = [Zap, Rocket, Skull];

function Menu(p: ScreensProps) {
  return (
    <div
      className="scanlines absolute inset-0 z-30 flex cursor-pointer flex-col items-center justify-center overflow-hidden"
      onPointerDown={() => p.onStart()}
    >
      <div className="crt-sweep" />
      {/* mute */}
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={p.onToggleMute}
        aria-label="Toggle sound"
        className="glass absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-xl text-white/80 transition-all hover:scale-105 hover:text-neon active:scale-95"
      >
        {p.muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>

      {p.best > 0 && (
        <div className="glass absolute left-4 top-4 flex items-center gap-2 rounded-xl px-3.5 py-2.5">
          <Crown className="h-4 w-4 text-gold" />
          <span className="font-display text-xs font-bold tracking-widest text-white/90">
            BEST&nbsp;<span className="text-neon">{p.best}%</span>
          </span>
        </div>
      )}

      <div className="pointer-events-none mx-auto flex w-full max-w-6xl flex-col items-center gap-8 px-5 py-6 lg:flex-row lg:items-center lg:justify-center lg:gap-14">
        {/* left: brand + play + level select */}
        <div className="flex flex-col items-center text-center">
          <div className="glass animate-fade-up mb-4 flex items-center gap-2 rounded-full px-4 py-1.5" style={{ animationDelay: '0.05s' }}>
            <Sparkles className="h-3.5 w-3.5 text-neon" />
            <span className="font-display text-[10px] font-semibold tracking-[0.3em] text-white/70">
              ONE TAP · CUBE & SHIP
            </span>
          </div>

          <h1 className="font-display font-black leading-[0.95]">
            <span className="animate-fade-up block text-[clamp(2.4rem,9vw,5rem)] text-white text-glow-cyan">
              NEON
            </span>
            <span className="animate-fade-up title-shimmer block text-[clamp(2.4rem,9vw,5rem)]" style={{ animationDelay: '0.18s' }}>
              DASH
            </span>
          </h1>

          <div className="animate-pop-in relative mt-6" style={{ animationDelay: '0.3s' }}>
            <div className="animate-pulse-ring absolute inset-0 rounded-full border-2 border-neon" />
            <div className="grid h-[4.5rem] w-[4.5rem] place-items-center rounded-full bg-neon shadow-[0_0_44px_rgba(46,242,255,0.65)] transition-transform duration-150 hover:scale-105 active:scale-95">
              <Play className="ml-1 h-8 w-8 fill-[#05010f] text-[#05010f]" />
            </div>
          </div>

          <div className="animate-blink mt-5 font-display text-[11px] font-bold tracking-[0.4em] text-neon/90">
            {p.isTouch ? 'TAP TO START' : 'PRESS SPACE TO START'}
          </div>

          {/* level select */}
          <div className="pointer-events-auto mt-6 w-full max-w-[430px]" onPointerDown={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-center gap-3 text-[9px] font-semibold tracking-[0.35em] text-white/35">
              <span className="h-px w-8 bg-white/15" />
              SELECT CIRCUIT {p.isTouch ? '' : '· 1 / 2 / 3'}
              <span className="h-px w-8 bg-white/15" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {p.levels.map((lv, i) => {
                const Icon = LEVEL_ICONS[i] ?? Zap;
                const active = lv.id === p.levelId;
                const lvBest = bestFor(lv.id);
                return (
                  <button
                    key={lv.id}
                    onClick={() => p.onSelectLevel(lv.id)}
                    className={[
                      'group relative flex flex-col items-center gap-1 rounded-2xl border px-2.5 py-3 transition-all duration-200 active:scale-95',
                      active
                        ? 'border-white/25 bg-white/[0.07] shadow-[0_0_26px_rgba(46,242,255,0.18)]'
                        : 'border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05]',
                    ].join(' ')}
                    style={active ? { boxShadow: `0 0 26px ${lv.accent}33, inset 0 0 0 1px ${lv.accent}55` } : undefined}
                  >
                    <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" style={{ color: active ? lv.accent : 'rgba(255,255,255,0.35)' }} />
                    <span className={`font-display text-[10px] font-bold leading-none tracking-wider ${active ? 'text-white' : 'text-white/55'}`}>
                      {lv.name}
                    </span>
                    <span className="flex gap-[3px]">
                      {Array.from({ length: 5 }).map((_, d) => (
                        <span
                          key={d}
                          className="h-[5px] w-[5px] rounded-full"
                          style={{ background: d < lv.difficulty ? lv.accent : 'rgba(255,255,255,0.12)' }}
                        />
                      ))}
                    </span>
                    <span className="text-[9px] font-semibold tabular-nums" style={{ color: lvBest > 0 ? lv.accent : 'rgba(255,255,255,0.25)' }}>
                      {lvBest > 0 ? `${lvBest}%` : '—'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="animate-fade-up mt-4 hidden items-center gap-2.5 sm:flex" style={{ animationDelay: '0.42s' }}>
            {!p.isTouch && <Chip><Keyboard className="h-3.5 w-3.5" />SPACE</Chip>}
            <Chip><MousePointerClick className="h-3.5 w-3.5" />CLICK</Chip>
            <Chip><Pointer className="h-3.5 w-3.5" />TAP</Chip>
          </div>

          {/* lab + teacher entries */}
          <div
            className="pointer-events-auto animate-fade-up mt-4 flex items-center gap-2.5"
            style={{ animationDelay: '0.5s' }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              onClick={p.onOpenLab}
              className="flex items-center gap-2 rounded-xl border border-lime/40 bg-lime/10 px-4 py-2.5 font-display text-[10px] font-black tracking-[0.2em] text-lime transition-all hover:bg-lime/20 hover:shadow-[0_0_24px_rgba(182,255,58,0.25)] active:scale-95"
            >
              <Hammer className="h-4 w-4" /> LEVEL LAB
            </button>
            <button
              onClick={p.onOpenTeachers}
              className="glass flex items-center gap-2 rounded-xl px-4 py-2.5 font-display text-[10px] font-black tracking-[0.2em] text-white/60 transition-all hover:text-gold active:scale-95"
            >
              <GraduationCap className="h-4 w-4" /> TEACHER PACK
            </button>
          </div>
        </div>

        {/* right: high scores */}
        <div className="animate-fade-up w-full max-w-xs" style={{ animationDelay: '0.3s' }}>
          <ScoreTable scores={p.scores} highlight={-1} title={`TOP RUNS — ${p.levelDef.name}`} />
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */

function LevelBadge({ name, accent }: { name: string; accent: string }) {
  return (
    <span
      className="mb-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-display text-[9px] font-bold tracking-[0.3em]"
      style={{ color: accent, background: `${accent}14`, boxShadow: `inset 0 0 0 1px ${accent}55` }}
    >
      {name}
    </span>
  );
}

function Paused(p: ScreensProps) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#05010f]/55 backdrop-blur-md">
      <div className="glass animate-pop-in flex w-[min(88vw,380px)] flex-col items-center rounded-3xl px-8 py-9 text-center">
        <LevelBadge name={p.levelDef.name} accent={p.levelDef.accent} />
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-vio/20 text-vio">
          <Pause className="h-7 w-7" />
        </div>
        <h2 className="mt-4 font-display text-3xl font-black tracking-wide text-white">PAUSED</h2>
        <p className="mt-1 text-xs tracking-[0.25em] text-white/40">TAKE A BREATH</p>

        <div className="mt-7 flex w-full flex-col gap-2.5">
          <BigBtn onClick={p.onResume} primary>
            <Play className="h-4 w-4" /> RESUME
          </BigBtn>
          <div className="flex gap-2.5">
            <BigBtn onClick={p.onRetry} className="flex-1"><RotateCcw className="h-4 w-4" /> RESTART</BigBtn>
            <BigBtn onClick={p.onMenu} className="flex-1">
              {p.inLab ? <FlaskConical className="h-4 w-4" /> : <Home className="h-4 w-4" />} {p.inLab ? 'LAB' : 'MENU'}
            </BigBtn>
          </div>
        </div>
        {!p.isTouch && (
          <p className="mt-5 text-[11px] tracking-[0.2em] text-white/35">P / ESC — RESUME &nbsp;·&nbsp; R — RESTART</p>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */

function GameOver(p: ScreensProps) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setArmed(true), 500);
    return () => clearTimeout(t);
  }, []);
  const myRow = p.scores.findIndex((s) => s.attempt === p.attempt && s.score === p.score);

  return (
    <div
      className="scanlines absolute inset-0 z-30 flex items-center justify-center bg-[#0c0114]/45"
      onPointerDown={() => armed && p.onRetry()}
    >
      <div className="glass animate-pop-in pointer-events-auto flex w-[min(90vw,400px)] flex-col items-center rounded-3xl px-7 py-8 text-center">
        <LevelBadge name={p.levelDef.name} accent={p.levelDef.accent} />
        <h2 className="animate-fade-up font-display text-[clamp(2.2rem,9vw,3.2rem)] font-black text-pulse text-glow-pink">
          WRECKED
        </h2>

        <div className="animate-pop-in mt-2 font-display text-7xl font-black tabular-nums text-white" style={{ animationDelay: '0.08s' }}>
          {p.score}<span className="text-4xl text-white/60">%</span>
        </div>

        {p.newBest && (
          <div className="animate-pop-in mt-3 flex items-center gap-1.5 rounded-full border border-gold/50 bg-gold/15 px-3.5 py-1.5" style={{ animationDelay: '0.16s' }}>
            <Crown className="h-3.5 w-3.5 text-gold" />
            <span className="font-display text-[10px] font-bold tracking-[0.3em] text-gold">NEW BEST</span>
          </div>
        )}

        <div className="mt-4 flex items-center gap-4 text-[11px] font-semibold tracking-[0.2em] text-white/45">
          <span>BEST <span className="text-neon">{p.best}%</span></span>
          <span className="h-3 w-px bg-white/15" />
          <span>ATTEMPT <span className="text-white/80">#{p.attempt}</span></span>
        </div>

        <div className="mt-5 w-full">
          <ScoreTable scores={p.scores} highlight={myRow} title="TOP RUNS" compact />
        </div>

        <div className="mt-6 flex w-full gap-2.5">
          <BigBtn onClick={(e) => { e.stopPropagation(); p.onRetry(); }} primary className="flex-[1.6]">
            <RotateCcw className="h-4 w-4" /> {p.inLab ? 'RE-TEST' : 'RETRY'}
          </BigBtn>
          <BigBtn onClick={(e) => { e.stopPropagation(); p.onMenu(); }} className="flex-1">
            {p.inLab ? <FlaskConical className="h-4 w-4" /> : <Home className="h-4 w-4" />} {p.inLab ? 'LAB' : 'MENU'}
          </BigBtn>
        </div>

        {armed && (
          <p className="animate-blink mt-4 text-[10px] font-semibold tracking-[0.3em] text-white/40">
            {p.isTouch ? 'TAP ANYWHERE — INSTANT RETRY' : 'R / TAP — INSTANT RETRY'}
          </p>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */

function Win(p: ScreensProps) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#05010f]/35">
      <div className="glass animate-pop-in flex w-[min(90vw,400px)] flex-col items-center rounded-3xl px-7 py-9 text-center">
        <LevelBadge name={p.levelDef.name} accent={p.levelDef.accent} />
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gold/15 text-gold shadow-[0_0_40px_rgba(255,181,49,0.35)]">
          <Trophy className="h-8 w-8" />
        </div>
        <h2 className="mt-5 font-display text-[clamp(1.6rem,7vw,2.4rem)] font-black text-gold text-glow-gold">
          LEVEL COMPLETE
        </h2>
        <div className="mt-2 font-display text-6xl font-black tabular-nums text-white">
          100<span className="text-3xl text-gold">%</span>
        </div>
        <p className="mt-3 text-[11px] font-semibold tracking-[0.25em] text-white/45">
          CONQUERED ON ATTEMPT <span className="text-white/85">#{p.attempt}</span>
        </p>
        <div className="mt-7 flex w-full gap-2.5">
          <BigBtn onClick={p.onRetry} primary className="flex-[1.6]">
            <RotateCcw className="h-4 w-4" /> {p.inLab ? 'RE-TEST' : 'RUN IT BACK'}
          </BigBtn>
          <BigBtn onClick={p.onMenu} className="flex-1">
            {p.inLab ? <FlaskConical className="h-4 w-4" /> : <Home className="h-4 w-4" />} {p.inLab ? 'LAB' : 'MENU'}
          </BigBtn>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="glass flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-display text-[9px] font-semibold tracking-[0.2em] text-white/55">
      {children}
    </span>
  );
}

function BigBtn({
  children, onClick, primary, className = '',
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  primary?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 font-display text-xs font-bold tracking-[0.2em] transition-all duration-150 active:scale-[0.97]',
        primary
          ? 'bg-gradient-to-r from-neon to-vio text-[#05010f] shadow-[0_0_30px_rgba(46,242,255,0.4)] hover:shadow-[0_0_44px_rgba(46,242,255,0.6)]'
          : 'glass text-white/75 hover:bg-white/10 hover:text-white',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  );
}

const RANK_COLORS = ['#ffd76a', '#cfd8ff', '#e2a26a'];

export function ScoreTable({ scores, highlight, title, compact }: {
  scores: ScoreEntry[];
  highlight: number;
  title: string;
  compact?: boolean;
}) {
  const rows = scores.slice(0, compact ? 5 : 7);
  return (
    <div className={`glass w-full rounded-2xl ${compact ? 'p-4' : 'p-5'}`}>
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 font-display text-[10px] font-bold tracking-[0.3em] text-white/60">
          <Trophy className="h-3.5 w-3.5 text-gold" /> {title}
        </span>
        <span className="text-[10px] tracking-[0.2em] text-white/25">LOCAL</span>
      </div>
      {rows.length === 0 ? (
        <p className="py-3 text-center text-xs text-white/35">No runs yet — be the first to ride the grid.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {rows.map((s, i) => (
            <li
              key={i}
              className={[
                'flex items-center gap-3 rounded-lg px-2.5 py-[7px] text-xs',
                i === highlight ? 'bg-neon/10 shadow-[0_0_0_1px_rgba(46,242,255,0.35)_inset]' : '',
              ].join(' ')}
            >
              <span
                className="w-5 text-center font-display text-[11px] font-black tabular-nums"
                style={{ color: i < 3 ? RANK_COLORS[i] : 'rgba(255,255,255,0.3)' }}
              >
                {i + 1}
              </span>
              <span className={`font-display font-bold tabular-nums ${s.win ? 'text-gold' : 'text-neon'}`}>
                {s.score}%
              </span>
              {s.win && <Trophy className="h-3 w-3 text-gold" />}
              <span className="ml-auto tabular-nums text-[10px] text-white/30">
                #{s.attempt} · {fmtDate(s.date)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}
