import type { EnvironmentConfig } from '../../store/envConfig';
import { computeWind, type Wind } from './wind';

// ---------------------------------------------------------------------------
// EnvironmentTimeSystem: turns config + a clock into one immutable-feeling
// snapshot (EnvState) the whole render path reads each frame. It is a PURE
// computation that mutates a single reused module object (zero per-frame
// allocation in the hot path). The visual look at any moment is defined by a
// small keyframe table (midnight → sunrise → noon → sunset → night) that we
// smoothly interpolate, so transitions are gradual and easy to retune.
// ---------------------------------------------------------------------------

export type RGB = readonly [number, number, number];
export type Phase = 'night' | 'dawn' | 'day' | 'dusk';

export interface EnvState {
  enabled: boolean; // dayNightCycleEnabled — when false the world stays at warm "day"
  // per-feature gates, mirrored from config so draw modules read one object
  sunEnabled: boolean;
  moonEnabled: boolean;
  birdsEnabled: boolean;
  particlesEnabled: boolean;
  reflectionsEnabled: boolean;
  shadowQuality: 'off' | 'low' | 'high';
  timeOfDay: number; // 0..1 (0 = midnight, 0.5 = noon)
  phase: Phase;
  skyTop: RGB;
  skyBottom: RGB;
  tint: { r: number; g: number; b: number; a: number }; // screen-space day/night grade
  lightBoost: number; // 0 (day) .. 1 (deep night): brighten lamps/windows
  intensity: number; // 0..1 sun strength → shadow length/contrast + grading
  sun: { up: number; x: number; y: number }; // up 0..1; x,y are screen fractions (0..1)
  moon: { up: number; x: number; y: number; phase: number }; // phase 0..1 (0/1 new, .5 full)
  wind: Wind;
  weatherKind: 'clear' | 'mist' | 'rain';
  weatherIntensity: number; // 0..1
}

// Accelerated mode: one full day every this-many real seconds (÷ gameTimeSpeed).
const ACCEL_DAY_SECONDS = 240;
// First-load offset for accelerated mode so it opens on warm late-morning, not midnight.
const ACCEL_START = 0.32;

interface Key {
  t: number;
  skyTop: RGB;
  skyBottom: RGB;
  tint: readonly [number, number, number, number];
  lightBoost: number;
  intensity: number;
}

// Keyframes across the day (t in 0..1). Tuned cozy/cinematic. With the floating
// sky discs gone, the GRADE + the directional light wash carry time of day, so
// these are a touch richer: a faintly golden noon (hero), warm sunrise/sunset,
// and a cool but readable dusk/night. Edit these to retune the whole mood.
const KEYS: readonly Key[] = [
  { t: 0.0, skyTop: [12, 16, 40], skyBottom: [26, 30, 62], tint: [10, 16, 48, 0.48], lightBoost: 1.0, intensity: 0.1 }, // midnight
  { t: 0.22, skyTop: [40, 42, 84], skyBottom: [104, 86, 116], tint: [28, 28, 70, 0.42], lightBoost: 0.92, intensity: 0.18 }, // pre-dawn
  { t: 0.28, skyTop: [255, 150, 112], skyBottom: [255, 208, 150], tint: [255, 168, 108, 0.16], lightBoost: 0.45, intensity: 0.55 }, // sunrise
  { t: 0.37, skyTop: [150, 196, 230], skyBottom: [222, 228, 228], tint: [255, 224, 178, 0.06], lightBoost: 0.12, intensity: 0.86 }, // morning
  { t: 0.5, skyTop: [130, 188, 234], skyBottom: [196, 220, 242], tint: [255, 238, 200, 0.03], lightBoost: 0.0, intensity: 1.0 }, // noon (warm hero)
  { t: 0.66, skyTop: [156, 176, 214], skyBottom: [255, 216, 156], tint: [255, 206, 142, 0.08], lightBoost: 0.16, intensity: 0.85 }, // afternoon gold
  { t: 0.78, skyTop: [104, 72, 150], skyBottom: [255, 138, 86], tint: [255, 118, 74, 0.2], lightBoost: 0.5, intensity: 0.48 }, // sunset
  { t: 0.85, skyTop: [46, 42, 98], skyBottom: [128, 74, 128], tint: [62, 42, 98, 0.36], lightBoost: 0.82, intensity: 0.24 }, // dusk
  { t: 0.92, skyTop: [18, 22, 52], skyBottom: [38, 40, 76], tint: [14, 20, 54, 0.46], lightBoost: 1.0, intensity: 0.14 }, // night
];

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const smoothstep = (x: number): number => x * x * (3 - 2 * x);

// The single reused state object + scratch fields (no allocation per frame).
const ENV: EnvState = {
  enabled: true,
  sunEnabled: true,
  moonEnabled: true,
  birdsEnabled: true,
  particlesEnabled: true,
  reflectionsEnabled: true,
  shadowQuality: 'high',
  timeOfDay: 0.5,
  phase: 'day',
  skyTop: [130, 188, 234],
  skyBottom: [196, 220, 242],
  tint: { r: 0, g: 0, b: 0, a: 0 },
  lightBoost: 0,
  intensity: 1,
  sun: { up: 1, x: 0.5, y: 0.2 },
  moon: { up: 0, x: 0.5, y: 0.2, phase: 0.5 },
  wind: { x: 1, y: 0.15, strength: 0.45 },
  weatherKind: 'clear',
  weatherIntensity: 0,
};
const skyTopScratch: [number, number, number] = [0, 0, 0];
const skyBottomScratch: [number, number, number] = [0, 0, 0];

// Throttle the real wall-clock read to ~1/sec (the sky changes over hours, so
// sub-second precision is pointless and a Date per frame is wasteful).
let lastWallSec = -1e9;
let cachedDayFrac = 0.5;
let cachedMoonPhase = 0.5;

function readBahrain(perfNowSec: number): void {
  if (perfNowSec - lastWallSec < 1) return; // cached value is fresh enough
  lastWallSec = perfNowSec;
  const d = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bahrain',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(d);
  let hh = 0;
  let mm = 0;
  let ss = 0;
  for (const p of parts) {
    if (p.type === 'hour') hh = parseInt(p.value, 10) % 24; // h23 → 00..23 (guard 24)
    else if (p.type === 'minute') mm = parseInt(p.value, 10);
    else if (p.type === 'second') ss = parseInt(p.value, 10);
  }
  cachedDayFrac = (hh * 3600 + mm * 60 + ss) / 86400;
  // Synodic moon phase from a known recent new moon (2026-01-18 ≈ JD-day 20106).
  const synodic = 29.530588;
  const daysSinceEpoch = d.getTime() / 86400000;
  cachedMoonPhase = (((daysSinceEpoch - 20106) % synodic) / synodic + 1) % 1;
}

function resolveTimeOfDay(cfg: EnvironmentConfig, debug: number | null, perfNowSec: number): number {
  if (debug != null) return ((debug % 1) + 1) % 1;
  if (!cfg.dayNightCycleEnabled) return 0.5; // fixed warm day
  if (cfg.useRealBahrainTime) {
    readBahrain(perfNowSec);
    return cachedDayFrac;
  }
  const dayLen = ACCEL_DAY_SECONDS / Math.max(0.01, cfg.gameTimeSpeed);
  return (ACCEL_START + perfNowSec / dayLen) % 1;
}

// Interpolate the keyframe table at td (0..1), writing colour/scalar fields onto ENV.
function applyKeyframes(td: number, smoothness: number): void {
  // find bracketing keys with wraparound (last key → first key + 1)
  let aIdx = KEYS.length - 1;
  for (let i = 0; i < KEYS.length; i++) {
    if (KEYS[i].t <= td) aIdx = i;
    else break;
  }
  const a = KEYS[aIdx];
  const bIdx = (aIdx + 1) % KEYS.length;
  const b = KEYS[bIdx];
  const bT = bIdx === 0 ? b.t + 1 : b.t;
  const aT = a.t;
  const span = bT - aT || 1;
  let f = (td - aT) / span;
  if (f < 0) f += 1 / span; // td just before wrap point
  f = Math.max(0, Math.min(1, f));
  // Blend linear↔smoothstep by configured smoothness (1 = fully eased).
  const e = lerp(f, smoothstep(f), Math.max(0, Math.min(1, smoothness)));

  for (let i = 0; i < 3; i++) {
    skyTopScratch[i] = Math.round(lerp(a.skyTop[i], b.skyTop[i], e));
    skyBottomScratch[i] = Math.round(lerp(a.skyBottom[i], b.skyBottom[i], e));
  }
  ENV.skyTop = skyTopScratch;
  ENV.skyBottom = skyBottomScratch;
  ENV.tint.r = Math.round(lerp(a.tint[0], b.tint[0], e));
  ENV.tint.g = Math.round(lerp(a.tint[1], b.tint[1], e));
  ENV.tint.b = Math.round(lerp(a.tint[2], b.tint[2], e));
  ENV.tint.a = lerp(a.tint[3], b.tint[3], e);
  ENV.lightBoost = lerp(a.lightBoost, b.lightBoost, e);
  ENV.intensity = lerp(a.intensity, b.intensity, e);
}

// Sun is up ~0.25 (sunrise) → 0.75 (sunset); moon fills the night (offset 0.5).
function arc(td: number, riseAt: number): { up: number; x: number; y: number } {
  let s = (td - riseAt) / 0.5; // 0 at rise, 1 at set
  // wrap so the moon's arc that crosses midnight still reads correctly
  if (s < 0) s += 2;
  const up = s >= 0 && s <= 1 ? Math.sin(s * Math.PI) : 0;
  const x = Math.max(0, Math.min(1, s)); // east (left) → west (right)
  const y = 1 - up * 0.82; // screen fraction: high (small y) at peak
  return { up, x, y };
}

export function computeEnv(cfg: EnvironmentConfig, debug: number | null, perfNowSec: number): EnvState {
  const td = resolveTimeOfDay(cfg, debug, perfNowSec);
  ENV.enabled = cfg.dayNightCycleEnabled;
  ENV.sunEnabled = cfg.sunEnabled;
  ENV.moonEnabled = cfg.moonEnabled;
  ENV.birdsEnabled = cfg.birdsEnabled;
  ENV.particlesEnabled = cfg.ambientParticlesEnabled;
  ENV.reflectionsEnabled = cfg.reflectionsEnabled;
  ENV.shadowQuality = cfg.shadowQuality;
  ENV.timeOfDay = td;
  applyKeyframes(td, cfg.transitionSmoothness);
  // master tint strength scales with lightingIntensity (lets users dim the grade)
  ENV.tint.a *= Math.max(0, Math.min(1, cfg.lightingIntensity));

  const sun = arc(td, 0.25);
  ENV.sun.up = sun.up;
  ENV.sun.x = sun.x;
  ENV.sun.y = sun.y;
  const moon = arc(td, 0.75);
  ENV.moon.up = moon.up;
  ENV.moon.x = moon.x;
  ENV.moon.y = moon.y;
  ENV.moon.phase = cachedMoonPhase;

  ENV.wind = cfg.windEnabled ? computeWind(perfNowSec, 0.6) : zeroWind();
  resolveWeather(cfg.weather, perfNowSec);
  ENV.phase = td < 0.24 || td > 0.84 ? 'night' : td < 0.34 ? 'dawn' : td < 0.72 ? 'day' : 'dusk';
  return ENV;
}

const _zeroWind: Wind = { x: 1, y: 0, strength: 0 };
function zeroWind(): Wind {
  _zeroWind.strength = 0;
  return _zeroWind;
}

// 'auto' = mostly clear with occasional gentle mist and rare light rain (two
// detuned sines so it never loops obviously). Intensities stay gentle/cozy.
function resolveWeather(mode: EnvironmentConfig['weather'], perfNowSec: number): void {
  if (mode === 'off') {
    ENV.weatherKind = 'clear';
    ENV.weatherIntensity = 0;
    return;
  }
  if (mode === 'mist') {
    ENV.weatherKind = 'mist';
    ENV.weatherIntensity = 0.8;
    return;
  }
  if (mode === 'rain') {
    ENV.weatherKind = 'rain';
    ENV.weatherIntensity = 0.7;
    return;
  }
  const w = Math.sin(perfNowSec * 0.008) * 0.6 + Math.sin(perfNowSec * 0.017 + 1.3) * 0.4;
  if (w > 0.78) {
    ENV.weatherKind = 'rain';
    ENV.weatherIntensity = Math.min(1, (w - 0.78) / 0.22) * 0.6;
  } else if (w > 0.45) {
    ENV.weatherKind = 'mist';
    ENV.weatherIntensity = Math.min(1, (w - 0.45) / 0.2) * 0.7;
  } else {
    ENV.weatherKind = 'clear';
    ENV.weatherIntensity = 0;
  }
}
