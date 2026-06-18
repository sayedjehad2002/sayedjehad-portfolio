import { palette as P } from '../../theme/palette';
import { R, type Viewport } from '../render';
import type { Door } from '../systems/door';

const GX = 213;
const GW = 54;
const GY = 96;
const GH = 56;

// A warm wooden double-door that slides open with a soft golden light spill.
// While closed it carries a gentle inviting glow (an interactable cue).
export function drawDoor(vp: Viewport, door: Door): void {
  const ctx = vp.ctx;
  const open = door.state === 'open' ? 1 : door.state === 'opening' ? door.t : 0;

  // soft inviting glow behind the closed door
  if (open < 1 && !vp.reduced) {
    const g = 0.1 + 0.06 * Math.sin(vp.t * 2);
    ctx.save();
    ctx.globalAlpha = g * (1 - open);
    ctx.fillStyle = P.glow.gold;
    ctx.beginPath();
    ctx.ellipse(GX + GW / 2, GY + GH / 2, GW * 0.72, GH * 0.66, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // warm wooden frame, beveled so the doorway reads recessed (lit top-left, shaded
  // bottom-right) with an inner shadow lip around the opening
  R(ctx, GX - 5, GY - 6, GW + 10, GH + 8, P.door.frame);
  R(ctx, GX - 5, GY - 6, GW + 10, 2, P.wood.light); // lit top
  R(ctx, GX - 5, GY - 6, 2, GH + 8, P.wood.light); // lit left
  R(ctx, GX + GW + 3, GY - 6, 2, GH + 8, P.wood.dark); // shaded right
  R(ctx, GX - 5, GY + GH, GW + 10, 2, P.wood.dark); // shaded bottom
  R(ctx, GX - 1, GY - 2, GW + 2, 1, '#3E281A'); // inner recess lip (top)
  R(ctx, GX - 1, GY - 2, 1, GH + 2, '#3E281A'); // inner recess lip (left)

  // interior warm spill when opening/open
  if (open > 0) {
    ctx.save();
    ctx.globalAlpha = 0.95 * open;
    R(ctx, GX, GY, GW, GH, P.door.spill);
    ctx.restore();
    if (!vp.reduced) {
      ctx.save();
      ctx.globalAlpha = 0.18 * open;
      ctx.fillStyle = P.glass.warm;
      ctx.beginPath();
      ctx.moveTo(GX, GY + GH);
      ctx.lineTo(GX + GW, GY + GH);
      ctx.lineTo(GX + GW + 16, GY + GH + 52);
      ctx.lineTo(GX - 16, GY + GH + 52);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  const slide = Math.round((GW / 2) * open);
  const panelW = GW / 2;
  drawWoodPanel(ctx, GX, GY, panelW - slide, GH);
  drawWoodPanel(ctx, GX + panelW + slide, GY, panelW - slide, GH);

  // brass knob handles with a back plate + catch-light, when mostly closed
  if (open < 0.5) {
    for (const hx of [GX + panelW - 4, GX + panelW + 2]) {
      R(ctx, hx, GY + GH / 2 - 6, 2, 12, '#6E4A2A'); // dark back plate
      R(ctx, hx, GY + GH / 2 - 2, 2, 4, P.accent.golden); // brass knob
      R(ctx, hx, GY + GH / 2 - 2, 1, 1, '#FFF3D8'); // top catch-light
    }
  }
}

function drawWoodPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  if (w <= 1) return;
  R(ctx, x, y, w, h, P.wood.mid);
  R(ctx, x, y, w, 3, P.wood.light);
  R(ctx, x, y + h - 3, w, 3, P.wood.dark);
  R(ctx, x, y, 2, h, P.wood.dark);
  if (w >= 12) {
    // a classic sunken centre panel: recess shadow, a lit-top-left face, a couple
    // of vertical plank seams. Reads as a crafted door leaf, not a flat plank.
    const ix = x + 4;
    const iy = y + 7;
    const iw = w - 8;
    const ih = h - 16;
    R(ctx, ix, iy, iw, ih, P.wood.dark); // recess shadow
    R(ctx, ix + 1, iy + 1, iw - 1, ih - 1, P.wood.mid); // panel face
    R(ctx, ix + 1, iy + 1, iw - 1, 1, P.wood.light); // lit inset top
    R(ctx, ix + 1, iy + 1, 1, ih - 1, P.wood.light); // lit inset left
    const step = Math.max(4, Math.floor(iw / 3));
    for (let xx = ix + step; xx < ix + iw - 1; xx += step) R(ctx, xx, iy + 2, 1, ih - 3, P.wood.dark);
  } else {
    // narrow (mid-slide) leaf: fall back to simple horizontal grain
    for (let yy = y + 9; yy < y + h - 4; yy += 12) R(ctx, x + 1, yy, w - 2, 1, P.wood.dark);
  }
}
