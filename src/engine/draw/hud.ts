import { pix, roundRectPath, sans, w2s, type Viewport } from '../render';
import type { Entity, Interactable, PhaseAccent, SceneId } from '../types';

// ---------------------------------------------------------------------------
// Unified canvas-HUD kit (mirrors the React overlay tokens in index.css):
// one cream panel surface, one warm hairline, one soft drop shadow, one teal
// accent. Every pill / card / plate routes through `uiPanel` so the on-world
// HUD reads as the same family as the DOM panels.
// ---------------------------------------------------------------------------
const UI = {
  panel: 'rgba(251,246,234,0.98)', // surface.panel
  ink: '#2E241A', // ink.text (AA on cream)
  inkSoft: '#5A4A36', // ink.soft
  tealDeep: '#14756C', // accent.tealDeep, text/key on light (AA)
  shadow: 'rgba(40,28,14,0.45)',
} as const;

// border colours (translucent) for label pills
const ACCENT: Record<PhaseAccent, string> = {
  sales: 'rgba(194,104,43,0.7)',
  hr: 'rgba(31,138,140,0.7)',
  aidev: 'rgba(122,91,166,0.7)',
  teal: 'rgba(31,168,156,0.7)',
  amber: 'rgba(224,148,42,0.8)',
};
// solid colours for the always-on markers
const ACCENT_SOLID: Record<PhaseAccent, string> = {
  sales: '#C2682B',
  hr: '#1F8A8C',
  aidev: '#7A5BA6',
  teal: '#1FA89C',
  amber: '#E0843C',
};

// Shared cream panel: rounded rect with one soft drop shadow + a colour-keyed
// hairline. Used by every name card, prompt pill, and plate for consistency.
function uiPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  border: string,
  borderW = 2,
): void {
  roundRectPath(ctx, x, y, w, h, r);
  ctx.save();
  ctx.shadowColor = UI.shadow;
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = UI.panel;
  ctx.fill();
  ctx.restore();
  ctx.lineWidth = borderW;
  ctx.strokeStyle = border;
  ctx.stroke();
}

interface HudState {
  scene: SceneId;
  player: Entity;
  interactables: Interactable[];
  active: Interactable | null;
  started: boolean;
  dialogueOpen: boolean;
  doorOpen: boolean;
  doorHint: { x: number; y: number } | null; // "talk to Sayed first" pill over the closed door
  refresh: { t: number; x: number; y: number } | null;
}

// one-shot "ready" bump when the active object changes
let lastActiveKey: string | null = null;
let bumpStart = -1;

export function drawHud(vp: Viewport, s: HudState): void {
  if (!s.started) return;
  const a = s.active;

  if (s.refresh) drawRefreshed(vp, s.refresh);

  if (s.scene === 'plaza') {
    if (!s.dialogueOpen) {
      // friendly "talk to Sayed first" hint over the still-locked door
      if (s.doorHint) drawDoorHint(vp, s.doorHint.x, s.doorHint.y);
      // full nameplate + prompt for the active NPC; a faint distance-faded marker over
      // the other, so both are discoverable without cluttering the courtyard
      for (const it of s.interactables) {
        if (it.type !== 'talk' && it.type !== 'lore' && it.type !== 'about') continue;
        if (a && a.key === it.key) {
          const p = w2s(vp, it.x, it.y - 34);
          if (it.name) drawPlateScreen(vp, it.name, p.x, p.y - 50, { sub: it.sub, accent: it.accent ?? 'teal' });
          drawPromptPill(vp, a, p.x, p.y - 12 + (vp.reduced ? 0 : Math.sin(vp.t * 3) * 1.5));
        } else {
          drawMarker(vp, it, s.player);
        }
      }
    }
    return;
  }

  // ---- studio ----
  if (s.dialogueOpen) return;

  // always-on markers so every hotspot is visible at a glance
  for (const it of s.interactables) {
    if (a && it.key === a.key) continue;
    drawMarker(vp, it, s.player);
  }

  // Zone guide plates are ALWAYS drawn so the studio keeps its three-zone read
  // (PROJECTS / RESUME / EXIT) at all times, including the return path via EXIT.
  // They sit at full strength when nothing is active and fade to a faint layer
  // (so the active name card + prompt stay the clear focus) when something is.
  // PROJECTS sits over the easels, RESUME over the resume desk/board (the
  // interactable is at y=258, below the desk), and EXIT over the exit.
  drawZoneGuides(vp, a ? 0.45 : 1);

  if (a) {
    if (a.key !== lastActiveKey) {
      lastActiveKey = a.key;
      bumpStart = vp.t;
    }
    drawActiveLabel(vp, a);
  } else {
    lastActiveKey = null;
  }
}

// The three studio zone signs, drawn as one group at a shared alpha so they can
// fade together behind the active label without altering each plate's internal
// composition. Steady (no pulsing) so it is reduced-motion safe.
function drawZoneGuides(vp: Viewport, alpha: number): void {
  const ctx = vp.ctx;
  ctx.save();
  ctx.globalAlpha = alpha;
  plate(vp, 'PROJECTS', 210, 48, { small: true, accent: 'amber', guide: true });
  plate(vp, 'SKILLS', 401, 150, { small: true, accent: 'teal', guide: true });
  plate(vp, 'RESUME', 235, 206, { small: true, accent: 'teal', guide: true });
  plate(vp, 'EXIT', 236, 318, { small: true, accent: 'teal', guide: true });
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Always-on marker: a bold bobbing diamond + down-chevron with a crisp dark
// outline and a soft accent halo behind it, so every hotspot reads as an
// obvious "interact here" beacon. The distance fade only kicks in close up,
// where the active card takes over — far away the marker stays fully readable
// (alpha floored high) so visitors can spot every hotspot across the room.
// ---------------------------------------------------------------------------
const haloCache = new Map<string, CanvasGradient>(); // one halo gradient per accent colour (built at origin)
function drawMarker(vp: Viewport, it: Interactable, player: Entity): void {
  const ctx = vp.ctx;
  const d = Math.hypot(player.x - it.x, player.y - it.y);
  // Near-fade only: dip toward the floor when the player is right on top of the
  // hotspot (the active card is about to take over); otherwise stay bold.
  const NEAR_FLOOR = 0.5;
  const near = (d - it.r * 0.45) / (it.r * 0.7); // 0 at object, 1 once clear
  const alpha = Math.max(NEAR_FLOOR, Math.min(1, near));
  const p = w2s(vp, it.x, it.y - it.up);
  const bob = vp.reduced ? 0 : Math.sin(vp.t * 2.4 + it.x * 0.05) * 2.5;
  const cy = p.y - 18 + bob;
  const color = ACCENT_SOLID[it.accent ?? 'teal'];

  // Soft accent halo behind the diamond so it pops off busy pixel art.
  // PERF: cache one gradient per accent colour (built at the origin) and translate it to
  // position, instead of createRadialGradient per marker per frame.
  ctx.save();
  ctx.globalAlpha = alpha * 0.5;
  let halo = haloCache.get(color);
  if (!halo) {
    halo = ctx.createRadialGradient(0, 0, 1, 0, 0, 16);
    halo.addColorStop(0, color);
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    haloCache.set(color, halo);
  }
  ctx.translate(p.x, cy);
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Bold diamond: dark outline first (crisp edge), bright accent fill, then a
  // 1px top highlight for a faceted, gem-like read.
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(p.x, cy);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = 'rgba(34,22,10,0.92)';
  ctx.fillRect(-7, -7, 14, 14);
  ctx.fillStyle = color;
  ctx.fillRect(-5, -5, 10, 10);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillRect(-5, -5, 4, 4);
  ctx.restore();

  // Down-chevron pointing at the object: dark backing stroke then accent stroke
  // so it stays legible over any colour underneath.
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const chevron = () => {
    ctx.beginPath();
    ctx.moveTo(p.x - 5, cy + 10);
    ctx.lineTo(p.x, cy + 15);
    ctx.lineTo(p.x + 5, cy + 10);
    ctx.stroke();
  };
  ctx.strokeStyle = 'rgba(34,22,10,0.92)';
  ctx.lineWidth = 4.5;
  chevron();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  chevron();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Bold active label: a big name card stacked over a "Press [E] Verb" pill,
// glued just above the object, with a ready-bump and a flip-below clamp.
// ---------------------------------------------------------------------------
function drawActiveLabel(vp: Viewport, it: Interactable): void {
  const top = w2s(vp, it.x, it.y - it.up);
  const idle = vp.reduced ? 0 : Math.sin(vp.t * 3) * 1.5;
  let bump = 0;
  if (!vp.reduced && bumpStart >= 0) {
    const e = (vp.t - bumpStart) / 0.18;
    if (e < 1) bump = -5 * (1 - e);
  }
  let nameY = top.y - 48 + idle + bump;
  let promptY = top.y - 18 + idle + bump;
  if (nameY < 22) {
    // not enough room above — flip the card below the object
    nameY = top.y + 34 + idle + bump;
    promptY = top.y + 64 + idle + bump;
  }
  if (it.name) drawNameCard(vp, it.name, top.x, nameY, it.accent);
  drawPromptPill(vp, it, top.x, promptY);
}

function drawNameCard(vp: Viewport, name: string, sx: number, sy: number, accent?: PhaseAccent): void {
  const ctx = vp.ctx;
  ctx.font = pix(15);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const tw = ctx.measureText(name).width;
  const padX = 14;
  const h = 26;
  const w = tw + padX * 2;
  const x = sx - w / 2;
  const y = sy - h / 2;

  // Stronger, deeper drop shadow so the card stays legible over busy art.
  ctx.save();
  roundRectPath(ctx, x, y, w, h, 9);
  ctx.shadowColor = 'rgba(40,28,14,0.55)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 5;
  ctx.fillStyle = UI.panel;
  ctx.fill();
  ctx.restore();
  // Bolder accent border (2.5px) for a clear, premium edge.
  roundRectPath(ctx, x, y, w, h, 9);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = ACCENT[accent ?? 'teal'];
  ctx.stroke();

  ctx.fillStyle = UI.ink;
  ctx.fillText(name, sx, sy + 0.5);
  ctx.fillText(name, sx + 0.6, sy + 0.5); // faux-bold (Pixelify has no bold weight)
}

function drawPromptPill(vp: Viewport, it: Interactable, sx: number, sy: number): void {
  const ctx = vp.ctx;
  ctx.textBaseline = 'middle';
  const verb = it.label; // View / Open / Talk
  ctx.font = sans(13);
  const wPre = ctx.measureText('Press ').width;
  ctx.font = '700 13px "Nunito Sans", system-ui, sans-serif';
  const wVerb = ctx.measureText(verb).width;
  const keyW = 22;
  const keyH = 22;
  const gap = 7;
  const padX = 13;
  const h = 30;
  const pillW = wPre + keyW + gap + 6 + wVerb + padX * 2;
  const left = sx - pillW / 2;

  // Subtle pulsing accent glow ring so the eye is drawn to the prompt. Static
  // (steady soft halo) under reduced motion.
  const pulse = vp.reduced ? 0.5 : 0.5 + Math.sin(vp.t * 4) * 0.5; // 0..1
  ctx.save();
  ctx.globalAlpha = 0.18 + pulse * 0.22;
  roundRectPath(ctx, left - 4, sy - h / 2 - 4, pillW + 8, h + 8, h / 2 + 4);
  ctx.shadowColor = ACCENT_SOLID.teal;
  ctx.shadowBlur = 10 + pulse * 8;
  ctx.fillStyle = ACCENT_SOLID.teal;
  ctx.fill();
  ctx.restore();

  uiPanel(ctx, left, sy - h / 2, pillW, h, h / 2, 'rgba(31,168,156,0.85)', 2);

  let cx = left + padX;
  ctx.textAlign = 'left';
  ctx.fillStyle = UI.inkSoft;
  ctx.font = sans(13);
  ctx.fillText('Press ', cx, sy + 0.5);
  cx += wPre;

  // keycap: teal-deep fill with a 1px top highlight + bottom shade so it reads
  // as a raised key; white glyph for AA contrast on the teal-deep.
  roundRectPath(ctx, cx, sy - keyH / 2, keyW, keyH, 6);
  ctx.fillStyle = UI.tealDeep;
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(cx + 2, sy - keyH / 2 + 1, keyW - 4, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(cx + 2, sy + keyH / 2 - 2, keyW - 4, 1);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = pix(13);
  ctx.textAlign = 'center';
  ctx.fillText('E', cx + keyW / 2, sy + 1);
  cx += keyW + gap;

  ctx.textAlign = 'left';
  ctx.fillStyle = UI.ink;
  ctx.font = '700 13px "Nunito Sans", system-ui, sans-serif';
  ctx.fillText(verb, cx + 6, sy + 0.5);
}

// "Refreshed!" flourish after drinking at the water cooler.
function drawRefreshed(vp: Viewport, r: { t: number; x: number; y: number }): void {
  const ctx = vp.ctx;
  const e = Math.min(1, r.t / 1.2);
  const easeOut = (v: number) => 1 - (1 - v) * (1 - v);
  const rise = vp.reduced ? 26 : easeOut(e) * 26;
  const alpha = e < 0.18 ? e / 0.18 : 1 - (e - 0.18) / 0.82;
  const p = w2s(vp, r.x, r.y - 36);
  const cy = p.y - rise;

  if (!vp.reduced) {
    // additive hydration ring expanding outward
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const ringE = easeOut(Math.min(1, e / 0.6));
    const ringR = 6 + ringE * 22;
    ctx.globalAlpha = Math.max(0, 0.5 * (1 - e));
    ctx.strokeStyle = '#5FE0D0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, cy, ringR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    // alternating droplet / plus sparkles fanning out
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - e);
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2 + vp.t * 0.4;
      const rr = e * 20;
      const sxp = Math.round(p.x + Math.cos(ang) * rr);
      const syp = Math.round(cy + Math.sin(ang) * rr);
      if (i % 2 === 0) {
        ctx.fillStyle = '#A9E0E8';
        ctx.fillRect(sxp, syp, 2, 2);
      } else {
        ctx.fillStyle = '#5FE0D0';
        ctx.fillRect(sxp - 1, syp, 3, 1);
        ctx.fillRect(sxp, syp - 1, 1, 3);
      }
    }
    ctx.restore();
  }

  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.font = '700 13px "Nunito Sans", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const text = 'Refreshed!';
  const w = ctx.measureText(text).width + 24;
  roundRectPath(ctx, p.x - w / 2, cy - 13, w, 26, 13);
  ctx.fillStyle = '#14756C';
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(text, p.x, cy + 0.5);
  ctx.restore();
}

// A gentle "Talk to Sayed first" pill over the closed door, shown when the visitor
// reaches it before meeting Sayed — so the gate reads as intentional, not a dead wall.
function drawDoorHint(vp: Viewport, wx: number, wy: number): void {
  const ctx = vp.ctx;
  const p = w2s(vp, wx, wy);
  const bob = vp.reduced ? 0 : Math.sin(vp.t * 3) * 1.5;
  const cy = p.y + bob;
  const text = 'Talk to Sayed first';
  ctx.font = '700 12px "Nunito Sans", system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  const tw = ctx.measureText(text).width;
  const keyR = 5;
  const padX = 12;
  const gap = 8;
  const w = padX * 2 + keyR * 2 + gap + tw;
  const h = 26;
  const x = p.x - w / 2;
  const y = cy - h / 2;
  uiPanel(ctx, x, y, w, h, h / 2, ACCENT.amber, 2);
  // small amber lock glyph (body + shackle) as a friendly "locked for now" cue
  const lx = x + padX + keyR;
  ctx.fillStyle = ACCENT_SOLID.amber;
  ctx.fillRect(lx - 3, cy - 1, 6, 5);
  ctx.strokeStyle = ACCENT_SOLID.amber;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(lx, cy - 1, 2.2, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = UI.ink;
  ctx.textAlign = 'left';
  ctx.fillText(text, x + padX + keyR * 2 + gap, cy + 0.5);
}

// ---- simple plates (plaza nameplate + studio zone signs) ----
interface PlateOpts {
  sub?: string;
  small?: boolean;
  accent?: PhaseAccent;
  guide?: boolean; // studio zone sign: bolder border + a small accent locator pip
}

function plate(vp: Viewport, text: string, wx: number, wy: number, opts: PlateOpts = {}): void {
  const p = w2s(vp, wx, wy);
  drawPlateScreen(vp, text, p.x, p.y, opts);
}

function drawPlateScreen(vp: Viewport, text: string, sx: number, sy: number, opts: PlateOpts = {}): void {
  const ctx = vp.ctx;
  const size = opts.small ? 9 : 10;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = pix(size);
  const wMain = ctx.measureText(text).width;
  let wSub = 0;
  if (opts.sub) {
    ctx.font = sans(12);
    wSub = ctx.measureText(opts.sub).width;
  }
  const padX = 10;
  const wpx = Math.max(wMain, wSub) + padX * 2;
  const h = opts.sub ? 32 : 21;
  const x = sx - wpx / 2;
  const y = sy - h / 2;

  const accentSolid = ACCENT_SOLID[opts.accent ?? 'teal'];

  if (opts.guide) {
    // Steady accent halo so the zone sign is clearly visible against the room.
    ctx.save();
    ctx.globalAlpha = 0.28;
    roundRectPath(ctx, x - 3, y - 3, wpx + 6, h + 6, 9);
    ctx.shadowColor = accentSolid;
    ctx.shadowBlur = 9;
    ctx.fillStyle = accentSolid;
    ctx.fill();
    ctx.restore();
  }

  uiPanel(ctx, x, y, wpx, h, 7, opts.guide ? accentSolid : ACCENT[opts.accent ?? 'teal'], opts.guide ? 2.5 : 1.5);

  if (opts.guide) {
    // A small solid accent pip on the left edge as a clear "here" locator dot.
    ctx.save();
    ctx.fillStyle = accentSolid;
    ctx.beginPath();
    ctx.arc(x + 7, sy, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.arc(x + 6, sy - 1, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.font = pix(size);
  ctx.fillStyle = UI.ink;
  ctx.fillText(text, sx, sy - (opts.sub ? 5 : 0) + 0.5);
  if (opts.sub) {
    ctx.font = sans(12);
    ctx.fillStyle = UI.tealDeep; // AA teal-deep on cream
    ctx.fillText(opts.sub, sx, sy + 9);
  }
}
