import { describe, it, expect } from 'vitest';
import {
  createState,
  startRound,
  turn,
  togglePause,
  update,
  cellPx,
  cellPy,
  DIFFS,
  CELL,
  GRID_Y,
  COLS,
  ROWS,
  CAP,
  type GameState,
} from './depsnake';

// Drive exactly one logical tick by feeding update() the tick duration.
function oneTick(s: GameState): void {
  update(s, s.tickSec + 1e-6);
}

// Read the head cell from the ring buffer.
function head(s: GameState): { x: number; y: number } {
  return { x: s.bodyX[s.headIdx], y: s.bodyY[s.headIdx] };
}

describe('depsnake — constants + cell math', () => {
  it('grid constants are coherent (CAP = COLS * ROWS)', () => {
    expect(CAP).toBe(COLS * ROWS);
    expect(COLS).toBeGreaterThan(0);
    expect(ROWS).toBeGreaterThan(0);
  });

  it('cellPx / cellPy map grid cells to pixels (with HUD y offset)', () => {
    expect(cellPx(0)).toBe(0);
    expect(cellPx(3)).toBe(3 * CELL);
    expect(cellPy(0)).toBe(GRID_Y);
    expect(cellPy(2)).toBe(GRID_Y + 2 * CELL);
  });
});

describe('depsnake — difficulty table', () => {
  it('harder = faster tick, shorter floor, longer start length', () => {
    expect(Object.keys(DIFFS).sort()).toEqual(['easy', 'hard', 'medium']);
    expect(DIFFS.hard.tickMs).toBeLessThan(DIFFS.easy.tickMs);
    expect(DIFFS.hard.tickFloorMs).toBeLessThan(DIFFS.easy.tickFloorMs);
    expect(DIFFS.hard.startLen).toBeGreaterThanOrEqual(DIFFS.easy.startLen);
    // ramp step is a negative number (speeds up over time)
    expect(DIFFS.medium.rampStepMs).toBeLessThan(0);
  });
});

describe('depsnake — startRound', () => {
  it('lays out the snake horizontally with the right length and enters countdown', () => {
    const s = createState();
    startRound(s, 'medium', 700);
    expect(s.phase).toBe('countdown');
    expect(s.difficulty).toBe('medium');
    expect(s.best).toBe(700);
    expect(s.length).toBe(DIFFS.medium.startLen);
    expect(s.score).toBe(0);
    expect(s.packages).toBe(0);
    // head occupies one cell; the body length matches the difficulty start length
    let occupied = 0;
    for (let i = 0; i < CAP; i++) occupied += s.occ[i];
    expect(occupied).toBe(DIFFS.medium.startLen);
    // initial heading is rightward
    expect(s.dirX).toBe(1);
    expect(s.dirY).toBe(0);
  });

  it('places food on a free cell (not under the snake)', () => {
    const s = createState();
    startRound(s, 'easy', 0);
    const foodCell = s.foodY * COLS + s.foodX;
    expect(s.occ[foodCell]).toBe(0);
  });
});

describe('depsnake — turn (direction queue + reverse guard)', () => {
  function playing(): GameState {
    const s = createState();
    startRound(s, 'easy', 0);
    s.phase = 'playing';
    return s;
  }

  it('queues a perpendicular turn', () => {
    const s = playing();
    turn(s, 0, 1); // down
    expect(s.nextDirX).toBe(0);
    expect(s.nextDirY).toBe(1);
  });

  it('ignores a 180-degree reverse against the current heading', () => {
    const s = playing(); // moving right (dirX 1)
    turn(s, -1, 0); // reverse — must be rejected
    expect(s.nextDirX).toBe(1);
    expect(s.nextDirY).toBe(0);
  });

  it('does nothing when not playing or when paused', () => {
    const s = createState();
    startRound(s, 'easy', 0); // still 'countdown'
    turn(s, 0, 1);
    expect(s.nextDirY).toBe(0);

    s.phase = 'playing';
    s.paused = true;
    turn(s, 0, 1);
    expect(s.nextDirY).toBe(0);
  });
});

describe('depsnake — togglePause', () => {
  it('toggles only while playing', () => {
    const s = createState();
    startRound(s, 'easy', 0);
    s.phase = 'playing';
    togglePause(s);
    expect(s.paused).toBe(true);
    togglePause(s);
    expect(s.paused).toBe(false);
  });

  it('is a no-op outside the playing phase', () => {
    const s = createState();
    startRound(s, 'easy', 0); // 'countdown'
    togglePause(s);
    expect(s.paused).toBe(false);
  });
});

describe('depsnake — update / stepTick transitions', () => {
  it('countdown elapses into the playing phase', () => {
    const s = createState();
    startRound(s, 'easy', 0);
    update(s, 3.1);
    expect(s.phase).toBe('playing');
  });

  it('moves the head one cell per tick in the current direction', () => {
    const s = createState();
    startRound(s, 'easy', 0);
    s.phase = 'playing';
    const before = head(s);
    oneTick(s);
    const after = head(s);
    expect(after.x).toBe(before.x + 1); // moving right
    expect(after.y).toBe(before.y);
  });

  it('hitting a wall ends the round with cause "wall"', () => {
    const s = createState();
    startRound(s, 'easy', 0);
    s.phase = 'playing';
    // aim the head at the right wall and keep ticking
    s.dirX = 1;
    s.dirY = 0;
    s.nextDirX = 1;
    s.nextDirY = 0;
    // move food out of the path so we don't grow / spawn into the head
    s.foodX = 0;
    s.foodY = 0;
    for (let i = 0; i < COLS + 2 && s.phase === 'playing'; i++) oneTick(s);
    expect(s.phase).toBe('gameover');
    expect(s.cause).toBe('wall');
  });

  it('running into your own body is a CIRCULAR DEPENDENCY (cause "self")', () => {
    const s = createState();
    startRound(s, 'hard', 0); // start length 5 — long enough to curl back
    s.phase = 'playing';
    // Move food away so eating never interferes with the loop.
    s.foodX = COLS - 1;
    s.foodY = ROWS - 1;
    // U-turn into the body: right (current) → down → left → up loops onto the neck.
    oneTick(s); // step right once so there's body behind to crash into
    turn(s, 0, 1);
    oneTick(s); // down
    turn(s, -1, 0);
    oneTick(s); // left
    turn(s, 0, -1);
    oneTick(s); // up → collides with own body
    expect(s.phase).toBe('gameover');
    expect(s.cause).toBe('self');
  });

  it('eating food grows the snake, scores points, and relocates the food', () => {
    const s = createState();
    startRound(s, 'easy', 0);
    s.phase = 'playing';
    const h = head(s);
    // drop food directly ahead of the head
    s.foodX = h.x + 1;
    s.foodY = h.y;
    const lenBefore = s.length;
    const scoreBefore = s.score;
    oneTick(s); // eat
    expect(s.packages).toBe(1);
    expect(s.score).toBeGreaterThan(scoreBefore);
    // growth is deferred over the next ticks (growLeft), so length is >= before
    expect(s.length).toBeGreaterThanOrEqual(lenBefore);
    expect(s.growLeft + (s.length - lenBefore)).toBeGreaterThan(0);
    // food moved off the just-eaten cell
    expect(s.foodX === h.x + 1 && s.foodY === h.y).toBe(false);
  });

  it('a paused playing game does not advance ticks', () => {
    const s = createState();
    startRound(s, 'easy', 0);
    s.phase = 'playing';
    s.paused = true;
    const before = head(s);
    oneTick(s);
    const after = head(s);
    expect(after).toEqual(before);
  });

  it('caps the per-call tick backlog (max 4 steps) and resets the accumulator', () => {
    const s = createState();
    startRound(s, 'easy', 0);
    s.phase = 'playing';
    s.foodX = ROWS - 1; // keep food clear of the straight path
    s.foodY = 0;
    const startX = head(s).x;
    update(s, s.tickSec * 50); // huge dt — would be 50 ticks without the clamp
    if (s.phase === 'playing') {
      expect(head(s).x - startX).toBeLessThanOrEqual(4);
      expect(s.acc).toBe(0);
    } else {
      // ran into the wall within the 4 capped steps — also acceptable
      expect(s.cause).toBe('wall');
    }
  });
});
