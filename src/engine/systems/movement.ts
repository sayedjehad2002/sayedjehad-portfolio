import type { Entity, Vec } from '../types';

export const MAX_SPEED = 108; // px/s
const ACCEL_TAU = 0.04; // accel time constant: reaches ~90% of target speed in ~92ms (snappy, still smooth)

export function normalize(x: number, y: number): Vec {
  const len = Math.hypot(x, y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: x / len, y: y / len };
}

// Smoothly accelerate velocity toward the input target for a responsive-yet-
// polished feel (reaches ~90% of target in ~92ms, eases to a stop on release).
export function steer(e: Entity, axis: Vec, dt: number): void {
  const dir = normalize(axis.x, axis.y);
  const tx = dir.x * MAX_SPEED;
  const ty = dir.y * MAX_SPEED;
  const k = 1 - Math.exp(-dt / ACCEL_TAU);
  e.vx += (tx - e.vx) * k;
  e.vy += (ty - e.vy) * k;
  if (Math.abs(e.vx) < 1.5) e.vx = 0;
  if (Math.abs(e.vy) < 1.5) e.vy = 0;
  e.moving = Math.hypot(e.vx, e.vy) > 6;

  if (axis.x !== 0 || axis.y !== 0) {
    if (Math.abs(axis.x) > Math.abs(axis.y)) e.dir = axis.x > 0 ? 'right' : 'left';
    else e.dir = axis.y > 0 ? 'down' : 'up';
  }
}

// Advance the 2-frame walk cycle.
export function stepWalk(e: Entity, dt: number): void {
  if (e.moving) {
    e.anim += dt * 9;
    if (e.anim > 1) {
      e.anim = 0;
      e.frame ^= 1;
    }
  } else {
    e.frame = 0;
    e.anim = 0;
  }
}
