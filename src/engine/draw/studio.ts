import { palette as P } from '../../theme/palette';
import { R, softShadow, pix, type Viewport } from '../render';
import type { Entity } from '../types';
import { drawRecruiter } from './sprites';

// ---------------------------------------------------------------------------
// Cozy, warm, Moonlighter-inspired interior "portfolio room".
// Two clean zones with no walls between them:
//   • PROJECTS zone (top band y36..150): 4 glowing project easels on a platform
//   • RESUME zone   (lower band):        teal rug + writing desk + "career wall"
//     corkboard with RESERVED frame slots for your real company logos.
// Interactable coords are unchanged (studio scene) — only the art changes here.
// ---------------------------------------------------------------------------

interface Mote {
  x: number;
  y: number;
  a: number;
}
const motes: Mote[] = Array.from({ length: 9 }, (_, i) => ({ x: 40 + ((i * 53) % 380), y: 40 + ((i * 71) % 280), a: i }));

// PERF: cache additive glow gradients (interactable pools, window, easel screens).
// Their shape is fixed per source, so build once and reuse (only globalAlpha varies),
// avoiding a createRadialGradient allocation per source per frame.
const gradCache = new Map<string, CanvasGradient>();
// Fixed attract-screen target offsets (relative to the CRT origin); hoisted so the
// cabinet attract loop allocates no per-frame array.
const ATTRACT_SLOT_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [3, 3],
  [10, 2],
  [15, 8],
];

// Additive warm light pool / interactable glow.
function pool(vp: Viewport, x: number, y: number, r: number, color: string, alpha: number): void {
  if (vp.reduced) alpha *= 0.7;
  const ctx = vp.ctx;
  // PERF: quantize the (often animated, e.g. r = 30 + Math.sin(t)) radius so the cache key
  // saturates instead of missing every frame. Without this, createRadialGradient runs every
  // frame and gradCache grows unbounded. Use rr for the key, the gradient, AND the arc so the
  // gradient stops (fractions of their own radius) line up with the filled disc.
  const rr = Math.round(r);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.max(0, alpha);
  const key = 'p' + x + ',' + y + ',' + rr + ',' + color;
  let g = gradCache.get(key);
  if (!g) {
    g = ctx.createRadialGradient(x, y, 0, x, y, rr);
    g.addColorStop(0, color);
    g.addColorStop(0.5, color);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    gradCache.set(key, g);
  }
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, rr, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// A small framed "About / who I am" portrait on a wood easel, so the story (and the
// contact actions inside the About panel) are reachable from the main studio room, not
// only the outdoor plaza. A tertiary indigo glow marks it interactable (same tier as
// the tech shelf / water cooler).
function drawAboutStand(vp: Viewport, x: number, y: number): void {
  const ctx = vp.ctx;
  softShadow(ctx, x, y + 3, 16, P.shadowSoft);
  pool(vp, x, y - 16, vp.reduced ? 22 : 22 + 2 * Math.sin(vp.t * 1.5), P.accent.indigo, 0.13 + (vp.reduced ? 0 : 0.05 * Math.sin(vp.t * 1.5)));
  // easel legs
  R(ctx, x - 9, y - 4, 3, 9, P.wood.dark);
  R(ctx, x + 6, y - 4, 3, 9, P.wood.dark);
  R(ctx, x - 1, y - 3, 3, 8, P.wood.mid);
  // frame
  const fw = 26;
  const fh = 30;
  const fx = x - fw / 2;
  const fy = y - 6 - fh;
  R(ctx, fx - 2, fy - 2, fw + 4, fh + 4, P.wood.mid);
  R(ctx, fx - 2, fy - 2, fw + 4, 2, P.wood.light); // top highlight edge
  R(ctx, fx, fy, fw, fh, '#EDE6F4'); // soft lavender mat
  // bust silhouette (reads as "profile / person")
  ctx.fillStyle = P.accent.indigo;
  ctx.beginPath();
  ctx.arc(x, fy + 12, 5, 0, Math.PI * 2); // head
  ctx.fill();
  R(ctx, fx + 5, fy + 19, fw - 10, 9, P.accent.indigo); // shoulders
  R(ctx, x - 3, fy + 9, 2, 2, 'rgba(255,255,255,0.4)'); // cheek catch-light
  R(ctx, fx + 4, fy + fh - 4, fw - 8, 2, '#C9B8E2'); // little nameplate bar
}

export function drawStudio(vp: Viewport, world: { player: Entity; drinking?: boolean; drinkT?: number }): void {
  const ctx = vp.ctx;
  // warm backdrop (covers any void on extreme aspect ratios)
  const x0 = Math.floor(vp.cam.x) - 40;
  const y0 = Math.floor(vp.cam.y) - 40;
  const x1 = vp.cam.x + vp.vw / vp.zoom + 40;
  const y1 = vp.cam.y + vp.vh / vp.zoom + 40;
  R(ctx, x0, y0, x1 - x0, y1 - y0, '#1a130d');

  drawFloor(ctx);
  drawWindowSpill(vp);
  drawRug(ctx, 150, 196, 170, 100);
  drawPlayRug(ctx, 34, 270, 100, 32); // warm rug grounding the left "Break & Play" cluster (clear of the central desk rug at x150)
  drawDoormat(ctx, 211, 300);
  drawWalls(ctx);
  drawWindow(ctx, 28, 120);

  // warm light pools (additive)
  const t = vp.t;
  pool(vp, 210, 80, 110, P.lamp.glow, 0.1); // projects gallery wash
  pool(vp, 155, 200, 46, P.lamp.warm, 0.16 + (vp.reduced ? 0 : 0.04 * Math.sin(t * 1.1)));
  pool(vp, 235, 256, 28, P.lamp.glow, 0.2 + (vp.reduced ? 0 : 0.06 * Math.sin(t * 2)));
  drawExitLight(ctx, vp);

  // wall decor on the top wall + the non-walkable gallery band (behind the
  // sealed counter), drawn before the counter/easels so they layer on top.
  drawWallDecor(vp);
  drawPlayWall(ctx); // left-wall poster + tiny high-score board marking the Play zone

  // zone props
  drawCounter(ctx, 60, 96, 360);
  // SECONDARY-tier interactable glow behind the career wall (unified vp.t*1.5),
  // drawn first so the corkboard layers on top; marks it as interactable.
  pool(vp, 235, 173, vp.reduced ? 30 : 30 + 2 * Math.sin(t * 1.5), P.accent.amber, 0.2 + (vp.reduced ? 0 : 0.06 * Math.sin(t * 1.5)));
  drawCareerWall(ctx, 196, 150);
  drawDeskAndBook(vp, 208, 212);
  drawTechShelf(vp, 386, 178);
  drawDeskLamp(vp, 196, 206);
  drawPotPlant(ctx, 36, 60);
  drawPotPlant(ctx, 416, 60);
  drawFern(ctx, 116, 250);
  drawWaterCooler(vp, 92, 246, world.drinking ?? false, world.drinkT ?? 0);
  drawFlowerPot(ctx, 408, 300);
  drawCozyProps(ctx);
  drawArcadeCabinet(vp, 38, 232);
  drawAboutStand(vp, 360, 252); // in-studio "About / who I am" station (story + contact on the main route)

  // interactable glows (signature Moonlighter "superposition") + easels
  drawEasel(vp, 90, '#9A7BC0', P.accent.indigo);
  drawEasel(vp, 175, '#9A7BC0', P.accent.indigo);
  drawEasel(vp, 295, '#4FBEBE', P.accent.teal);
  drawEasel(vp, 380, '#4FBEBE', P.accent.teal);

  drawRecruiter(vp, world.player, world.drinking ?? false, world.drinkT ?? 0);

  // gentle inward vignette (never dark — corners only)
  drawVignette(vp);

  if (!vp.reduced) drawMotes(vp);
}

// Fills an arbitrary quad (used for the cabinet's angled 3/4 side + top faces).
function quad(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number, c: string): void {
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.lineTo(x4, y4);
  ctx.closePath();
  ctx.fill();
}

// A 3/4-view arcade cabinet that FACES RIGHT: the lit marquee + glowing CRT + the
// control deck sit on the front face pointing into the room (toward the resume),
// while the left side panel + top recede up-left for depth so it reads as a real
// machine standing against the wall. (x, y) is the bounding top-left; ~42 wide x
// ~54 tall. Reduced motion holds a static frame. Decorative only (never reads the
// high score, which lives in the game overlay).
function drawArcadeCabinet(vp: Viewport, x: number, y: number): void {
  const ctx = vp.ctx;
  const t = vp.t;
  const D = 12; // side/top depth (recede up-left toward the wall)
  const fx = x + D; // front face left
  const fr = x + 42; // front face right
  const fw = fr - fx; // 30
  const fy = y + 8; // front face top
  const fb = y + 54; // front face bottom

  // floor contact shadow under the whole footprint
  softShadow(ctx, x + 24, y + 55, 24, P.shadowSoft);
  softShadow(ctx, x + 22, y + 55, 15, P.shadow);

  // TOP face (recede up-left) + lit front lip
  quad(ctx, fx, fy, fr, fy, fr - D, y + 2, x, y + 2, '#2F2820');
  R(ctx, fx, fy, fw, 1, '#423826');

  // LEFT SIDE panel (dark, recede up-left) + wood corner trim + teal side decal
  quad(ctx, fx, fy, x, y + 2, x, fb - 6, fx, fb, '#1C160F');
  R(ctx, fx - 1, fy, 1, fb - fy, '#5A3A22');
  quad(ctx, fx - 2, fy + 16, x + 3, fy + 10, x + 3, fy + 30, fx - 2, fy + 36, '#16685F');

  // FRONT FACE body (lit-left / shaded-right) — warm charcoal, not cold blue-black
  R(ctx, fx, fy, fw, fb - fy, '#2A2218');
  R(ctx, fx, fy, 2, fb - fy, '#3A2F20');
  R(ctx, fr - 1, fy, 1, fb - fy, '#1C1610');

  // MARQUEE (front-face top) + "ARCADE" wordmark
  R(ctx, fx, fy, fw, 7, '#2E2438');
  R(ctx, fx + 1, fy + 1, fw - 2, 5, '#F2E4C4');
  R(ctx, fx + 1, fy + 1, fw - 2, 1, '#FFF4DA');
  if (!vp.reduced && 0.5 + 0.5 * Math.sin(t * 9.3) > 0.86) R(ctx, fx + 1, fy + 1, fw - 2, 1, '#FFFDF0');
  ctx.save();
  ctx.fillStyle = '#16685F';
  ctx.font = pix(5);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ARCADE', fx + fw / 2, fy + 3);
  ctx.restore();

  // SCREEN bezel + CRT + scanlines + glow + attract loop
  R(ctx, fx + 2, fy + 8, fw - 4, 19, '#0C0814');
  const sx = fx + 4;
  const sy = fy + 10;
  const sw = fw - 8; // 22
  const sh = 15;
  R(ctx, sx, sy, sw, sh, '#08161A');
  R(ctx, sx, sy, sw, 1, '#050E12');
  R(ctx, sx, sy + sh - 1, sw, 1, '#04090C');
  if (!vp.reduced) {
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#000000';
    for (let yy = sy + 1; yy < sy + sh; yy += 2) ctx.fillRect(sx, yy, sw, 1);
    ctx.restore();
  }
  pool(vp, sx + sw / 2, sy + sh / 2, 13, '#5FE0D0', vp.reduced ? 0.12 : 0.12 + 0.05 * Math.sin(t * 2.2));
  drawCabinetAttract(vp, sx, sy, sw, sh);

  // CONTROL DECK + joystick + four buttons (front face, lower)
  R(ctx, fx, fy + 28, fw, 5, '#3A2E48');
  R(ctx, fx, fy + 28, fw, 1, '#4A3C5C');
  R(ctx, fx, fy + 33, fw, 1, '#140E1E');
  R(ctx, fx + 4, fy + 30, 2, 2, '#9AA0B0');
  R(ctx, fx + 4, fy + 29, 2, 1, '#D8643A');
  R(ctx, fx + 11, fy + 30, 2, 2, '#39C0B0');
  R(ctx, fx + 11, fy + 30, 2, 1, '#5FE0D0');
  R(ctx, fx + 15, fy + 30, 2, 2, '#FFB454');
  R(ctx, fx + 19, fy + 30, 2, 2, '#D8643A');
  R(ctx, fx + 23, fy + 30, 2, 2, '#9A7BC0');

  // COIN DOOR + kick base
  R(ctx, fx + 8, fy + 36, 14, 7, '#2A2236');
  R(ctx, fx + 8, fy + 36, 14, 1, '#3A3048');
  R(ctx, fx + 10, fy + 38, 2, 1, '#5FE0D0');
  R(ctx, fx + 12, fy + 41, 6, 1, '#100B18');
  R(ctx, fx, fb - 2, fw, 2, '#140E1E');
  R(ctx, fx, fb - 1, fw, 1, '#100B18');

  // additive marquee glow + neon underglow
  pool(vp, fx + fw / 2, fy + 2, 14, P.accent.golden, vp.reduced ? 0.16 : 0.16 + 0.05 * Math.sin(t * 1.6));
  pool(vp, x + 24, y + 56, 24, '#39C0B0', vp.reduced ? 0.1 : 0.1 + 0.04 * Math.sin(t * 1.4));
  pool(vp, x + 14, y + 56, 12, '#D8643A', vp.reduced ? 0.07 : 0.07 + 0.03 * Math.sin(t * 1.4 + 1.7));
}

// Arcade attract loop inside the CRT (sx, sy = screen top-left). Three fixed
// target rings; a crosshair snap-aims across them with a brief hit flash; a
// blinking PRESS E. Reduced motion parks the crosshair on the middle target.
function drawCabinetAttract(vp: Viewport, sx: number, sy: number, sw: number, sh: number): void {
  const ctx = vp.ctx;
  const t = vp.t;
  const reduced = vp.reduced;
  for (let i = 0; i < 3; i++) {
    const tx = sx + ATTRACT_SLOT_OFFSETS[i][0];
    const ty = sy + ATTRACT_SLOT_OFFSETS[i][1];
    R(ctx, tx, ty, 4, 1, '#39C0B0');
    R(ctx, tx, ty + 3, 4, 1, '#39C0B0');
    R(ctx, tx, ty, 1, 4, '#39C0B0');
    R(ctx, tx + 3, ty, 1, 4, '#39C0B0');
    R(ctx, tx + 1, ty + 1, 2, 2, '#5FE0D0');
  }
  const idx = reduced ? 1 : Math.floor(t * 0.8) % 3;
  const cx = sx + ATTRACT_SLOT_OFFSETS[idx][0] + 2;
  const cy = sy + ATTRACT_SLOT_OFFSETS[idx][1] + 2;
  if (!reduced && (t * 0.8) % 1 < 0.18) {
    R(ctx, cx - 1, cy - 1, 3, 3, '#D8643A');
    pool(vp, cx, cy, 5, '#D8643A', 0.14);
  }
  R(ctx, cx - 3, cy, 7, 1, '#EAF7F4');
  R(ctx, cx, cy - 3, 1, 7, '#EAF7F4');
  R(ctx, cx, cy, 1, 1, '#08161A');
  if (reduced || Math.sin(t * 3) > 0) R(ctx, sx + Math.round(sw / 2) - 6, sy + sh - 4, 12, 2, '#FFE08A');
}

// Warm amber rug grounding the left "Break & Play" cluster (arcade + cooler + lamp).
// No additive glow on it, so the central desk spotlight stays the room's focal point.
function drawPlayRug(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  R(ctx, x, y, w, h, '#6E4A28'); // border
  R(ctx, x + 1, y + 1, w - 2, h - 2, '#8A5E38'); // field
  R(ctx, x + 1, y + 1, w - 2, 1, '#A87A4A'); // lit top lip
  R(ctx, x + 1, y + h - 2, w - 2, 1, '#5A3A22'); // shaded base
  R(ctx, x + 4, y + 4, 1, h - 8, P.accent.golden); // inset trim frame
  R(ctx, x + w - 5, y + 4, 1, h - 8, P.accent.golden);
  R(ctx, x + 4, y + 4, w - 8, 1, P.accent.golden);
  R(ctx, x + 4, y + h - 5, w - 8, 1, P.accent.golden);
}

// Left-wall poster + tiny high-score board for the Play zone (both flat, no glow).
function drawPlayWall(ctx: CanvasRenderingContext2D): void {
  // poster, mounted flush to the inner wall face (x36) so it reads as on the wall
  R(ctx, 36, 150, 12, 20, P.wood.dark); // frame
  R(ctx, 37, 151, 10, 18, P.surface.panel); // sheet
  R(ctx, 37, 151, 10, 4, P.accent.indigo); // top band
  R(ctx, 41, 158, 2, 2, P.accent.golden); // emblem
  R(ctx, 48, 151, 1, 19, P.shadow); // 1px drop shadow (proud of the wall)
  // tiny high-score board
  R(ctx, 36, 176, 14, 12, P.wood.dark); // frame
  R(ctx, 37, 177, 12, 10, '#0C1A1E'); // CRT face
  R(ctx, 39, 179, 8, 1, P.accent.golden);
  R(ctx, 39, 181, 6, 1, P.accent.golden);
  R(ctx, 39, 183, 7, 1, P.accent.golden);
  R(ctx, 38, 179, 1, 1, '#5FE0D0'); // teal rank pip
}

// Warm honey-oak floor: long horizontal boards (directional, not a checker),
// a 5-tone family so adjacent planks differ slightly, with grain + staggered joints.
// Each plank now reads as a rounded slat: a lit top bevel, a shaded base, knots,
// and a soft inner grain so the floor feels hand-finished, not flat.
function drawFloor(ctx: CanvasRenderingContext2D): void {
  const tones = P.floor.plankTones;
  let row = 0;
  for (let y = 36; y < 324; y += 16) {
    const base = tones[(row * 7 + 3) % tones.length];
    R(ctx, 36, y, 398, 16, base);
    // lit top bevel (top-left light) + a soft 1px shaded base for plank roundness
    ctx.save();
    ctx.globalAlpha = 0.32;
    R(ctx, 36, y + 1, 398, 1, P.floor.seamHi);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.5;
    R(ctx, 36, y + 14, 398, 1, P.floor.plankSh); // shaded bottom of the slat
    ctx.restore();
    R(ctx, 36, y + 15, 398, 1, P.floor.seam); // board seam
    // staggered butt-joints (offset per row so it never reads as one long board)
    const off = (row % 3) * 132;
    for (let jx = 96 + off; jx < 432; jx += 132) {
      R(ctx, jx, y, 1, 16, P.floor.seam);
      ctx.save();
      ctx.globalAlpha = 0.3;
      R(ctx, jx + 1, y, 1, 16, P.floor.seamHi); // lit right lip of the joint
      ctx.restore();
    }
    // subtle long grain dashes + occasional knot, all deterministic per row
    ctx.save();
    ctx.globalAlpha = 0.2;
    for (let g = 0; g < 4; g++) {
      const gx = 40 + ((row * 53 + g * 137) % 348);
      const gw = 7 + ((row * 17 + g * 29) % 10);
      R(ctx, gx, y + 3 + ((g * 5) % 9), gw, 1, P.floor.grain);
    }
    ctx.restore();
    if (row % 4 === 1) {
      const kx = 64 + ((row * 97) % 320);
      ctx.save();
      ctx.globalAlpha = 0.34;
      R(ctx, kx, y + 6, 2, 2, P.floor.seam); // little knot
      R(ctx, kx, y + 6, 1, 1, P.floor.grain);
      ctx.restore();
    }
    row++;
  }
}

// Sun pouring through the left window onto the honey floor: a soft warm
// light pool (additive) with a brighter core wedge, all clipped to its shape.
function drawWindowSpill(vp: Viewport): void {
  const ctx = vp.ctx;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // wide soft wash
  ctx.globalAlpha = 0.09;
  ctx.fillStyle = P.glowKit.window;
  ctx.beginPath();
  ctx.moveTo(38, 124);
  ctx.lineTo(38, 168);
  ctx.lineTo(124, 214);
  ctx.lineTo(120, 150);
  ctx.closePath();
  ctx.fill();
  // brighter inner wedge for a crisp sunbeam feel
  ctx.globalAlpha = vp.reduced ? 0.08 : 0.12;
  ctx.fillStyle = P.lamp.glow;
  ctx.beginPath();
  ctx.moveTo(44, 128);
  ctx.lineTo(44, 156);
  ctx.lineTo(96, 184);
  ctx.lineTo(94, 146);
  ctx.closePath();
  ctx.fill();
  // faint mullion shadow bar crossing the pool (the window cross)
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = P.floor.seam;
  ctx.fillRect(40, 150, 78, 2);
  ctx.restore();
}

function drawRug(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  // soft contact shadow so the rug sits ON the floor, light from top-left
  ctx.save();
  ctx.globalAlpha = 0.5;
  R(ctx, x + 2, y + h - 1, w, 2, P.shadowSoft);
  R(ctx, x + w - 1, y + 2, 2, h, P.shadowSoft);
  ctx.restore();
  // braided border (deep) with a lit top-left lip
  R(ctx, x, y, w, h, P.rug.deep);
  R(ctx, x, y, w, 1, '#2F8079');
  R(ctx, x, y, 1, h, '#2F8079');
  R(ctx, x, y + h - 1, w, 1, '#164E48');
  // field
  R(ctx, x + 4, y + 4, w - 8, h - 8, P.rug.base);
  R(ctx, x + 4, y + 4, w - 8, 1, '#46AFA6'); // lit top edge of field
  R(ctx, x + 4, y + h - 5, w - 8, 1, '#1E6A63'); // shaded base edge
  // clean inner border frame (two thin lines) + center medallion
  ctx.save();
  ctx.globalAlpha = 0.85;
  R(ctx, x + 8, y + 8, w - 16, 1, P.accent.golden);
  R(ctx, x + 8, y + h - 9, w - 16, 1, P.accent.golden);
  R(ctx, x + 8, y + 8, 1, h - 16, P.accent.golden);
  R(ctx, x + w - 9, y + 8, 1, h - 16, P.accent.golden);
  ctx.restore();
  R(ctx, x + 12, y + 12, w - 24, h - 24, '#24454d'); // recessed center panel
  R(ctx, x + 12, y + 12, w - 24, 1, '#2E545C');
  // woven dash pattern along the field band (deterministic, calm)
  ctx.save();
  ctx.globalAlpha = 0.4;
  for (let dx = x + 16; dx < x + w - 16; dx += 12) {
    R(ctx, dx, y + 10, 6, 1, '#3CA199');
    R(ctx, dx, y + h - 11, 6, 1, '#3CA199');
  }
  ctx.restore();
  // center medallion diamond
  const mcx = x + (w >> 1);
  const mcy = y + (h >> 1);
  R(ctx, mcx - 1, mcy - 5, 2, 10, P.accent.golden);
  R(ctx, mcx - 5, mcy - 1, 10, 2, P.accent.golden);
  R(ctx, mcx - 1, mcy - 1, 2, 2, '#FFE6A8');
  // corner diamonds
  for (const [dx, dy] of [[10, 10], [w - 12, 10], [10, h - 12], [w - 12, h - 12]] as const) {
    R(ctx, x + dx, y + dy, 3, 3, P.accent.golden);
    R(ctx, x + dx, y + dy, 1, 1, '#FFE6A8');
  }
}

function drawDoormat(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.save();
  ctx.globalAlpha = 0.28;
  R(ctx, x + 1, y + 15, 48, 1, P.shadow); // faint contact shadow so it sits on the floor
  ctx.restore();
  R(ctx, x, y, 50, 16, P.wood.dark); // border
  R(ctx, x, y, 50, 1, P.wood.mid); // lit top lip
  R(ctx, x, y + 15, 50, 1, '#3A2616'); // shaded bottom lip
  R(ctx, x + 2, y + 2, 46, 12, P.rug.deep); // woven field
  ctx.save();
  ctx.globalAlpha = 0.3;
  for (let wx = x + 5; wx < x + 46; wx += 4) R(ctx, wx, y + 2, 1, 12, P.rug.base); // coir weave
  ctx.restore();
  // golden motif: a centred diamond flanked by two short bars (varied, not 3 identical bars)
  R(ctx, x + 7, y + 8, 8, 1, P.accent.golden);
  R(ctx, x + 35, y + 8, 8, 1, P.accent.golden);
  R(ctx, x + 24, y + 7, 2, 1, P.accent.golden);
  R(ctx, x + 23, y + 8, 4, 1, P.accent.golden);
  R(ctx, x + 24, y + 9, 2, 1, P.accent.golden);
}

function drawWalls(ctx: CanvasRenderingContext2D): void {
  const { wall, wallHi, wallSh, wainscot, trim } = P.room;
  // --- TOP wall: lit crown, soft body shade toward the floor, base trim line ---
  R(ctx, 20, 20, 430, 16, wall);
  R(ctx, 20, 20, 430, 4, wallHi); // crown highlight
  ctx.save();
  ctx.globalAlpha = 0.28;
  R(ctx, 20, 28, 430, 4, wallSh); // gentle shade where the wall meets the floor
  ctx.restore();
  R(ctx, 20, 32, 430, 1, P.wood.light); // trim highlight catch
  R(ctx, 20, 33, 430, 2, trim); // base trim band
  // recessed pilaster panels (~every 88px): a shaded-left + lit-right outline
  // pair reads as a shallow inset, so the wall feels paneled, not hollow/planar
  for (let px = 92; px < 440; px += 88) {
    ctx.save();
    ctx.globalAlpha = 0.28;
    R(ctx, px, 22, 1, 11, wallSh); // recessed left edge (in shadow)
    R(ctx, px - 14, 22, 1, 11, wallSh); // panel's far (left) inner shade
    ctx.globalAlpha = 0.25;
    R(ctx, px + 1, 22, 1, 11, wallHi); // lit right lip of the recess
    R(ctx, px - 13, 22, 1, 11, wallHi);
    ctx.restore();
  }
  // very faint scattered wall speckle texture so the plaster reads hand-finished
  ctx.save();
  for (let s = 0; s < 22; s++) {
    ctx.globalAlpha = 0.08 + ((s * 7) % 5) * 0.01; // 0.08..0.12
    const spx = 26 + ((s * 197) % 418);
    const spy = 24 + ((s * 53) % 8);
    R(ctx, spx, spy, 1, 1, s % 2 ? wallSh : wallHi);
  }
  ctx.restore();
  // --- LEFT wall ---
  R(ctx, 20, 20, 16, 320, wall);
  R(ctx, 20, 20, 4, 320, wallHi);
  ctx.save();
  ctx.globalAlpha = 0.28;
  R(ctx, 30, 36, 2, 288, wallSh);
  ctx.restore();
  R(ctx, 32, 36, 1, 288, P.wood.light);
  R(ctx, 33, 36, 1, 288, trim);
  // --- RIGHT wall (shadow side) ---
  R(ctx, 434, 20, 16, 320, wall);
  R(ctx, 446, 20, 4, 320, wallSh);
  ctx.save();
  ctx.globalAlpha = 0.3;
  R(ctx, 434, 20, 3, 320, wallSh); // inner shade catches the right edge
  ctx.restore();
  R(ctx, 434, 36, 1, 288, P.wood.light);
  R(ctx, 435, 36, 1, 288, trim);
  // --- BOTTOM (gap 210..262): wainscot cap + lit top edge ---
  R(ctx, 20, 324, 190, 16, wall);
  R(ctx, 262, 324, 188, 16, wall);
  R(ctx, 20, 322, 190, 1, P.wood.light);
  R(ctx, 262, 322, 188, 1, P.wood.light);
  R(ctx, 20, 323, 190, 2, wainscot);
  R(ctx, 262, 323, 188, 2, wainscot);
  // raise the cap a touch: a 1px mid-tone shade stripe at its base grounds it
  ctx.save();
  ctx.globalAlpha = 0.4;
  R(ctx, 20, 325, 190, 1, wallSh);
  R(ctx, 262, 325, 188, 1, wallSh);
  ctx.restore();
}

function drawWindow(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  // 1px drop shadow on the bottom-right (wall-mounted object)
  ctx.save();
  ctx.globalAlpha = 0.5;
  R(ctx, x - 1, y + 51, 13, 2, P.shadowSoft);
  R(ctx, x + 10, y - 1, 2, 53, P.shadowSoft);
  ctx.restore();
  // wooden frame with lit top-left, shaded bottom-right
  R(ctx, x - 2, y - 2, 12, 52, P.wood.mid);
  R(ctx, x - 2, y - 2, 12, 1, P.wood.light);
  R(ctx, x - 2, y - 2, 1, 52, P.wood.light);
  R(ctx, x + 9, y - 2, 1, 52, P.wood.dark);
  R(ctx, x - 2, y + 49, 12, 1, P.wood.dark);
  // warm glass, brighter toward the top-left (sun comes in)
  R(ctx, x, y, 8, 48, P.glass.warm);
  R(ctx, x, y, 8, 18, P.glass.lit);
  R(ctx, x, y, 4, 10, P.glass.reflect); // bright sky catch top-left
  // mullions
  R(ctx, x, y + 23, 8, 2, P.glass.mullion);
  R(ctx, x + 3, y, 2, 48, P.glass.mullion);
  // soft inner window glow (additive)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.16;
  let g = gradCache.get('swin' + x);
  if (!g) {
    g = ctx.createRadialGradient(x + 4, y + 16, 1, x + 4, y + 16, 22);
    g.addColorStop(0, P.glowKit.window);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    gradCache.set('swin' + x, g);
  }
  ctx.fillStyle = g;
  ctx.fillRect(x - 6, y - 4, 24, 40);
  ctx.restore();
  // sill with a lit top lip + shaded underside
  R(ctx, x - 2, y + 50, 12, 1, P.glass.reflect);
  R(ctx, x - 2, y + 51, 12, 2, P.wood.light);
  R(ctx, x - 2, y + 53, 12, 1, P.wood.dark);
}

function drawExitLight(ctx: CanvasRenderingContext2D, vp: Viewport): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = vp.reduced ? 0.1 : 0.14;
  ctx.fillStyle = P.lamp.glow;
  ctx.fillRect(210, 306, 52, 20);
  ctx.restore();
}

// Gallery counter the project easels sit on. Its front face (y+4..y+27) is the
// collision band (scenes/studio.ts), so the player stands in front and never
// overlaps the easels above it.
function drawCounter(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): void {
  // stacked contact shadows under the counter base (decreasing alpha, growing
  // radius) plus a thin 1px dark grounding line, echoing the floor-seam feel
  ctx.save();
  ctx.globalAlpha = 0.16;
  R(ctx, x + 6, y + 27, w - 12, 3, P.shadowSoft);
  ctx.globalAlpha = 0.12;
  R(ctx, x + 2, y + 28, w - 4, 3, P.shadowSoft);
  ctx.restore();
  R(ctx, x, y, w, 4, P.wood.light); // lit top surface
  R(ctx, x, y, w, 1, '#D6A468'); // bright front lip
  R(ctx, x, y + 3, w, 1, P.accent.teal); // thin teal inlay
  R(ctx, x, y + 4, w, 23, P.wood.mid); // front face
  // subtle deterministic wood grain across the front face (floor-grain logic)
  ctx.save();
  ctx.globalAlpha = 0.15;
  for (let g = 0; g < 7; g++) {
    const gx = x + 6 + ((g * 113) % (w - 24));
    const gw = 9 + ((g * 29) % 12);
    R(ctx, gx, y + 9 + ((g * 19) % 11), gw, 1, P.floor.grain);
  }
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = 0.22;
  R(ctx, x, y + 4, w, 4, P.wood.light); // soft top-lit gradient on the face
  R(ctx, x, y + 20, w, 5, P.wood.dark); // shaded lower face
  ctx.restore();
  R(ctx, x, y + 25, w, 2, P.wood.dark); // base shadow
  ctx.save();
  ctx.globalAlpha = 0.45;
  R(ctx, x + 2, y + 27, w - 4, 1, P.wood.dark); // 1px dark contact line under the counter
  ctx.restore();
  // recessed panel divisions with lit/shadow edges
  for (let i = x + 44; i < x + w; i += 58) {
    R(ctx, i, y + 6, 2, 18, P.wood.dark);
    R(ctx, i + 2, y + 6, 1, 18, P.wood.light);
    // panel inset between dividers (faint frame)
    if (i + 6 < x + w) {
      ctx.save();
      ctx.globalAlpha = 0.16;
      R(ctx, i + 8, y + 9, 44, 1, P.wood.dark);
      R(ctx, i + 8, y + 20, 44, 1, P.wood.light);
      ctx.restore();
    }
  }
}

// Office water cooler — interactable: press E to drink (bottom-left).
function drawWaterCooler(vp: Viewport, x: number, y: number, drinking: boolean, drinkT: number): void {
  const ctx = vp.ctx;
  // subtle COOL teal interactable glow (below easel intensity) on the shared
  // vp.t*1.5 time base, so the cooler reads as a "press E to drink" interactable
  pool(vp, x + 9, y + 22, vp.reduced ? 17 : 17 + 2 * Math.sin(vp.t * 1.5), P.accent.teal, 0.16 + (vp.reduced ? 0 : 0.05 * Math.sin(vp.t * 1.5)));
  softShadow(ctx, x + 9, y + 46, 13, P.shadowSoft);
  // body
  R(ctx, x, y + 14, 18, 32, '#E6E2D8');
  R(ctx, x, y + 14, 18, 3, '#F2EEE6');
  R(ctx, x, y + 14, 3, 32, '#D2CCBE');
  R(ctx, x, y + 43, 18, 3, '#C9C3B5');
  // inverted water bottle on top
  R(ctx, x + 2, y, 14, 16, '#7FC9D6');
  R(ctx, x + 2, y, 14, 4, '#A9E0E8');
  R(ctx, x + 5, y - 3, 8, 4, '#5FA9B0');
  // taps + drip tray
  R(ctx, x + 4, y + 22, 3, 4, '#3A6E8C');
  R(ctx, x + 11, y + 22, 3, 4, '#9A3A2A');
  R(ctx, x + 4, y + 27, 10, 2, '#9AA0AA');
  // a paper cup
  R(ctx, x + 6, y + 31, 6, 7, '#FBF6EA');
  R(ctx, x + 6, y + 31, 6, 1, '#D7EFEA');

  // ---- phase model (shared shape, defined inline; see sprites.ts) ----
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
  const easeOut = (v: number) => 1 - (1 - v) * (1 - v);
  const T_FILL_END = 0.32,
    T_SIP_END = 1.46; // 1.8 total
  const fill = clamp01(drinkT / T_FILL_END);
  const sip = clamp01((drinkT - T_FILL_END) / (T_SIP_END - T_FILL_END));
  const phase = drinkT < T_FILL_END ? 'fill' : drinkT < T_SIP_END ? 'sip' : 'finish';

  if (drinking) {
    // A) WATER STREAM — taps pouring into the cup during the fill phase
    if (phase === 'fill') {
      const streamTop = y + 26,
        streamBot = y + 31;
      ctx.save();
      ctx.globalAlpha = 0.85;
      R(ctx, x + 5, streamTop, 2, streamBot - streamTop, '#7FC9D6');
      if (!vp.reduced) {
        const sh = streamTop + Math.round((vp.t * 30) % (streamBot - streamTop));
        R(ctx, x + 5, sh, 2, 1, '#A9E0E8');
      }
      ctx.restore();
    }

    // B) TRAY-CUP FILL — the cup on the tray fills during fill, empties after
    const cupFillTray = phase === 'fill' ? easeOut(fill) : 0;
    const wH = Math.round((vp.reduced ? (phase === 'fill' ? 1 : 0) : cupFillTray) * 6);
    if (wH > 0) {
      R(ctx, x + 7, y + 31 + (6 - wH) + 1, 4, wH, '#7FC9D6');
      R(ctx, x + 7, y + 31 + (6 - wH) + 1, 4, 1, '#A9E0E8');
    }

    // C) PUDDLE SPARKLE — a glint on the drip tray early on
    if (phase === 'fill' || sip < 0.25) {
      R(ctx, x + 7, y + 29, 3, 1, '#5FA9B0');
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5 + (vp.reduced ? 0 : 0.3 * Math.sin(vp.t * 6));
      R(ctx, x + 8, y + 29, 1, 1, '#A9E0E8');
      ctx.restore();
    }

    // D) RICHER BUBBLES rising in the inverted bottle
    if (!vp.reduced) {
      ctx.save();
      for (let i = 0; i < 5; i++) {
        const by = (vp.t * 18 + i * 5) % 14;
        const bx = x + 4 + ((i * 3) % 11);
        const sz = 1 + (i % 2);
        ctx.globalAlpha = 0.7 * (1 - by / 14);
        ctx.fillStyle = '#A9E0E8';
        ctx.fillRect(bx, y + 13 - by, sz, sz);
      }
      ctx.globalAlpha = 0.5;
      R(ctx, x + 2, y + 12 + Math.round(Math.sin(vp.t * 5)), 14, 1, '#A9E0E8');
      ctx.restore();
    }
  }
}

// Decorative terracotta pot of flowers (no glow, never interactable).
function drawFlowerPot(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  softShadow(ctx, x + 8, y + 23, 11, P.shadowSoft);
  // terracotta pot: lit top-left rim, shaded right, base band
  R(ctx, x, y + 10, 16, 12, '#B5793F');
  R(ctx, x, y + 9, 16, 3, '#C98A4B'); // lit rim
  R(ctx, x, y + 9, 16, 1, '#D89A5A'); // bright rim lip
  R(ctx, x, y + 10, 3, 12, '#C98A4B'); // lit left
  R(ctx, x + 13, y + 10, 3, 12, '#8A5A33'); // shaded right
  R(ctx, x, y + 20, 16, 2, '#8A5A33'); // base shadow
  // foliage clump
  R(ctx, x + 2, y, 4, 11, P.plant.dark);
  R(ctx, x + 6, y - 3, 5, 14, P.plant.base);
  R(ctx, x + 6, y - 3, 2, 14, P.plant.hi); // lit left stem
  R(ctx, x + 10, y, 4, 11, P.plant.dark); // shaded right stem
  // blossoms with lit cores
  R(ctx, x + 3, y - 1, 2, 2, '#D85A30');
  R(ctx, x + 3, y - 1, 1, 1, P.flower.core);
  R(ctx, x + 8, y - 2, 2, 2, P.accent.golden);
  R(ctx, x + 8, y - 2, 1, 1, P.flower.cream);
  R(ctx, x + 11, y + 1, 2, 2, '#D85A30');
  R(ctx, x + 11, y + 1, 1, 1, P.flower.core);
}

// PROJECT display: a premium desktop MONITOR (bezel + stand) showing a small
// stylized pixel-art mockup of that product's UI, a soft screen glow, and a
// brass title plate. The mockup style is keyed off x so each product differs:
//   90  → browser + cards (careers.lumofy.ai)
//   175 → dashboard + chart (Lumofy Pulse)
//   295 → list / flow board (Dispatching Tool)
//   380 → ranked list / curator feed (AI Curator)
function drawEasel(vp: Viewport, x: number, screen: string, glow: string): void {
  const ctx = vp.ctx;
  const y = 74;
  // interactable glow (additive, pulsing) BEHIND the monitor: STRONGEST tier in
  // the unified glow hierarchy, all breathing on the shared vp.t*1.5 time base.
  pool(vp, x, y + 2, vp.reduced ? 19 : 19 + 3 * Math.sin(vp.t * 1.5), glow, 0.36 + (vp.reduced ? 0 : 0.12 * Math.sin(vp.t * 1.5)));
  // stacked contact shadows + a thin dark grounding line so the monitor sits firmly
  softShadow(ctx, x, 96, 24, P.shadowSoft);
  softShadow(ctx, x, 96, 16, P.shadowSoft);
  ctx.save();
  ctx.globalAlpha = 0.4;
  R(ctx, x - 16, 96, 32, 1, P.wood.dark); // 1px dark contact line directly under
  ctx.restore();

  // --- bezel: lit top + left, shadowed bottom + right ---
  R(ctx, x - 25, y - 12, 50, 32, '#2A2620'); // dark bezel body
  R(ctx, x - 25, y - 12, 50, 1, '#4A443A'); // top edge highlight
  R(ctx, x - 25, y - 12, 1, 32, '#3C372E'); // left edge highlight
  R(ctx, x + 24, y - 12, 1, 32, '#15120D'); // right edge shadow
  R(ctx, x - 25, y + 19, 50, 1, '#15120D'); // bottom edge shadow

  // --- monitor neck connecting bezel to the brass base plate ---
  R(ctx, x - 2, y + 20, 4, 2, P.metal.base);
  R(ctx, x - 2, y + 20, 1, 2, P.metal.hi); // lit left of neck

  // --- screen recess ---
  const sx = x - 22,
    sy = y - 9,
    sw = 44,
    sh = 26;
  R(ctx, sx, sy, sw, sh, screen); // screen base tint
  // per-product mockup
  drawScreenMockup(ctx, vp, x, sx, sy, sw, sh);
  // glass sheen: a 1px lit top + a soft diagonal glare, then screen glow
  ctx.save();
  ctx.globalAlpha = 0.32;
  R(ctx, sx, sy, sw, 1, '#ffffff');
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(sx + 2, sy);
  ctx.lineTo(sx + 14, sy);
  ctx.lineTo(sx + 4, sy + sh);
  ctx.lineTo(sx, sy + sh);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // additive screen glow spilling just past the bezel (intensified a touch)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = vp.reduced ? 0.13 : 0.18;
  const sgKey = 'scr' + x + ',' + y + ',' + glow;
  let sg = gradCache.get(sgKey);
  if (!sg) {
    sg = ctx.createRadialGradient(x, y + 2, 2, x, y + 2, 28);
    sg.addColorStop(0, glow);
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    gradCache.set(sgKey, sg);
  }
  ctx.fillStyle = sg;
  ctx.fillRect(sx - 4, sy - 4, sw + 8, sh + 8);
  ctx.restore();
  // tiny lit status LED on the bottom-left bezel corner (reads as a live machine)
  R(ctx, x - 22, y + 17, 1, 1, '#3AA890'); // LED seat so it reads when glow is faint
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = vp.reduced ? 0.7 : 0.6 + 0.4 * Math.sin(vp.t * 1.5);
  R(ctx, x - 22, y + 17, 1, 1, '#6CE0C8');
  ctx.restore();

  // --- brass title plate / monitor base (project name lettered elsewhere) ---
  softShadow(ctx, x, y + 24, 16, P.shadowSoft); // base contact shadow
  R(ctx, x - 15, y + 22, 30, 1, P.wood.dark); // seat shadow under the plate
  R(ctx, x - 14, y + 21, 28, 3, P.accent.amber); // brass plate
  R(ctx, x - 14, y + 21, 28, 1, P.accent.golden); // lit top of plate
  R(ctx, x - 14, y + 23, 28, 1, '#B5471F'); // shaded base of plate
}

// Small stylized pixel-art product mockups. All drawing is clipped to the
// screen rect and uses flat rects only (no realism), keyed by the easel x.
function drawScreenMockup(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  ex: number,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(sx, sy, sw, sh);
  ctx.clip();
  // brighten the base screen slightly so UI elements pop (subtle top-down lift)
  ctx.save();
  ctx.globalAlpha = 0.12;
  R(ctx, sx, sy, sw, sh, '#ffffff');
  ctx.globalAlpha = 0.08;
  R(ctx, sx, sy, sw, (sh >> 1), '#ffffff'); // extra lift toward the top
  ctx.restore();
  const ink = 'rgba(255,255,255,0.9)';
  const soft = 'rgba(255,255,255,0.55)';
  const faint = 'rgba(255,255,255,0.32)';
  const card = 'rgba(255,255,255,0.18)';

  if (ex === 90) {
    // BROWSER + CARDS (careers.lumofy.ai)
    R(ctx, sx, sy, sw, 6, 'rgba(0,0,0,0.28)'); // browser chrome bar
    R(ctx, sx + 2, sy + 2, 1, 1, '#E0843C'); // traffic dots
    R(ctx, sx + 4, sy + 2, 1, 1, P.accent.golden);
    R(ctx, sx + 6, sy + 2, 1, 1, '#46AFA6');
    R(ctx, sx + 10, sy + 2, 24, 2, 'rgba(255,255,255,0.4)'); // url pill
    R(ctx, sx + 4, sy + 9, 36, 3, ink); // hero headline
    R(ctx, sx + 4, sy + 14, 22, 2, soft);
    R(ctx, sx + 28, sy + 13, 12, 4, P.accent.teal); // bold "Apply" CTA pill (brand)
    R(ctx, sx + 28, sy + 13, 12, 1, '#5CC9BE'); // lit top of the pill
    // 3 job cards
    for (let i = 0; i < 3; i++) {
      const cx = sx + 4 + i * 13;
      R(ctx, cx, sy + 18, 11, 7, card);
      R(ctx, cx, sy + 18, 11, 1, soft);
      R(ctx, cx + 1, sy + 20, 7, 1, faint);
      R(ctx, cx + 1, sy + 22, 5, 2, P.accent.golden); // apply chip
    }
  } else if (ex === 175) {
    // DASHBOARD + CHART (Lumofy Pulse)
    R(ctx, sx, sy, 12, sh, 'rgba(0,0,0,0.22)'); // left sidebar
    R(ctx, sx + 2, sy + 3, 8, 1, soft);
    R(ctx, sx + 2, sy + 6, 8, 1, faint);
    R(ctx, sx + 2, sy + 9, 8, 1, faint);
    // 2 KPI tiles; left one gets a bold filled accent header so it reads as "live"
    R(ctx, sx + 15, sy + 3, 12, 7, P.accent.tealDeep); // bold filled KPI card
    R(ctx, sx + 15, sy + 3, 12, 1, '#5CC9BE');
    R(ctx, sx + 17, sy + 5, 6, 1, soft);
    R(ctx, sx + 17, sy + 7, 8, 2, P.accent.golden);
    R(ctx, sx + 29, sy + 3, 12, 7, card);
    R(ctx, sx + 31, sy + 5, 6, 1, soft);
    R(ctx, sx + 31, sy + 7, 8, 2, '#46AFA6');
    // bar chart with an animated highlight bar
    const heights = [4, 8, 6, 11, 7, 13, 9];
    for (let i = 0; i < 7; i++) {
      const bx = sx + 16 + i * 3;
      const bh = heights[i];
      R(ctx, bx, sy + sh - 2 - bh, 2, bh, soft);
      R(ctx, bx, sy + sh - 2 - bh, 2, 1, ink);
    }
    if (!vp.reduced) {
      const k = Math.floor(vp.t * 1.5) % 7;
      const bh = heights[k];
      R(ctx, sx + 16 + k * 3, sy + sh - 2 - bh, 2, bh, P.accent.golden);
    }
    R(ctx, sx + 14, sy + sh - 2, 28, 1, faint); // axis
  } else if (ex === 295) {
    // KANBAN LIST / FLOW (Dispatching Tool)
    R(ctx, sx + 4, sy + 3, 22, 2, ink); // header
    R(ctx, sx + 28, sy + 2, 12, 4, P.accent.teal); // bold "Dispatch" action pill
    R(ctx, sx + 28, sy + 2, 12, 1, '#5CC9BE');
    const colTints = ['#1FA89C', P.accent.golden, '#E0843C'] as const; // per-column lane
    for (let col = 0; col < 3; col++) {
      const cx = sx + 4 + col * 13;
      R(ctx, cx, sy + 8, 11, sh - 11, card); // column
      R(ctx, cx, sy + 8, 11, 1, soft);
      R(ctx, cx, sy + 8, 11, 1, colTints[col]); // bold lane header strip
      R(ctx, cx, sy + 8, 3, 1, '#ffffff');
      // task chips down the column
      const n = col === 1 ? 3 : 2;
      for (let r = 0; r < n; r++) {
        R(ctx, cx + 1, sy + 10 + r * 5, 9, 3, 'rgba(255,255,255,0.28)');
        R(ctx, cx + 1, sy + 10 + r * 5, 3, 3, col === 0 ? '#46AFA6' : col === 1 ? P.accent.golden : '#E0843C');
      }
    }
  } else {
    // RANKED CURATOR FEED (AI Curator) — list with score bars + a sparkle
    R(ctx, sx + 4, sy + 3, 18, 2, ink); // title
    R(ctx, sx + 34, sy + 2, 6, 4, P.accent.golden); // AI badge
    R(ctx, sx + 35, sy + 3, 1, 1, '#ffffff');
    for (let i = 0; i < 4; i++) {
      const ly = sy + 8 + i * 5;
      if (i === 0) R(ctx, sx + 3, ly - 1, 35, 5, 'rgba(31,168,156,0.4)'); // bold top-pick highlight row
      R(ctx, sx + 4, ly, 3, 3, i === 0 ? P.accent.teal : card); // avatar/rank (top pick filled)
      R(ctx, sx + 4, ly, 1, 1, i === 0 ? '#5CC9BE' : soft);
      R(ctx, sx + 9, ly, 18 - i * 3, 1, soft); // title line (descending)
      R(ctx, sx + 9, ly + 2, 22 - i * 4, 1, P.accent.golden); // score bar
    }
    if (!vp.reduced) {
      const tw = (Math.sin(vp.t * 3) + 1) * 0.5;
      ctx.globalAlpha = 0.5 + 0.5 * tw;
      R(ctx, sx + 37, sy + 3, 1, 1, '#ffffff'); // twinkle on the AI badge
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}

// "Career wall" corkboard with 3 phase cards + RESERVED real-logo frame slots.
// A wall-mounted object: 1px drop shadow bottom-right, lit top-left frame.
function drawCareerWall(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  // wall drop shadow (bottom-right): stacked, decreasing alpha at growing radius,
  // plus a thin 1px dark line directly under the base so the frame sits grounded
  ctx.save();
  ctx.globalAlpha = 0.45;
  R(ctx, x + 1, y + 46, 78, 2, P.shadowSoft);
  R(ctx, x + 78, y + 1, 2, 46, P.shadowSoft);
  ctx.globalAlpha = 0.22;
  R(ctx, x + 2, y + 48, 78, 2, P.shadowSoft); // softer outer falloff
  R(ctx, x + 80, y + 2, 2, 46, P.shadowSoft);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = 0.4;
  R(ctx, x + 1, y + 46, 77, 1, P.wood.dark); // 1px dark contact line under the base
  ctx.restore();
  // wooden frame: lit top + left, shadowed bottom + right
  R(ctx, x, y, 78, 46, P.wood.mid);
  R(ctx, x, y, 78, 2, P.wood.light);
  R(ctx, x, y, 2, 46, P.wood.light);
  R(ctx, x + 76, y, 2, 46, P.wood.dark);
  R(ctx, x, y + 44, 78, 2, P.wood.dark);
  // cork field with an inset shadow lip + faint speckle
  R(ctx, x + 3, y + 3, 72, 40, '#C7A878');
  R(ctx, x + 3, y + 3, 72, 1, '#B89868'); // top inner shade (recessed)
  R(ctx, x + 3, y + 3, 1, 40, '#B89868');
  ctx.save();
  ctx.globalAlpha = 0.25;
  for (let s = 0; s < 14; s++) {
    const sxp = x + 6 + ((s * 37) % 66);
    const syp = y + 6 + ((s * 53) % 34);
    R(ctx, sxp, syp, 1, 1, '#A88454');
  }
  ctx.restore();
  // 3 phase pin-cards (Sales / HR / AI-Dev tints)
  const tints = [P.phase.sales.tint, P.phase.hr.tint, P.phase.aidev.tint];
  const deeps = [P.phase.sales.deep, P.phase.hr.deep, P.phase.aidev.deep];
  for (let i = 0; i < 3; i++) {
    const cx = x + 8 + i * 24;
    R(ctx, cx + 1, y + 25, 16, 13, P.shadowSoft); // tiny card shadow
    R(ctx, cx, y + 24, 16, 13, tints[i]);
    R(ctx, cx, y + 24, 16, 2, '#ffffff'); // lit top of note
    R(ctx, cx, y + 35, 16, 1, deeps[i]); // shaded base of note
    R(ctx, cx + 3, y + 30, 10, 1, deeps[i]); // a written line
    R(ctx, cx + 3, y + 33, 7, 1, deeps[i]);
    R(ctx, cx + 7, y + 22, 2, 3, P.metal.base); // pin shaft
    R(ctx, cx + 7, y + 22, 2, 2, P.accent.amber); // pin head
    R(ctx, cx + 7, y + 22, 1, 1, P.accent.golden);
  }
  // RESERVED company-logo frame slots (drawImage real logos here later)
  for (let i = 0; i < 3; i++) {
    const cx = x + 6 + i * 24;
    R(ctx, cx - 1, y + 6, 22, 1, P.shadowSoft); // slot top shadow lip
    R(ctx, cx, y + 6, 22, 14, P.surface.white);
    R(ctx, cx, y + 6, 22, 1, '#ffffff');
    R(ctx, cx, y + 19, 22, 1, P.surface.line); // shaded base
    ctx.strokeStyle = P.surface.line;
    ctx.lineWidth = 1;
    ctx.strokeRect(cx + 0.5, y + 6.5, 21, 13);
    // company monogram tile (T / V / L for Takhlees / Vamonos / Lumofy) in its phase
    // colour, so each slot reads as a real employer instead of an empty "add image" frame
    ctx.save();
    ctx.fillStyle = i === 0 ? P.phase.sales.deep : i === 1 ? P.phase.hr.deep : P.phase.aidev.deep;
    ctx.font = pix(11);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const mono = i === 0 ? 'T' : i === 1 ? 'V' : 'L';
    ctx.fillText(mono, cx + 11, y + 13.5);
    ctx.fillText(mono, cx + 11.6, y + 13.5); // faux-bold (Pixelify has no bold weight)
    ctx.restore();
  }
}

// RESUME station — the centerpiece. A solid writing desk with a framed CV / "Career"
// board standing on it (subtle teal accent glow so it reads as important), a mug,
// a pencil cup, and the open portfolio book on the floor (the interaction object).
function drawDeskAndBook(vp: Viewport, x: number, y: number): void {
  const ctx = vp.ctx;
  // stronger furniture contact shadow (stacked: 3 layers, decreasing alpha at
  // increasing radius) + a thin 1px dark line so the desk grounds firmly
  softShadow(ctx, x + 27, y + 33, 34, P.shadowSoft);
  softShadow(ctx, x + 27, y + 33, 24, P.shadowSoft);
  softShadow(ctx, x + 27, y + 33, 14, P.shadowSoft);
  ctx.save();
  ctx.globalAlpha = 0.42;
  R(ctx, x + 2, y + 30, 50, 1, P.wood.dark); // 1px dark contact line under the desk
  ctx.restore();

  // accent glow behind the CV board (additive): SECONDARY tier, unified vp.t*1.5
  pool(vp, x + 27, y - 4, vp.reduced ? 22 : 22 + 2 * Math.sin(vp.t * 1.5), P.accent.teal, 0.2 + (vp.reduced ? 0 : 0.06 * Math.sin(vp.t * 1.5)));

  // --- framed CV / "Career Path" board standing on the desk ---
  const bw = 34,
    bh = 22,
    bx = x + 10,
    by = y - 18;
  R(ctx, bx - 2, by - 2, bw + 4, bh + 4, P.wood.dark); // frame outer
  R(ctx, bx - 2, by - 2, bw + 4, 1, P.wood.light); // lit top of frame
  R(ctx, bx - 2, by - 2, 1, bh + 4, P.wood.light); // lit left of frame
  R(ctx, bx + bw + 1, by - 2, 1, bh + 4, '#3A2516'); // shadow right
  R(ctx, bx, by, bw, bh, P.surface.panel); // cream CV sheet
  R(ctx, bx, by, bw, 1, P.surface.white);
  // CV header: teal name bar + golden accent
  R(ctx, bx + 3, by + 3, 16, 3, P.accent.tealDeep);
  R(ctx, bx + 21, by + 3, 8, 3, P.accent.golden);
  R(ctx, bx + 3, by + 8, bw - 6, 1, P.surface.line);
  // CV body lines (two columns of faint text rows)
  ctx.save();
  ctx.globalAlpha = 0.7;
  for (let r = 0; r < 4; r++) {
    R(ctx, bx + 3, by + 11 + r * 3, 12, 1, P.ink.faint);
    R(ctx, bx + 18, by + 11 + r * 3, 11 - (r % 2) * 3, 1, P.ink.faint);
  }
  ctx.restore();
  // easel kickstand under the board
  R(ctx, bx + bw / 2 - 1, by + bh + 2, 2, 4, P.wood.dark);

  // --- desk body: lit top, shaded apron, legs ---
  R(ctx, x, y, 54, 30, P.wood.mid);
  R(ctx, x, y, 54, 5, P.wood.light); // lit top surface
  R(ctx, x, y + 4, 54, 1, P.accent.teal); // thin teal inlay (matches counter)
  // subtle deterministic wood grain on the apron (echoes the floor-grain logic)
  ctx.save();
  ctx.globalAlpha = 0.16;
  for (let g = 0; g < 4; g++) {
    const gx = x + 4 + ((g * 71) % 40);
    const gw = 6 + ((g * 17) % 8);
    R(ctx, gx, y + 8 + ((g * 23) % 14), gw, 1, P.floor.grain);
  }
  ctx.restore();
  R(ctx, x, y + 26, 54, 4, P.wood.dark); // base shadow apron
  R(ctx, x + 4, y + 34, 6, 8, P.wood.dark);
  R(ctx, x + 4, y + 34, 1, 8, P.wood.mid); // lit left of leg
  R(ctx, x + 44, y + 34, 6, 8, P.wood.dark);

  // --- desk-top props (off to the sides, board centered) ---
  R(ctx, x + 4, y + 7, 9, 6, P.surface.white); // stacked papers
  R(ctx, x + 4, y + 7, 9, 1, '#ffffff');
  R(ctx, x + 5, y + 9, 6, 1, P.ink.faint);
  R(ctx, x + 3, y + 8, 9, 1, P.surface.line); // second sheet edge
  R(ctx, x + 45, y + 6, 5, 7, P.accent.teal); // mug
  R(ctx, x + 45, y + 6, 5, 1, '#5CC9BE'); // mug rim light
  R(ctx, x + 50, y + 8, 1, 3, P.accent.tealDeep); // mug handle
  R(ctx, x + 39, y + 5, 4, 8, P.wood.dark); // pencil cup
  R(ctx, x + 39, y + 4, 1, 2, P.accent.amber); // pencils
  R(ctx, x + 41, y + 3, 1, 3, '#46AFA6');

  // --- open portfolio "Resume" book on the floor (the interaction object) ---
  R(ctx, x + 20, y + 36, 16, 11, P.wood.dark); // cover
  R(ctx, x + 20, y + 36, 16, 1, P.wood.mid);
  R(ctx, x + 21, y + 37, 7, 9, P.surface.white); // left page
  R(ctx, x + 28, y + 37, 7, 9, P.surface.white); // right page
  ctx.save();
  ctx.globalAlpha = 0.6;
  R(ctx, x + 22, y + 39, 5, 1, P.ink.faint);
  R(ctx, x + 22, y + 41, 4, 1, P.ink.faint);
  R(ctx, x + 29, y + 39, 5, 1, P.ink.faint);
  R(ctx, x + 29, y + 41, 4, 1, P.ink.faint);
  ctx.restore();
  R(ctx, x + 27, y + 37, 2, 9, P.accent.teal); // center bookmark/spine
}

// TECH STACK — a tidy wall tool-board over a small server-rack cabinet.
// Same footprint: pegboard strip + shelf at y, rack cabinet of tool tiles below.
function drawTechShelf(vp: Viewport, x: number, y: number): void {
  const ctx = vp.ctx;
  // interactable glow: TERTIARY tier on the unified vp.t*1.5 time base, plus
  // stacked contact shadows and a thin 1px dark grounding line under the cabinet
  pool(vp, 401, 200, vp.reduced ? 16 : 16 + 2 * Math.sin(vp.t * 1.5), P.accent.teal, 0.28 + (vp.reduced ? 0 : 0.08 * Math.sin(vp.t * 1.5)));
  softShadow(ctx, 401, 224, 18, P.shadowSoft);
  softShadow(ctx, 401, 224, 12, P.shadowSoft);
  softShadow(ctx, 401, 224, 7, P.shadowSoft);
  ctx.save();
  ctx.globalAlpha = 0.42;
  R(ctx, x + 4, y + 46, 24, 1, P.wood.dark); // 1px dark contact line under the rack
  ctx.restore();

  // --- pegboard tool strip above the shelf (small device tiles) ---
  R(ctx, x + 2, y - 8, 28, 8, P.room.wainscot); // board
  R(ctx, x + 2, y - 8, 28, 1, P.wood.light);
  R(ctx, x + 2, y - 1, 28, 1, P.wood.dark);
  // peg holes (faint) + 3 little tool tiles
  ctx.save();
  ctx.globalAlpha = 0.4;
  for (let h = 0; h < 5; h++) R(ctx, x + 5 + h * 5, y - 5, 1, 1, P.wood.dark);
  ctx.restore();
  R(ctx, x + 4, y - 7, 6, 6, P.surface.panel); // doc tile
  R(ctx, x + 4, y - 7, 6, 1, P.surface.white);
  R(ctx, x + 5, y - 5, 4, 1, P.ink.faint);
  R(ctx, x + 12, y - 7, 6, 6, P.accent.teal); // terminal tile
  R(ctx, x + 12, y - 7, 6, 1, '#5CC9BE');
  R(ctx, x + 13, y - 5, 1, 1, P.surface.white); // prompt caret
  R(ctx, x + 22, y - 6, 4, 5, P.plant.base); // tiny succulent
  R(ctx, x + 23, y - 8, 1, 3, P.plant.hi);

  // --- shelf board ---
  R(ctx, x, y, 32, 6, P.wood.mid);
  R(ctx, x, y, 32, 2, P.wood.light);
  // subtle deterministic wood grain on the shelf board (floor-grain logic)
  ctx.save();
  ctx.globalAlpha = 0.16;
  for (let g = 0; g < 3; g++) {
    const gx = x + 4 + ((g * 67) % 20);
    const gw = 6 + ((g * 13) % 7);
    R(ctx, gx, y + 2 + (g % 2), gw, 1, P.floor.grain);
  }
  ctx.restore();
  R(ctx, x, y + 5, 32, 1, P.wood.dark);
  R(ctx, x + 2, y + 6, 3, 8, P.wood.dark);
  R(ctx, x + 26, y + 6, 3, 8, P.wood.dark);

  // --- server-rack cabinet of 6 tool tiles (the 6 tech tools) ---
  R(ctx, x + 2, y + 12, 26, 34, '#2A2620'); // dark cabinet
  R(ctx, x + 2, y + 12, 26, 1, '#4A443A'); // lit top rail
  R(ctx, x + 2, y + 12, 1, 34, '#3C372E'); // lit left rail
  R(ctx, x + 27, y + 12, 1, 34, '#15120D'); // shadow right rail
  R(ctx, x + 2, y + 45, 26, 1, '#15120D'); // shadow base rail
  // faint per-row separator rails so the 2x3 tiles read as distinct rack units
  ctx.save();
  ctx.globalAlpha = 0.5;
  R(ctx, x + 3, y + 16, 24, 1, '#15120D');
  R(ctx, x + 3, y + 17, 24, 1, '#3C372E'); // lit lip under the separator
  R(ctx, x + 3, y + 25, 24, 1, '#15120D');
  R(ctx, x + 3, y + 26, 24, 1, '#3C372E');
  ctx.restore();
  const chipColors = ['#1F8A8C', '#4458B0', '#E0843C', '#10666A', '#B5471F', '#6A4C93'];
  for (let i = 0; i < 6; i++) {
    const cx = x + 6 + (i % 3) * 7;
    const cy = y + 17 + Math.floor(i / 3) * 9;
    R(ctx, cx, cy, 6, 7, '#1A1712'); // tile slot recess
    // faint vertical separation between tiles in a row
    if (i % 3 !== 2) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      R(ctx, cx + 6, cy, 1, 7, '#15120D');
      ctx.restore();
    }
    R(ctx, cx + 1, cy + 1, 4, 4, chipColors[i]); // tool LED face
    R(ctx, cx + 1, cy + 1, 4, 1, 'rgba(255,255,255,0.45)'); // lit top of LED
    // tiny status LED with offset per-tile blink timing (prime-spaced phases)
    const on = vp.reduced ? true : Math.sin(vp.t * 2 + i * 2.39) > -0.3;
    R(ctx, cx + 4, cy + 5, 1, 1, on ? P.accent.golden : '#3A2516');
  }
}

// Slim floor lamp with a warm shade. Glow is baked as lit pixels (no vp here,
// so no additive pass) but still reads warm; reduced-motion safe by nature.
function drawFloorLamp(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  // contact shadow at the base
  softShadow(ctx, x + 5, y + 30, 9, P.shadowSoft);
  // weighted base, lit top-left
  R(ctx, x, y + 28, 11, 3, P.wood.mid);
  R(ctx, x, y + 28, 11, 1, P.wood.light);
  R(ctx, x, y + 29, 1, 2, P.wood.light);
  R(ctx, x + 9, y + 28, 2, 3, P.wood.dark);
  // pole with a lit left edge
  R(ctx, x + 4, y, 3, 28, P.metal.base);
  R(ctx, x + 4, y, 1, 28, P.metal.hi);
  R(ctx, x + 6, y, 1, 28, '#5E4632');
  // conical shade: lit top-left, warm underside glow lip
  R(ctx, x - 1, y - 8, 13, 10, P.glass.warm);
  R(ctx, x, y - 9, 11, 1, P.glass.lit); // bright crown
  R(ctx, x - 1, y - 8, 13, 2, P.glass.lit); // lit top band
  R(ctx, x - 1, y - 8, 1, 10, P.glass.reflect); // lit left edge
  R(ctx, x + 11, y - 8, 1, 10, '#C98A4B'); // shaded right edge
  R(ctx, x - 1, y + 1, 13, 1, P.lamp.glow); // warm glow lip at the shade mouth
  R(ctx, x + 1, y - 4, 3, 2, P.glass.reflect); // bright catch on the shade
}

function drawPotPlant(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  // the two planters differ slightly (scale + tint) so they feel placed, not
  // stamped; keyed off x so the footprint/coords are untouched (calls: 36 & 416)
  const alt = x > 200;
  const lift = alt ? 2 : 0; // right plant sits a touch taller
  const catchHi = alt ? '#7CC468' : '#6CB85C'; // slightly warmer-green catch
  softShadow(ctx, x + 9, y + 19, 11, P.shadowSoft);
  // planter: lit rim, lit left, shaded right (footprint identical for both)
  R(ctx, x, y + 10, 18, 8, P.wood.mid);
  R(ctx, x, y + 10, 18, 2, P.wood.light);
  R(ctx, x, y + 10, 2, 8, P.wood.light);
  R(ctx, x + 16, y + 10, 2, 8, P.wood.dark);
  R(ctx, x, y + 16, 18, 2, P.wood.dark);
  // layered leaves (dark base, lit left, shaded right) for a fuller bush
  R(ctx, x + 2, y - (lift >> 1), 5, 11 + (lift >> 1), P.plant.dark);
  R(ctx, x + 7, y - 3 - lift, 5, 14 + lift, P.plant.base);
  R(ctx, x + 11, y - (lift >> 1), 5, 11 + (lift >> 1), alt ? P.plant.base : P.plant.hi);
  R(ctx, x + 7, y - 3 - lift, 2, 5, catchHi); // top-left leaf catch
  R(ctx, x + 4, y + 1, 1, 8, P.plant.base); // inner left frond
  R(ctx, x + 13, y + 2, 1, 8, P.plant.dark); // shaded right frond
  if (alt) R(ctx, x + 9, y - 5, 1, 5, P.plant.hi); // a lone tall sprig (variation)
}

function drawFern(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  softShadow(ctx, x + 9, y + 33, 11, P.shadowSoft);
  // pot: lit rim + left, shaded right + base
  R(ctx, x + 2, y + 22, 14, 10, P.wood.mid);
  R(ctx, x + 2, y + 22, 14, 2, P.wood.light);
  R(ctx, x + 2, y + 22, 2, 10, P.wood.light);
  R(ctx, x + 14, y + 22, 2, 10, P.wood.dark);
  R(ctx, x + 2, y + 30, 14, 2, P.wood.dark);
  // arching fronds: dark base, lit left, shaded right + a few leaf ticks
  R(ctx, x, y, 5, 24, P.plant.dark);
  R(ctx, x + 5, y - 4, 6, 28, P.plant.base);
  R(ctx, x + 11, y, 5, 24, P.plant.hi);
  R(ctx, x + 5, y - 4, 2, 10, '#6CB85C'); // top-left frond catch
  R(ctx, x + 1, y + 4, 1, 16, P.plant.base); // outer left blade
  R(ctx, x + 14, y + 4, 1, 16, P.plant.dark); // outer right blade
}

// Slim clip-on desk lamp tucked at the resume desk's left edge, with a tiny
// warm additive glow. Footprint hugs the desk so it never blocks a lane.
function drawDeskLamp(vp: Viewport, x: number, y: number): void {
  const ctx = vp.ctx;
  softShadow(ctx, x + 4, y + 24, 7, P.shadowSoft);
  // small weighted base clamped beside the desk
  R(ctx, x, y + 20, 8, 4, P.metal.base);
  R(ctx, x, y + 20, 8, 1, P.metal.hi);
  R(ctx, x + 7, y + 20, 1, 4, '#4A382A');
  // jointed arm: up then angled over the desk top-right
  R(ctx, x + 3, y + 6, 2, 14, P.metal.base);
  R(ctx, x + 3, y + 6, 1, 14, P.metal.hi);
  R(ctx, x + 4, y + 5, 9, 2, P.metal.base);
  R(ctx, x + 4, y + 5, 9, 1, P.metal.hi);
  // angled conical head pointing down at the desk
  R(ctx, x + 10, y + 6, 7, 5, P.accent.amber);
  R(ctx, x + 10, y + 6, 7, 1, P.accent.golden); // lit top of shade
  R(ctx, x + 10, y + 6, 1, 5, P.accent.golden); // lit left
  R(ctx, x + 16, y + 6, 1, 5, '#B5471F'); // shaded right
  R(ctx, x + 11, y + 10, 5, 1, P.lamp.glow); // warm bulb lip
  // tiny warm glow under the head (additive): lowered so it is no longer a hot
  // spot, breathing on the unified vp.t*1.5 time base
  pool(vp, x + 13, y + 12, vp.reduced ? 12 : 12 + Math.sin(vp.t * 1.5), P.glowKit.lamp, 0.095 + (vp.reduced ? 0 : 0.03 * Math.sin(vp.t * 1.5)));
}

// Top-wall decor over the sealed gallery band: a round wall clock centered
// between the middle easels, and two small framed certificates in the easel
// gaps. All hang at y~22..34, above the easel screens, with 1px drop shadows.
function drawWallDecor(vp: Viewport): void {
  const ctx = vp.ctx;
  // --- round wall clock (centered gap, x=235) ---
  const cx = 235,
    cy = 28;
  ctx.save();
  ctx.globalAlpha = 0.4;
  R(ctx, cx - 6, cy + 7, 14, 2, P.shadowSoft); // drop shadow
  ctx.restore();
  R(ctx, cx - 7, cy - 7, 14, 14, P.wood.dark); // rim
  R(ctx, cx - 7, cy - 7, 14, 1, P.wood.mid);
  R(ctx, cx - 6, cy - 6, 12, 12, P.surface.panel); // face
  R(ctx, cx - 6, cy - 6, 12, 1, P.surface.white);
  // tick marks (12/3/6/9)
  R(ctx, cx, cy - 5, 1, 1, P.ink.faint);
  R(ctx, cx, cy + 4, 1, 1, P.ink.faint);
  R(ctx, cx - 5, cy, 1, 1, P.ink.faint);
  R(ctx, cx + 4, cy, 1, 1, P.ink.faint);
  // hands: static hour hand toward ~10; minute hand sweeps slowly when allowed
  R(ctx, cx - 3, cy - 2, 3, 1, P.ink.text); // hour hand pointing up-left
  R(ctx, cx - 3, cy - 1, 1, 1, P.ink.text);
  if (vp.reduced) {
    R(ctx, cx, cy - 4, 1, 4, P.accent.tealDeep); // static minute hand (up)
  } else {
    // sweep the minute tip around a small circle; draw a 1px tip + a 1px mid
    const a = vp.t * 0.5;
    const tx = cx + Math.round(Math.sin(a) * 4);
    const ty = cy - Math.round(Math.cos(a) * 4);
    const mx = cx + Math.round(Math.sin(a) * 2);
    const my = cy - Math.round(Math.cos(a) * 2);
    R(ctx, mx, my, 1, 1, P.accent.tealDeep);
    R(ctx, tx, ty, 1, 1, P.accent.tealDeep);
  }
  R(ctx, cx, cy, 1, 1, P.accent.amber); // center pin

  // --- two small framed certificates in the easel gaps ---
  for (const fx of [132, 337]) {
    ctx.save();
    ctx.globalAlpha = 0.4;
    R(ctx, fx - 7, cy + 8, 16, 2, P.shadowSoft); // drop shadow
    ctx.restore();
    R(ctx, fx - 8, cy - 8, 16, 16, P.wood.mid); // frame
    R(ctx, fx - 8, cy - 8, 16, 1, P.wood.light);
    R(ctx, fx - 8, cy - 8, 1, 16, P.wood.light);
    R(ctx, fx + 7, cy - 8, 1, 16, P.wood.dark);
    R(ctx, fx - 6, cy - 6, 12, 12, P.surface.panel); // mat
    R(ctx, fx - 6, cy - 6, 12, 1, P.surface.white);
    // a tiny gold seal + caption lines (a certificate)
    R(ctx, fx - 1, cy - 4, 3, 3, P.accent.golden);
    R(ctx, fx, cy - 3, 1, 1, P.accent.amber);
    ctx.save();
    ctx.globalAlpha = 0.6;
    R(ctx, fx - 4, cy + 1, 8, 1, P.ink.faint);
    R(ctx, fx - 3, cy + 3, 6, 1, P.ink.faint);
    ctx.restore();
  }
}

// Cozy edge props OFF every walking lane: a small book stack + mug on the far
// right of the (sealed) counter, sticky notes on the right wall above the tech
// rack, and a framed certificate on the left wall below the window.
function drawCozyProps(ctx: CanvasRenderingContext2D): void {
  // --- book stack + mug on the counter top, in the gap between easels 295/380
  // (behind the sealed counter, so never on a walking lane) ---
  const bx = 326,
    by = 92;
  ctx.save();
  ctx.globalAlpha = 0.4;
  R(ctx, bx - 1, by + 8, 16, 2, P.shadowSoft);
  ctx.restore();
  const spines = [P.accent.tealDeep, P.accent.indigo, P.accent.amber];
  for (let i = 0; i < 3; i++) {
    const byy = by + 5 - i * 3;
    const bw = 14 - i * 2;
    R(ctx, bx + i, byy, bw, 3, spines[i]);
    R(ctx, bx + i, byy, bw, 1, 'rgba(255,255,255,0.35)'); // lit top of book
    R(ctx, bx + i, byy, 1, 3, 'rgba(255,255,255,0.25)'); // lit spine left
  }
  // a small mug beside the books
  R(ctx, bx + 16, by + 3, 5, 5, P.surface.panel);
  R(ctx, bx + 16, by + 3, 5, 1, P.surface.white);
  R(ctx, bx + 17, by + 4, 3, 1, P.accent.teal); // coffee
  R(ctx, bx + 21, by + 4, 1, 2, P.ink.faint); // handle

  // --- sticky notes pinned to the right wall face, above the tech rack ---
  const nx = 437;
  const noteCols = [P.accent.golden, '#F6C9A0', P.glow.cyan];
  const tilts = [-0.09, 0.07, -0.05]; // tiny per-note tilt so they feel hand-stuck
  for (let i = 0; i < 3; i++) {
    const ny = 130 + i * 11;
    // pivot the whole note around its centre by a small angle, then draw locally
    ctx.save();
    ctx.translate(nx + 4.5, ny + 4.5);
    ctx.rotate(tilts[i]);
    ctx.translate(-(nx + 4.5), -(ny + 4.5));
    ctx.save();
    ctx.globalAlpha = 0.4;
    R(ctx, nx + 1, ny + 9, 9, 1, P.shadowSoft);
    ctx.restore();
    R(ctx, nx, ny, 9, 9, noteCols[i]);
    R(ctx, nx, ny, 9, 1, '#ffffff'); // lit top edge
    R(ctx, nx, ny + 8, 9, 1, 'rgba(60,40,20,0.18)'); // curled base shade
    R(ctx, nx + 4, ny - 1, 1, 1, P.metal.base); // a tiny pushpin at the top
    ctx.save();
    ctx.globalAlpha = 0.45;
    R(ctx, nx + 2, ny + 3, 5, 1, P.ink.faint); // scribble
    R(ctx, nx + 2, ny + 5, 4, 1, P.ink.faint);
    ctx.restore();
    ctx.restore();
  }

  // --- framed certificate on the left wall, below the window (wall-mounted) ---
  const fx = 22,
    fy = 182;
  ctx.save();
  ctx.globalAlpha = 0.4;
  R(ctx, fx + 1, fy + 18, 14, 2, P.shadowSoft);
  R(ctx, fx + 13, fy + 1, 2, 18, P.shadowSoft);
  ctx.restore();
  R(ctx, fx, fy, 13, 18, P.wood.mid); // frame
  R(ctx, fx, fy, 13, 1, P.wood.light);
  R(ctx, fx, fy, 1, 18, P.wood.light);
  R(ctx, fx + 12, fy, 1, 18, P.wood.dark);
  R(ctx, fx + 11, fy, 1, 18, P.wood.dark);
  R(ctx, fx + 2, fy + 2, 9, 14, P.surface.panel); // paper
  R(ctx, fx + 2, fy + 2, 9, 1, P.surface.white);
  R(ctx, fx + 4, fy + 4, 5, 3, P.accent.tealDeep); // header band
  R(ctx, fx + 5, fy + 11, 3, 3, P.accent.golden); // gold seal
  ctx.save();
  ctx.globalAlpha = 0.6;
  R(ctx, fx + 4, fy + 8, 5, 1, P.ink.faint);
  R(ctx, fx + 4, fy + 9, 4, 1, P.ink.faint);
  ctx.restore();
}

function drawVignette(vp: Viewport): void {
  const ctx = vp.ctx;
  const cx = vp.cam.x + vp.vw / vp.zoom / 2;
  const cy = vp.cam.y + vp.vh / vp.zoom / 2;
  const r = Math.max(vp.vw, vp.vh) / vp.zoom;
  ctx.save();
  const g = ctx.createRadialGradient(cx, cy, r * 0.42, cx, cy, r * 0.72);
  g.addColorStop(0, 'rgba(58,36,20,0)');
  g.addColorStop(1, 'rgba(58,36,20,0.16)');
  ctx.fillStyle = g;
  ctx.fillRect(vp.cam.x - 20, vp.cam.y - 20, vp.vw / vp.zoom + 40, vp.vh / vp.zoom + 40);
  ctx.restore();
}

function drawMotes(vp: Viewport): void {
  const ctx = vp.ctx;
  ctx.save();
  for (const m of motes) {
    m.y -= 0.12;
    if (m.y < 36) m.y = 320;
    ctx.globalAlpha = 0.14 + 0.1 * Math.sin(m.a + vp.t * 1.3);
    ctx.fillStyle = P.lamp.glow;
    ctx.fillRect(Math.round(m.x), Math.round(m.y), 1, 1);
  }
  ctx.restore();
}
