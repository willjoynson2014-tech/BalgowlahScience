import { RefObject } from 'react';
import { Pause, Volume2, VolumeX } from 'lucide-react';

interface HudProps {
  barRef: RefObject<HTMLDivElement | null>;
  pctRef: RefObject<HTMLSpanElement | null>;
  attempt: number;
  muted: boolean;
  onPause: () => void;
  onToggleMute: () => void;
}

export function Hud({ barRef, pctRef, attempt, muted, onPause, onToggleMute }: HudProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 select-none">
      {/* progress */}
      <div className="absolute left-1/2 top-5 flex w-[min(46vw,430px)] -translate-x-1/2 items-center gap-3">
        <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-white/10 shadow-[0_0_12px_rgba(46,242,255,0.15)_inset]">
          <div
            ref={barRef}
            className="h-full w-full origin-left rounded-full bg-gradient-to-r from-neon via-vio to-pulse"
            style={{ transform: 'scaleX(0)', boxShadow: '0 0 14px rgba(46,242,255,0.7)' }}
          />
        </div>
        <span ref={pctRef} className="w-11 text-right font-display text-[13px] font-bold text-white/90 tabular-nums">
          0%
        </span>
      </div>

      {/* attempt pop */}
      <div key={attempt} className="animate-pop-in absolute left-1/2 top-[19%] -translate-x-1/2">
        <span className="font-display text-sm font-semibold tracking-[0.35em] text-white/40">
          ATTEMPT {attempt}
        </span>
      </div>

      {/* buttons */}
      <div className="pointer-events-auto absolute right-4 top-4 flex gap-2.5">
        <button
          onClick={onPause}
          aria-label="Pause"
          className="glass grid h-11 w-11 place-items-center rounded-xl text-white/80 transition-all duration-150 hover:scale-105 hover:bg-white/10 hover:text-neon active:scale-95"
        >
          <Pause className="h-5 w-5" />
        </button>
        <button
          onClick={onToggleMute}
          aria-label="Toggle sound"
          className="glass grid h-11 w-11 place-items-center rounded-xl text-white/80 transition-all duration-150 hover:scale-105 hover:bg-white/10 hover:text-neon active:scale-95"
        >
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}
