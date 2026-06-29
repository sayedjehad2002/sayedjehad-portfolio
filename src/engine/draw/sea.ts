import { palette as P } from '../../theme/palette';
import { R, softShadow, staticLayer, type StaticLayerCtx, type Viewport } from '../render';
import { DOLPHINS, dolphinState, SEA_WATERLINE, type Dolphin, type DolphinView } from '../systems/dolphins';

// The sea behind the cottage. The walkable courtyard (paving + lawns) starts at
// y=150 and is sealed off, so this whole band (world y 0..150, minus the cottage
// footprint which draws on top) is a decorative, non-walkable coastline:
//  - buildSea: a baked static base (depth gradient + ripple texture + a sandy foam
//    shore at the courtyard edge + a sandy doorstep so the sea never reaches the
//    doorway). One drawImage per frame.
//  - drawSea: the static base, then per-frame life (wave shimmer, fish schools,
//    dolphin jumps + splashes, horizon gulls). Day/night tint is applied globally
//    later, so the water cools to moonlight automatically; motion is gated on the
//    `ocean` setting + reduced-motion, so it falls back to a calm static sea.

const SEA_W = 480;
const SEA_H = 150; // shoreline meets the courtyard paving at y=150
const SHORE_Y = 141; // top of the sandy beach strip
const SAND = { x0: 196, x1: 284 }; // sandy doorstep so no "sea through the doorway"

// deterministic per-location rng so the baked texture + pools never shimmer
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ---- baked static base ------------------------------------------------------
function buildSea(s: StaticLayerCtx): void {
  const ctx = s.ctx;
  // vertical depth gradient: deepest at the far horizon (top), lightening to a warm
  // shallow toward the shore.
  const g = ctx.createLinearGradient(0, 0, 0, SHORE_Y);
  g.addColorStop(0, P.sea.deep);
  g.addColorStop(0.55, P.sea.mid);
  g.addColorStop(1, P.sea.shallow);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SEA_W, SHORE_Y);

  // faint static ripple courses (long, low-contrast dashes) for water texture
  const rng = lcg(515123);
  for (let y = 6; y < SHORE_Y - 6; y += 5) {
    const lit = ((y / 5) | 0) % 2 === 0;
    ctx.fillStyle = lit ? 'rgba(234,246,243,0.05)' : 'rgba(10,40,50,0.08)';
    let x = -(rng() * 40);
    while (x < SEA_W) {
      const w = 6 + rng() * 16;
      ctx.fillRect(Math.round(x), y, Math.round(w), 1);
      x += w + 8 + rng() * 22;
    }
  }

  // sandy beach strip + foam line where the sea meets the courtyard
  ctx.fillStyle = P.sea.sand;
  ctx.fillRect(0, SHORE_Y, SEA_W, SEA_H - SHORE_Y);
  ctx.fillStyle = P.sea.sandSh;
  ctx.fillRect(0, SEA_H - 2, SEA_W, 2);
  // wet-sand + foam band right at the waterline
  ctx.fillStyle = 'rgba(234,246,243,0.55)';
  ctx.fillRect(0, SHORE_Y, SEA_W, 1);
  const fr = lcg(99173);
  ctx.fillStyle = P.sea.foam;
  for (let x = 0; x < SEA_W; ) {
    const w = 3 + fr() * 7;
    if (fr() > 0.4) ctx.fillRect(Math.round(x), SHORE_Y - 1, Math.round(w), 1);
    x += w + 2 + fr() * 5;
  }

  // sandy entry apron filling the door gap from just under the roofline down to the
  // threshold, so the open doorway reads as a sandy alcove (never water above/at the
  // door). The facade overdraws the sides; only the x212..268 gap stays sand.
  const apronTop = 56;
  ctx.fillStyle = P.sea.sand;
  ctx.fillRect(SAND.x0, apronTop, SAND.x1 - SAND.x0, SEA_H - apronTop);
  ctx.fillStyle = P.sea.sandSh;
  ctx.fillRect(SAND.x0, apronTop, SAND.x1 - SAND.x0, 1);
}

// ---- per-frame pools (built once) -------------------------------------------
interface Fish {
  x: number;
  y: number;
  sp: number;
  phase: number;
  size: number;
  gold: boolean;
}
const fish: Fish[] = (() => {
  const r = lcg(73219);
  return Array.from({ length: 11 }, () => ({
    x: r() * SEA_W,
    y: 7 + r() * 21, // the open-water band above the roof (always visible)
    sp: (r() < 0.5 ? -1 : 1) * (5 + r() * 7),
    phase: r() * Math.PI * 2,
    size: r() < 0.25 ? 2 : 1,
    gold: r() < 0.18,
  }));
})();

interface Shimmer {
  x: number;
  y: number;
  w: number;
  phase: number;
  sp: number;
}
const shimmer: Shimmer[] = (() => {
  const r = lcg(40610);
  return Array.from({ length: 9 }, () => ({
    x: r() * SEA_W,
    y: 6 + r() * 22,
    w: 4 + r() * 7,
    phase: r() * Math.PI * 2,
    sp: 0.3 + r() * 0.5,
  }));
})();

const dview: DolphinView = { active: false, x: 0, y: 0, angle: 0, u: 0 };

// ---- draw -------------------------------------------------------------------
export function drawSea(vp: Viewport): void {
  staticLayer(vp, 'plaza:sea', SEA_W, SEA_H, buildSea);

  const env = vp.env;
  const live = (env ? env.oceanEnabled : true) && !vp.reduced;
  if (!live) return; // calm static sea (reduced-motion or toggled off)

  const ctx = vp.ctx;
  const t = vp.t;
  const wind = env?.wind;
  const windX = wind ? wind.x * wind.strength : 0.4;
  const night = env ? Math.max(0, Math.min(1, 1 - env.sun.up * 2.2)) : 0;
  const dayGull = env ? Math.max(0, Math.min(1, (env.sun.up - 0.05) / 0.2)) : 1; // gulls fly by day

  // wave shimmer: drifting light dashes on the open water
  ctx.save();
  ctx.fillStyle = P.sea.foam;
  for (const s of shimmer) {
    s.x += (s.sp + windX * 1.4) * 0.18;
    if (s.x > SEA_W + 4) s.x -= SEA_W + 8;
    const a = 0.065 + 0.06 * (0.5 + 0.5 * Math.sin(t * 1.1 + s.phase));
    ctx.globalAlpha = a;
    ctx.fillRect(Math.round(s.x), s.y, Math.round(s.w), 1);
  }
  ctx.restore();

  // fish schools: tiny darting shapes just under the surface
  const fishCol = night > 0.5 ? '#9FD0CE' : P.sea.fish;
  for (const f of fish) {
    f.x += (f.sp + windX * 2) * 0.016;
    if (f.x > SEA_W + 6) f.x -= SEA_W + 12;
    else if (f.x < -6) f.x += SEA_W + 12;
    const yy = Math.round(f.y + Math.sin(t * 1.6 + f.phase) * 1.2);
    const dir = f.sp >= 0 ? 1 : -1;
    const col = f.gold ? P.sea.fishGold : fishCol;
    R(ctx, Math.round(f.x), yy, f.size, f.size, col); // body
    R(ctx, Math.round(f.x - dir * f.size), yy, 1, f.size, col); // tail
  }

  // dolphins: deterministic jumps + splash rings at launch / re-entry
  for (const d of DOLPHINS) {
    dolphinState(d, t, dview);
    if (!dview.active) continue;
    drawDolphin(ctx, d, dview);
  }

  // horizon gulls: two distant "M" silhouettes drifting across the sky band
  if (dayGull > 0.02) {
    drawGull(ctx, t, 0, dayGull);
    drawGull(ctx, t, 1, dayGull);
  }
}

function drawDolphin(ctx: CanvasRenderingContext2D, d: Dolphin, v: DolphinView): void {
  // splash rings at the waterline on the way out and back in
  const entryX = d.x0 + d.dir * d.span;
  if (v.u < 0.16) splash(ctx, d.x0, v.u / 0.16);
  if (v.u > 0.84) splash(ctx, entryX, (1 - v.u) / 0.16);

  // contact ripple shadow on the water when low in the arc
  const low = Math.max(0, 1 - Math.sin(v.u * Math.PI)); // 1 near the surface, 0 at apex
  if (low > 0.2) {
    ctx.save();
    ctx.globalAlpha = 0.18 * low;
    softShadow(ctx, v.x, SEA_WATERLINE + 1, 6 * d.size, 'rgba(8,40,48,1)');
    ctx.restore();
  }

  ctx.save();
  ctx.translate(v.x, v.y);
  ctx.rotate(v.angle);
  ctx.scale(d.size, d.size);
  // body (nose at +x)
  ctx.fillStyle = P.sea.dolphin;
  ellipse(ctx, 0, 0, 6, 2.4);
  // pale belly
  ctx.fillStyle = P.sea.belly;
  ellipse(ctx, -0.5, 1, 4.6, 1.2);
  // lit back
  ctx.fillStyle = P.sea.dolphinHi;
  ellipse(ctx, 0.5, -1, 4.2, 0.9);
  // tail flukes
  ctx.fillStyle = P.sea.dolphin;
  tri(ctx, -6, 0, -9, -2.4, -9, 2.4);
  // dorsal fin
  tri(ctx, 0, -2, -2.4, -2, -1.4, -4.6);
  // beak + eye
  ctx.fillStyle = P.sea.dolphin;
  ctx.fillRect(5, -0.6, 3, 1.3);
  ctx.fillStyle = '#10222A';
  ctx.fillRect(3, -1, 1, 1);
  ctx.restore();
}

function splash(ctx: CanvasRenderingContext2D, x: number, k: number): void {
  // k: 0 at the instant of contact, 1 at the edge of the splash window
  ctx.save();
  ctx.strokeStyle = P.sea.foam;
  ctx.lineWidth = 1;
  // a double ring so the splash reads as a satisfying burst of foam
  ctx.globalAlpha = (1 - k) * 0.7;
  ring(ctx, x, 2 + k * 8);
  ctx.globalAlpha = (1 - k) * 0.4;
  ring(ctx, x, 1 + k * 4.5);
  // droplets flicking up on first contact
  if (k < 0.55) {
    ctx.fillStyle = P.sea.foam;
    ctx.globalAlpha = (0.55 - k) * 1.3;
    ctx.fillRect(Math.round(x - 2), Math.round(SEA_WATERLINE - 2 - k * 4), 1, 1);
    ctx.fillRect(Math.round(x + 2), Math.round(SEA_WATERLINE - 1 - k * 5), 1, 1);
    ctx.fillRect(Math.round(x), Math.round(SEA_WATERLINE - 3 - k * 6), 1, 1);
  }
  ctx.restore();
}

function ring(ctx: CanvasRenderingContext2D, x: number, rr: number): void {
  ctx.beginPath();
  ctx.ellipse(x, SEA_WATERLINE, rr, rr * 0.4, 0, 0, Math.PI * 2);
  ctx.stroke();
}

// distant seagull: a small flapping "M" silhouette drifting slowly across the band
function drawGull(ctx: CanvasRenderingContext2D, t: number, i: number, fade: number): void {
  const speed = 7 + i * 2;
  const x = (((t * speed + i * 260) % (SEA_W + 40)) - 20);
  const y = 8 + i * 7 + Math.sin(t * 0.5 + i) * 2;
  const flap = Math.sin(t * 5 + i * 1.7) * 1.4; // wing rise/fall
  ctx.save();
  ctx.globalAlpha = 0.6 * fade;
  ctx.strokeStyle = '#E8EEF0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 3, y + flap);
  ctx.lineTo(x, y - 1);
  ctx.lineTo(x + 3, y + flap);
  ctx.stroke();
  ctx.restore();
}

// small filled ellipse / triangle helpers (rotation-friendly, used only for the
// few active dolphins per frame)
function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}
function tri(ctx: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number, cx: number, cy: number): void {
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.lineTo(cx, cy);
  ctx.closePath();
  ctx.fill();
}
