import type { Rect, Vec } from '../types';

// A small "feet" box at the base of a sprite — only the feet collide, so heads
// can overlap walls/props for a natural top-down look.
export function feet(e: Vec): Rect {
  return { x: e.x - 6, y: e.y - 6, w: 12, h: 6 };
}

export function hit(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Per-axis resolution so the player slides along walls instead of sticking.
export function moveX(e: Vec, dx: number, solids: Rect[]): void {
  e.x += dx;
  const b = feet(e);
  for (const s of solids) {
    if (hit(b, s)) {
      if (dx > 0) e.x = s.x - 6;
      else if (dx < 0) e.x = s.x + s.w + 6;
      b.x = e.x - 6;
    }
  }
}

export function moveY(e: Vec, dy: number, solids: Rect[]): void {
  e.y += dy;
  const b = feet(e);
  for (const s of solids) {
    if (hit(b, s)) {
      if (dy > 0) e.y = s.y;
      else if (dy < 0) e.y = s.y + s.h + 6;
      b.y = e.y - 6;
    }
  }
}
