import { describe, it, expect } from 'vitest';
import { DOLPHINS, dolphinState, SEA_WATERLINE, type DolphinView } from './dolphins';

const mk = (): DolphinView => ({ active: false, x: 0, y: 0, angle: 0, u: 0 });

describe('dolphins', () => {
  it('has a balanced pod: a synchronized pair + a solo', () => {
    expect(DOLPHINS.length).toBe(3);
    expect(DOLPHINS[0].period).toBe(DOLPHINS[1].period); // the pair jumps together
    expect(DOLPHINS[2].period).not.toBe(DOLPHINS[0].period); // solo on its own schedule
  });

  it('is deterministic for the same time', () => {
    expect(dolphinState(DOLPHINS[0], 5.5, mk())).toEqual(dolphinState(DOLPHINS[0], 5.5, mk()));
  });

  it('writes into the provided out object (no allocation)', () => {
    const out = mk();
    expect(dolphinState(DOLPHINS[0], 3, out)).toBe(out);
  });

  it('is underwater most of the cycle and airborne only briefly', () => {
    const d = DOLPHINS[2];
    const out = mk();
    const N = 2000;
    let active = 0;
    for (let i = 0; i < N; i++) {
      dolphinState(d, (i / N) * d.period, out);
      if (out.active) active++;
    }
    const frac = active / N;
    expect(frac).toBeGreaterThan(0.05); // it does jump
    expect(frac).toBeLessThan(0.25); // but is mostly underwater
  });

  it('arcs above the waterline with the peak near the apex of the jump', () => {
    const d = DOLPHINS[2];
    const out = mk();
    const N = 4000;
    let minY = Infinity;
    let minU = 0;
    for (let i = 0; i < N; i++) {
      dolphinState(d, (i / N) * d.period, out);
      if (out.active) {
        expect(out.y).toBeLessThanOrEqual(SEA_WATERLINE); // never below the surface while airborne
        if (out.y < minY) {
          minY = out.y;
          minU = out.u;
        }
      }
    }
    expect(minY).toBeLessThan(SEA_WATERLINE - 10); // clears the surface meaningfully
    expect(minU).toBeGreaterThan(0.3);
    expect(minU).toBeLessThan(0.7);
  });

  it('travels in its heading direction across the arc', () => {
    const d = DOLPHINS[0]; // dir +1 -> x increases
    const out = mk();
    const N = 4000;
    let x1: number | null = null;
    let x2: number | null = null;
    let u1 = 0;
    for (let i = 0; i < N; i++) {
      dolphinState(d, (i / N) * d.period, out);
      if (!out.active) continue;
      if (x1 === null) {
        x1 = out.x;
        u1 = out.u;
      } else if (out.u > u1 + 0.2) {
        x2 = out.x;
        break;
      }
    }
    expect(x1).not.toBeNull();
    expect(x2).not.toBeNull();
    expect(x2 as number).toBeGreaterThan(x1 as number);
  });
});
