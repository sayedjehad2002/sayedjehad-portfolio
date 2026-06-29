import { describe, it, expect } from 'vitest';
import {
  createState,
  startRound,
  comboTier,
  shoot,
  update,
  DIFFS,
  ROUND_SECONDS,
  BASE_PER_HIT,
  AIM_ASSIST,
  type GameState,
  type Difficulty,
} from './aimtrainer';

// Place a single active target at (x,y,r) so shoot()'s scoring is deterministic.
function placeTarget(s: GameState, x: number, y: number, r: number, born = 0): void {
  for (const t of s.targets) t.active = false;
  const t = s.targets[0];
  t.active = true;
  t.x = x;
  t.y = y;
  t.r = r;
  t.born = born;
  t.colorIdx = 0;
}

describe('aimtrainer — difficulty table', () => {
  it('exposes easy/medium/hard with sane, monotonic-ish progression', () => {
    expect(Object.keys(DIFFS).sort()).toEqual(['easy', 'hard', 'medium']);
    // harder = more concurrent targets, smaller radii, shorter lifetime, faster drift
    expect(DIFFS.easy.concurrent).toBeLessThan(DIFFS.hard.concurrent);
    expect(DIFFS.hard.rMax).toBeLessThan(DIFFS.easy.rMax);
    expect(DIFFS.hard.lifetimeSec).toBeLessThan(DIFFS.easy.lifetimeSec);
    expect(DIFFS.easy.driftPxSec).toBe(0);
    expect(DIFFS.hard.driftPxSec).toBeGreaterThan(DIFFS.medium.driftPxSec);
  });
});

describe('aimtrainer — comboTier', () => {
  it('starts at tier 1 and steps up every 5 combo, capped at 4', () => {
    expect(comboTier(0)).toBe(1);
    expect(comboTier(4)).toBe(1);
    expect(comboTier(5)).toBe(2);
    expect(comboTier(10)).toBe(3);
    expect(comboTier(15)).toBe(4);
    expect(comboTier(100)).toBe(4); // hard cap
  });
});

describe('aimtrainer — createState / startRound', () => {
  it('createState seeds a menu state with full pools and zeroed stats', () => {
    const s = createState();
    expect(s.phase).toBe('menu');
    expect(s.score).toBe(0);
    expect(s.combo).toBe(0);
    expect(s.timeLeft).toBe(ROUND_SECONDS);
    expect(s.targets.length).toBeGreaterThan(0);
    expect(s.targets.every((t) => !t.active)).toBe(true);
  });

  it('startRound resets stats, stores best, and enters countdown', () => {
    const s = createState();
    s.score = 999;
    s.combo = 7;
    startRound(s, 'hard', 4200);
    expect(s.phase).toBe('countdown');
    expect(s.difficulty).toBe('hard');
    expect(s.best).toBe(4200);
    expect(s.score).toBe(0);
    expect(s.combo).toBe(0);
    expect(s.timeLeft).toBe(ROUND_SECONDS);
    expect(s.countdown).toBe(3);
    expect(s.now).toBe(0);
    expect(s.targets.every((t) => !t.active)).toBe(true);
  });
});

describe('aimtrainer — shoot scoring + combo', () => {
  function playing(diff: Difficulty = 'easy'): GameState {
    const s = createState();
    startRound(s, diff, 0);
    s.phase = 'playing';
    s.fireCd = 0;
    return s;
  }

  it('does nothing when not in the playing phase', () => {
    const s = createState(); // 'menu'
    placeTarget(s, 100, 100, 12);
    shoot(s, 100, 100);
    expect(s.shots).toBe(0);
    expect(s.targets[0].active).toBe(true);
  });

  it('a hit pops the target, increments combo, and awards >= base points', () => {
    const s = playing();
    s.now = 5; // a slow reaction so no big speed bonus, but base + tier still applies
    placeTarget(s, 100, 100, 12, /*born*/ 4.9);
    shoot(s, 100, 100);
    expect(s.targets[0].active).toBe(false);
    expect(s.hits).toBe(1);
    expect(s.shots).toBe(1);
    expect(s.combo).toBe(1);
    expect(s.bestCombo).toBe(1);
    expect(s.score).toBeGreaterThanOrEqual(BASE_PER_HIT); // tier 1, minimal speed bonus
  });

  it('an instant reaction (now == born) earns the full speed bonus', () => {
    const s = playing();
    s.now = 0;
    placeTarget(s, 60, 60, 12, /*born*/ 0); // reaction == 0 → full bonus
    shoot(s, 60, 60);
    // tier 1: BASE_PER_HIT + SPEED_BONUS_MAX(150) = 250
    expect(s.score).toBe(250);
  });

  it('a miss (empty click) resets the combo and counts a shot but no hit', () => {
    const s = playing();
    s.combo = 6;
    s.now = 1;
    // no target near the click point
    placeTarget(s, 10, 10, 4);
    shoot(s, 300, 200);
    expect(s.combo).toBe(0);
    expect(s.shots).toBe(1);
    expect(s.hits).toBe(0);
  });

  it('aim assist lets a near-miss within (r + AIM_ASSIST) still connect', () => {
    const s = playing();
    s.now = 1;
    const r = 10;
    placeTarget(s, 100, 100, r, 1);
    // click just outside r but inside r + AIM_ASSIST
    shoot(s, 100 + r + AIM_ASSIST - 1, 100);
    expect(s.hits).toBe(1);
    expect(s.targets[0].active).toBe(false);
  });

  it('fire cooldown blocks a second immediate shot', () => {
    const s = playing();
    s.now = 1;
    placeTarget(s, 100, 100, 12, 1);
    shoot(s, 100, 100); // sets fireCd > 0
    const shotsAfterFirst = s.shots;
    shoot(s, 100, 100); // blocked by cooldown
    expect(s.shots).toBe(shotsAfterFirst);
  });

  it('higher combo tier multiplies the score (tier 2 > tier 1 for the same shot)', () => {
    const base = playing();
    base.now = 0;
    placeTarget(base, 80, 80, 12, 0);
    shoot(base, 80, 80); // combo 1 → tier 1 → 250
    const tier1 = base.score;

    const hi = playing();
    hi.combo = 5; // next hit becomes combo 6 → tier 2
    hi.now = 0;
    placeTarget(hi, 80, 80, 12, 0);
    shoot(hi, 80, 80);
    expect(hi.score).toBeGreaterThan(tier1);
    expect(hi.score).toBe(tier1 * 2); // (100+150) * 2
  });
});

describe('aimtrainer — update lifecycle', () => {
  it('countdown ticks down and transitions to playing at 0', () => {
    const s = createState();
    startRound(s, 'easy', 0);
    expect(s.phase).toBe('countdown');
    update(s, 3.1); // run the whole countdown out
    expect(s.phase).toBe('playing');
  });

  it('playing fills the field up to the difficulty concurrent count', () => {
    const s = createState();
    startRound(s, 'easy', 0);
    s.phase = 'playing';
    update(s, 0.016);
    const active = s.targets.filter((t) => t.active).length;
    expect(active).toBe(DIFFS.easy.concurrent);
  });

  it('time running out ends the round (gameover) and banks a new best', () => {
    const s = createState();
    startRound(s, 'easy', 0);
    s.phase = 'playing';
    s.timeLeft = 0.01;
    s.score = 1234;
    update(s, 0.5);
    expect(s.phase).toBe('gameover');
    expect(s.timeLeft).toBe(0);
    expect(s.best).toBe(1234);
    expect(s.newBest).toBe(true);
  });

  it('an expired target breaks the combo', () => {
    const s = createState();
    startRound(s, 'easy', 0);
    s.phase = 'playing';
    s.combo = 4;
    // one target about to expire, freeze the others
    s.targets[0].active = true;
    s.targets[0].life = 0.001;
    update(s, 0.05);
    expect(s.combo).toBe(0);
    expect(s.expired).toBeGreaterThanOrEqual(1);
  });
});
