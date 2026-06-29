// Dolphins: jumping arcs driven purely by the animation clock. PURE LOGIC ONLY
// (no imports from React / palette / render). Each dolphin has a fixed period +
// phase, so the schedule is deterministic and allocation-free; the sea draw reads
// the per-frame view via dolphinState() (writing into a reused out object) and
// paints the silhouette + splash. Most of each cycle is underwater (inactive);
// only a brief window near the end is the visible arc.

export interface Dolphin {
  x0: number; // launch x (world)
  dir: 1 | -1; // jump heading
  span: number; // horizontal travel across the arc
  period: number; // seconds between jumps
  phase: number; // 0..1 cycle offset (desync)
  size: number; // silhouette scale
}

export interface DolphinView {
  active: boolean; // true only during the brief arc out of the water
  x: number;
  y: number;
  angle: number; // body tilt along the arc tangent (radians)
  u: number; // 0 launch .. 1 re-entry
}

// Waterline the dolphins break through (world y). Just above the cottage roof ridge
// (y=32) so the arc reads in the open-water horizon band behind the house.
export const SEA_WATERLINE = 30;
const ARC_H = 24; // peak height above the waterline
const JUMP_DUR = 1.7; // seconds the arc is visible

function frac(v: number): number {
  const f = v - Math.floor(v);
  return f < 0 ? f + 1 : f;
}

// Balanced cadence: a synchronized pair on one schedule + a solo on another, so a
// jump lands roughly every ~12-18s and is sometimes a pair.
export const DOLPHINS: readonly Dolphin[] = [
  { x0: 196, dir: 1, span: 34, period: 16, phase: 0.08, size: 1.15 },
  { x0: 214, dir: 1, span: 34, period: 16, phase: 0.105, size: 1.0 }, // pair partner (a touch behind + smaller)
  { x0: 332, dir: -1, span: 30, period: 12.5, phase: 0.55, size: 1.15 },
];

// Writes the dolphin's current arc state into `out` (no allocation). When the
// dolphin is underwater, out.active is false and the other fields are left at 0.
export function dolphinState(d: Dolphin, t: number, out: DolphinView): DolphinView {
  const local = frac(t / d.period + d.phase);
  const jf = JUMP_DUR / d.period; // fraction of the cycle spent airborne
  const start = 1 - jf;
  if (local < start) {
    out.active = false;
    out.x = 0;
    out.y = 0;
    out.angle = 0;
    out.u = 0;
    return out;
  }
  const u = (local - start) / jf; // 0..1 across the arc
  out.active = true;
  out.u = u;
  out.x = d.x0 + d.dir * d.span * u;
  out.y = SEA_WATERLINE - Math.sin(u * Math.PI) * ARC_H;
  // arc tangent -> body tilt (screen y grows downward, so dy is the y-derivative)
  const dx = d.dir * d.span;
  const dy = -ARC_H * Math.PI * Math.cos(u * Math.PI);
  out.angle = Math.atan2(dy, dx);
  return out;
}
