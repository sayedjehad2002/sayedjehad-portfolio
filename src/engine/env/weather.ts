import type { Viewport } from '../render';

// Cozy, subtle weather: soft atmospheric FOG (a bottom haze + a couple of very
// soft drifting wisps, never hard ovals) and gentle RAIN (one batched stroke
// path + a few faint ground-splash rings), all wind-driven and reduced-motion
// gated. Reads only vp.env.

interface Drop {
  x: number;
  y: number;
  len: number;
  sp: number;
}
const RAIN: Drop[] = (() => {
  let s = 90210 >>> 0;
  const rnd = (): number => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  return Array.from({ length: 92 }, () => ({ x: rnd(), y: rnd(), len: 9 + rnd() * 11, sp: 0.55 + rnd() * 0.5 }));
})();

interface Splash {
  x: number;
  y: number;
  t: number;
}
const SPLASH: Splash[] = [];
let sSeed = 778899 >>> 0;
function srand(): number {
  sSeed = (sSeed * 1103515245 + 12345) & 0x7fffffff;
  return sSeed / 0x7fffffff;
}

// One unit soft radial (white→transparent) reused via translate+scale for wisps.
let fogG: CanvasGradient | null = null;
function fogGrad(ctx: CanvasRenderingContext2D): CanvasGradient {
  if (!fogG) {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    fogG = g;
  }
  return fogG;
}

export function drawWeather(vp: Viewport): void {
  const env = vp.env;
  if (!env || !env.enabled) return;
  const kind = env.weatherKind;
  const inten = env.weatherIntensity;
  if (kind === 'clear' || inten <= 0.02) return;
  const ctx = vp.ctx;
  const windX = env.wind.x * env.wind.strength;
  const c = env.skyBottom;
  const fr = Math.min(255, c[0] + 44) | 0;
  const fg = Math.min(255, c[1] + 44) | 0;
  const fb = Math.min(255, c[2] + 50) | 0;

  // Bottom haze = atmospheric depth (both mist + a touch for rain).
  const hazeA = (kind === 'mist' ? 0.14 : 0.07) * inten;
  if (hazeA > 0.004) {
    ctx.save();
    const bg = ctx.createLinearGradient(0, vp.vh * 0.45, 0, vp.vh);
    bg.addColorStop(0, `rgba(${fr},${fg},${fb},0)`);
    bg.addColorStop(1, `rgba(${fr},${fg},${fb},${hazeA})`);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, vp.vw, vp.vh);
    ctx.restore();
  }

  // Soft drifting wisps (mist only) — wide + feathered, so they read as fog.
  if (kind === 'mist') {
    ctx.save();
    ctx.fillStyle = `rgb(${fr},${fg},${fb})`;
    for (let i = 0; i < 2; i++) {
      const phase = i * 0.5;
      const drift = vp.reduced ? phase : phase + vp.t * (0.01 + windX * 0.004);
      const x = ((drift % 1.6) - 0.3) * vp.vw;
      const y = vp.vh * (0.3 + i * 0.34);
      ctx.globalAlpha = 0.05 * inten;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(vp.vw * 0.7, 78);
      ctx.fillStyle = fogGrad(ctx);
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // Gentle rain (skip under reduced-motion — static streaks read as a bug).
  if (kind === 'rain' && !vp.reduced) {
    const slant = 2.4 + windX * 3.2;
    ctx.save();
    ctx.strokeStyle = 'rgba(202,217,240,0.6)';
    ctx.globalAlpha = 0.55 * inten;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (const d of RAIN) {
      const t = (d.y + vp.t * d.sp) % 1;
      const yy = t * (vp.vh + 20) - 10;
      const xx = ((((d.x + t * 0.08) % 1) * vp.vw + t * slant) % (vp.vw + 4));
      ctx.moveTo(xx, yy);
      ctx.lineTo(xx + slant, yy + d.len);
    }
    ctx.stroke();
    ctx.restore();
    // occasionally spawn a faint ground-splash ring
    if (srand() < 0.55 * inten && SPLASH.length < 14) SPLASH.push({ x: srand() * vp.vw, y: vp.vh * (0.35 + srand() * 0.6), t: 0 });
  }

  // age + draw splash rings (only while actually raining)
  if (SPLASH.length) {
    for (const s of SPLASH) s.t += 0.05;
    for (let i = SPLASH.length - 1; i >= 0; i--) if (SPLASH[i].t >= 1) SPLASH.splice(i, 1);
    if (kind === 'rain' && !vp.reduced) {
      ctx.save();
      ctx.strokeStyle = 'rgba(212,226,246,0.5)';
      ctx.lineWidth = 1;
      for (const s of SPLASH) {
        const k = s.t;
        const rr = 1 + k * 7;
        ctx.globalAlpha = (1 - k) * 0.4 * inten;
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, rr, rr * 0.4, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}
