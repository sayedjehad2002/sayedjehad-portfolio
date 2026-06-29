// Global wind vector. One coherent drifting direction + breathing gusts, so
// grass, leaves, clouds and particles all sway together instead of each
// hardcoding its own oscillation. Mutates a shared module object (no per-frame
// allocation). `strength` is a 0..~1 multiplier; callers scale their own range.

export interface Wind {
  x: number; // unit-ish heading x
  y: number; // unit-ish heading y (kept mostly horizontal for a breezy feel)
  strength: number; // 0..~1, breathes with slow gusts
}

const shared: Wind = { x: 1, y: 0.15, strength: 0.45 };

export function computeWind(t: number, base: number, out: Wind = shared): Wind {
  // Heading drifts slowly so the world never feels mechanical.
  const dir = Math.sin(t * 0.05) * 0.5 + 0.35;
  out.x = Math.cos(dir);
  out.y = Math.sin(dir) * 0.4; // dampened vertical → wind reads as a side breeze
  // Two detuned sines = gusts that rise and fall without an obvious loop.
  const gust = 0.55 + 0.45 * Math.sin(t * 0.13) * Math.sin(t * 0.37 + 1.3);
  out.strength = Math.max(0, base * gust);
  return out;
}
