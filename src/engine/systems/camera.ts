import type { Vec } from '../types';

// Camera follow time constant (seconds). Lower = snappier lock-on to the player,
// higher = lazier drift. ~0.12s reads responsive but still cozy-smooth. The
// formula below (1 - e^(-dt/TAU)) is exact and frame-rate independent, so the
// feel is identical at 60Hz, 120Hz or 144Hz.
const FOLLOW_TAU = 0.12;

// Follow `target`, clamp to world bounds (or centre if the world is smaller than
// the viewport), with exponential smoothing that is frame-rate independent.
export function followClamp(
  cam: Vec,
  target: Vec,
  worldW: number,
  worldH: number,
  viewW: number,
  viewH: number,
  dt: number,
): void {
  const tx = target.x - viewW / 2;
  const ty = target.y - viewH / 2;
  const maxX = Math.max(0, worldW - viewW);
  const maxY = Math.max(0, worldH - viewH);
  const cx = worldW < viewW ? (worldW - viewW) / 2 : Math.max(0, Math.min(maxX, tx));
  const cy = worldH < viewH ? (worldH - viewH) / 2 : Math.max(0, Math.min(maxY, ty));
  const k = 1 - Math.exp(-dt / FOLLOW_TAU);
  cam.x += (cx - cam.x) * k;
  cam.y += (cy - cam.y) * k;
}

export function snapClamp(
  cam: Vec,
  target: Vec,
  worldW: number,
  worldH: number,
  viewW: number,
  viewH: number,
): void {
  const maxX = Math.max(0, worldW - viewW);
  const maxY = Math.max(0, worldH - viewH);
  cam.x = worldW < viewW ? (worldW - viewW) / 2 : Math.max(0, Math.min(maxX, target.x - viewW / 2));
  cam.y = worldH < viewH ? (worldH - viewH) / 2 : Math.max(0, Math.min(maxY, target.y - viewH / 2));
}
