// Draws the whole arcade game onto a fixed 320x240 logical canvas, pixel-crisp.
// Pools only, no per-frame allocation beyond a couple of locals. Reduced-motion
// strips shake / shards / target pulse / crosshair animation while keeping the
// game fully readable and playable. `t` is the animation clock (seconds).
import { pix } from '../../engine/render';
import { LOGICAL_W, LOGICAL_H, SAYED_X, SAYED_Y, AIM_ASSIST, comboTier, type GameState, type Target, type Burst } from './aimtrainer';

const TAU = Math.PI * 2;

const TARGET_COLORS = [
  { rim: '#16685F', body: '#39C0B0', hi: '#5FE0D0', glint: '#BFF7EE' }, // teal
  { rim: '#A8702A', body: '#FFB454', hi: '#FFE08A', glint: '#FFF3D0' }, // amber
  { rim: '#6A4F94', body: '#9A7BC0', hi: '#C6B2E4', glint: '#EFE6FA' }, // violet
];
const WARN = '#FF6B6B';

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string): void {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}
function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, c: string): void {
  if (r <= 0) return; // a target mid pop-in can produce r-1.5 < 0; arc() throws on negative radii
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
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
    ox = Math.sin(t * 80) * s.shake * 2.2;
    oy = Math.cos(t * 67) * s.shake * 2.2;
  }
  ctx.save();
  ctx.translate(Math.round(ox), Math.round(oy));

  // dark "terminal" backdrop + faint static code lines + warm desk band
  rect(ctx, -4, -4, LOGICAL_W + 8, LOGICAL_H + 8, '#0C1018');
  ctx.fillStyle = 'rgba(95,224,208,0.045)';
  for (let i = 0; i < 14; i++) {
    ctx.fillRect(10 + ((i * 29) % 44), 12 + i * 15, 40 + ((i * 53) % 150), 1);
  }
  ctx.fillStyle = 'rgba(255,224,138,0.05)';
  ctx.fillRect(0, LOGICAL_H - 40, LOGICAL_W, 40);

  if (s.phase === 'menu') {
    ctx.restore();
    return;
  }

  for (const tg of s.targets) {
    if (tg.active) drawTarget(ctx, tg, reduced, t);
  }
  for (const b of s.bursts) {
    if (b.active) drawBurst(ctx, b);
  }
  if (!reduced) {
    for (const p of s.particles) {
      if (p.active) {
        const c = TARGET_COLORS[p.colorIdx];
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        rect(ctx, p.x - 1, p.y - 1, 2, 2, p.life > p.maxLife * 0.5 ? c.glint : c.hi);
      }
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

  drawZap(ctx, s, reduced);
  drawSayed(ctx, s);

  if (s.phase === 'playing' || s.phase === 'countdown') {
    let over = false;
    if (s.phase === 'playing') {
      const reach2base = AIM_ASSIST + s.touchAssist;
      for (const tg of s.targets) {
        if (!tg.active) continue;
        const dx = tg.x - s.cross.x;
        const dy = tg.y - s.cross.y;
        const reach = tg.r + reach2base;
        if (dx * dx + dy * dy <= reach * reach) {
          over = true;
          break;
        }
      }
    }
    drawCrosshair(ctx, s.cross.x, s.cross.y, t, reduced, over, s.zap.t);
  }

  drawHud(ctx, s);
  if (s.phase === 'countdown') drawCountdown(ctx, s);

  ctx.restore();
}

function drawTarget(ctx: CanvasRenderingContext2D, tg: Target, reduced: boolean, t: number): void {
  const c = TARGET_COLORS[tg.colorIdx];
  const p = tg.life / tg.lifeMax;
  let warn = 0;
  let pulse = 1;
  if (p <= 0.35 && p > 0) {
    warn = reduced ? 1 : (Math.sin(t * 18) + 1) / 2;
    pulse = reduced ? 1 : 1 + warn * 0.06;
  }
  const R = tg.r * (reduced ? 1 : tg.pop * pulse);
  if (R < 0.6) return;
  const cx = tg.x;
  const cy = tg.y;

  // soft blob shadow
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + tg.r * 0.62, R * 0.92, R * 0.34, 0, 0, TAU);
  ctx.fill();

  // additive bloom (cheap concentric discs; skip under reduced)
  if (!reduced) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.1;
    disc(ctx, cx, cy, R * 1.35, c.body);
    ctx.globalAlpha = 0.12;
    disc(ctx, cx, cy, R * 1.05, c.body);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  // sphere: rim ring, body, lower shade, upper light, highlight, glint
  disc(ctx, cx, cy, R, c.rim);
  disc(ctx, cx, cy, R - 1.5, c.body);
  ctx.globalAlpha = 0.26;
  disc(ctx, cx, cy + R * 0.2, R - 1.5, c.rim);
  ctx.globalAlpha = 1;
  disc(ctx, cx, cy - R * 0.14, R * 0.62, c.hi);
  disc(ctx, cx - R * 0.26, cy - R * 0.34, Math.max(1, R * 0.26), c.hi);
  disc(ctx, cx - R * 0.28, cy - R * 0.4, Math.max(1, R * 0.16), c.glint);
  rect(ctx, cx - R * 0.28, cy - R * 0.46, 1, 1, c.glint);

  // bullseye centre (the precise aim anchor) — palette-independent dark core so it
  // reads on amber/violet bodies too, matching the crosshair ink halo
  disc(ctx, cx, cy, Math.max(1.5, R * 0.18), '#0B0E14');
  rect(ctx, cx, cy, 1, 1, c.glint);

  // expiry warning annulus
  if (warn > 0) {
    ctx.strokeStyle = WARN;
    ctx.lineWidth = 1;
    if (reduced) {
      ctx.globalAlpha = 0.8;
      ring(ctx, cx, cy, R + 2);
    } else {
      ctx.globalAlpha = 0.4 + warn * 0.5;
      ring(ctx, cx, cy, R + 1.5 + warn * 1.5);
    }
    ctx.globalAlpha = 1;
  }
}

function drawBurst(ctx: CanvasRenderingContext2D, b: Burst): void {
  const c = TARGET_COLORS[b.colorIdx];
  const a = b.t;
  ctx.globalAlpha = a;
  ctx.strokeStyle = c.hi;
  ctx.lineWidth = 1 + (1 - a) * 1.5;
  ring(ctx, b.x, b.y, b.r * (1 + (1 - a) * 1.6));
  ctx.globalAlpha = a * 0.5;
  ctx.strokeStyle = c.glint;
  ctx.lineWidth = 1;
  ring(ctx, b.x, b.y, b.r * (1 + (1 - a) * 2.3));
  ctx.globalAlpha = 1;
}

const _muz = { mx: 0, my: 0 };
function muzzle(s: GameState): { mx: number; my: number } {
  // reused module-scope object (callers read it synchronously) to avoid a per-frame allocation
  _muz.mx = SAYED_X + Math.cos(s.aim) * 13;
  _muz.my = SAYED_Y - 4 + Math.sin(s.aim) * 13;
  return _muz;
}

function drawSayed(ctx: CanvasRenderingContext2D, s: GameState): void {
  const x = SAYED_X;
  const y = SAYED_Y;
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  ctx.beginPath();
  ctx.ellipse(x, y + 12, 12, 4, 0, 0, TAU);
  ctx.fill();
  rect(ctx, x - 7, y - 2, 14, 14, '#2C3A57');
  rect(ctx, x - 7, y - 2, 14, 1, '#3C4F76');
  rect(ctx, x - 1, y - 2, 2, 7, '#E8EDF4');
  rect(ctx, x - 1, y - 1, 2, 2, '#C0453B');
  rect(ctx, x - 5, y - 13, 10, 11, '#C9956B');
  rect(ctx, x - 5, y - 14, 10, 3, '#33241A');
  rect(ctx, x - 5, y - 13, 2, 5, '#33241A');
  rect(ctx, x + 3, y - 13, 2, 5, '#33241A');
  rect(ctx, x - 3, y - 9, 1, 2, '#1c130c');
  rect(ctx, x + 2, y - 9, 1, 2, '#1c130c');
  const m = muzzle(s);
  const ax = x + Math.cos(s.aim) * 6;
  const ay = y - 4 + Math.sin(s.aim) * 6;
  ctx.strokeStyle = '#C9956B';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y - 1);
  ctx.lineTo(ax, ay);
  ctx.stroke();
  rect(ctx, m.mx - 2, m.my - 2, 4, 4, '#39C0B0');
  rect(ctx, m.mx - 1, m.my - 1, 2, 2, '#BFF7EE');
}

function drawZap(ctx: CanvasRenderingContext2D, s: GameState, reduced: boolean): void {
  if (s.zap.t <= 0) return;
  const m = muzzle(s);
  const a = s.zap.t;
  ctx.globalAlpha = reduced ? 0.7 : a;
  ctx.strokeStyle = '#7FF0E2';
  ctx.lineWidth = reduced ? 1 : a * 2 + 0.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(m.mx, m.my);
  ctx.lineTo(s.zap.x, s.zap.y);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawCrosshair(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, reduced: boolean, over: boolean, fire: number): void {
  const cx = Math.round(x) + 0.5;
  const cy = Math.round(y) + 0.5;
  const ix = Math.round(x);
  const iy = Math.round(y);
  const INK = 'rgba(11,14,20,0.85)';
  const FILL = over ? '#7CFF4F' : '#E8F6F3';
  const DOT = over ? '#B6FF8C' : '#FFFFFF';
  const anim = !reduced;
  const f = fire > 0 ? fire : 0;
  const L = 4;
  const G = over ? 3 : 5;
  const pulse = anim ? Math.sin(t * 4) * 0.6 : 0;
  const kick = anim ? f * 3 : 0;
  const scale = anim ? 1 + f * 0.18 : 1;
  const gIn = (G + pulse + kick) * scale;
  const gOut = gIn + L * scale;

  ctx.save();
  ctx.lineCap = 'butt';

  // rotating broken outer ring (skip under reduced)
  if (anim) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * 0.4);
    const RR = 11;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    for (let k = 0; k < 4; k++) ringArc(ctx, RR, k * (Math.PI / 2) + 0.25, k * (Math.PI / 2) + 1.12);
    ctx.strokeStyle = over ? 'rgba(124,255,79,0.55)' : 'rgba(95,224,208,0.45)';
    ctx.lineWidth = 1;
    for (let k = 0; k < 4; k++) ringArc(ctx, RR, k * (Math.PI / 2) + 0.25, k * (Math.PI / 2) + 1.12);
    ctx.restore();
  }

  // ticks: ink outline pass, then bright fill pass
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ticks(ctx, cx, cy, gIn, gOut);
  ctx.strokeStyle = FILL;
  ctx.lineWidth = 1;
  ticks(ctx, cx, cy, gIn, gOut);

  // centre dot (always 1px, never scaled, with ink halo)
  rect(ctx, ix - 1, iy - 1, 3, 3, '#0B0E14');
  rect(ctx, ix, iy, 1, 1, DOT);

  // expanding fire ring (skip under reduced; steady blink instead)
  if (anim && f > 0.02) {
    const rr = (1 - f) * 9 + 4;
    ctx.globalAlpha = f * 0.9;
    ctx.strokeStyle = over ? '#7CFF4F' : '#7FF0E2';
    ctx.lineWidth = 1;
    ring(ctx, cx, cy, rr);
    ctx.globalAlpha = 1;
  } else if (!anim && f > 0.5) {
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = over ? '#7CFF4F' : '#7FF0E2';
    ctx.lineWidth = 1;
    ring(ctx, cx, cy, 8);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function ringArc(ctx: CanvasRenderingContext2D, r: number, a0: number, a1: number): void {
  ctx.beginPath();
  ctx.arc(0, 0, r, a0, a1);
  ctx.stroke();
}
function ticks(ctx: CanvasRenderingContext2D, cx: number, cy: number, gIn: number, gOut: number): void {
  ctx.beginPath();
  ctx.moveTo(cx - gOut, cy);
  ctx.lineTo(cx - gIn, cy);
  ctx.moveTo(cx + gIn, cy);
  ctx.lineTo(cx + gOut, cy);
  ctx.moveTo(cx, cy - gOut);
  ctx.lineTo(cx, cy - gIn);
  ctx.moveTo(cx, cy + gIn);
  ctx.lineTo(cx, cy + gOut);
  ctx.stroke();
}

function drawHud(ctx: CanvasRenderingContext2D, s: GameState): void {
  // score (top-left) + combo beneath it
  ctx.textAlign = 'left';
  ctx.font = pix(7);
  ctx.fillStyle = '#7C8AA0';
  ctx.fillText('SCORE', 9, 12);
  ctx.font = pix(15);
  ctx.fillStyle = '#FFE08A';
  ctx.fillText(String(s.score).padStart(5, '0'), 9, 27);
  if (s.combo >= 2) {
    const tier = comboTier(s.combo);
    ctx.font = pix(10);
    const txt = 'x' + tier + '  ' + s.combo + ' streak';
    ctx.fillStyle = 'rgba(8,12,18,0.55)'; // dark plate so the streak reads over any target
    ctx.fillRect(7, 31, Math.ceil(ctx.measureText(txt).width) + 4, 11);
    ctx.fillStyle = tier >= 3 ? '#FF8A3D' : '#FFCF6B';
    ctx.fillText(txt, 9, 40);
  }

  // time (top-centre) + best beneath
  ctx.textAlign = 'center';
  const low = s.timeLeft <= 8;
  ctx.font = pix(16);
  ctx.fillStyle = low && (s.reduced || Math.floor(s.timeLeft * 2) % 2 === 0) ? '#FF6B6B' : '#E8EDF4';
  ctx.fillText(Math.ceil(s.timeLeft) + 's', LOGICAL_W / 2, 19);
  ctx.font = pix(7);
  ctx.fillStyle = '#5FE0D0';
  ctx.fillText('BEST ' + s.best, LOGICAL_W / 2, 29);
  ctx.textAlign = 'left';
}

function drawCountdown(ctx: CanvasRenderingContext2D, s: GameState): void {
  ctx.fillStyle = 'rgba(8,12,18,0.55)';
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
  ctx.textAlign = 'center';
  ctx.font = pix(9);
  ctx.fillStyle = '#9FB0C0';
  ctx.fillText('GET READY', LOGICAL_W / 2, LOGICAL_H / 2 - 28);
  ctx.font = pix(44);
  ctx.fillStyle = '#FFE08A';
  ctx.fillText(String(Math.max(1, Math.ceil(s.countdown))), LOGICAL_W / 2, LOGICAL_H / 2 + 16);
  ctx.textAlign = 'left';
}
