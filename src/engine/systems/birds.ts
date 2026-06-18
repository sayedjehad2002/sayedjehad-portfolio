// Birds: a small flock that perches, hops, flies to a feed spot, feeds, and returns.
// PURE LOGIC ONLY — imports nothing from React, palette, plaza, or render. Math only.

export type BirdPhase = 'perched' | 'flying' | 'feeding' | 'returning';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Bird {
  phase: BirdPhase;
  t: number;
  dur: number;
  home: Vec2;
  feed: Vec2;
  x: number;
  y: number;
  from: Vec2;
  to: Vec2;
  ctrl: Vec2;
  lift: number;
  flap: number;
  facing: 1 | -1;
  bob: number;
  hopT: number;
  nextHopAt: number;
  tone: 0 | 1 | 2;
  seed: number;
  chirp?: boolean; // transient: set true on takeoff so the engine seam can play a chirp
}

export interface BirdsState {
  birds: Bird[];
  feed: Vec2;
}

export interface CreateBirdsOpts {
  count?: number;
  perches: Vec2[];
  feed: Vec2;
  seed?: number;
  reduced?: boolean;
}

export const BIRD_TUNING = {
  FLY_SPEED: 46,
  PERCH_DWELL: [4.5, 9.0],
  FEED_DWELL: [2.8, 5.5],
  FLAP_HZ_FLY: 9.0,
  BOB_HZ: 1.4,
  HOP_TIME: 0.26,
  HOP_RISE: 2.0,
  ARC_HEIGHT: 26,
  STAGGER_MAX: 3.2,
  TAU: Math.PI * 2,
  ALT_MAX: 14,
} as const;

const {
  FLY_SPEED,
  PERCH_DWELL,
  FEED_DWELL,
  FLAP_HZ_FLY,
  BOB_HZ,
  HOP_TIME,
  HOP_RISE,
  ARC_HEIGHT,
  STAGGER_MAX,
  TAU,
} = BIRD_TUNING;

// --- pure helpers ---
function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function easeInOutQuad(p: number): number {
  return p < 0.5 ? 2 * p * p : 1 - ((-2 * p + 2) ** 2) / 2;
}

function bezier2(a: Vec2, c: Vec2, b: Vec2, t: number): Vec2 {
  const u = 1 - t;
  const w0 = u * u;
  const w1 = 2 * u * t;
  const w2 = t * t;
  return {
    x: w0 * a.x + w1 * c.x + w2 * b.x,
    y: w0 * a.y + w1 * c.y + w2 * b.y,
  };
}

// 0 at the ends of the flight, ramps to ~1 in the middle.
function liftEnvelope(p: number): number {
  const up = clamp(p / 0.25, 0, 1);
  const down = clamp((1 - p) / 0.25, 0, 1);
  return easeInOutQuad(Math.min(up, down));
}

// Local LCG (numerical-recipes constants) returning a generator in [0,1).
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function rand(range: readonly [number, number], rng: () => number): number {
  const [lo, hi] = range;
  return lo + rng() * (hi - lo);
}

// Keep a value in [0,1) deterministically (so per-cycle dwell stays pure).
function frac(v: number): number {
  const f = v - Math.floor(v);
  return f < 0 ? f + 1 : f;
}

function perchDur(b: Bird): number {
  return PERCH_DWELL[0] + frac(b.seed * 9301 + 49297) * (PERCH_DWELL[1] - PERCH_DWELL[0]);
}

function feedDur(b: Bird): number {
  return FEED_DWELL[0] + frac(b.seed * 49297 + 9301) * (FEED_DWELL[1] - FEED_DWELL[0]);
}

export function hopOffset(b: Bird): number {
  return b.hopT < 0 ? 0 : Math.sin((b.hopT / HOP_TIME) * Math.PI) * HOP_RISE;
}

export function createBirds(opts: CreateBirdsOpts): BirdsState {
  const rng = lcg(opts.seed ?? 20260618);
  const count = Math.min(opts.count ?? 3, opts.perches.length);
  const birds: Bird[] = [];

  for (let i = 0; i < count; i++) {
    const home: Vec2 = { x: opts.perches[i].x, y: opts.perches[i].y };
    const feed: Vec2 = {
      x: opts.feed.x + (rng() * 12 - 6),
      y: opts.feed.y + (rng() * 8 - 4),
    };
    const tone = (i % 3) as 0 | 1 | 2;
    const bird: Bird = {
      phase: 'perched',
      t: 0,
      dur: rand(PERCH_DWELL, rng),
      home,
      feed,
      x: home.x,
      y: home.y,
      from: home,
      to: home,
      ctrl: home,
      lift: 0,
      flap: 0,
      facing: feed.x < home.x ? -1 : 1,
      bob: rng() * TAU,
      hopT: -1,
      nextHopAt: 1.6 + rng() * 1.6,
      tone,
      seed: rng(),
    };
    if (!opts.reduced) bird.t = rng() * STAGGER_MAX; // desync the flock
    birds.push(bird);
  }

  return { birds, feed: opts.feed };
}

function startFlight(b: Bird, from: Vec2, to: Vec2, next: BirdPhase): void {
  b.from = { x: from.x, y: from.y };
  b.to = { x: to.x, y: to.y };
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  b.ctrl = { x: mid.x, y: mid.y - ARC_HEIGHT };
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  b.dur = clamp((dist * 1.15) / FLY_SPEED, 0.7, 2.4);
  b.phase = next;
  b.t = 0;
  b.facing = to.x >= from.x ? 1 : -1;
}

function maybeHop(b: Bird): void {
  if (b.hopT < 0 && b.t >= b.nextHopAt) {
    b.hopT = 0;
    b.nextHopAt = b.t + 1.4 + b.seed * 1.6;
  }
}

export function updateBirds(state: BirdsState, dt: number, reduced: boolean): void {
  if (reduced) {
    for (const b of state.birds) {
      b.phase = 'perched';
      b.lift = 0;
      b.flap = 0;
      b.x = b.home.x;
      b.y = b.home.y;
      b.hopT = -1;
    }
    return;
  }

  for (const b of state.birds) {
    b.t += dt;
    b.bob += dt * BOB_HZ * TAU;
    if (b.hopT >= 0) {
      b.hopT += dt;
      if (b.hopT > HOP_TIME) b.hopT = -1;
    }

    switch (b.phase) {
      case 'perched': {
        b.lift = 0;
        b.flap = 0;
        maybeHop(b);
        if (b.t >= b.dur) {
          b.chirp = true; // departing the bench: let the engine play a soft chirp
          startFlight(b, b.home, b.feed, 'flying');
        }
        break;
      }
      case 'flying':
      case 'returning': {
        b.flap += dt * FLAP_HZ_FLY * TAU;
        const p = clamp(b.t / b.dur, 0, 1);
        const e = easeInOutQuad(p);
        const pos = bezier2(b.from, b.ctrl, b.to, e);
        b.x = pos.x;
        b.y = pos.y;
        b.lift = liftEnvelope(p);
        b.facing = b.to.x >= b.from.x ? 1 : -1;
        if (p >= 1) {
          b.x = b.to.x;
          b.y = b.to.y;
          b.lift = 0;
          b.flap = 0;
          b.t = 0;
          if (b.phase === 'flying') {
            b.phase = 'feeding';
            b.dur = feedDur(b);
            b.nextHopAt = 0.4;
          } else {
            b.phase = 'perched';
            b.dur = perchDur(b);
            b.nextHopAt = 1.6;
          }
        }
        break;
      }
      case 'feeding': {
        b.lift = 0;
        b.flap = 0;
        maybeHop(b);
        if (b.t >= b.dur) startFlight(b, b.feed, b.home, 'returning');
        break;
      }
    }
  }
}
