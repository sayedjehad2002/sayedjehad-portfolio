// "DEPENDENCY DASH" — a dev-themed Snake. You are an import chain swallowing npm
// packages; the walls are the module's edges; running into yourself is a CIRCULAR
// DEPENDENCY. Pure, framework-agnostic, zero per-frame allocation: the body is a
// fixed Int16Array ring buffer + a Uint8Array occupancy grid, advanced O(1) per tick.
import { blip, chime } from '../../engine/audio';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type Phase = 'menu' | 'countdown' | 'playing' | 'gameover';
export type DeathCause = 'self' | 'wall' | 'overflow' | 'clear';

export const LOGICAL_W = 320;
export const LOGICAL_H = 240;
export const CELL = 10;
export const COLS = 24;
export const ROWS = 16;
export const GRID_Y = 16; // top 16px is the HUD band
export const CAP = COLS * ROWS; // 384
const FRESH_TICKS = 28; // window to keep a "fresh" streak going

const FLOATER_POOL = 10;
const BURST_POOL = 8;
const PARTICLE_POOL = 24;

const DIR8 = [
  [1, 0],
  [0.7071, 0.7071],
  [0, 1],
  [-0.7071, 0.7071],
  [-1, 0],
  [-0.7071, -0.7071],
  [0, -1],
  [0.7071, -0.7071],
];

interface DiffParams {
  tickMs: number;
  grow: number;
  rampEvery: number;
  rampStepMs: number; // negative
  tickFloorMs: number;
  startLen: number;
}
export const DIFFS: Record<Difficulty, DiffParams> = {
  easy: { tickMs: 150, grow: 3, rampEvery: 5, rampStepMs: -6, tickFloorMs: 95, startLen: 3 },
  medium: { tickMs: 115, grow: 3, rampEvery: 4, rampStepMs: -7, tickFloorMs: 75, startLen: 4 },
  hard: { tickMs: 90, grow: 4, rampEvery: 3, rampStepMs: -8, tickFloorMs: 58, startLen: 5 },
};

export interface Floater {
  active: boolean;
  x: number;
  y: number;
  t: number;
  text: string;
}
export interface Burst {
  active: boolean;
  x: number;
  y: number;
  t: number;
}
export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

export interface GameState {
  phase: Phase;
  difficulty: Difficulty;
  reduced: boolean;
  paused: boolean;
  bodyX: Int16Array;
  bodyY: Int16Array;
  occ: Uint8Array;
  headIdx: number;
  length: number;
  dirX: number;
  dirY: number;
  nextDirX: number;
  nextDirY: number;
  growLeft: number;
  foodX: number;
  foodY: number;
  tickSec: number;
  tickFloorSec: number;
  rampStepSec: number;
  rampEvery: number;
  grow: number;
  acc: number;
  countdown: number;
  score: number;
  packages: number;
  streak: number;
  bestStreak: number;
  freshLeft: number;
  totalTicks: number;
  shake: number;
  cause: DeathCause | null;
  best: number;
  newBest: boolean;
  floaters: Floater[];
  bursts: Burst[];
  particles: Particle[];
}

export const cellPx = (cx: number): number => cx * CELL;
export const cellPy = (cy: number): number => GRID_Y + cy * CELL;

export function createState(): GameState {
  return {
    phase: 'menu',
    difficulty: 'medium',
    reduced: false,
    paused: false,
    bodyX: new Int16Array(CAP),
    bodyY: new Int16Array(CAP),
    occ: new Uint8Array(CAP),
    headIdx: 0,
    length: 0,
    dirX: 1,
    dirY: 0,
    nextDirX: 1,
    nextDirY: 0,
    growLeft: 0,
    foodX: 0,
    foodY: 0,
    tickSec: 0.12,
    tickFloorSec: 0.06,
    rampStepSec: -0.006,
    rampEvery: 4,
    grow: 3,
    acc: 0,
    countdown: 3,
    score: 0,
    packages: 0,
    streak: 0,
    bestStreak: 0,
    freshLeft: 0,
    totalTicks: 0,
    shake: 0,
    cause: null,
    best: 0,
    newBest: false,
    floaters: Array.from({ length: FLOATER_POOL }, () => ({ active: false, x: 0, y: 0, t: 0, text: '' })),
    bursts: Array.from({ length: BURST_POOL }, () => ({ active: false, x: 0, y: 0, t: 0 })),
    particles: Array.from({ length: PARTICLE_POOL }, () => ({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1 })),
  };
}

export function startRound(s: GameState, diff: Difficulty, best: number): void {
  const d = DIFFS[diff];
  s.difficulty = diff;
  s.best = best;
  s.newBest = false;
  s.score = 0;
  s.packages = 0;
  s.streak = 0;
  s.bestStreak = 0;
  s.freshLeft = 0;
  s.totalTicks = 0;
  s.cause = null;
  s.shake = 0;
  s.paused = false;
  s.acc = 0;
  s.tickSec = d.tickMs / 1000;
  s.tickFloorSec = d.tickFloorMs / 1000;
  s.rampStepSec = d.rampStepMs / 1000;
  s.rampEvery = d.rampEvery;
  s.grow = d.grow;
  s.occ.fill(0);
  s.dirX = 1;
  s.dirY = 0;
  s.nextDirX = 1;
  s.nextDirY = 0;
  s.growLeft = 0;
  const cy = ROWS >> 1;
  const headX = COLS >> 1;
  s.length = d.startLen;
  for (let i = 0; i < d.startLen; i++) {
    const cx = headX - (d.startLen - 1 - i);
    s.bodyX[i] = cx;
    s.bodyY[i] = cy;
    s.occ[cy * COLS + cx] = 1;
  }
  s.headIdx = d.startLen - 1;
  for (const f of s.floaters) f.active = false;
  for (const b of s.bursts) b.active = false;
  for (const p of s.particles) p.active = false;
  spawnFood(s);
  s.countdown = 3;
  s.phase = 'countdown';
}

// Queue a direction. A 180-degree reverse vs the CURRENT moving direction is ignored,
// so key-mashing can never fold the snake back into itself in a single tick.
export function turn(s: GameState, dx: number, dy: number): void {
  if (s.phase !== 'playing' || s.paused) return;
  if (dx === -s.dirX && dy === -s.dirY) return;
  s.nextDirX = dx;
  s.nextDirY = dy;
}

export function togglePause(s: GameState): void {
  if (s.phase !== 'playing') return;
  s.paused = !s.paused;
}

function spawnFood(s: GameState): void {
  for (let a = 0; a < 40; a++) {
    const cx = Math.floor(Math.random() * COLS);
    const cy = Math.floor(Math.random() * ROWS);
    if (!s.occ[cy * COLS + cx]) {
      s.foodX = cx;
      s.foodY = cy;
      return;
    }
  }
  for (let cell = 0; cell < CAP; cell++) {
    if (!s.occ[cell]) {
      s.foodX = cell % COLS;
      s.foodY = (cell / COLS) | 0;
      return;
    }
  }
  // no free cell: a perfect fill -> clean build
  die(s, 'clear');
}

function die(s: GameState, cause: DeathCause): void {
  s.phase = 'gameover';
  s.cause = cause;
  if (s.score > s.best) {
    s.best = s.score;
    s.newBest = true;
  }
  blip(150);
  chime();
}

function freeFloater(s: GameState, x: number, y: number, text: string): void {
  for (const f of s.floaters) {
    if (!f.active) {
      f.active = true;
      f.x = x;
      f.y = y;
      f.t = 0.8;
      f.text = text;
      return;
    }
  }
}
function spawnBurst(s: GameState, x: number, y: number): void {
  for (const b of s.bursts) {
    if (!b.active) {
      b.active = true;
      b.x = x;
      b.y = y;
      b.t = 1;
      return;
    }
  }
}
function spawnShards(s: GameState, x: number, y: number): void {
  let made = 0;
  for (const p of s.particles) {
    if (p.active) continue;
    const d = DIR8[made % DIR8.length];
    const sp = 40 + Math.random() * 50;
    p.active = true;
    p.x = x;
    p.y = y;
    p.vx = d[0] * sp;
    p.vy = d[1] * sp;
    p.life = 0.35;
    p.maxLife = 0.35;
    made++;
    if (made >= 6) return;
  }
}

function onEat(s: GameState, nx: number, ny: number): void {
  s.packages++;
  const fresh = s.freshLeft > 0;
  s.streak = fresh ? s.streak + 1 : 1;
  if (s.streak > s.bestStreak) s.bestStreak = s.streak;
  const pts = 50 + Math.floor(s.length / 4) * 5 + (fresh ? 25 : 0);
  s.score += pts;
  s.freshLeft = FRESH_TICKS;
  if (s.packages % s.rampEvery === 0) s.tickSec = Math.max(s.tickFloorSec, s.tickSec + s.rampStepSec);
  spawnFood(s);
  const cx = cellPx(nx) + CELL / 2;
  const cy = cellPy(ny) + CELL / 2;
  freeFloater(s, cx, cy - 4, '+' + pts);
  if (!s.reduced) spawnBurst(s, cx, cy);
  if (!s.reduced) spawnShards(s, cx, cy);
  s.shake = Math.min(1, s.shake + 0.3);
  blip(540 + Math.min(s.streak, 8) * 40);
}

function stepTick(s: GameState): void {
  s.dirX = s.nextDirX;
  s.dirY = s.nextDirY;
  const hx = s.bodyX[s.headIdx];
  const hy = s.bodyY[s.headIdx];
  const nx = hx + s.dirX;
  const ny = hy + s.dirY;
  if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) {
    die(s, 'wall');
    return;
  }
  const eating = nx === s.foodX && ny === s.foodY;
  if (eating) s.growLeft += s.grow;
  const removeTail = s.growLeft === 0;
  if (removeTail) {
    const tailIdx = ((s.headIdx - s.length + 1) % CAP + CAP) % CAP;
    s.occ[s.bodyY[tailIdx] * COLS + s.bodyX[tailIdx]] = 0;
  }
  const newCell = ny * COLS + nx;
  if (s.occ[newCell]) {
    die(s, 'self');
    return;
  }
  s.headIdx = (s.headIdx + 1) % CAP;
  s.bodyX[s.headIdx] = nx;
  s.bodyY[s.headIdx] = ny;
  s.occ[newCell] = 1;
  if (!removeTail) {
    s.length++;
    if (s.growLeft > 0) s.growLeft--;
  }
  s.totalTicks++;
  if (s.freshLeft > 0) s.freshLeft--;
  if (eating) onEat(s, nx, ny);
  if (s.phase === 'playing' && s.length >= CAP) die(s, 'clear');
}

export function update(s: GameState, dt: number): void {
  if (s.phase === 'countdown') {
    const prev = Math.ceil(s.countdown);
    s.countdown -= dt;
    const now = Math.ceil(s.countdown);
    if (now !== prev && now >= 1) blip(440);
    if (s.countdown <= 0) {
      s.phase = 'playing';
      blip(660);
    }
    return;
  }
  if (s.phase === 'playing' && s.paused) return;

  if (s.shake > 0) s.shake = Math.max(0, s.shake - dt * 4);
  for (const f of s.floaters) {
    if (!f.active) continue;
    f.t -= dt;
    if (!s.reduced) f.y -= dt * 16; // under reduced-motion the '+pts' fades in place, no drift
    if (f.t <= 0) f.active = false;
  }
  for (const b of s.bursts) {
    if (!b.active) continue;
    b.t -= dt * 4;
    if (b.t <= 0) b.active = false;
  }
  for (const p of s.particles) {
    if (!p.active) continue;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 120 * dt;
    p.life -= dt;
    if (p.life <= 0) p.active = false;
  }

  if (s.phase !== 'playing') return;

  s.acc += dt;
  let steps = 0;
  while (s.acc >= s.tickSec && steps < 4) {
    stepTick(s);
    s.acc -= s.tickSec;
    steps++;
    if (s.phase !== 'playing') break;
  }
  if (steps >= 4) s.acc = 0; // drop a backlog from a tab restore
}
