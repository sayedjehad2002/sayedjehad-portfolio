import { R, softShadow, type Viewport } from '../render';
import { hopOffset, BIRD_TUNING, type BirdsState, type Bird } from '../systems/birds';

// Harmonized to the wood/teal/golden palette: sparrow / robin / one teal-accent finch.
const TONES = [
  { body: '#8A5E38', belly: '#C4925A', wing: '#5A3A22', beak: '#E0843C', eye: '#241A10' },
  { body: '#7A4E2A', belly: '#E0843C', wing: '#5A3A22', beak: '#FFCF6E', eye: '#241A10' },
  { body: '#1FA89C', belly: '#C4925A', wing: '#14756C', beak: '#FFCF6E', eye: '#241A10' },
] as const;

export function drawBirds(vp: Viewport, state: BirdsState): void {
  const order = [...state.birds].sort((a, b) => a.y - b.y);
  for (const b of order) drawBird(vp, b);
}

export function drawBird(vp: Viewport, b: Bird): void {
  const ctx = vp.ctx;
  const t = TONES[b.tone];
  const hop = hopOffset(b);
  const altY = b.lift * BIRD_TUNING.ALT_MAX;
  const gx = Math.round(b.x);
  const gy = Math.round(b.y);
  const bx = gx;
  const by = Math.round(gy - altY - hop);
  const f = b.facing;

  // Soft blob shadow on the ground — shrinks and fades as the bird gains altitude.
  const sr = Math.max(1.4, 4 * (1 - 0.6 * b.lift));
  const sCol = b.lift > 0.02 ? 'rgba(60,40,20,0.16)' : 'rgba(60,40,20,0.30)';
  softShadow(ctx, gx, gy + 1, sr, sCol);

  // Gentle head bob while grounded.
  const hb =
    !vp.reduced && (b.phase === 'perched' || b.phase === 'feeding')
      ? Math.round(Math.sin(b.bob) * 0.5)
      : 0;

  // Body (authored facing-right; mirror horizontally via f).
  R(ctx, bx - 4 * f, by, 2, 2, t.wing); // tail
  R(ctx, bx - 2, by - 1, 5, 4, t.body); // body
  R(ctx, bx - 1, by + 1, 4, 2, t.belly); // belly
  R(ctx, bx + 1 * f, by - 3 + hb, 3, 3, t.body); // head
  R(ctx, bx + 1 * f, by - 4 + hb, 3, 1, t.wing); // crown
  R(ctx, bx + 3 * f, by - 2 + hb, 2, 1, t.beak); // beak
  R(ctx, bx + 2 * f, by - 3 + hb, 1, 1, t.eye); // eye

  // Wings: folded when still/reduced, otherwise flap up/down with the cycle.
  if (b.flap === 0 || vp.reduced) {
    R(ctx, bx - 1, by, 4, 2, t.wing);
  } else {
    const up = Math.sin(b.flap) > 0;
    if (up) {
      R(ctx, bx - 2, by - 2, 2, 1, t.wing);
      R(ctx, bx + 2, by - 2, 2, 1, t.wing);
    } else {
      R(ctx, bx - 3, by + 1, 3, 1, t.wing);
      R(ctx, bx + 2, by + 1, 3, 1, t.wing);
    }
  }
}
