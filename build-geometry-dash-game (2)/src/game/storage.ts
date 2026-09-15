// Local persistence: high-score tables (per level), bests, attempts, settings.

export interface ScoreEntry {
  score: number;      // percent 0..100
  win: boolean;
  date: string;       // ISO
  attempt: number;    // global attempt number when achieved
  level: string;      // level id
}

const K_SCORES = 'neon-dash:scores';
const K_BEST_PREFIX = 'neon-dash:best:';
const K_ATTEMPTS = 'neon-dash:attempts';
const K_MUTED = 'neon-dash:muted';
const K_LEVEL = 'neon-dash:level';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — ignore */
  }
}

export function loadScores(): ScoreEntry[] {
  const list = read<ScoreEntry[]>(K_SCORES, []);
  return Array.isArray(list) ? list : [];
}

export function loadScoresFor(level: string): ScoreEntry[] {
  return loadScores().filter((s) => (s.level ?? 'pulse') === level);
}

export function loadBest(level: string): number {
  return read<number>(K_BEST_PREFIX + level, 0);
}

export function bestFor(level: string): number {
  const table = loadBest(level);
  if (table > 0) return table;
  // fall back to scanning the table (handles pre-level entries)
  return loadScores().reduce((m, s) => ((s.level ?? 'pulse') === level ? Math.max(m, s.score) : m), 0);
}

export function recordScore(entry: ScoreEntry): { scores: ScoreEntry[]; best: number } {
  const scores = loadScores();
  scores.push(entry);
  scores.sort((a, b) => (b.win ? 1 : 0) - (a.win ? 1 : 0) || b.score - a.score || a.attempt - b.attempt);
  const trimmed = scores.slice(0, 21); // keep 7 slots x 3 levels
  write(K_SCORES, trimmed);
  const best = Math.max(loadBest(entry.level), entry.score);
  write(K_BEST_PREFIX + entry.level, best);
  return {
    scores: trimmed.filter((s) => (s.level ?? 'pulse') === entry.level).slice(0, 7),
    best,
  };
}

export function loadAttempts(): number {
  return read<number>(K_ATTEMPTS, 0);
}

export function bumpAttempts(): number {
  const n = loadAttempts() + 1;
  write(K_ATTEMPTS, n);
  return n;
}

export function loadMuted(): boolean {
  return read<boolean>(K_MUTED, false);
}

export function saveMuted(m: boolean) {
  write(K_MUTED, m);
}

export function loadLevel(fallback: string): string {
  return read<string>(K_LEVEL, fallback);
}

export function saveLevel(id: string) {
  write(K_LEVEL, id);
}
