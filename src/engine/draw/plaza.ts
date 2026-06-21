import { palette as P } from '../../theme/palette';
import { R, roundRectPath, softShadow, staticLayer, type StaticLayerCtx, type Viewport } from '../render';
import type { Door } from '../systems/door';
import type { Entity } from '../types';
import { drawSayed, drawRecruiter, drawLostOne } from './sprites';
import { drawDoor } from './door';
import { drawBird } from './birds';
import type { BirdsState } from '../systems/birds';

// Cozy, warm, Moonlighter-inspired cottage-studio courtyard where Sayed waits.
const LAWNS = [
  { x: 6, y: 184, w: 152, h: 240 },
  { x: 322, y: 184, w: 152, h: 240 },
];

interface Blade {
  x: number;
  y: number;
  h: number;
  tone: number;
  lead: boolean; // thicker "leader" blade for tuft variety
}
interface Mote {
  x: number;
  y: number;
  s: number;
  a: number;
}
interface Speck {
  x: number;
  y: number;
  kind: number; // 0 dry tuft, 1 dark tuft, 2 clover, 3 pebble, 4 leaf speck
}
interface Leaf {
  x: number;
  y: number;
  sp: number; // fall speed
  sw: number; // sway phase
  c: string;
}
interface Clump {
  x: number;
  y: number;
}

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

const blades: Blade[] = (() => {
  const out: Blade[] = [];
  const rnd = lcg(20260618);
  for (const b of LAWNS) {
    for (let yy = b.y + 4; yy < b.y + b.h - 2; yy += 6) {
      for (let xx = b.x + 4; xx < b.x + b.w - 2; xx += 6) {
        if (rnd() < 0.32) continue;
        out.push({ x: xx + (rnd() * 3 - 1.5), y: yy + (rnd() * 3 - 1.5), h: 6 + rnd() * 5, tone: rnd(), lead: rnd() < 0.16 });
      }
    }
  }
  return out;
})();
// Sparse, deterministic lawn texture (tufts, clover, pebbles, fallen leaf specks),
// kept clear of prop/path zones so the grass still reads clean.
const specks: Speck[] = (() => {
  const out: Speck[] = [];
  const rnd = lcg(540231);
  for (const b of LAWNS) {
    for (let yy = b.y + 6; yy < b.y + b.h - 6; yy += 14) {
      for (let xx = b.x + 6; xx < b.x + b.w - 6; xx += 14) {
        const r = rnd();
        if (r < 0.62) continue;
        const px = Math.round(xx + (rnd() * 6 - 3));
        const py = Math.round(yy + (rnd() * 6 - 3));
        const k = r < 0.7 ? 0 : r < 0.78 ? 1 : r < 0.86 ? 2 : r < 0.94 ? 3 : 4;
        out.push({ x: px, y: py, kind: k });
      }
    }
  }
  return out;
})();
// Lush Moonlighter-style grass clumps scattered across the lawns (deterministic).
const clumps: Clump[] = (() => {
  const out: Clump[] = [];
  const rnd = lcg(330217);
  for (const b of LAWNS) {
    for (let i = 0; i < 9; i++) {
      out.push({ x: Math.round(b.x + 8 + rnd() * (b.w - 16)), y: Math.round(b.y + 12 + rnd() * (b.h - 22)) });
    }
  }
  return out;
})();
const motes: Mote[] = (() => {
  const rnd = lcg(99173);
  return Array.from({ length: 12 }, () => ({ x: rnd() * 480, y: rnd() * 420, s: 4 + rnd() * 8, a: rnd() * 6 }));
})();
// A few slow-drifting fallen leaves over the courtyard (additive-free, simple sprites).
const leaves: Leaf[] = (() => {
  const rnd = lcg(771904);
  const tints = ['#C9663A', '#D8843C', P.lawn.dry, '#B5562E'];
  return Array.from({ length: 5 }, () => ({
    x: rnd() * 480,
    y: rnd() * 432,
    sp: 5 + rnd() * 6,
    sw: rnd() * 6.28,
    c: tints[Math.floor(rnd() * tints.length)],
  }));
})();

// PERF: the additive glow gradients (cottage windows, lanterns) never change shape
// frame-to-frame (only globalAlpha varies), so build each once and reuse it instead
// of allocating a fresh radial gradient per source per frame. Keyed by source x.
const glowCache = new Map<string, CanvasGradient>();

export function drawPlaza(vp: Viewport, world: { player: Entity; npc: Entity; lostOne: Entity; door: Door; birds: BirdsState | null }): void {
  const ctx = vp.ctx;
  const x0 = Math.floor(vp.cam.x) - 40;
  const y0 = Math.floor(vp.cam.y) - 40;
  const x1 = vp.cam.x + vp.vw / vp.zoom + 40;
  const y1 = vp.cam.y + vp.vh / vp.zoom + 40;
  R(ctx, x0, y0, x1 - x0, y1 - y0, P.plaza.stone2);

  staticLayer(vp, 'plaza:bg', 480, 432, buildPlazaBg); // baked: paving + welcome path + lawns
  drawGrass(vp, world.player);
  staticLayer(vp, 'plaza:mid', 480, 432, buildPlazaMid); // baked: roof + facade
  drawCottageWindow(vp, 64, 78);
  drawCottageWindow(vp, 150, 78);
  drawCottageWindow(vp, 300, 78);
  drawCottageWindow(vp, 386, 78);
  drawBrandSign(ctx);
  drawDoor(vp, world.door);
  drawWelcomeMat(ctx, 216, 150);
  drawPlanter(ctx, 150, 150);
  drawPlanter(ctx, 316, 150);
  drawTree(ctx, 72, 250);
  drawTree(ctx, 408, 250);
  drawFeeder(ctx, 110, 380);
  // (the plaza About board was removed — the in-studio About station is now the single "About Sayed")
  drawBench(ctx, 294, 272);
  drawLantern(vp, 96, 300);
  drawLantern(vp, 374, 300);
  drawFlowers(ctx);

  // depth pass: birds, the player and Sayed all y-sorted together so a bird
  // perched/feeding behind the player draws behind, and one in front draws over
  const ents: Array<{ y: number; draw: () => void }> = [
    { y: world.npc.y, draw: () => drawSayed(vp, world.npc) },
    { y: world.lostOne.y, draw: () => drawLostOne(vp, world.lostOne) },
    { y: world.player.y, draw: () => drawRecruiter(vp, world.player) },
  ];
  if (world.birds) for (const b of world.birds.birds) ents.push({ y: b.y, draw: () => drawBird(vp, b) });
  ents.sort((a, b) => a.y - b.y);
  for (const o of ents) o.draw();

  if (!vp.reduced) {
    drawGodRays(ctx);
    drawLeaves(vp);
    drawMotes(vp);
  }
}

// Static plaza dressing baked once into offscreen layers (see staticLayer). Each is
// blitted in place in drawPlaza, so z-order is unchanged. The heavy paving + lawn +
// facade loops become two drawImage calls; trees/flowers/bench stay per-frame so their
// z-order with grass/lanterns is preserved automatically.
function buildPlazaBg(s: StaticLayerCtx): void {
  drawPaving(s.ctx);
  drawWelcomePath(s.ctx);
  drawLawns(s.ctx);
}
function buildPlazaMid(s: StaticLayerCtx): void {
  drawRoof(s.ctx);
  drawFacade(s.ctx);
}

function drawPaving(ctx: CanvasRenderingContext2D): void {
  R(ctx, 0, 150, 480, 282, P.plaza.stone2);
  const rnd = lcg(733);
  for (let y = 150; y < 432; y += 16) {
    for (let x = 0; x < 480; x += 16) {
      const r = rnd();
      // bias to the mid tone so the courtyard reads calm, not a busy checker
      const c = r < 0.18 ? P.plaza.stone : r < 0.82 ? P.plaza.stone2 : P.plaza.walk;
      roundRectPath(ctx, x + 1, y + 1, 14, 14, 3);
      ctx.fillStyle = c;
      ctx.fill();
      // top-left catch-light + bottom-right soft seam shadow give each flag depth
      R(ctx, x + 2, y + 1, 11, 1, P.plaza.hi);
      R(ctx, x + 1, y + 2, 1, 10, P.plaza.hi);
      ctx.save();
      ctx.globalAlpha = 0.5; // soft, low-contrast seam
      R(ctx, x + 2, y + 13, 12, 1, P.plaza.seam);
      R(ctx, x + 13, y + 2, 1, 11, P.plaza.seam);
      ctx.restore();
      const d = rnd();
      // a few hairline cracks + chipped corners on some stones (slightly more frequent)
      if (d < 0.11) {
        R(ctx, x + 4, y + 5, 5, 1, P.plaza.crack);
        R(ctx, x + 8, y + 6, 1, 3, P.plaza.crack);
      } else if (d < 0.17) {
        R(ctx, x + 12, y + 12, 2, 2, P.plaza.stone2);
        R(ctx, x + 12, y + 12, 2, 1, P.plaza.crack);
      } else if (d < 0.24) {
        // an occasional faint internal seam splitting a flag into two halves
        ctx.save();
        ctx.globalAlpha = 0.45;
        R(ctx, x + 7, y + 3, 1, 9, P.plaza.seam);
        ctx.restore();
      }
      // a touch of moss in seams, but only near the courtyard edges (off the centre)
      if (d > 0.93 && (x < 96 || x > 384 || y > 392)) {
        ctx.save();
        ctx.globalAlpha = 0.45;
        R(ctx, x + 3, y + 13, 4, 1, P.plaza.moss);
        R(ctx, x + 13, y + 5, 1, 4, P.plaza.moss);
        ctx.restore();
      }
    }
  }
}

function drawWelcomePath(ctx: CanvasRenderingContext2D): void {
  // tidy lighter runway from the path edge so the route to the door reads clearly walkable
  ctx.save();
  ctx.globalAlpha = 0.5;
  R(ctx, 206, 150, 2, 282, P.plaza.edge);
  R(ctx, 272, 150, 2, 282, P.plaza.edge);
  ctx.restore();
  const rnd = lcg(421);
  for (let y = 150; y < 432; y += 20) {
    for (let x = 208; x < 272; x += 20) {
      roundRectPath(ctx, x + 1, y + 1, 18, 18, 4);
      ctx.fillStyle = rnd() < 0.5 ? P.plaza.walk : P.plaza.stone;
      ctx.fill();
      R(ctx, x + 2, y + 2, 14, 1, P.plaza.hi); // top-left catch-light
      R(ctx, x + 1, y + 2, 1, 14, P.plaza.hi);
      ctx.save();
      ctx.globalAlpha = 0.4;
      R(ctx, x + 2, y + 17, 16, 1, P.plaza.seam); // soft bottom seam
      ctx.restore();
      if (rnd() < 0.12) R(ctx, x + 6, y + 8, 4, 1, P.plaza.crack); // occasional hairline
    }
  }
}

function drawLawns(ctx: CanvasRenderingContext2D): void {
  const rnd = lcg(31477);
  for (const b of LAWNS) {
    R(ctx, b.x, b.y, b.w, b.h, P.lawn.base);
    // soft, irregular mowing patches instead of a hard banded stripe: low-alpha
    // tone2/hi blocks of varied height so the turf reads textured, not striped
    ctx.save();
    let y = b.y + 4;
    while (y < b.y + b.h - 6) {
      const h = 8 + Math.floor(rnd() * 10);
      const r = rnd();
      if (r < 0.4) {
        ctx.globalAlpha = 0.22;
        R(ctx, b.x, y, b.w, h, P.lawn.tone2);
      } else if (r < 0.62) {
        ctx.globalAlpha = 0.18;
        R(ctx, b.x, y, b.w, h, P.lawn.hi);
      }
      y += h + 2 + Math.floor(rnd() * 4);
    }
    ctx.restore();
    // a faint top-left lit edge inside the turf, then the warm soil border
    ctx.save();
    ctx.globalAlpha = 0.5;
    R(ctx, b.x + 1, b.y + 1, b.w - 2, 1, P.lawn.tip);
    R(ctx, b.x + 1, b.y + 1, 1, b.h - 2, P.lawn.tip);
    ctx.restore();
    R(ctx, b.x - 2, b.y - 2, b.w + 4, 2, '#7C5A3A');
    R(ctx, b.x - 2, b.y + b.h, b.w + 4, 2, '#7C5A3A');
    R(ctx, b.x - 2, b.y - 2, 2, b.h + 4, '#7C5A3A'); // left edge so grass meets stone softly
    R(ctx, b.x + b.w, b.y - 2, 2, b.h + 4, '#7C5A3A'); // right edge
  }
  drawSpecks(ctx);
  drawClumps(ctx);
}

// Sparse fixed scatter of tufts/clover/pebbles/leaf flecks across the lawns.
function drawSpecks(ctx: CanvasRenderingContext2D): void {
  for (const s of specks) {
    switch (s.kind) {
      case 0: // dry lighter tuft
        R(ctx, s.x, s.y, 2, 1, P.lawn.dry);
        R(ctx, s.x, s.y - 1, 1, 1, P.lawn.dry);
        break;
      case 1: // darker tuft
        R(ctx, s.x, s.y, 2, 1, P.lawn.tone2);
        R(ctx, s.x + 1, s.y - 1, 1, 1, P.lawn.tone2);
        break;
      case 2: // clover dot
        R(ctx, s.x, s.y, 1, 1, P.lawn.clover);
        R(ctx, s.x + 1, s.y, 1, 1, P.lawn.clover);
        R(ctx, s.x, s.y + 1, 1, 1, P.lawn.clover);
        break;
      case 3: // pebble with a top catch-light
        R(ctx, s.x, s.y, 3, 2, P.ground.pebble);
        R(ctx, s.x, s.y, 2, 1, P.ground.pebbleHi);
        break;
      default: // tiny fallen leaf speck
        R(ctx, s.x, s.y, 2, 1, P.flower.leaf);
        break;
    }
  }
}

// Small Moonlighter-style grass clumps (denser rounded tufts) for a lush lawn.
function drawClumps(ctx: CanvasRenderingContext2D): void {
  for (const c of clumps) {
    R(ctx, c.x - 3, c.y - 1, 7, 3, P.lawn.shadow); // dark mound base
    R(ctx, c.x - 2, c.y - 2, 5, 2, P.lawn.base); // mid
    R(ctx, c.x - 1, c.y - 3, 3, 1, P.lawn.hi); // lit crown
    R(ctx, c.x - 2, c.y - 4, 1, 2, P.lawn.tip); // upright blade tips
    R(ctx, c.x, c.y - 5, 1, 3, P.lawn.tip);
    R(ctx, c.x + 2, c.y - 4, 1, 2, P.lawn.tip);
  }
}

// Tone tiers reused for the batched grass stroke groups (dry / tone2 / hi / tip).
const GRASS_COLS = [P.lawn.dry, P.lawn.tone2, P.lawn.hi, P.lawn.tip];

function drawGrass(vp: Viewport, player: Entity): void {
  const ctx = vp.ctx;
  const t = vp.t;
  const reduced = vp.reduced;
  const px = player.x;
  const py = player.y;
  const moving = player.moving;
  // PERF: batch every blade into a few Path2D groups so the whole lawn strokes in
  // ~10 draw calls per frame instead of ~1400. Group by tone tier; 1px field blades
  // and 2px "leader" blades stroke at their own widths; bright tips batch separately.
  const stalk = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
  const lead = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
  const tips = new Path2D();
  const tipsLead = new Path2D();
  for (const bl of blades) {
    let sway = reduced ? 0 : Math.sin(t * 1.2 + bl.x * 0.18) * 2.4 + Math.sin(t * 2.1 + bl.x * 0.31) * 0.7;
    // rustle: blades bend away from the player and wobble as they walk through
    if (!reduced) {
      const dx = bl.x - px;
      const dy = bl.y - py;
      const d2 = dx * dx + dy * dy;
      if (d2 < 289) {
        const f = 1 - Math.sqrt(d2) / 17;
        const m = moving ? 1 : 0.35;
        sway += (dx >= 0 ? 1 : -1) * f * 4 * m + Math.sin(t * 17 + bl.x) * f * 1.6 * m;
      }
    }
    const tx = bl.x + sway;
    const ty = bl.y - bl.h;
    const ci = bl.tone > 0.74 ? 3 : bl.tone > 0.5 ? 2 : bl.tone > 0.24 ? 1 : 0;
    const p = bl.lead ? lead[ci] : stalk[ci];
    p.moveTo(bl.x, bl.y);
    p.lineTo(tx, ty);
    // a brighter sunlit cap on the upper third of taller / leader blades
    if (bl.h > 8.5 || bl.lead) {
      const tp = bl.lead ? tipsLead : tips;
      tp.moveTo(bl.x + sway * 0.6, bl.y - bl.h * 0.6);
      tp.lineTo(tx, ty);
    }
  }
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = GRASS_COLS[i];
    ctx.stroke(stalk[i]);
  }
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = GRASS_COLS[i];
    ctx.stroke(lead[i]);
  }
  ctx.strokeStyle = P.lawn.tip;
  ctx.lineWidth = 1;
  ctx.stroke(tips);
  ctx.lineWidth = 2;
  ctx.stroke(tipsLead);
  ctx.restore();
}

function drawRoof(ctx: CanvasRenderingContext2D): void {
  // Wooden shingle roof reading steeper: darker base, three overlapping courses of
  // staggered wooden shakes (lit top edge, shaded underside), a ridge beam and eaves
  // overhang. Same footprint: field y34..60, ridge at y32, chimneys at x96/x350.
  const SHAKE = '#9A5A33'; // warm wood shake
  const SHAKE2 = '#8A4E2A'; // alternate darker shake
  const SHAKE_HI = '#C08049'; // sun-lit top edge
  const SHAKE_SH = '#6E3C1E'; // shake underside / seam shadow
  const SHAKE_CAP_HI = '#D49A60'; // occasional bleached/sun-lit shingle cap
  const SHAKE_CAP_DK = '#5E331A'; // occasional weathered-dark shingle cap
  const MOSS = '#5E6E3A'; // faint roof moss
  R(ctx, 36, 34, 408, 26, '#7A4424'); // dark roof base behind the shakes
  const courses = [
    [34, SHAKE],
    [42, SHAKE2],
    [50, SHAKE],
  ] as const;
  const rs = lcg(50711); // deterministic shingle-cap / weathering variation
  for (let ci = 0; ci < courses.length; ci++) {
    const [ry, base] = courses[ci];
    const stagger = ci % 2 === 0 ? 0 : 9; // offset alternate courses for a woven shake look
    for (let x = 36 - stagger; x < 444; x += 18) {
      const sx = Math.max(36, x);
      const sw = Math.min(x + 16, 444) - sx;
      if (sw <= 0) continue;
      const c = ((x >> 4) & 1) === 0 ? base : base === SHAKE ? SHAKE2 : SHAKE;
      R(ctx, sx, ry, sw, 8, c);
      // occasional lighter/darker shingle caps so the courses read hand-laid, not uniform
      const cap = rs();
      if (cap < 0.12) R(ctx, sx, ry, sw, 8, SHAKE_CAP_HI);
      else if (cap < 0.22) R(ctx, sx, ry, sw, 8, SHAKE_CAP_DK);
      R(ctx, sx, ry, sw, 1, SHAKE_HI); // lit top edge per shake
      R(ctx, sx, ry + 7, sw, 1, SHAKE_SH); // shaded underside per course
      if (x + 16 <= 444) R(ctx, x + 15, ry, 1, 8, SHAKE_SH); // shadow seam between shakes
    }
  }
  // ridge beam: a defined timber cap with a lit crown
  R(ctx, 36, 32, 408, 4, '#8A5230');
  R(ctx, 36, 32, 408, 1, '#C9905A'); // lit ridge crown
  R(ctx, 36, 35, 408, 1, SHAKE_SH); // ridge underside shadow
  // faint moss streaks along the ridge for a weathered, settled roof
  ctx.save();
  ctx.globalAlpha = 0.3;
  const rm = lcg(50713);
  for (let mx = 52; mx < 436; mx += 22) {
    if (rm() < 0.45) continue;
    R(ctx, mx, 33, 2 + Math.floor(rm() * 4), 1, MOSS);
  }
  ctx.restore();
  // eaves overhang: a thin lit lip then a deeper under-eave shadow onto the wall
  R(ctx, 34, 58, 412, 2, '#A86A3C'); // overhang lip (sticks out 2px each side)
  R(ctx, 34, 58, 412, 1, '#C9905A'); // lit edge of the overhang
  // faint moss tucked under the eave line where damp collects
  ctx.save();
  ctx.globalAlpha = 0.26;
  for (let mx = 60; mx < 430; mx += 30) {
    if (rm() < 0.5) continue;
    R(ctx, mx, 57, 3, 1, MOSS);
  }
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = 0.42;
  R(ctx, 36, 60, 408, 3, '#4A2A14'); // under-eave cast shadow (building depth)
  ctx.restore();
  R(ctx, 96, 22, 18, 14, '#7A4E2A'); // left chimney
  R(ctx, 96, 22, 3, 14, '#9C6838'); // lit-left
  R(ctx, 111, 22, 3, 14, '#5A3A22'); // shadow-right
  R(ctx, 96, 20, 18, 3, '#C9663A');
  R(ctx, 350, 20, 20, 16, '#7A4E2A'); // right chimney
  R(ctx, 350, 20, 3, 16, '#9C6838');
  R(ctx, 367, 20, 3, 16, '#5A3A22');
  R(ctx, 350, 18, 20, 3, '#C9663A');
}

function drawFacade(ctx: CanvasRenderingContext2D): void {
  // Warm wooden Moonlighter cottage: vertical plank walls with seams, knots and a
  // top-left lit / right-shaded read. Same footprint per block (bx,60 .. 172x90).
  const PLANK = '#A6743E';
  const PLANK2 = '#9C6A38'; // alternating board tone
  const SEAM = '#6E4524'; // board seam shadow
  const LIT = '#C28A50'; // top-left board catch-light
  const KNOT = '#7A4E28';
  for (const bx of [40, 268]) {
    R(ctx, bx, 60, 172, 90, PLANK);
    // vertical boards: alternate tone every 12px with a shaded seam + a thin lit edge
    for (let i = 0, vx = bx; vx < bx + 172; vx += 12, i++) {
      const w = Math.min(12, bx + 172 - vx);
      if (i % 2 === 1) R(ctx, vx, 60, w, 90, PLANK2);
      R(ctx, vx, 60, 1, 90, LIT); // lit left edge of each board
      if (vx + w - 1 < bx + 172) R(ctx, vx + w - 1, 60, 1, 90, SEAM); // seam shadow on the right
    }
    // a couple of deterministic knots/grain dabs per board run for hand-crafted warmth,
    // with varied intensity so some knots read deep and some are faint surface grain
    const kn = lcg(bx === 40 ? 8101 : 8102);
    for (let k = 0; k < 6; k++) {
      const kx = bx + 6 + Math.floor(kn() * 158);
      const ky = 70 + Math.floor(kn() * 64);
      const deep = kn() < 0.5;
      R(ctx, kx, ky, 2, 2, deep ? '#5E3A1E' : KNOT); // deeper or lighter knot core
      R(ctx, kx, ky, 1, 1, SEAM);
      if (deep) R(ctx, kx, ky + 2, 2, 1, KNOT); // a short grain tail under the deeper knots
    }
    // a small weathered repair patch + a faint plinth damp-stain, varied per wall
    const wn = lcg(bx === 40 ? 8201 : 8202);
    const ppx = bx + 20 + Math.floor(wn() * 120);
    const ppy = 96 + Math.floor(wn() * 30);
    R(ctx, ppx, ppy, 9, 7, PLANK2); // mismatched repair board
    R(ctx, ppx, ppy, 9, 1, LIT); // its lit top edge
    R(ctx, ppx, ppy, 1, 7, LIT);
    R(ctx, ppx + 8, ppy, 1, 7, SEAM); // its shaded seam
    R(ctx, ppx + 2, ppy + 3, 1, 1, KNOT); // a tiny nail/knot on the patch
    ctx.save();
    ctx.globalAlpha = 0.2;
    const stx = bx + 30 + Math.floor(wn() * 110);
    R(ctx, stx, 144, 10, 5, '#5E3A1E'); // faint damp stain rising off the plinth
    R(ctx, stx + 3, 142, 5, 2, '#5E3A1E');
    ctx.restore();
    // overall top-left light wash + right inner shade across the whole wall
    ctx.save();
    ctx.globalAlpha = 0.5;
    R(ctx, bx + 1, 61, 170, 1, LIT); // top lit course
    R(ctx, bx + 1, 61, 1, 88, LIT); // left lit course
    R(ctx, bx + 168, 62, 1, 86, SEAM); // right inner shade
    ctx.restore();
    // corner timber posts framing the plank wall (lit-left edge each), with a few
    // weathered nicks and a worn base so the corners read aged, not freshly milled
    for (const tx of [bx, bx + 168]) {
      R(ctx, tx, 60, 4, 90, P.facade.parapet);
      R(ctx, tx, 60, 1, 90, '#A06A40');
      R(ctx, tx + 3, 60, 1, 90, SEAM);
      R(ctx, tx + 1, 84, 2, 1, SEAM); // weathered nick mid-post
      R(ctx, tx + 1, 118, 2, 1, SEAM);
      ctx.save();
      ctx.globalAlpha = 0.3;
      R(ctx, tx, 138, 4, 4, '#5E3A1E'); // scuffed, darker worn base of the corner board
      ctx.restore();
    }
    // a mid rail beam banding the wall (lit cap + shadow underside)
    R(ctx, bx, 110, 172, 4, P.facade.parapet);
    R(ctx, bx, 110, 172, 1, '#A06A40');
    R(ctx, bx, 113, 172, 1, SEAM);
    // eave shadow band just under the roofline so the overhang reads
    ctx.save();
    ctx.globalAlpha = 0.34;
    R(ctx, bx, 60, 172, 3, '#4A2E16');
    ctx.restore();
    // plinth with a lit cap line + a soft contact shadow at the base
    R(ctx, bx, 142, 172, 8, '#7A4E2A');
    R(ctx, bx, 142, 172, 1, '#9C6838');
    ctx.save();
    ctx.globalAlpha = 0.3;
    R(ctx, bx, 148, 172, 2, '#4A2E16');
    ctx.restore();
  }
}

function drawCottageWindow(vp: Viewport, x: number, y: number): void {
  const ctx = vp.ctx;
  // Wooden-framed 4-pane cottage window with a cross mullion, warm inner glow and
  // little louvered shutters. Footprint unchanged: frame (x-3,y-3 46x40), sill x-4..x+44.
  R(ctx, x - 3, y - 3, 46, 40, P.wood.mid); // frame
  R(ctx, x - 3, y - 3, 46, 1, P.wood.light); // lit top edge
  R(ctx, x - 3, y - 3, 1, 40, P.wood.light); // lit left edge
  R(ctx, x + 42, y - 3, 1, 40, P.wood.dark); // shadow right edge
  R(ctx, x - 3, y + 36, 46, 1, P.wood.dark); // shadow bottom edge
  // shutter panels worked into the frame stiles (left + right), louvered for charm
  for (const [sx, lit] of [[x - 3, true], [x + 40, false]] as const) {
    R(ctx, sx, y - 2, 3, 38, lit ? P.wood.mid : '#7A4E2A'); // shutter panel
    R(ctx, sx, y - 2, 1, 38, lit ? P.wood.light : P.wood.dark); // panel edge shade
    for (let ly = y + 2; ly < y + 32; ly += 5) R(ctx, sx, ly, 3, 1, P.wood.dark); // louver slats
  }
  R(ctx, x, y, 40, 34, P.glass.warm);
  // deeper interior colour layers behind the glass so the lit room reads with depth
  R(ctx, x, y + 18, 40, 16, '#C97A3E'); // warm lower-room wall band
  R(ctx, x, y, 40, 8, P.glass.lit); // warm sky-sheen graded down from the top
  R(ctx, x, y, 40, 3, P.glass.reflect); // brighter near the very top
  R(ctx, x, y, 40, 1, '#FFF3D8'); // crisp top sheen line
  // thin STATIC shelf silhouettes + a couple of jars/books behind the glass (no motion)
  R(ctx, x + 4, y + 9, 32, 1, '#5E3A1E'); // upper shelf line
  R(ctx, x + 6, y + 4, 2, 5, '#5E3A1E'); // a jar standing on the upper shelf
  R(ctx, x + 10, y + 5, 3, 4, '#7A4E2A'); // a stout book
  R(ctx, x + 4, y + 23, 32, 1, '#5E3A1E'); // lower shelf line
  R(ctx, x + 26, y + 18, 2, 5, '#5E3A1E'); // a tall bottle on the lower shelf
  R(ctx, x + 30, y + 19, 3, 4, '#7A4E2A'); // a small box
  R(ctx, x + 2, y + 13, 14, 18, P.glass.hi); // warm interior pane glow (top-left)
  // soft additive inner glow so the room behind reads lit and inviting
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  let ig = glowCache.get('win' + x);
  if (!ig) {
    ig = ctx.createRadialGradient(x + 14, y + 14, 0, x + 14, y + 14, 22);
    ig.addColorStop(0, P.glowKit.window);
    ig.addColorStop(1, 'rgba(255,230,176,0)');
    glowCache.set('win' + x, ig);
  }
  ctx.globalAlpha = 0.26;
  ctx.fillStyle = ig;
  ctx.fillRect(x, y, 40, 34);
  ctx.restore();
  // cross mullion splitting the glass into four panes, with a lit edge for depth
  R(ctx, x + 19, y, 2, 34, P.glass.mullion);
  R(ctx, x, y + 16, 40, 2, P.glass.mullion);
  R(ctx, x + 19, y, 1, 34, P.wood.dark); // mullion shaded side
  R(ctx, x, y + 16, 40, 1, P.wood.light); // mullion lit side
  // glass surface reflection: a warm sun sheen streaking diagonally across the pane
  // with a hot glint where the sun catches the corner, so it reads like real glass
  // catching the light instead of a flat band. Static, so reduced-motion safe.
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, 40, 34);
  ctx.clip();
  ctx.globalAlpha = 0.16; // wide soft sheen
  ctx.fillStyle = '#FFF6DC';
  ctx.beginPath();
  ctx.moveTo(x - 2, y + 1);
  ctx.lineTo(x + 13, y - 2);
  ctx.lineTo(x + 31, y + 36);
  ctx.lineTo(x + 16, y + 38);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 0.5; // thin bright core streak
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(x + 5, y - 2);
  ctx.lineTo(x + 9, y - 2);
  ctx.lineTo(x + 25, y + 38);
  ctx.lineTo(x + 21, y + 38);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // hot sun glint at the top-left where the sheen originates (additive sparkle)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = '#FFFBEC';
  ctx.fillRect(x + 5, y + 2, 3, 3);
  ctx.fillRect(x + 4, y + 3, 5, 1);
  ctx.fillRect(x + 6, y + 1, 1, 5);
  ctx.restore();
  R(ctx, x - 4, y + 35, 48, 3, P.wood.light); // sill
  R(ctx, x - 4, y + 35, 48, 1, '#D8AE72'); // lit sill cap
  ctx.save();
  ctx.globalAlpha = 0.5;
  R(ctx, x - 4, y + 38, 48, 1, P.wood.dark); // 1px sill drop shadow
  ctx.restore();
  if (!vp.reduced) {
    const a = 0.3 + 0.06 * Math.sin(vp.t * 1.4 + x);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = a;
    ctx.fillStyle = P.glass.warm;
    ctx.beginPath();
    ctx.arc(x + 20, y + 40, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawBrandSign(ctx: CanvasRenderingContext2D): void {
  // hanger chains with a tiny lit ring at the top of each
  R(ctx, 222, 30, 1, 8, P.wood.dark);
  R(ctx, 258, 30, 1, 8, P.wood.dark);
  R(ctx, 221, 30, 3, 1, P.wood.light);
  R(ctx, 257, 30, 3, 1, P.wood.light);
  // 1px drop shadow under the board (wall-mounted)
  ctx.save();
  ctx.globalAlpha = 0.4;
  R(ctx, 215, 54, 52, 1, P.shadow);
  ctx.restore();
  R(ctx, 214, 38, 52, 16, P.wood.mid);
  // vertical plank seams so the hanging board reads as wood
  R(ctx, 231, 38, 1, 16, P.wood.dark);
  R(ctx, 248, 38, 1, 16, P.wood.dark);
  R(ctx, 214, 38, 52, 3, P.wood.light); // lit top bevel
  R(ctx, 214, 38, 1, 16, P.wood.light); // lit left edge
  R(ctx, 265, 38, 1, 16, P.wood.dark); // shadow right edge
  R(ctx, 214, 51, 52, 3, P.wood.dark); // shadow bottom bevel
  // recessed carved emblem with a soft inset
  R(ctx, 235, 41, 10, 10, P.wood.dark); // recessed frame
  R(ctx, 236, 42, 8, 8, P.accent.teal); // emblem field
  R(ctx, 236, 42, 8, 1, P.glow.cyan); // emblem top catch-light
  // a small house glyph so the entrance sign reads as "the studio", not an abstract square
  R(ctx, 239, 42, 2, 1, P.accent.golden); // roof peak
  R(ctx, 238, 43, 4, 1, P.accent.golden); // roof
  R(ctx, 238, 44, 4, 4, P.accent.golden); // walls
  R(ctx, 239, 46, 2, 2, P.accent.tealDeep); // door
  R(ctx, 238, 43, 1, 1, '#FFE6A8'); // tiny roof glint
  drawDoorAwning(ctx);
}

// A small striped cloth awning over the entrance, on the wall just above the door
// (door frame top is y90). Drawn before drawDoor so the panels sit cleanly below it.
function drawDoorAwning(ctx: CanvasRenderingContext2D): void {
  const CLOTH = '#C4543A'; // warm terracotta cloth
  const CLOTH2 = '#E6D6B0'; // cream stripe
  const SH = '#8A3A28'; // cloth shadow / underside
  // mounting board against the wall
  R(ctx, 206, 82, 68, 2, P.wood.dark);
  R(ctx, 206, 82, 68, 1, P.wood.light);
  // sloped valance: striped cloth canopy (each 8px panel alternates cloth/cream)
  for (let i = 0, ax = 207; ax < 273; ax += 8, i++) {
    const w = Math.min(8, 273 - ax);
    R(ctx, ax, 84, w, 5, i % 2 === 0 ? CLOTH : CLOTH2);
  }
  R(ctx, 207, 84, 66, 1, '#E8845A'); // lit front lip of the canopy
  R(ctx, 207, 88, 66, 1, SH); // soft underside shadow
  // little scalloped fringe along the bottom edge
  for (let fx = 208; fx < 272; fx += 8) {
    R(ctx, fx, 89, 4, 2, CLOTH);
    R(ctx, fx, 89, 4, 1, SH);
  }
}

function drawWelcomeMat(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  // faint contact shadow so the mat sits on the stone, not floating
  ctx.save();
  ctx.globalAlpha = 0.28;
  R(ctx, x + 1, y + 13, 48, 2, P.shadow);
  ctx.restore();
  R(ctx, x, y, 48, 14, '#7A4527'); // mat border
  R(ctx, x, y, 48, 1, '#9C6038'); // raised edge highlight (lit top lip)
  R(ctx, x, y + 13, 48, 1, '#5E3320'); // raised edge shadow (bottom lip)
  R(ctx, x + 2, y + 2, 44, 10, '#9C5A34'); // woven field
  // coir weave: fine warp/weft lines crossed for a braided-mat read
  ctx.save();
  ctx.globalAlpha = 0.4;
  for (let wx = x + 5; wx < x + 45; wx += 4) R(ctx, wx, y + 2, 1, 10, '#7A4527'); // vertical warp
  R(ctx, x + 2, y + 5, 44, 1, '#7A4527'); // horizontal weft
  R(ctx, x + 2, y + 9, 44, 1, '#7A4527');
  ctx.restore();
  // golden coir motif: a centred diamond flanked by two short bars (varied, not 3 identical stripes)
  R(ctx, x + 6, y + 5, 9, 1, P.accent.golden);
  R(ctx, x + 33, y + 5, 9, 1, P.accent.golden);
  R(ctx, x + 23, y + 4, 2, 1, P.accent.golden);
  R(ctx, x + 22, y + 5, 4, 1, P.accent.golden);
  R(ctx, x + 23, y + 6, 2, 1, P.accent.golden);
}

function drawPlanter(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  // the two planters differ by position: the left (x=150) is bushy with warm blooms,
  // the right (x=316) is taller/narrower with cooler violet blooms
  const tall = x > 200;
  R(ctx, x - 2, y - 2, 22, 16, '#B5793F'); // terracotta pot
  R(ctx, x - 2, y - 2, 22, 3, '#C98A4B'); // lit rim
  R(ctx, x - 2, y - 2, 3, 16, '#8A5A33'); // shaded left wall
  // dark soil with an inner shadow tucked under the rim
  R(ctx, x + 1, y - 1, 16, 2, '#4A3320');
  ctx.save();
  ctx.globalAlpha = 0.5;
  R(ctx, x + 1, y - 1, 16, 1, '#2E2012'); // soil-shadow under the front rim
  ctx.restore();
  if (tall) {
    // tall, upright foliage with a slim crown
    R(ctx, x + 1, y - 9, 4, 9, P.plant.dark);
    R(ctx, x + 6, y - 15, 5, 15, P.plant.base);
    R(ctx, x + 11, y - 10, 4, 10, P.plant.hi);
    R(ctx, x + 7, y - 16, 3, 2, P.plant.hi); // lit crown tip
    R(ctx, x + 7, y - 15, 2, 2, P.accent.indigo); // cool violet bloom
    R(ctx, x + 11, y - 11, 2, 2, P.accent.indigo);
    R(ctx, x + 3, y - 7, 2, 2, P.accent.golden);
  } else {
    // low, bushy mound spilling wider over the rim
    R(ctx, x, y - 8, 6, 8, P.plant.dark);
    R(ctx, x + 5, y - 11, 7, 11, P.plant.base);
    R(ctx, x + 11, y - 9, 6, 9, P.plant.hi);
    R(ctx, x + 6, y - 12, 4, 2, P.plant.hi); // lit crown
    R(ctx, x + 3, y - 10, 2, 2, '#D85A30'); // warm blooms
    R(ctx, x + 12, y - 9, 2, 2, P.accent.golden);
    R(ctx, x + 7, y - 11, 2, 2, '#E07A3A');
  }
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  // stacked contact shadow (soft wide + denser core), unchanged ground anchor
  softShadow(ctx, x, y + 30, 22, P.shadowSoft);
  softShadow(ctx, x, y + 30, 13, P.shadowSoft);

  // lean + cluster character derived from x so the two trees differ:
  // x=72  -> lean -1, taller rounder crown
  // x=408 -> lean +1, wider, lower, bushier crown (mirrored + reshaped)
  const lean = ((x >> 4) & 1) === 0 ? -1 : 1;
  const tall = lean < 0; // the left tree sits a touch taller and narrower
  const top = tall ? -16 : -13; // crown apex offset
  const spread = tall ? 13 : 16; // side-cluster reach

  // trunk with a 3-tone lit-left to shadow-right gradient via vertical strips,
  // extra bark grain strokes and a couple of small knots/branch scars
  R(ctx, x - 4, y, 8, 32, P.wood.dark);
  R(ctx, x - 4, y, 2, 32, '#7A5230'); // lit-left strip
  R(ctx, x - 2, y, 3, 32, P.wood.dark); // mid strip
  R(ctx, x + 1, y, 3, 32, '#46301d'); // shadow-right strip
  R(ctx, x - 4, y, 1, 32, '#8A5E38'); // brightest lit left rim
  R(ctx, x - 1, y + 2, 1, 28, '#46301d'); // grain stroke
  R(ctx, x + 2, y + 5, 1, 24, '#3A2616'); // deeper grain stroke
  R(ctx, x - 3, y + 8, 1, 18, '#5A3E26'); // lit-side grain stroke
  R(ctx, x, y + 3, 1, 22, '#3A2616'); // mid grain stroke
  R(ctx, x + 1, y + 14, 1, 12, '#2E2012'); // short deep grain
  R(ctx, x - 2, y + 11, 2, 2, '#2E2012'); // small bark knot
  R(ctx, x - 2, y + 11, 1, 1, '#5A3E26'); // its lit rim
  R(ctx, x + 1, y + 22, 2, 1, '#5A3E26'); // a healed branch scar
  R(ctx, x - 3, y + 30, 8, 2, '#3A2616'); // root shadow at base

  // layered AUTUMN canopy (Moonlighter-style orange): dark base mass, mid + lit clusters, golden sun-catch
  circle(ctx, x + lean, y - 14, 22, P.autumn.dark);
  circle(ctx, x - spread + lean, y - 4, 13, P.autumn.dark);
  circle(ctx, x + spread - 1 + lean, y - 5, 12, P.autumn.dark);
  // inner shadow pocket (bottom-right of canopy) for volume
  circle(ctx, x + 7 + lean, y - 4, 11, P.autumn.pocket);
  // a deeper-red autumn cluster for richness
  circle(ctx, x + 8 + lean, y + 1, 7, P.autumn.red);
  // mid + lit overlapping clusters
  circle(ctx, x - 12 + lean, y - 3, 13, P.autumn.mid);
  circle(ctx, x + 12 + lean, y - 3, 12, P.autumn.mid);
  circle(ctx, x - 2 + lean, y + top - 3, 13, P.autumn.mid);
  circle(ctx, x + 10 + lean, y - 6, 11, P.autumn.hi);
  circle(ctx, x - 6 + lean, y - 12, 10, P.autumn.hi);
  // top-left sun-catch highlights
  circle(ctx, x - 2 + lean, y + top - 5, 8, P.autumn.sun);
  circle(ctx, x - 9 + lean, y - 12, 5, P.autumn.sun2);
  // a few crisp leaf dabs on the rim
  R(ctx, x - 18 + lean, y - 6, 2, 2, P.autumn.hi);
  R(ctx, x + 17 + lean, y - 8, 2, 2, P.autumn.hi);
  R(ctx, x + lean, y + top - 11, 2, 2, P.autumn.sun2);
}

// A side-profile park bench facing LEFT (toward the welcome path): the backrest
// stands on the RIGHT, the seat reaches LEFT, so the seated Guide looks out at the path.
function drawBench(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const HI = '#D8AE72';
  const LT = P.wood.light;
  const MID = P.wood.mid;
  const DK = P.wood.dark;
  const LEG = '#6B4630';
  const EDGE = '#3E281A';
  const GRAIN = '#7A5230';
  // grounding
  softShadow(ctx, x - 1, y + 18, 26, P.shadowSoft);
  softShadow(ctx, x - 1, y + 18, 18, P.shadowSoft);
  // denser contact shadow pooled directly under each leg where it meets the ground
  softShadow(ctx, x - 10, y + 18, 6, P.shadowSoft);
  softShadow(ctx, x + 9, y + 18, 6, P.shadowSoft);
  // legs: front (left) + back (right), lit + shadow edges
  R(ctx, x - 12, y + 4, 4, 14, DK);
  R(ctx, x - 12, y + 4, 1, 14, LEG);
  R(ctx, x - 9, y + 4, 1, 14, EDGE);
  R(ctx, x + 7, y + 4, 4, 14, DK);
  R(ctx, x + 7, y + 4, 1, 14, LEG);
  R(ctx, x + 10, y + 4, 1, 14, EDGE);
  // backrest panel on the RIGHT: three slats + the corner post
  R(ctx, x + 5, y - 16, 6, 4, LT);
  R(ctx, x + 5, y - 16, 6, 1, HI);
  R(ctx, x + 5, y - 11, 6, 4, MID);
  R(ctx, x + 5, y - 11, 6, 1, LT);
  R(ctx, x + 5, y - 6, 6, 4, MID);
  R(ctx, x + 9, y - 16, 2, 22, DK);
  R(ctx, x + 10, y - 16, 1, 22, EDGE);
  // seat plank reaching left: lit top, front-edge highlight, lip + plank seams + grain
  R(ctx, x - 13, y, 24, 5, MID);
  R(ctx, x - 13, y, 24, 2, LT);
  R(ctx, x - 13, y - 1, 24, 1, HI);
  R(ctx, x - 13, y + 4, 24, 1, DK);
  R(ctx, x - 6, y, 1, 5, '#6E4A2C');
  R(ctx, x + 1, y, 1, 5, '#6E4A2C');
  R(ctx, x - 11, y + 2, 6, 1, GRAIN);
  R(ctx, x - 3, y + 2, 6, 1, GRAIN);
  R(ctx, x + 5, y + 2, 5, 1, GRAIN);
  R(ctx, x - 10, y + 3, 4, 1, GRAIN); // extra grain strokes per plank
  R(ctx, x - 1, y + 3, 5, 1, GRAIN);
  // light scuff / wear marks rubbed into the seat top from years of use
  R(ctx, x - 8, y + 1, 3, 1, HI);
  R(ctx, x + 2, y + 1, 2, 1, HI);
  R(ctx, x - 4, y + 2, 1, 1, '#6E4A2C');
  R(ctx, x - 13, y, 1, 5, HI); // front end-cap highlight
}

function drawFeeder(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  // a low ground bird-feeder dish on a short post, with scattered seed; the
  // birds fly here to peck and loop back to the bench. Sits on the right lawn.
  softShadow(ctx, x, y + 3, 13, P.shadowSoft);
  R(ctx, x - 1, y - 6, 3, 9, P.wood.dark); // short post
  R(ctx, x - 1, y - 6, 1, 9, '#6B4630');
  R(ctx, x - 7, y - 9, 16, 4, P.wood.mid); // shallow tray dish
  R(ctx, x - 7, y - 9, 16, 1, '#D8AE72'); // lit rim highlight
  R(ctx, x + 8, y - 9, 1, 4, P.wood.dark); // shaded right rim
  R(ctx, x - 7, y - 5, 16, 1, P.wood.dark);
  // inner dish shadow so the tray reads concave before the seed sits in it
  ctx.save();
  ctx.globalAlpha = 0.4;
  R(ctx, x - 6, y - 8, 14, 2, P.wood.dark);
  ctx.restore();
  // centred mound of seed piling up in the middle of the dish
  R(ctx, x - 2, y - 8, 6, 2, '#C4925A'); // base of the pile
  R(ctx, x - 1, y - 9, 4, 2, '#D8B070'); // mounded centre
  R(ctx, x, y - 10, 2, 1, '#E0B87A'); // bright crown of the pile
  R(ctx, x - 4, y - 7, 1, 1, '#E0B87A'); // a couple of stray kernels
  R(ctx, x + 4, y - 7, 1, 1, '#D8B070');
  R(ctx, x - 5, y + 2, 2, 2, '#E0B87A'); // seed scattered on the ground
  R(ctx, x + 2, y + 3, 2, 2, '#C4925A');
  R(ctx, x + 5, y + 1, 2, 2, '#D8B070');
}

// A cozy wooden signboard on the left lawn that introduces Sayed (the About beat).
// (x, y) is the base centre; the panel stands above it. Drawn with the lawn props.
// NOTE: currently unused — the plaza About board was removed in favour of the single
// in-studio About station; kept for reference (tree-shaken out of the production bundle).
function drawAboutBoard(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const LT = P.wood.light;
  const MID = P.wood.mid;
  const DK = P.wood.dark;
  const HI = '#D8AE72';
  const EDGE = '#3E281A';
  const indigo = P.accent.indigo;
  const parch = '#F2E6C8';
  const parchSh = '#E0CFA6';
  const ink = '#7A5230';
  // grounding shadow
  softShadow(ctx, x, y + 6, 22, P.shadowSoft);
  softShadow(ctx, x, y + 6, 14, P.shadowSoft);
  // two posts rising from the base to the panel: richer turned-wood read with a
  // lit-left rim, a darker shadow edge and a small grain stroke each
  for (const postx of [x - 9, x + 5]) {
    R(ctx, postx, y - 2, 4, 10, DK);
    R(ctx, postx, y - 2, 1, 10, '#7A5230'); // lit-left rim
    R(ctx, postx + 1, y - 2, 1, 10, MID); // mid face
    R(ctx, postx + 3, y - 2, 1, 10, EDGE); // shadow-right edge
    R(ctx, postx + 1, y + 2, 1, 4, '#3A2616'); // faint grain stroke
  }
  // panel frame + inner board (lit top-left, shaded right) with crisper double bevels
  const px = x - 17;
  const py = y - 30;
  const pw = 34;
  const ph = 26;
  R(ctx, px, py, pw, ph, DK); // outer frame
  R(ctx, px, py, pw, 1, '#7A5230'); // lit outer top edge
  R(ctx, px, py, 1, ph, '#7A5230'); // lit outer left edge
  R(ctx, px + pw - 1, py, 1, ph, EDGE); // shadow outer right edge
  R(ctx, px, py + ph - 1, pw, 1, EDGE); // shadow outer bottom edge
  R(ctx, px + 2, py + 2, pw - 4, ph - 4, MID); // frame inner face
  R(ctx, px + 2, py + 2, pw - 4, 1, HI); // crisp top bevel highlight
  R(ctx, px + 2, py + 2, 1, ph - 4, LT); // crisp left bevel highlight
  R(ctx, px + pw - 3, py + 2, 1, ph - 4, EDGE); // crisp right bevel shadow
  R(ctx, px + 2, py + ph - 3, pw - 4, 1, EDGE); // crisp bottom bevel shadow
  // pinned parchment note with a soft inset shadow under the frame lip
  R(ctx, px + 5, py + 5, pw - 10, ph - 10, parch);
  R(ctx, px + 5, py + 5, pw - 10, 1, '#FBF3DE'); // lit parchment top
  R(ctx, px + 5, py + 5, 1, ph - 10, '#FBF3DE'); // lit parchment left
  R(ctx, px + pw - 6, py + 6, 1, ph - 11, parchSh); // shaded parchment right
  R(ctx, px + 5, py + ph - 6, pw - 10, 1, parchSh); // shaded parchment bottom
  // four little corner pins fixing the note to the board
  R(ctx, px + 6, py + 6, 1, 1, '#8A6A3A');
  R(ctx, px + pw - 7, py + 6, 1, 1, '#8A6A3A');
  R(ctx, px + 6, py + ph - 7, 1, 1, '#8A6A3A');
  R(ctx, px + pw - 7, py + ph - 7, 1, 1, '#8A6A3A');
  // indigo header band with a lit top edge (clearly the "about me" banner)
  R(ctx, px + 5, py + 5, pw - 10, 5, indigo);
  R(ctx, px + 5, py + 5, pw - 10, 1, '#7A6AA8'); // lit band cap
  R(ctx, px + 5, py + 9, pw - 10, 1, '#2E2452'); // band base shadow
  // a tiny portrait-style glyph (head + rounded shoulders) reading as a person
  R(ctx, px + 8, py + 6, 3, 2, '#F0EAF8'); // head
  R(ctx, px + 9, py + 6, 1, 1, '#E8E0F0'); // head highlight
  R(ctx, px + 7, py + 8, 5, 1, '#E8E0F0'); // shoulders
  // a few abstract text lines (varied length, like a short bio)
  R(ctx, px + 7, py + 12, pw - 16, 1, ink);
  R(ctx, px + 7, py + 15, pw - 19, 1, ink);
  R(ctx, px + 7, py + 18, pw - 14, 1, ink);
  R(ctx, px + 7, py + 21, pw - 22, 1, parchSh); // a faint trailing line
  // peaked cap on top of the frame with a crisper lit ridge
  R(ctx, px - 1, py - 2, pw + 2, 2, DK);
  R(ctx, px + 1, py - 4, pw - 2, 2, MID);
  R(ctx, px + 1, py - 4, pw - 2, 1, HI);
  R(ctx, px - 1, py - 1, pw + 2, 1, EDGE); // cap underside shadow onto the frame
}

function drawLantern(vp: Viewport, x: number, y: number): void {
  const ctx = vp.ctx;
  // denser, layered contact shadow grounding the post base
  softShadow(ctx, x + 3, y + 9, 11, P.shadowSoft);
  softShadow(ctx, x + 3, y + 9, 7, P.shadowSoft);
  // a small stone footer pad the post stands on, with its own contact shadow
  R(ctx, x - 4, y + 5, 14, 5, '#8A8478'); // stone pad
  R(ctx, x - 4, y + 5, 14, 1, '#A8A294'); // lit pad cap
  R(ctx, x - 4, y + 9, 14, 1, '#5A5448'); // shaded pad base
  R(ctx, x - 3, y + 6, 1, 1, '#6E685C'); // a fleck of weathering on the stone
  R(ctx, x + 6, y + 7, 1, 1, '#6E685C');
  // post: shaded base, lit-left rim, shadow-right rim, plus a wider footed base
  R(ctx, x, y - 22, 6, 30, P.metal.base);
  R(ctx, x, y - 22, 2, 30, P.metal.hi); // lit left
  R(ctx, x + 5, y - 22, 1, 30, '#4A3826'); // shadow right
  R(ctx, x + 2, y - 18, 1, 26, '#4A3826'); // faint inner seam for a turned-post read
  R(ctx, x - 2, y + 4, 10, 3, P.metal.base); // wider footed base
  R(ctx, x - 2, y + 4, 10, 1, P.metal.hi);
  R(ctx, x - 2, y + 6, 10, 1, '#4A3826'); // base contact line
  // housing: a cleaner cage with a peaked cap, finial and crisp corner posts
  R(ctx, x + 2, y - 38, 2, 2, '#7A6248'); // little roof finial
  R(ctx, x - 4, y - 36, 14, 1, '#8A7050'); // bright roof ridge
  R(ctx, x - 4, y - 35, 14, 3, '#5A4632'); // roof cap
  R(ctx, x - 4, y - 32, 14, 1, '#241C14'); // eave shadow under the cap
  R(ctx, x - 3, y - 31, 12, 12, '#3A2E22'); // cage body
  R(ctx, x - 3, y - 31, 1, 12, '#5A4632'); // lit left corner post
  R(ctx, x + 8, y - 31, 1, 12, '#241C14'); // shadow right corner post
  R(ctx, x + 2, y - 31, 1, 12, '#2E261A'); // centre cage bar (softer than the posts)
  // thin horizontal cage cross-bars so the housing reads as a glazed lattice
  R(ctx, x - 3, y - 28, 12, 1, '#2E261A');
  R(ctx, x - 3, y - 24, 12, 1, '#2E261A');
  R(ctx, x - 3, y - 20, 12, 1, '#241C14'); // bottom rail
  // warmer, slightly larger additive halo with a smooth multi-stop falloff
  const flick = vp.reduced
    ? 0.5
    : 0.5 + 0.14 * Math.sin(vp.t * 3.2 + x) + 0.05 * Math.sin(vp.t * 7.7 + x) + 0.03 * Math.sin(vp.t * 13.3 + x);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  let g = glowCache.get('lamp' + x);
  if (!g) {
    g = ctx.createRadialGradient(x + 3, y - 26, 0, x + 3, y - 26, 22);
    g.addColorStop(0, P.glowKit.lamp);
    g.addColorStop(0.35, 'rgba(255,222,150,0.5)');
    g.addColorStop(0.7, 'rgba(255,213,130,0.22)');
    g.addColorStop(1, 'rgba(255,213,130,0)');
    glowCache.set('lamp' + x, g);
  }
  ctx.globalAlpha = 0.42 * flick;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x + 3, y - 26, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // bulb with a brighter warm core nested in the cage
  R(ctx, x, y - 30, 6, 7, P.lamp.warm);
  R(ctx, x + 1, y - 29, 4, 5, '#FFE6A8');
  // thin filament silhouette hanging in the glass before the hot core washes it
  R(ctx, x + 3, y - 28, 1, 4, '#C98A4B');
  R(ctx, x + 2, y - 25, 2, 1, '#C98A4B');
  R(ctx, x + 1, y - 28, 3, 3, '#FFF1C8'); // warm inner glow
  R(ctx, x + 2, y - 28, 2, 2, '#FFF6DC'); // hot bulb core
}

function drawFlowers(ctx: CanvasRenderingContext2D): void {
  const violet = P.accent.indigo; // softer, palette-harmonised bloom (replaces the harsh purple "sparks")
  const spots: Array<[number, number, string]> = [
    [60, 178, '#D85A30'], [110, 176, P.accent.golden], [170, 178, violet],
    [300, 178, P.accent.golden], [360, 176, '#D85A30'], [420, 178, violet],
    [30, 300, '#D85A30'], [130, 360, P.accent.golden], [350, 320, violet], [450, 300, P.accent.golden],
  ];
  for (let i = 0; i < spots.length; i++) {
    const [x, y, c] = spots[i];
    R(ctx, x + 1, y, 1, 5, '#4C7E37'); // green stem
    R(ctx, x - 1, y + 2, 2, 1, '#5E9A46'); // left leaf
    R(ctx, x + 2, y + 3, 2, 1, '#5E9A46'); // right leaf
    // every other bloom is a fuller 5-petal flower with a tiny bud on a curved stem;
    // the rest stay as the original compact cluster
    if (i % 2 === 0) {
      R(ctx, x, y - 3, 3, 3, c); // centre mass
      R(ctx, x + 1, y - 4, 1, 1, c); // top petal
      R(ctx, x - 1, y - 2, 1, 1, c); // left petal
      R(ctx, x + 3, y - 2, 1, 1, c); // right petal
      R(ctx, x, y, 1, 1, c); // lower-left petal
      R(ctx, x + 2, y, 1, 1, c); // lower-right petal
      R(ctx, x + 1, y - 2, 1, 1, '#FFE6A8'); // bright center
      // a curved side-stem ending in a small bud
      R(ctx, x + 2, y + 1, 1, 1, '#4C7E37');
      R(ctx, x + 3, y, 1, 1, '#4C7E37');
      R(ctx, x + 4, y - 1, 1, 1, c); // the bud
    } else {
      R(ctx, x, y - 3, 3, 3, c); // petal cluster
      R(ctx, x - 1, y - 2, 1, 1, c); // left petal
      R(ctx, x + 3, y - 2, 1, 1, c); // right petal
      R(ctx, x + 1, y - 2, 1, 1, '#FFE6A8'); // bright center
    }
  }
  // a couple of denser overlapping clusters tucked beside existing blooms for richness
  const extras: Array<[number, number, string]> = [
    [113, 179, '#D85A30'], [357, 179, P.accent.golden], [33, 303, P.accent.golden],
  ];
  for (const [x, y, c] of extras) {
    R(ctx, x, y, 1, 4, '#4C7E37'); // short stem
    R(ctx, x - 1, y - 2, 2, 2, c); // overlapping petal mass
    R(ctx, x, y - 3, 2, 2, c);
    R(ctx, x, y - 2, 1, 1, '#FFE6A8'); // center
  }
}

function drawGodRays(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = P.glowKit.window;
  ctx.globalAlpha = 0.06;
  ctx.beginPath();
  ctx.moveTo(90, 0);
  ctx.lineTo(150, 0);
  ctx.lineTo(110, 240);
  ctx.lineTo(70, 240);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(330, 0);
  ctx.lineTo(400, 0);
  ctx.lineTo(380, 220);
  ctx.lineTo(330, 220);
  ctx.closePath();
  ctx.fill();
  // a thin brighter core down each shaft for a crisper sunbeam
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = P.lamp.glow;
  ctx.beginPath();
  ctx.moveTo(112, 0);
  ctx.lineTo(126, 0);
  ctx.lineTo(96, 240);
  ctx.lineTo(86, 240);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(356, 0);
  ctx.lineTo(372, 0);
  ctx.lineTo(360, 220);
  ctx.lineTo(348, 220);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawMotes(vp: Viewport): void {
  const ctx = vp.ctx;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const m of motes) {
    m.y -= m.s * 0.016;
    m.x += Math.sin((m.y + m.a * 30) / 40) * 0.12;
    if (m.y < vp.cam.y - 4) {
      m.y = vp.cam.y + vp.vh / vp.zoom + 4;
      m.x = vp.cam.x + Math.random() * (vp.vw / vp.zoom);
    }
    ctx.globalAlpha = 0.16 + 0.12 * Math.sin(m.a + vp.t * 1.4);
    ctx.fillStyle = P.glowKit.lamp;
    ctx.fillRect(Math.round(m.x), Math.round(m.y), 1, 1);
  }
  ctx.restore();
}

// A handful of slow falling leaves that drift down and wrap; gated to !reduced by the caller.
function drawLeaves(vp: Viewport): void {
  const ctx = vp.ctx;
  ctx.save();
  ctx.globalAlpha = 0.7;
  const span = vp.vh / vp.zoom;
  for (const lf of leaves) {
    lf.y += lf.sp * 0.012;
    const drift = Math.sin(vp.t * 0.7 + lf.sw) * 6;
    if (lf.y > vp.cam.y + span + 6) {
      lf.y = vp.cam.y - 6;
      lf.x = vp.cam.x + Math.random() * (vp.vw / vp.zoom);
    }
    const px = Math.round(lf.x + drift);
    const py = Math.round(lf.y);
    // tiny 2x2 leaf with a 1px lit edge, orientation flips with sway for a tumble feel
    if (drift > 0) {
      R(ctx, px, py, 2, 1, lf.c);
      R(ctx, px, py + 1, 1, 1, lf.c);
    } else {
      R(ctx, px, py, 2, 1, lf.c);
      R(ctx, px + 1, py + 1, 1, 1, lf.c);
    }
    R(ctx, px, py, 1, 1, '#E8B26A');
  }
  ctx.restore();
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, c: string): void {
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}
