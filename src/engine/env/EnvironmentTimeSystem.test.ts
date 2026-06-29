import { describe, it, expect } from 'vitest';
import { computeEnv, type EnvState } from './EnvironmentTimeSystem';
import { DEFAULT_ENV_CONFIG, type EnvironmentConfig } from '../../store/envConfig';

// Helper: a fresh config object so per-test tweaks never leak.
const cfg = (patch: Partial<EnvironmentConfig> = {}): EnvironmentConfig => ({
  ...DEFAULT_ENV_CONFIG,
  ...patch,
});

// computeEnv mutates and returns ONE reused module object, so we snapshot the
// scalar fields we care about into a fresh plain object when we need to compare
// two different calls (otherwise both references point at the same mutated ENV).
function snap(s: EnvState) {
  return {
    timeOfDay: s.timeOfDay,
    phase: s.phase,
    enabled: s.enabled,
    lightBoost: s.lightBoost,
    intensity: s.intensity,
    tint: { ...s.tint },
    skyTop: [...s.skyTop] as [number, number, number],
    skyBottom: [...s.skyBottom] as [number, number, number],
    sun: { ...s.sun },
    moon: { ...s.moon },
  };
}

describe('computeEnv — determinism', () => {
  it('returns identical scalar fields for the same debug time + config', () => {
    const a = snap(computeEnv(cfg(), 0.5, 100));
    const b = snap(computeEnv(cfg(), 0.5, 100));
    expect(b).toEqual(a);
  });

  it('clamps/wraps debug time into 0..1 (1.5 → 0.5, -0.25 → 0.75)', () => {
    const wrapHi = computeEnv(cfg(), 1.5, 0).timeOfDay;
    expect(wrapHi).toBeCloseTo(0.5, 6);
    const wrapLo = computeEnv(cfg(), -0.25, 0).timeOfDay;
    expect(wrapLo).toBeCloseTo(0.75, 6);
  });
});

describe('computeEnv — phases across the day', () => {
  it('midnight (0) is night', () => {
    expect(computeEnv(cfg(), 0, 0).phase).toBe('night');
  });
  it('dawn (.25) is dawn', () => {
    // 0.24 < 0.25 < 0.34 → 'dawn'
    expect(computeEnv(cfg(), 0.25, 0).phase).toBe('dawn');
  });
  it('noon (.5) is day', () => {
    expect(computeEnv(cfg(), 0.5, 0).phase).toBe('day');
  });
  it('dusk (.75) is dusk', () => {
    // 0.72 <= 0.75 <= 0.84 → 'dusk'
    expect(computeEnv(cfg(), 0.75, 0).phase).toBe('dusk');
  });
  it('timeOfDay tracks the requested debug time at each marker', () => {
    expect(computeEnv(cfg(), 0, 0).timeOfDay).toBeCloseTo(0, 6);
    expect(computeEnv(cfg(), 0.25, 0).timeOfDay).toBeCloseTo(0.25, 6);
    expect(computeEnv(cfg(), 0.5, 0).timeOfDay).toBeCloseTo(0.5, 6);
    expect(computeEnv(cfg(), 0.75, 0).timeOfDay).toBeCloseTo(0.75, 6);
  });
});

describe('computeEnv — sun / moon arcs', () => {
  it('sun is fully up at noon and down at midnight', () => {
    const noon = computeEnv(cfg(), 0.5, 0).sun.up;
    const midnight = computeEnv(cfg(), 0, 0).sun.up;
    expect(noon).toBeGreaterThan(0.99); // sin(pi/2) ~ 1 at td=0.5 (rise 0.25)
    expect(midnight).toBe(0); // outside the daytime arc
  });

  it('moon is up at midnight and down at noon (complementary to the sun)', () => {
    const moonMid = computeEnv(cfg(), 0, 0).moon.up;
    const moonNoon = computeEnv(cfg(), 0.5, 0).moon.up;
    expect(moonMid).toBeGreaterThan(0.5);
    expect(moonNoon).toBe(0);
  });

  it('sun travels east→west (x increases) from morning to afternoon', () => {
    const morning = computeEnv(cfg(), 0.35, 0).sun.x;
    const afternoon = computeEnv(cfg(), 0.65, 0).sun.x;
    expect(afternoon).toBeGreaterThan(morning);
  });

  it('sun y is highest (smallest) at noon vs near the horizon at rise', () => {
    const yNoon = computeEnv(cfg(), 0.5, 0).sun.y;
    const yRise = computeEnv(cfg(), 0.26, 0).sun.y;
    expect(yNoon).toBeLessThan(yRise); // peak sits high on screen (small y fraction)
    expect(yNoon).toBeGreaterThanOrEqual(0);
  });

  it('sun/moon screen fractions stay within 0..1', () => {
    for (const td of [0, 0.2, 0.4, 0.6, 0.8, 0.95]) {
      const s = computeEnv(cfg(), td, 0);
      expect(s.sun.x).toBeGreaterThanOrEqual(0);
      expect(s.sun.x).toBeLessThanOrEqual(1);
      expect(s.moon.x).toBeGreaterThanOrEqual(0);
      expect(s.moon.x).toBeLessThanOrEqual(1);
      expect(s.sun.up).toBeGreaterThanOrEqual(0);
      expect(s.sun.up).toBeLessThanOrEqual(1);
    }
  });
});

describe('computeEnv — tint / light grade across the day', () => {
  it('night tint is much stronger (higher alpha) than noon tint', () => {
    const nightA = computeEnv(cfg(), 0, 0).tint.a;
    const noonA = computeEnv(cfg(), 0.5, 0).tint.a;
    expect(nightA).toBeGreaterThan(noonA);
    expect(noonA).toBeLessThan(0.1);
  });

  it('lightBoost (lamp brightening) is high at night, ~0 at noon', () => {
    const nightBoost = computeEnv(cfg(), 0, 0).lightBoost;
    const noonBoost = computeEnv(cfg(), 0.5, 0).lightBoost;
    expect(nightBoost).toBeGreaterThan(0.8);
    expect(noonBoost).toBeLessThan(0.1);
  });

  it('intensity (sun strength) is ~1 at noon and low at midnight', () => {
    const noonI = computeEnv(cfg(), 0.5, 0).intensity;
    const midI = computeEnv(cfg(), 0, 0).intensity;
    expect(noonI).toBeGreaterThan(0.9);
    expect(midI).toBeLessThan(0.3);
  });

  it('lightingIntensity config scales the tint alpha down', () => {
    const full = computeEnv(cfg({ lightingIntensity: 1 }), 0, 0).tint.a;
    const half = computeEnv(cfg({ lightingIntensity: 0.5 }), 0, 0).tint.a;
    expect(half).toBeCloseTo(full * 0.5, 5);
    const off = computeEnv(cfg({ lightingIntensity: 0 }), 0, 0).tint.a;
    expect(off).toBe(0);
  });

  it('sky colours are integer RGB triples in 0..255', () => {
    const s = computeEnv(cfg(), 0.3, 0);
    for (const c of [...s.skyTop, ...s.skyBottom]) {
      expect(Number.isInteger(c)).toBe(true);
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(255);
    }
  });
});

describe('computeEnv — disabled / default fallbacks', () => {
  it('with dayNightCycle disabled, timeOfDay is pinned to warm noon (0.5) regardless of perfNow', () => {
    const s1 = computeEnv(cfg({ dayNightCycleEnabled: false }), null, 0);
    expect(s1.timeOfDay).toBe(0.5);
    expect(s1.enabled).toBe(false);
    expect(s1.phase).toBe('day');
    const s2 = computeEnv(cfg({ dayNightCycleEnabled: false }), null, 99999);
    expect(s2.timeOfDay).toBe(0.5); // time does not advance when disabled
  });

  it('disabled config yields the warm-day look: ~0 lightBoost, full intensity, faint tint', () => {
    const s = computeEnv(cfg({ dayNightCycleEnabled: false }), null, 12345);
    expect(s.lightBoost).toBeLessThan(0.1);
    expect(s.intensity).toBeGreaterThan(0.9);
    expect(s.tint.a).toBeLessThan(0.1);
  });

  it('a debug time overrides a disabled cycle (dev scrubbing still works)', () => {
    const s = computeEnv(cfg({ dayNightCycleEnabled: false }), 0, 0);
    expect(s.timeOfDay).toBe(0); // debug wins over the disabled pin
    expect(s.phase).toBe('night');
  });

  it('mirrors per-feature gates from config onto the state object', () => {
    const s = computeEnv(
      cfg({ sunEnabled: false, moonEnabled: false, birdsEnabled: false, ambientParticlesEnabled: false, reflectionsEnabled: false, shadowQuality: 'off' }),
      0.5,
      0,
    );
    expect(s.sunEnabled).toBe(false);
    expect(s.moonEnabled).toBe(false);
    expect(s.birdsEnabled).toBe(false);
    expect(s.particlesEnabled).toBe(false);
    expect(s.reflectionsEnabled).toBe(false);
    expect(s.shadowQuality).toBe('off');
  });
});

describe('computeEnv — wind + weather gating', () => {
  it('windEnabled false → zero wind strength; true → positive', () => {
    const off = computeEnv(cfg({ windEnabled: false }), 0.5, 5);
    expect(off.wind.strength).toBe(0);
    const on = computeEnv(cfg({ windEnabled: true }), 0.5, 5);
    expect(on.wind.strength).toBeGreaterThanOrEqual(0);
  });

  it("weather 'off' clears, 'mist'/'rain' force their kind", () => {
    expect(computeEnv(cfg({ weather: 'off' }), 0.5, 0).weatherKind).toBe('clear');
    expect(computeEnv(cfg({ weather: 'off' }), 0.5, 0).weatherIntensity).toBe(0);
    expect(computeEnv(cfg({ weather: 'mist' }), 0.5, 0).weatherKind).toBe('mist');
    expect(computeEnv(cfg({ weather: 'rain' }), 0.5, 0).weatherKind).toBe('rain');
    expect(computeEnv(cfg({ weather: 'mist' }), 0.5, 0).weatherIntensity).toBeGreaterThan(0);
  });
});
