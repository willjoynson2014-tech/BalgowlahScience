import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Play, Save, FolderOpen, Share2, Download, Trash2, Eraser, X,
  Triangle, Pyramid, Mountain, Square, Layers, ArrowDownToLine,
  Rocket, Box, HelpCircle, ArrowLeft, Check, AlertTriangle, OctagonAlert,
} from 'lucide-react';
import {
  Placement, ToolId, TOOLS, validate, buildCustomLevel,
  LAB_COLS, RUNWAY, GOAL_RUNWAY, encodeLevel, decodeLevel,
  loadSavedLevels, saveNamedLevel, deleteSavedLevel, SavedLevel, LabIssue,
} from '../game/custom';
import { Level } from '../game/level';

const CELL = 30;

interface LabProps {
  onTestPlay: (level: Level) => void;
  onExit: () => void;
  placements: Placement[];
  setPlacements: React.Dispatch<React.SetStateAction<Placement[]>>;
}

type Panel = 'save' | 'list' | 'share' | 'import' | 'help' | null;

const TOOL_ICONS: Record<string, typeof Triangle> = {
  s1: Triangle, s2: Pyramid, s3: Mountain, b1: Square, b2: Layers,
  pit: ArrowDownToLine, ship: Rocket, cube: Box,
};

export function Lab({ onTestPlay, onExit, placements, setPlacements }: LabProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<ToolId | 'erase'>('s1');
  const [scroll, setScroll] = useState(0);
  const [hoverCol, setHoverCol] = useState(-1);
  const [size, setSize] = useState({ w: 800, h: 400 });
  const [panel, setPanel] = useState<Panel>(null);
  const [saved, setSaved] = useState<SavedLevel[]>(() => loadSavedLevels());
  const [name, setName] = useState('MY LEVEL');
  const [importText, setImportText] = useState('');
  const [importErr, setImportErr] = useState(false);
  const painting = useRef(false);

  const issues = validate(placements);
  const hasError = issues.some((i) => i.level === 'error');

  // ---------- canvas plumbing ----------
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const maxScroll = Math.max(0, (LAB_COLS + 2) * CELL - size.w);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = size.w * dpr;
    cv.height = size.h * dpr;
    const ctx = cv.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawEditor(ctx, size.w, size.h, placements, scroll, hoverCol, tool);
  }, [size, placements, scroll, hoverCol, tool]);

  // ---------- placement logic ----------
  const cellsOccupied = (pl: Placement): number[] => {
    const def = TOOLS.find((t) => t.id === pl.t)!;
    return Array.from({ length: def.w }, (_, i) => pl.col + i);
  };

  const paint = useCallback((clientX: number, clientY: number) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const x = clientX - rect.left + scroll;
    const col = Math.floor(x / CELL);
    void clientY;
    if (col < RUNWAY || col >= LAB_COLS - GOAL_RUNWAY) return;

    if (tool === 'erase') {
      setPlacements((prev) => prev.filter((pl) => !cellsOccupied(pl).includes(col)));
      return;
    }
    const def = TOOLS.find((t) => t.id === tool)!;
    if (col + def.w > LAB_COLS - GOAL_RUNWAY) return;
    const newCells = Array.from({ length: def.w }, (_, i) => col + i);
    setPlacements((prev) => {
      let next = prev.filter((pl) => !cellsOccupied(pl).some((cc) => newCells.includes(cc)));
      // only ONE ship gate and ONE cube gate allowed — keep it simple
      if (tool === 'ship') next = next.filter((pl) => pl.t !== 'ship');
      if (tool === 'cube') next = next.filter((pl) => pl.t !== 'cube');
      // skip if identical already there (avoids state churn during drag paint)
      if (next.some((pl) => pl.t === tool && pl.col === col)) return prev;
      return [...next, { t: tool, col }];
    });
  }, [scroll, tool]);

  const onPointerDown = (e: React.PointerEvent) => {
    painting.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    paint(e.clientX, e.clientY);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const col = Math.floor((e.clientX - rect.left + scroll) / CELL);
    setHoverCol(col);
    if (painting.current && (tool === 'erase' || tool === 's1')) paint(e.clientX, e.clientY);
  };
  const stopPaint = () => { painting.current = false; };

  const onWheel = (e: React.WheelEvent) => {
    setScroll((s) => Math.max(0, Math.min(maxScroll, s + (e.deltaY || e.deltaX))));
  };

  // ---------- actions ----------
  const testPlay = () => {
    if (hasError) return;
    onTestPlay(buildCustomLevel(placements));
  };

  const doSave = () => {
    setSaved(saveNamedLevel(name.trim().toUpperCase() || 'UNTITLED', placements));
    setPanel(null);
  };

  const doShare = async () => {
    const code = encodeLevel(placements);
    try {
      await navigator.clipboard.writeText(code);
    } catch { /* fall back to manual copy below */ }
    setPanel('share');
  };

  const doImport = () => {
    const decoded = decodeLevel(importText);
    if (!decoded) { setImportErr(true); return; }
    setPlacements(decoded);
    setImportErr(false);
    setImportText('');
    setPanel(null);
  };

  const shareCode = encodeLevel(placements);

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-[#070214]/92 backdrop-blur-md">
      {/* ---- header ---- */}
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5 sm:px-5">
        <button
          onClick={onExit}
          className="glass flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold tracking-wider text-white/70 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">MENU</span>
        </button>
        <div className="ml-1 flex items-center gap-2">
          <span className="font-display text-sm font-black tracking-widest text-white sm:text-base">
            LEVEL <span className="text-lime">LAB</span>
          </span>
          <span className="hidden rounded-full bg-lime/15 px-2.5 py-1 text-[9px] font-bold tracking-[0.2em] text-lime sm:inline">
            DESIGN · BUILD · TEST
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <HBtn onClick={() => setPanel('help')} title="Tips"><HelpCircle className="h-4 w-4" /></HBtn>
          <HBtn onClick={() => setPanel('save')} title="Save"><Save className="h-4 w-4" /></HBtn>
          <HBtn onClick={() => setPanel('list')} title="My levels"><FolderOpen className="h-4 w-4" /></HBtn>
          <HBtn onClick={doShare} title="Share code"><Share2 className="h-4 w-4" /></HBtn>
          <HBtn onClick={() => { setPanel('import'); setImportErr(false); }} title="Import code"><Download className="h-4 w-4" /></HBtn>
          <HBtn onClick={() => setPlacements([])} title="Clear all"><Trash2 className="h-4 w-4 text-pulse/80" /></HBtn>
        </div>
      </div>

      {/* ---- issues bar ---- */}
      <div className="flex min-h-[34px] items-center gap-2 overflow-x-auto px-3 py-1.5 sm:px-5">
        {issues.length === 0 ? (
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-lime/80">
            <Check className="h-3.5 w-3.5" /> Looks great, designer! Ready to test.
          </span>
        ) : (
          issues.map((iss: LabIssue, i: number) => (
            <span
              key={i}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-semibold ${
                iss.level === 'error'
                  ? 'bg-pulse/15 text-pulse shadow-[inset_0_0_0_1px_rgba(255,61,129,0.4)]'
                  : 'bg-gold/10 text-gold shadow-[inset_0_0_0_1px_rgba(255,181,49,0.3)]'
              }`}
            >
              {iss.level === 'error' ? <OctagonAlert className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
              {iss.msg}
            </span>
          ))
        )}
      </div>

      {/* ---- canvas ---- */}
      <div
        ref={wrapRef}
        className="relative mx-3 flex-1 cursor-crosshair overflow-hidden rounded-2xl border border-white/10 sm:mx-5"
        onWheel={onWheel}
      >
        <canvas
          ref={canvasRef}
          className="h-full w-full touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={stopPaint}
          onPointerLeave={() => { stopPaint(); setHoverCol(-1); }}
        />
        {/* scroll nudges */}
        <button
          onClick={() => setScroll((s) => Math.max(0, s - CELL * 4))}
          className="glass absolute left-2 top-1/2 -translate-y-1/2 rounded-xl px-2.5 py-3 text-white/60 transition hover:text-white"
        >◀</button>
        <button
          onClick={() => setScroll((s) => Math.min(maxScroll, s + CELL * 4))}
          className="glass absolute right-2 top-1/2 -translate-y-1/2 rounded-xl px-2.5 py-3 text-white/60 transition hover:text-white"
        >▶</button>
      </div>

      {/* ---- toolbar ---- */}
      <div className="flex items-center gap-2 overflow-x-auto px-3 py-3 sm:px-5">
        {TOOLS.map((t) => {
          const Icon = TOOL_ICONS[t.id];
          const active = tool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              className={[
                'flex shrink-0 flex-col items-center gap-1 rounded-2xl border px-3 py-2.5 transition-all active:scale-95',
                active
                  ? 'border-lime/60 bg-lime/15 text-lime shadow-[0_0_18px_rgba(182,255,58,0.25)]'
                  : 'border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.07] hover:text-white',
              ].join(' ')}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[9px] font-bold tracking-widest">{t.name}</span>
            </button>
          );
        })}
        <button
          onClick={() => setTool('erase')}
          className={[
            'flex shrink-0 flex-col items-center gap-1 rounded-2xl border px-3 py-2.5 transition-all active:scale-95',
            tool === 'erase'
              ? 'border-pulse/60 bg-pulse/15 text-pulse shadow-[0_0_18px_rgba(255,61,129,0.25)]'
              : 'border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.07] hover:text-white',
          ].join(' ')}
        >
          <Eraser className="h-5 w-5" />
          <span className="text-[9px] font-bold tracking-widest">ERASE</span>
        </button>

        <div className="mx-1 h-10 w-px shrink-0 bg-white/10" />
        <button
          onClick={testPlay}
          disabled={hasError}
          className={[
            'flex shrink-0 items-center gap-2 rounded-2xl px-6 py-3 font-display text-sm font-black tracking-[0.2em] transition-all active:scale-[0.97]',
            hasError
              ? 'cursor-not-allowed bg-white/10 text-white/30'
              : 'bg-gradient-to-r from-lime to-neon text-[#05010f] shadow-[0_0_34px_rgba(182,255,58,0.4)] hover:shadow-[0_0_50px_rgba(182,255,58,0.55)]',
          ].join(' ')}
        >
          <Play className="h-4 w-4 fill-current" /> TEST PLAY
        </button>
      </div>

      {/* ---- tool hint ---- */}
      <div className="border-t border-white/5 px-3 py-2 text-center text-[11px] text-white/40 sm:px-5">
        {tool === 'erase'
          ? 'Tap anything to remove it. Drag across big mistakes!'
          : TOOLS.find((t) => t.id === tool)?.hint}
        <span className="hidden text-white/25 sm:inline"> &nbsp;·&nbsp; scroll or drag to see the whole track</span>
      </div>

      {/* ---- panels ---- */}
      {panel && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#05010f]/70 p-4" onPointerDown={() => setPanel(null)}>
          <div className="glass w-[min(92vw,420px)] rounded-3xl p-6" onPointerDown={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-black tracking-wider text-white">
                {panel === 'save' && 'SAVE LEVEL'}
                {panel === 'list' && 'MY LEVELS'}
                {panel === 'share' && 'SHARE CODE'}
                {panel === 'import' && 'IMPORT CODE'}
                {panel === 'help' && 'DESIGNER TIPS'}
              </h3>
              <button onClick={() => setPanel(null)} className="text-white/50 transition hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {panel === 'save' && (
              <div className="flex flex-col gap-3">
                <label className="text-xs font-semibold tracking-wider text-white/60">NAME YOUR MASTERPIECE</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value.toUpperCase().replace(/[^A-Z0-9 !?-]/g, ''))}
                  maxLength={24}
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 font-display text-sm font-bold tracking-wider text-white outline-none focus:border-lime/60"
                  placeholder="MEGA SPIKE CAVE"
                />
                <BigAction onClick={doSave}>SAVE</BigAction>
              </div>
            )}

            {panel === 'list' && (
              <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
                {saved.length === 0 && <p className="py-4 text-center text-xs text-white/40">Nothing saved yet. Build something wild!</p>}
                {saved.map((lv) => (
                  <div key={lv.name} className="flex items-center gap-2 rounded-xl bg-white/5 px-3.5 py-2.5">
                    <span className="font-display text-xs font-bold tracking-wider text-white">{lv.name}</span>
                    <span className="text-[10px] text-white/30">{lv.data.length} pieces</span>
                    <button
                      onClick={() => { setPlacements(lv.data); setPanel(null); }}
                      className="ml-auto rounded-lg bg-lime/15 px-3 py-1.5 text-[10px] font-bold tracking-wider text-lime transition hover:bg-lime/25"
                    >
                      OPEN
                    </button>
                    <button
                      onClick={() => setSaved(deleteSavedLevel(lv.name))}
                      className="rounded-lg bg-white/5 px-2.5 py-1.5 text-white/40 transition hover:text-pulse"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {panel === 'share' && (
              <div className="flex flex-col gap-3">
                <p className="text-xs leading-relaxed text-white/60">
                  Give this code to a friend! They tap <b>IMPORT</b> and paste it to play YOUR level. It works on any device — no accounts, no names, just the level.
                </p>
                <textarea
                  readOnly
                  value={shareCode}
                  rows={4}
                  onFocus={(e) => e.target.select()}
                  className="w-full resize-none rounded-xl border border-white/15 bg-black/40 p-3 font-mono text-[10px] leading-relaxed text-lime outline-none"
                />
                <BigAction onClick={() => { void navigator.clipboard?.writeText(shareCode).catch(() => undefined); }}>
                  COPY CODE
                </BigAction>
              </div>
            )}

            {panel === 'import' && (
              <div className="flex flex-col gap-3">
                <p className="text-xs leading-relaxed text-white/60">Paste a friend's level code here to open it.</p>
                <textarea
                  value={importText}
                  onChange={(e) => { setImportText(e.target.value); setImportErr(false); }}
                  rows={4}
                  className="w-full resize-none rounded-xl border border-white/15 bg-black/40 p-3 font-mono text-[10px] leading-relaxed text-white outline-none focus:border-lime/60"
                  placeholder="Paste code…"
                />
                {importErr && <p className="text-xs font-semibold text-pulse">Hmm, that code doesn't look right. Check it and try again!</p>}
                <BigAction onClick={doImport}>OPEN THIS LEVEL</BigAction>
              </div>
            )}

            {panel === 'help' && (
              <ul className="flex flex-col gap-2.5 text-xs leading-relaxed text-white/70">
                <Tip>Start small! Three spikes, test it, THEN go big.</Tip>
                <Tip>Leave about 5 empty cells after a jump — dashers need room to land.</Tip>
                <Tip>One spike = easy. Two = spicy. Three = expert only!</Tip>
                <Tip>Ship gates come in pairs: SHIP GATE starts flying, CUBE GATE ends it. Put them 8+ cells apart.</Tip>
                <Tip>Flying zones love spikes on the floor and blocks to dodge. Don't seal the tunnel shut!</Tip>
                <Tip>The best levels have a rhythm: hard bit, breather, hard bit, breather.</Tip>
                <Tip>Share your code with a friend and race their times!</Tip>
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- bits ---------------- */

function HBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="glass grid h-9 w-9 place-items-center rounded-xl text-white/70 transition hover:scale-105 hover:text-white active:scale-95"
    >
      {children}
    </button>
  );
}

function BigAction({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl bg-gradient-to-r from-lime to-neon px-4 py-3 font-display text-xs font-black tracking-[0.2em] text-[#05010f] transition-all hover:brightness-110 active:scale-[0.98]"
    >
      {children}
    </button>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-lime" />
      <span>{children}</span>
    </li>
  );
}

/* ---------------- editor rendering ---------------- */

function drawEditor(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  placements: Placement[], scroll: number, hoverCol: number, tool: ToolId | 'erase',
) {
  const groundY = Math.round(h * 0.8);
  const rowH = (groundY - 18) / 7;

  // bg
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#0d0330');
  bg.addColorStop(1, '#05010f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const colX = (col: number) => col * CELL - scroll;

  // runway shading
  ctx.fillStyle = 'rgba(182,255,58,0.05)';
  ctx.fillRect(colX(0), 0, RUNWAY * CELL, groundY);
  ctx.fillStyle = 'rgba(255,181,49,0.05)';
  ctx.fillRect(colX(LAB_COLS - GOAL_RUNWAY), 0, GOAL_RUNWAY * CELL, groundY);

  // grid
  ctx.beginPath();
  for (let col = 0; col <= LAB_COLS; col++) {
    const x = colX(col);
    if (x < -CELL || x > w + CELL) continue;
    ctx.strokeStyle = col % 4 === 0 ? 'rgba(139,92,255,0.25)' : 'rgba(139,92,255,0.09)';
    ctx.lineWidth = 1;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, groundY);
  }
  ctx.stroke();

  // numbers every 10 cells
  ctx.font = '600 10px "Space Grotesk", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  for (let col = 10; col < LAB_COLS; col += 10) {
    const x = colX(col);
    if (x < -30 || x > w + 30) continue;
    ctx.fillText(String(col), x, 14);
  }

  // ship zone band
  const shipG = placements.find((p) => p.t === 'ship');
  const cubeG = placements.find((p) => p.t === 'cube');
  if (shipG && cubeG && cubeG.col > shipG.col) {
    const x0 = colX(shipG.col);
    const x1 = colX(cubeG.col + 1);
    ctx.fillStyle = 'rgba(46,242,255,0.05)';
    ctx.fillRect(x0, 0, x1 - x0, groundY);
    // ceiling rail
    const railY = groundY - 7 * rowH;
    ctx.strokeStyle = 'rgba(255,61,129,0.8)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(x0, railY);
    ctx.lineTo(x1, railY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,61,129,0.7)';
    ctx.font = '700 10px "Space Grotesk", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CEILING — DO NOT TOUCH', x0 + 6, railY - 6);
    ctx.fillStyle = 'rgba(46,242,255,0.6)';
    ctx.fillText('FLY ZONE', x0 + 6, 14);
  }

  // ground
  ctx.fillStyle = '#0b0526';
  ctx.fillRect(0, groundY, w, h - groundY);
  // ground line with pit gaps
  ctx.strokeStyle = '#eaffff';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  const pitCols = new Set<number>();
  for (const pl of placements) if (pl.t === 'pit') for (let i = 0; i < 3; i++) pitCols.add(pl.col + i);
  for (let col = 0; col < LAB_COLS; col++) {
    const x = colX(col);
    if (x < -CELL * 2 || x > w + CELL * 2) continue;
    if (!pitCols.has(col)) {
      ctx.moveTo(Math.max(x, colX(Math.max(col, 0))), groundY);
      ctx.lineTo(x + CELL, groundY);
    }
  }
  ctx.stroke();
  // dark holes for pits
  for (const colnum of pitCols) {
    ctx.fillStyle = '#02000a';
    ctx.fillRect(colX(colnum), groundY, CELL, h - groundY);
  }

  // goal
  const gx = colX(LAB_COLS - GOAL_RUNWAY);
  ctx.strokeStyle = '#ffb531';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.moveTo(gx, 6);
  ctx.lineTo(gx, groundY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#ffb531';
  ctx.font = '800 11px "Space Grotesk", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('GOAL', gx + 6, 26);

  // start
  ctx.fillStyle = '#b6ff3a';
  ctx.textAlign = 'left';
  ctx.fillText('START', colX(0) + 6, 26);

  // placements
  for (const pl of placements) {
    const x = colX(pl.col);
    if (x < -CELL * 4 || x > w + CELL * 4) continue;
    switch (pl.t) {
      case 's1': case 's2': case 's3': {
        const n = Number(pl.t[1]);
        for (let i = 0; i < n; i++) drawSpike(ctx, x + i * CELL, groundY, CELL, rowH);
        break;
      }
      case 'b1': case 'b2': {
        const hh = pl.t === 'b1' ? 1 : 2;
        for (let i = 0; i < hh; i++) drawBlock(ctx, x, groundY - (i + 1) * rowH, CELL, rowH);
        break;
      }
      case 'pit': break; // drawn above
      case 'ship': drawPortal(ctx, x + CELL / 2, groundY - rowH * 3, '#2ef2ff', 'S'); break;
      case 'cube': drawPortal(ctx, x + CELL / 2, groundY - rowH * 3, '#ff3d81', 'C'); break;
    }
  }

  // hover ghost
  if (hoverCol >= RUNWAY && hoverCol < LAB_COLS - GOAL_RUNWAY && tool !== 'erase') {
    const def = TOOLS.find((t) => t.id === tool)!;
    const x = colX(hoverCol);
    ctx.globalAlpha = 0.35;
    switch (tool) {
      case 's1': case 's2': case 's3':
        for (let i = 0; i < def.w; i++) drawSpike(ctx, x + i * CELL, groundY, CELL, rowH);
        break;
      case 'b1': case 'b2': {
        const hh = tool === 'b1' ? 1 : 2;
        for (let i = 0; i < hh; i++) drawBlock(ctx, x, groundY - (i + 1) * rowH, CELL, rowH);
        break;
      }
      case 'pit':
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, groundY + 2, CELL * 3, 4);
        break;
      case 'ship': drawPortal(ctx, x + CELL / 2, groundY - rowH * 3, '#2ef2ff', 'S'); break;
      case 'cube': drawPortal(ctx, x + CELL / 2, groundY - rowH * 3, '#ff3d81', 'C'); break;
    }
    ctx.globalAlpha = 1;
  }
}

function drawSpike(ctx: CanvasRenderingContext2D, x: number, groundY: number, cw: number, rh: number) {
  const g = ctx.createLinearGradient(0, groundY, 0, groundY - rh);
  g.addColorStop(0, '#7a0d3a');
  g.addColorStop(1, '#ff3d81');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x + 2, groundY);
  ctx.lineTo(x + cw / 2, groundY - rh * 0.96);
  ctx.lineTo(x + cw - 2, groundY);
  ctx.closePath();
  ctx.fill();
}

function drawBlock(ctx: CanvasRenderingContext2D, x: number, y: number, cw: number, rh: number) {
  const g = ctx.createLinearGradient(0, y, 0, y + rh);
  g.addColorStop(0, '#6d4df0');
  g.addColorStop(1, '#241547');
  ctx.fillStyle = g;
  ctx.fillRect(x + 2, y + 2, cw - 4, rh - 2);
  ctx.strokeStyle = '#a68cff';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 2, y + 2, cw - 4, rh - 2);
}

function drawPortal(ctx: CanvasRenderingContext2D, x: number, cy: number, color: string, letter: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(x, cy, 9, 30, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = '800 12px "Unbounded", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(letter, x, cy);
  ctx.textBaseline = 'alphabetic';
}
