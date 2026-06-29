import { create } from 'zustand';

// Lightweight "discovery" progress: which of the portfolio's stations the visitor
// has opened. Drives a transient toast per discovery and a one-time "you've seen
// it all, let's connect" card. Persisted so it survives reloads. The engine
// (non-React) calls `discover()` via getState(); React subscribes for the UI.

export const STATIONS = ['sayed', 'project', 'resume', 'about', 'stack', 'arcade'] as const;
export type Station = (typeof STATIONS)[number];

export const STATION_LABEL: Record<Station, string> = {
  sayed: 'Met Sayed',
  project: 'Projects',
  resume: 'Career path',
  about: 'About Sayed',
  stack: 'Tech stack',
  arcade: 'Arcade',
};

const KEY = 'sjbh.progress.v1';

interface Saved {
  discovered: Station[];
  completionShown: boolean;
}
function load(): Saved {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Saved>;
      const discovered = (p.discovered ?? []).filter((s): s is Station => (STATIONS as readonly string[]).includes(s));
      return { discovered, completionShown: !!p.completionShown };
    }
  } catch {
    /* ignore */
  }
  return { discovered: [], completionShown: false };
}
function save(s: Saved): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* private mode / quota */
  }
}

interface ProgressState {
  discovered: Station[];
  completionShown: boolean;
  // ephemeral (not persisted): the most recent NEW discovery, for the toast
  lastDiscovery: { label: string; count: number; nonce: number } | null;
  discover: (s: Station) => void;
  markCompletionShown: () => void;
  reset: () => void;
}

export const useProgress = create<ProgressState>((set, get) => ({
  ...load(),
  lastDiscovery: null,
  discover: (station) => {
    const s = get();
    if (s.discovered.includes(station)) return; // already found
    const discovered = [...s.discovered, station];
    save({ discovered, completionShown: s.completionShown });
    set({
      discovered,
      lastDiscovery: { label: STATION_LABEL[station], count: discovered.length, nonce: (s.lastDiscovery?.nonce ?? 0) + 1 },
    });
  },
  markCompletionShown: () => {
    save({ discovered: get().discovered, completionShown: true });
    set({ completionShown: true });
  },
  reset: () => {
    save({ discovered: [], completionShown: false });
    set({ discovered: [], completionShown: false, lastDiscovery: null });
  },
}));

// Dev-only: scrub/reset discovery while testing.
//   window.useProgress.getState().reset()
if (import.meta.env.DEV) {
  (window as unknown as { useProgress?: typeof useProgress }).useProgress = useProgress;
}
