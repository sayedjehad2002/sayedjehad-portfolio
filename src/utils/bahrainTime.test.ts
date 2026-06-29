import { describe, it, expect } from 'vitest';
import { bahrainTimeString } from './bahrainTime';

describe('bahrainTime — bahrainTimeString', () => {
  it('formats a fixed UTC instant into Bahrain local 12h time (UTC+3)', () => {
    // 2026-06-29T16:42:00Z → Bahrain (UTC+3) = 19:42 → "07:42 PM"
    const d = new Date('2026-06-29T16:42:00Z');
    const out = bahrainTimeString(d);
    expect(out).toMatch(/^\d{2}:\d{2}\s?(AM|PM)$/i);
    expect(out).toContain('07:42');
    expect(out.toUpperCase()).toContain('PM');
  });

  it('handles a morning instant (AM)', () => {
    // 2026-01-01T05:05:00Z → Bahrain 08:05 → "08:05 AM"
    const out = bahrainTimeString(new Date('2026-01-01T05:05:00Z'));
    expect(out).toContain('08:05');
    expect(out.toUpperCase()).toContain('AM');
  });

  it('rolls past midnight Bahrain time correctly (UTC offset crosses the date)', () => {
    // 2026-06-29T22:30:00Z → Bahrain next-day 01:30 → "01:30 AM"
    const out = bahrainTimeString(new Date('2026-06-29T22:30:00Z'));
    expect(out).toContain('01:30');
    expect(out.toUpperCase()).toContain('AM');
  });

  it('defaults to "now" without a crash and returns a sensible string', () => {
    const out = bahrainTimeString();
    expect(typeof out).toBe('string');
    expect(out).toMatch(/^\d{2}:\d{2}\s?(AM|PM)$/i);
  });

  it('is deterministic for the same input', () => {
    const d = new Date('2026-03-15T09:00:00Z');
    expect(bahrainTimeString(d)).toBe(bahrainTimeString(d));
  });
});
