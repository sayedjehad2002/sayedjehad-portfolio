// Draws DEPENDENCY DASH onto the fixed 320x240 canvas, pixel-crisp. The simulation and
// the pooled draw loops are allocation-free; only HUD text formatting allocates short
// strings each frame, exactly as the gridshot baseline does. Reduced-motion strips shake /
// food pulse / eat shards / eat burst-ring and holds the score floater static (fade only)
// while keeping the board fully readable. `t` is the animation clock (seconds).
import { pix } from '../../engine/render';
import { CELL, COLS, ROWS, GRID_Y, cellPx, cellPy, type Burst, type GameState } from './depsnake';

const TAU = Math.PI * 2;

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string): void {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}
function ring(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  if (r <= 0) return;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.stroke();
}

export function render(ctx: CanvasRenderingContext2D, s: GameState, reduced: boolean, t: number): void {
  let ox = 0;
  let oy = 0;
  if (!reduced && s.shake > 0) {
    ox = Math.sin(t * 80) * s.shake * 1.6;
    oy = Math.cos(t * 67) * s.shake * 1.6;
  }
  ctx.save();
  ctx.translate(Math.round(ox), Math.round(oy));

  // backdrop + faint editor grid over the playfield
  rect(ctx, -4, -4, 320 + 8, 240 + 8, '#0C1018');
  ctx.fillStyle = 'rgba(95,224,208,0.05)';
  for (let c = 0; c <= COLS; c++) ctx.fillRect(c * CELL, GRID_Y, 1, 240 - GRID_Y);
  for (let r = 0; r <= ROWS; r++) ctx.fillRect(0, GRID_Y + r * CELL, COLS * CELL, 1);

  if (s.phase !== 'menu') {
    drawFood(ctx, s, reduced, t);
    drawSnake(ctx, s, reduced, t);
    for (const b of s.bursts) if (b.active) drawBurst(ctx, b);
    if (!reduced) {
      for (const p of s.particles) {
        if (!p.active) continue;
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        rect(ctx, p.x - 1, p.y - 1, 2, 2, p.life > p.maxLife * 0.5 ? '#FFF3D0' : '#FFB454');
      }
      ctx.globalAlpha = 1;
    }
    // score floaters
    ctx.textAlign = 'center';
    ctx.font = pix(10);
    for (const f of s.floaters) {
      if (!f.active) continue;
      ctx.globalAlpha = Math.min(1, f.t / 0.5);
      ctx.fillStyle = '#FFE08A';
      ctx.fillText(f.text, Math.round(f.x), Math.round(f.y));
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';

    drawHud(ctx, s);
    if (s.phase === 'countdown') drawCountdown(ctx, s);
    if (s.paused) drawPause(ctx);
  }

  ctx.restore();
}

function drawSnake(ctx: CanvasRenderingContext2D, s: GameState, reduced: boolean, t: number): void {
  if (s.length <= 0) return;
  const tailIdx = (((s.headIdx - s.length + 1) % s.bodyX.length) + s.bodyX.length) % s.bodyX.length;
  for (let k = 0; k < s.length; k++) {
    const idx = (tailIdx + k) % s.bodyX.length;
    const px = cellPx(s.bodyX[idx]);
    const py = cellPy(s.bodyY[idx]);
    if (k === s.length - 1) {
      // HEAD (amber import head)
      rect(ctx, px, py, 9, 9, '#FFB454');
      rect(ctx, px, py, 9, 1, '#FFE08A');
      rect(ctx, px, py, 1, 9, '#FFE08A');
      rect(ctx, px + 8, py, 1, 9, '#A8702A');
      rect(ctx, px, py + 8, 9, 1, '#A8702A');
      // eyes on the leading edge (faces travel direction)
      const ex = s.dirX;
      const ey = s.dirY;
      const fx = px + 5 + ex * 3;
      const fy = py + 5 + ey * 3;
      const perpx = -ey;
      const perpy = ex;
      rect(ctx, fx + perpx * 2 - 1, fy + perpy * 2 - 1, 2, 2, '#0B0E14');
      rect(ctx, fx - perpx * 2 - 1, fy - perpy * 2 - 1, 2, 2, '#0B0E14');
      if (!reduced && Math.sin(t * 8) > 0.6) rect(ctx, px + 2, py + 2, 1, 1, '#FFFDF0');
    } else {
      // BODY (teal package link)
      rect(ctx, px, py, 9, 9, '#39C0B0');
      rect(ctx, px, py, 9, 1, '#5FE0D0');
      rect(ctx, px, py, 1, 9, '#5FE0D0');
      rect(ctx, px + 8, py, 1, 9, '#16685F');
      rect(ctx, px, py + 8, 9, 1, '#16685F');
    }
  }
}

function drawFood(ctx: CanvasRenderingContext2D, s: GameState, reduced: boolean, t: number): void {
  const cx = cellPx(s.foodX) + CELL / 2;
  const cy = cellPy(s.foodY) + CELL / 2;
  const pulse = reduced ? 0 : Math.round(Math.sin(t * 6) * 1);
  const r = 4 + (pulse > 0 ? 1 : 0);
  if (!reduced) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#FFB454';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.8, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
  const x = Math.round(cx - r);
  const y = Math.round(cy - r);
  const w = r * 2;
  rect(ctx, x, y, w, w, '#A8702A'); // rim
  rect(ctx, x + 1, y + 1, w - 2, w - 2, '#FFB454'); // body
  rect(ctx, x + 1, y + 1, w - 2, 1, '#FFE08A'); // top face
  rect(ctx, x + 1, y + 1, 1, 1, '#FFF3D0'); // glint
  // dark seam cross (a tiny crate / package box)
  rect(ctx, x + Math.floor(w / 2), y + 1, 1, w - 2, '#8A5A24');
  rect(ctx, x + 1, y + Math.floor(w / 2), w - 2, 1, '#8A5A24');
}

function drawBurst(ctx: CanvasRenderingContext2D, b: Burst): void {
  const a = b.t;
  ctx.globalAlpha = a;
  ctx.strokeStyle = '#FFE08A';
  ctx.lineWidth = 1 + (1 - a) * 1.5;
  ring(ctx, b.x, b.y, 4 + (1 - a) * 9);
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1;
}

function drawHud(ctx: CanvasRenderingContext2D, s: GameState): void {
  rect(ctx, 0, 0, 320, GRID_Y, '#0A0D14');
  rect(ctx, 0, GRID_Y - 1, 320, 1, 'rgba(95,224,208,0.18)');
  ctx.textAlign = 'left';
  ctx.font = pix(10);
  ctx.fillStyle = '#FFE08A';
  ctx.fillText(String(s.score).padStart(5, '0'), 6, 12);
  ctx.textAlign = 'center';
  ctx.font = pix(8);
  ctx.fillStyle = '#5FE0D0';
  ctx.fillText('DEPS ' + s.length, 320 / 2, 11);
  ctx.textAlign = 'right';
  ctx.fillText('BEST ' + s.best, 314, 11);
  ctx.textAlign = 'left';
  // fresh streak chip
  if (s.streak >= 2) {
    ctx.font = pix(8);
    const txt = 'x' + s.streak + ' deps';
    const w = Math.ceil(ctx.measureText(txt).width) + 4;
    rect(ctx, 318 - w - 56, GRID_Y + 2, w, 10, 'rgba(8,12,18,0.7)');
    ctx.fillStyle = '#FFCF6B';
    ctx.fillText(txt, 320 - w - 54, GRID_Y + 10);
  }
}

function drawCountdown(ctx: CanvasRenderingContext2D, s: GameState): void {
  rect(ctx, 0, 0, 320, 240, 'rgba(8,12,18,0.55)');
  ctx.textAlign = 'center';
  ctx.font = pix(9);
  ctx.fillStyle = '#9FB0C0';
  ctx.fillText('NPM INSTALL', 160, 240 / 2 - 28);
  ctx.font = pix(44);
  ctx.fillStyle = '#FFE08A';
  ctx.fillText(String(Math.max(1, Math.ceil(s.countdown))), 160, 240 / 2 + 16);
  ctx.textAlign = 'left';
}

function drawPause(ctx: CanvasRenderingContext2D): void {
  rect(ctx, 0, GRID_Y, 320, 240 - GRID_Y, 'rgba(8,12,18,0.55)');
  ctx.textAlign = 'center';
  ctx.font = pix(12);
  ctx.fillStyle = '#9FB0C0';
  ctx.fillText('BUILD PAUSED', 160, 130);
  ctx.textAlign = 'left';
}
