import type { Vec } from './types';

// A snapshot of everything a draw function needs to paint one frame.
export interface Viewport {
  ctx: CanvasRenderingContext2D;
  cam: Vec;
  zoom: number;
  dpr: number;
  vw: number; // css px
  vh: number;
  t: number; // seconds (animation clock)
  reduced: boolean;
}

export function pix(size: number): string {
  return `${size}px "Pixelify Sans", ui-monospace, monospace`;
}
export function sans(size: number): string {
  return `${size}px "Nunito Sans", system-ui, sans-serif`;
}

// world-space transform (pixels are scaled by zoom, offset by camera)
export function worldTransform(vp: Viewport): void {
  const z = vp.zoom * vp.dpr;
  vp.ctx.setTransform(z, 0, 0, z, -vp.cam.x * z, -vp.cam.y * z);
}
// screen-space transform (for crisp HUD text)
export function screenTransform(vp: Viewport): void {
  vp.ctx.setTransform(vp.dpr, 0, 0, vp.dpr, 0, 0);
}
export function w2s(vp: Viewport, x: number, y: number): Vec {
  return { x: (x - vp.cam.x) * vp.zoom, y: (y - vp.cam.y) * vp.zoom };
}

export function R(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string): void {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
}

export function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function softShadow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, rx * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ---------------------------------------------------------------------------
// Offscreen static-texture cache. The heavy world-texture layers (paving, lawn,
// floor, walls, facade) are pure deterministic geometry — identical every frame.
// We bake each CONTIGUOUS run of static draws into a world-resolution offscreen
// canvas ONCE and blit it IN PLACE under the world transform (one drawImage
// instead of hundreds of rects). Because every cached run is blitted at its
// original position in the draw order, z-order is unchanged → pixel-identical.
// Built lazily; rebuilt only if reduced-motion flips. World-resolution means it
// is camera/zoom/dpr-independent, so it never needs rebuilding on resize.
// ---------------------------------------------------------------------------
export interface StaticLayerCtx {
  ctx: CanvasRenderingContext2D;
  reduced: boolean;
  t: number; // frozen at 0 — static layers never animate
}

const staticCache = new Map<string, { canvas: HTMLCanvasElement; reduced: boolean }>();

export function staticLayer(vp: Viewport, key: string, w: number, h: number, build: (s: StaticLayerCtx) => void): void {
  let entry = staticCache.get(key);
  if (!entry || entry.reduced !== vp.reduced) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const octx = canvas.getContext('2d');
    if (!octx) return;
    octx.imageSmoothingEnabled = false;
    build({ ctx: octx, reduced: vp.reduced, t: 0 });
    entry = { canvas, reduced: vp.reduced };
    staticCache.set(key, entry);
  }
  vp.ctx.drawImage(entry.canvas, 0, 0);
}

export function invalidateStaticLayers(): void {
  staticCache.clear();
}
