import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isTouchDevice } from './useIsTouch';

// We toggle the three signals isTouchDevice() ORs together:
//   1) matchMedia('(pointer: coarse)').matches
//   2) 'ontouchstart' in window
//   3) navigator.maxTouchPoints > 0
// Each test stubs one in isolation and restores afterwards.

const originalMatchMedia = window.matchMedia;

function setMatchMedia(coarse: boolean): void {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('coarse') ? coarse : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

function setMaxTouchPoints(n: number): void {
  Object.defineProperty(window.navigator, 'maxTouchPoints', { value: n, configurable: true });
}

describe('useIsTouch — isTouchDevice', () => {
  beforeEach(() => {
    // Neutralize all three signals before each test.
    setMatchMedia(false);
    setMaxTouchPoints(0);
    // remove any ontouchstart we may have added
    delete (window as unknown as Record<string, unknown>).ontouchstart;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    delete (window as unknown as Record<string, unknown>).ontouchstart;
    setMaxTouchPoints(0);
  });

  it('returns false when no touch signal is present', () => {
    expect(isTouchDevice()).toBe(false);
  });

  it('returns true when pointer:coarse matches', () => {
    setMatchMedia(true);
    expect(isTouchDevice()).toBe(true);
  });

  it('returns true when ontouchstart exists on window', () => {
    (window as unknown as Record<string, unknown>).ontouchstart = null; // presence is what matters
    expect('ontouchstart' in window).toBe(true);
    expect(isTouchDevice()).toBe(true);
  });

  it('returns true when navigator.maxTouchPoints > 0', () => {
    setMaxTouchPoints(5);
    expect(isTouchDevice()).toBe(true);
  });

  it('returns false again once every signal is cleared', () => {
    setMatchMedia(false);
    setMaxTouchPoints(0);
    expect(isTouchDevice()).toBe(false);
  });

  it('is true if ANY single signal is on (coarse off but maxTouchPoints on)', () => {
    setMatchMedia(false);
    setMaxTouchPoints(2);
    expect(isTouchDevice()).toBe(true);
  });
});
