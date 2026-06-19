// "Sayed's Arcade" — pure, framework-agnostic gridshot logic (no React, no DOM).
// Aimlabs-style: a fixed number of circular targets are always alive; the player
// snap-aims a crosshair and fires to pop them within a time-attack round. Faster
// reaction and longer combos score more. Fixed object pools, zero per-frame
// allocation. Audio (blip/chime) self-gates on mute.
import { blip, chime } from '../../engine/audio';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type Phase = 'menu' | 'countdown' | 'playing' | 'gameover';

export const LOGICAL_W = 320;
export const LOGICAL_H = 240;
export const ROUND_SECONDS = 30;
export const BASE_PER_HIT = 100;
const SPEED_BONUS_MAX = 150;
const SPEED_FULL_BY = 0.9; // a hit faster than this (seconds) earns the full speed bonus

// Sayed stands here and fires a zap toward each click ("Sayed shoots").
export const SAYED_X = LOGICAL_W / 2;
export const SAYED_Y = LOGICAL_H - 16;

// Playfield safe box: targets never overlap the top HUD band or Sayed's zone.
const PAD = 6;
const HUD_BOTTOM = 28;
const SAYED_TOP = 196;
const GAP = 6; // min spacing between target edges
export const AIM_ASSIST = 3; // desktop click forgiveness (added to target radius)
const CROSS_GUARD = 10; // do not spawn a target right under the crosshair
const FIRE_CD = 0.06; // anti-autofire throttle (held Space / dragged finger)

const TARGET_POOL = 12;
const FLOATER_POOL = 12;
const BURST_POOL = 10;
const PARTICLE_POOL = 32;

// 8 unit directions for shard bursts (avoids per-shard trig).
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
  concurrent: number;
  rMin: number;
  rMax: number;
  lifetimeSec: number;
  driftPxSec: number;
}
export const DIFFS: Record<Difficulty, DiffParams> = {
  easy: { concurrent: 3, rMin: 13, rMax: 17, lifetimeSec: 2.6, driftPxSec: 0 },
  medium: { concurrent: 4, rMin: 9, rMax: 13, lifetimeSec: 1.9, driftPxSec: 18 },
  hard: { concurrent: 5, rMin: 6, rMax: 9, lifetimeSec: 1.35, driftPxSec: 40 },
};

export interface Target {
  active: boolean;
  x: number;
  y: number;
  r: number;
  life: number;
  lifeMax: number;
  born: number;
  colorIdx: number;
  pop: number; // 0..1 spawn scale-in (visual only; hit test always uses full r)
  vx: number;
  vy: number;
}
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
  t: number; // 1..0
  r: number;
  colorIdx: number;
}
export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  colorIdx: number;
}

export interface GameState {
  phase: Phase;
  difficulty: Difficulty;
  reduced: boolean; // disables drift (presentation flag set by the host)
  touchAssist: number; // extra hit radius for coarse pointers
  score: number;
  combo: number;
  bestCombo: number;
  timeLeft: number;
  countdown: number;
  now: number; // monotonic round clock (accumulates only while playing) for reaction timing
  targets: Target[];
  floaters: Floater[];
  bursts: Burst[];
  particles: Particle[];
  cross: { x: number; y: number };
  aim: number;
  fireCd: number;
  zap: { t: number; x: number; y: number };
  shake: number;
  hits: number;
  shots: number;
  expired: number;
  reactSum: number;
  reactCount: number;
  best: number;
  newBest: boolean;
  lastColorIdx: number;
}

export function createState(): GameState {
  return {
    phase: 'menu',
    difficulty: 'medium',
    reduced: false,
    touchAssist: 0,
    score: 0,
    combo: 0,
    bestCombo: 0,
    timeLeft: ROUND_SECONDS,
    countdown: 3,
    now: 0,
    targets: Array.from({ length: TARGET_POOL }, () => ({ active: false, x: 0, y: 0, r: 10, life: 0, lifeMax: 1, born: 0, colorIdx: 0, pop: 0, vx: 0, vy: 0 })),
    floaters: Array.from({ length: FLOATER_POOL }, () => ({ active: false, x: 0, y: 0, t: 0, text: '' })),
    bursts: Array.from({ length: BURST_POOL }, () => ({ active: false, x: 0, y: 0, t: 0, r: 0, colorIdx: 0 })),
    particles: Array.from({ length: PARTICLE_POOL }, () => ({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, colorIdx: 0 })),
    cross: { x: LOGICAL_W / 2, y: LOGICAL_H / 2 },
    aim: -Math.PI / 2,
    fireCd: 0,
    zap: { t: 0, x: 0, y: 0 },
    shake: 0,
    hits: 0,
    shots: 0,
    expired: 0,
    reactSum: 0,
    reactCount: 0,
    best: 0,
    newBest: false,
    lastColorIdx: -1,
  };
}

export function startRound(s: GameState, diff: Difficulty, best: number): void {
  s.difficulty = diff;
  s.best = best;
  s.newBest = false;
  s.score = 0;
  s.combo = 0;
  s.bestCombo = 0;
  s.hits = 0;
  s.shots = 0;
  s.expired = 0;
  s.reactSum = 0;
  s.reactCount = 0;
  s.timeLeft = ROUND_SECONDS;
  s.countdown = 3;
  s.now = 0;
  s.fireCd = 0;
  s.shake = 0;
  s.zap.t = 0;
  s.lastColorIdx = -1;
  for (const tg of s.targets) tg.active = false;
  for (const f of s.floaters) f.active = false;
  for (const b of s.bursts) b.active = false;
  for (const p of s.particles) p.active = false;
  s.phase = 'countdown';
}

export function comboTier(combo: number): number {
  return Math.min(4, 1 + Math.floor(combo / 5));
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

function spawnBurst(s: GameState, x: number, y: number, r: number, colorIdx: number): void {
  for (const b of s.bursts) {
    if (!b.active) {
      b.active = true;
      b.x = x;
      b.y = y;
      b.t = 1;
      b.r = r;
      b.colorIdx = colorIdx;
      return;
    }
  }
}

function spawnShards(s: GameState, x: number, y: number, colorIdx: number): void {
  let made = 0;
  for (const p of s.particles) {
    if (p.active) continue;
    const d = DIR8[made % DIR8.length];
    const sp = 44 + Math.random() * 52;
    p.active = true;
    p.x = x;
    p.y = y;
    p.vx = d[0] * sp + (Math.random() * 16 - 8);
    p.vy = d[1] * sp + (Math.random() * 16 - 8);
    p.life = 0.35;
    p.maxLife = 0.35;
    p.colorIdx = colorIdx;
    made++;
    if (made >= 6) return;
  }
}

function spawnTarget(s: GameState): boolean {
  let tg: Target | null = null;
  for (const t of s.targets) {
    if (!t.active) {
      tg = t;
      break;
    }
  }
  if (!tg) return false;
  const d = DIFFS[s.difficulty];
  const r = d.rMin + Math.random() * (d.rMax - d.rMin);
  const xMin = PAD + r;
  const xMax = LOGICAL_W - PAD - r;
  const yMin = HUD_BOTTOM + r;
  const yMax = SAYED_TOP - r;
  let px = (xMin + xMax) / 2;
  let py = (yMin + yMax) / 2;
  // reject-sample for spacing + crosshair guard, relaxing if the box is crowded
  for (let attempt = 0; attempt < 32; attempt++) {
    const relaxed = attempt >= 24;
    const x = xMin + Math.random() * (xMax - xMin);
    const y = yMin + Math.random() * (yMax - yMin);
    let ok = true;
    if (!relaxed) {
      const cdx = x - s.cross.x;
      const cdy = y - s.cross.y;
      if (cdx * cdx + cdy * cdy < (r + CROSS_GUARD) * (r + CROSS_GUARD)) ok = false;
    }
    if (ok) {
      const gap = relaxed ? 0 : GAP;
      for (const o of s.targets) {
        if (!o.active || o === tg) continue;
        const dx = x - o.x;
        const dy = y - o.y;
        const min = r + o.r + gap;
        if (dx * dx + dy * dy < min * min) {
          ok = false;
          break;
        }
      }
    }
    px = x;
    py = y;
    if (ok) break;
  }
  tg.active = true;
  tg.x = px;
  tg.y = py;
  tg.r = r;
  tg.life = d.lifetimeSec;
  tg.lifeMax = d.lifetimeSec;
  tg.born = s.now;
  tg.pop = 0;
  // avoid two identical colours in a row
  let ci = Math.floor(Math.random() * 3);
  if (ci === s.lastColorIdx) ci = (ci + 1) % 3;
  tg.colorIdx = ci;
  s.lastColorIdx = ci;
  if (d.driftPxSec > 0 && !s.reduced) {
    const a = Math.random() * Math.PI * 2;
    tg.vx = Math.cos(a) * d.driftPxSec;
    tg.vy = Math.sin(a) * d.driftPxSec;
  } else {
    tg.vx = 0;
    tg.vy = 0;
  }
  return true;
}

export function update(s: GameState, dt: number): void {
  // Sayed's gadget tracks the crosshair in every phase
  const aimTarget = Math.atan2(s.cross.y - SAYED_Y, s.cross.x - SAYED_X);
  let da = aimTarget - s.aim;
  while (da > Math.PI) da -= Math.PI * 2;
  while (da < -Math.PI) da += Math.PI * 2;
  s.aim += da * Math.min(1, dt * 14);

  if (s.shake > 0) s.shake = Math.max(0, s.shake - dt * 4);
  if (s.fireCd > 0) s.fireCd -= dt;
  if (s.zap.t > 0) s.zap.t = Math.max(0, s.zap.t - dt * 5);

  for (const f of s.floaters) {
    if (!f.active) continue;
    f.t -= dt;
    f.y -= dt * 20;
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
  if (s.phase !== 'playing') return;

  s.now += dt;
  s.timeLeft -= dt;
  if (s.timeLeft <= 0) {
    // end the round here, before this frame's expiry/refill, so no doomed final wave spawns
    s.timeLeft = 0;
    s.phase = 'gameover';
    if (s.score > s.best) {
      s.best = s.score;
      s.newBest = true;
    }
    chime();
    return;
  }

  for (const tg of s.targets) {
    if (!tg.active) continue;
    if (tg.pop < 1) tg.pop = Math.min(1, tg.pop + dt / 0.12);
    tg.life -= dt;
    if (tg.vx !== 0 || tg.vy !== 0) {
      tg.x += tg.vx * dt;
      tg.y += tg.vy * dt;
      const xMin = PAD + tg.r;
      const xMax = LOGICAL_W - PAD - tg.r;
      const yMin = HUD_BOTTOM + tg.r;
      const yMax = SAYED_TOP - tg.r;
      if (tg.x < xMin) {
        tg.x = xMin;
        tg.vx = -tg.vx;
      } else if (tg.x > xMax) {
        tg.x = xMax;
        tg.vx = -tg.vx;
      }
      if (tg.y < yMin) {
        tg.y = yMin;
        tg.vy = -tg.vy;
      } else if (tg.y > yMax) {
        tg.y = yMax;
        tg.vy = -tg.vy;
      }
    }
    if (tg.life <= 0) {
      tg.active = false;
      s.expired++;
      s.combo = 0;
      blip(150);
    }
  }

  // keep the field full
  const concurrent = DIFFS[s.difficulty].concurrent;
  let activeCount = 0;
  for (const tg of s.targets) if (tg.active) activeCount++;
  while (activeCount < concurrent) {
    if (!spawnTarget(s)) break;
    activeCount++;
  }
}

// Fire at a logical point. Pops the nearest target within (r + assist); a single
// fire clears at most one target. An empty click breaks the combo.
export function shoot(s: GameState, x: number, y: number): void {
  if (s.phase !== 'playing' || s.fireCd > 0) return;
  s.fireCd = FIRE_CD;
  s.shots++;
  s.zap.t = 1;
  s.zap.x = x;
  s.zap.y = y;
  const assist = AIM_ASSIST + s.touchAssist;
  let best: Target | null = null;
  let bestD = Infinity;
  for (const tg of s.targets) {
    if (!tg.active) continue;
    const dx = tg.x - x;
    const dy = tg.y - y;
    const d2 = dx * dx + dy * dy;
    const reach = tg.r + assist;
    if (d2 <= reach * reach && d2 < bestD) {
      best = tg;
      bestD = d2;
    }
  }
  if (best) {
    best.active = false;
    s.hits++;
    s.combo++;
    if (s.combo > s.bestCombo) s.bestCombo = s.combo;
    const reaction = Math.max(0, s.now - best.born);
    s.reactSum += reaction;
    s.reactCount++;
    const tier = comboTier(s.combo);
    let bonusFrac = 1 - reaction / SPEED_FULL_BY;
    if (bonusFrac < 0) bonusFrac = 0;
    else if (bonusFrac > 1) bonusFrac = 1;
    const speedBonus = Math.round(SPEED_BONUS_MAX * bonusFrac);
    const pts = Math.round((BASE_PER_HIT + speedBonus) * tier);
    s.score += pts;
    s.shake = Math.min(1, s.shake + 0.35);
    spawnBurst(s, best.x, best.y, best.r, best.colorIdx);
    if (!s.reduced) spawnShards(s, best.x, best.y, best.colorIdx);
    freeFloater(s, best.x, best.y - 6, '+' + pts);
    blip(680 + tier * 90);
  } else {
    s.combo = 0;
    blip(190);
  }
}
