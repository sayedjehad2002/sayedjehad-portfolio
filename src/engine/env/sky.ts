import { palette as P } from '../../theme/palette';
import { R, type Viewport } from '../render';

// ---------------------------------------------------------------------------
// Sky lighting for the TOP-DOWN plaza. We do NOT draw sun/moon/cloud discs on
// the playfield (in a top-down view they look pasted-on). Time of day reads
// through LIGHT instead:
//  - drawSky: the backdrop fill, recoloured by time (shows only in letterbox).
//  - drawDayNightTint: one screen-space colour grade over the world.
//  - drawLightWash: a soft directional glow that sweeps in from the sun's side
//    by day and turns to cool moonlight by night, so the light source is FELT,
//    never a stuck orb. Drawn under the HUD; bright additive lights still punch
//    through. Cheap (one cached radial gradient + translate).
// ---------------------------------------------------------------------------

// The backdrop BEHIND the world is the open SEA. This fills the whole visible
// backdrop (the band above the cottage + any letterbox margin) with deep water so
// there is never a gap; the detailed near-shore water, shoreline and sea life are
// baked / drawn by draw/sea.ts over the world band on top of this. Day/night is
// applied by the screen-space tint, so this base layer is static (cools to
// moonlit blue automatically at night).
export function drawSky(vp: Viewport, x0: number, y0: number, x1: number, y1: number): void {
  R(vp.ctx, x0, y0, x1 - x0, y1 - y0, P.sea.deep);
}

export function drawDayNightTint(vp: Viewport): void {
  const env = vp.env;
  if (!env || !env.enabled || env.tint.a <= 0.001) return;
  const ctx = vp.ctx;
  ctx.save();
  ctx.globalAlpha = Math.min(0.5, env.tint.a); // readability cap: never fully black
  ctx.fillStyle = `rgb(${env.tint.r},${env.tint.g},${env.tint.b})`;
  ctx.fillRect(0, 0, vp.vw, vp.vh);
  ctx.restore();
}

// --- Directional light wash (the sun/moon, felt not seen) -------------------
// Two fixed soft gradients (warm sun, cool moon) reused via translate; their
// orange/cool grading comes from the day/night tint, so colour is fixed here and
// the cache key is just kind + rounded radius (a handful of buckets, no churn).
const washCache = new Map<string, CanvasGradient>();
function washGrad(ctx: CanvasRenderingContext2D, kind: 'sun' | 'moon', r: number): CanvasGradient {
  const k = kind + Math.round(r / 40); // coarse radius buckets
  let g = washCache.get(k);
  if (!g) {
    g = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(1, r));
    if (kind === 'sun') {
      g.addColorStop(0, 'rgba(255,238,202,0.95)');
      g.addColorStop(0.5, 'rgba(255,216,150,0.3)');
    } else {
      g.addColorStop(0, 'rgba(190,212,255,0.7)');
      g.addColorStop(0.5, 'rgba(150,180,235,0.22)');
    }
    g.addColorStop(1, 'rgba(0,0,0,0)');
    washCache.set(k, g);
  }
  return g;
}

export function drawLightWash(vp: Viewport): void {
  const env = vp.env;
  if (!env || !env.enabled) return;
  const ctx = vp.ctx;
  const sun = env.sun.up;
  const moon = env.moon.up;
  let up: number;
  let sx: number;
  let kind: 'sun' | 'moon';
  if (sun > 0.02) {
    up = sun;
    sx = env.sun.x;
    kind = 'sun';
  } else if (moon > 0.02) {
    up = moon;
    sx = env.moon.x;
    kind = 'moon';
  } else {
    return;
  }
  // Anchor toward the light's side of the screen, just above the top edge; rides
  // higher (more overhead) when the sun is high, lower at dawn/dusk.
  const cx = vp.vw * (0.12 + 0.76 * sx);
  const cy = vp.vh * (0.02 + (1 - up) * 0.16);
  // tighter radius → the glow falls off toward the far side, so the light clearly
  // "comes from" the sun's direction instead of an even all-over wash.
  const r = Math.max(vp.vw, vp.vh) * (0.72 + 0.26 * up);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(cx, cy);
  // a broad directional wash + a softer concentrated pool nearer the source
  ctx.globalAlpha = (kind === 'sun' ? 0.2 : 0.14) * up;
  ctx.fillStyle = washGrad(ctx, kind, r);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = (kind === 'sun' ? 0.14 : 0.09) * up;
  ctx.fillStyle = washGrad(ctx, kind, r * 0.34);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
