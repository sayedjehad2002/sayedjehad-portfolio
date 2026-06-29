import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useProgress, STATIONS, STATION_LABEL } from './progressStore';

const KEY = 'sjbh.progress.v1';

describe('progressStore — discover / persist / reset', () => {
  beforeEach(() => {
    localStorage.clear();
    useProgress.getState().reset();
    localStorage.clear(); // reset() writes an empty record; clear again for a clean slate
  });

  it('STATIONS + labels are aligned (a label per station)', () => {
    expect(STATIONS.length).toBeGreaterThan(0);
    for (const s of STATIONS) {
      expect(typeof STATION_LABEL[s]).toBe('string');
      expect(STATION_LABEL[s].length).toBeGreaterThan(0);
    }
  });

  it('discover() adds a station and surfaces a lastDiscovery toast', () => {
    useProgress.getState().discover('sayed');
    const s = useProgress.getState();
    expect(s.discovered).toContain('sayed');
    expect(s.discovered).toHaveLength(1);
    expect(s.lastDiscovery).not.toBeNull();
    expect(s.lastDiscovery?.label).toBe(STATION_LABEL.sayed);
    expect(s.lastDiscovery?.count).toBe(1);
  });

  it('discover() dedupes a repeated station (no double-count, no new toast)', () => {
    const { discover } = useProgress.getState();
    discover('project');
    const nonceAfterFirst = useProgress.getState().lastDiscovery?.nonce;
    discover('project'); // duplicate — should be a no-op
    const s = useProgress.getState();
    expect(s.discovered).toHaveLength(1);
    expect(s.discovered).toEqual(['project']);
    // lastDiscovery untouched by the duplicate
    expect(s.lastDiscovery?.nonce).toBe(nonceAfterFirst);
  });

  it('lastDiscovery.count tracks the running total and nonce increments per NEW find', () => {
    const { discover } = useProgress.getState();
    discover('sayed');
    discover('project');
    discover('resume');
    const s = useProgress.getState();
    expect(s.discovered).toHaveLength(3);
    expect(s.lastDiscovery?.count).toBe(3);
    expect(s.lastDiscovery?.label).toBe(STATION_LABEL.resume);
    expect(s.lastDiscovery?.nonce).toBeGreaterThanOrEqual(3);
  });

  it('persists discoveries to localStorage as JSON', () => {
    useProgress.getState().discover('about');
    useProgress.getState().discover('stack');
    const raw = localStorage.getItem(KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw as string);
    expect(parsed.discovered).toEqual(['about', 'stack']);
    expect(parsed.completionShown).toBe(false);
  });

  it('completion: discovering all stations reaches the full total', () => {
    const { discover } = useProgress.getState();
    for (const s of STATIONS) discover(s);
    const st = useProgress.getState();
    expect(st.discovered).toHaveLength(STATIONS.length);
    expect(st.lastDiscovery?.count).toBe(STATIONS.length);
  });

  it('markCompletionShown() persists the flag', () => {
    useProgress.getState().discover('arcade');
    useProgress.getState().markCompletionShown();
    expect(useProgress.getState().completionShown).toBe(true);
    const parsed = JSON.parse(localStorage.getItem(KEY) as string);
    expect(parsed.completionShown).toBe(true);
    expect(parsed.discovered).toEqual(['arcade']);
  });

  it('reset() clears state and storage', () => {
    const { discover, reset } = useProgress.getState();
    discover('sayed');
    discover('project');
    reset();
    const s = useProgress.getState();
    expect(s.discovered).toEqual([]);
    expect(s.completionShown).toBe(false);
    expect(s.lastDiscovery).toBeNull();
    const parsed = JSON.parse(localStorage.getItem(KEY) as string);
    expect(parsed.discovered).toEqual([]);
    expect(parsed.completionShown).toBe(false);
  });

  it('reloads persisted state from localStorage on fresh module init (isolated import)', async () => {
    // Seed storage as if a previous session had discovered two stations.
    localStorage.setItem(KEY, JSON.stringify({ discovered: ['sayed', 'about'], completionShown: true }));
    vi.resetModules();
    const fresh = await import('./progressStore');
    const s = fresh.useProgress.getState();
    expect(s.discovered).toEqual(['sayed', 'about']);
    expect(s.completionShown).toBe(true);
  });

  it('ignores unknown/garbage station ids when loading from storage', async () => {
    localStorage.setItem(KEY, JSON.stringify({ discovered: ['sayed', 'bogus', 42], completionShown: false }));
    vi.resetModules();
    const fresh = await import('./progressStore');
    const s = fresh.useProgress.getState();
    expect(s.discovered).toEqual(['sayed']); // 'bogus' + 42 filtered out
  });
});
