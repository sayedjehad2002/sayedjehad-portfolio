import { create } from 'zustand';

// ---------------------------------------------------------------------------
// Environment / atmosphere configuration. One source of truth for the whole
// day/night + weather-ambience system. React reads it reactively (clock chip,
// settings panel); the engine reads `useEnvConfig.getState()` NON-reactively
// once per frame (same pattern as uiStore in Engine.render), so toggling a
// setting takes effect on the next frame with no React re-render of the world.
// Persisted to localStorage so a visitor's preferences survive reloads.
// ---------------------------------------------------------------------------

export type ClockPosition = 'top-left' | 'top-right';
export type ShadowQuality = 'off' | 'low' | 'high';
export type WeatherMode = 'off' | 'mist' | 'rain' | 'auto';

export interface EnvironmentConfig {
  dayNightCycleEnabled: boolean; // master switch: off → fixed warm day (today's look)
  useRealBahrainTime: boolean; // true → sky follows real Asia/Bahrain time; false → accelerated loop
  gameTimeSpeed: number; // accelerated mode only: how many full day cycles per ACCEL_DAY_SECONDS
  clockVisible: boolean;
  clockPosition: ClockPosition;
  sunEnabled: boolean;
  moonEnabled: boolean;
  windEnabled: boolean;
  birdsEnabled: boolean;
  oceanEnabled: boolean; // animated sea behind the cottage (dolphins, fish, shimmer, gulls)
  reflectionsEnabled: boolean;
  ambientParticlesEnabled: boolean;
  ambientAudioEnabled: boolean;
  shadowQuality: ShadowQuality;
  weather: WeatherMode; // 'auto' = mostly clear with occasional gentle mist/drizzle
  lightingIntensity: number; // 0..1 multiplier on the day/night tint strength
  transitionSmoothness: number; // 0..1 (1 = fully eased keyframe blends)
}

export const DEFAULT_ENV_CONFIG: EnvironmentConfig = {
  dayNightCycleEnabled: true,
  useRealBahrainTime: true, // owner's choice: authentic Bahrain time
  gameTimeSpeed: 1,
  clockVisible: true,
  clockPosition: 'top-right',
  sunEnabled: true,
  moonEnabled: true,
  windEnabled: true,
  birdsEnabled: true,
  oceanEnabled: true,
  reflectionsEnabled: true,
  ambientParticlesEnabled: true,
  ambientAudioEnabled: true,
  shadowQuality: 'high',
  weather: 'auto',
  lightingIntensity: 1,
  transitionSmoothness: 1,
};

const KEY = 'sjbh.env.v1';

function load(): EnvironmentConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_ENV_CONFIG };
    // Merge over defaults so configs saved before a new field was added still load.
    return { ...DEFAULT_ENV_CONFIG, ...(JSON.parse(raw) as Partial<EnvironmentConfig>) };
  } catch {
    return { ...DEFAULT_ENV_CONFIG };
  }
}

function save(cfg: EnvironmentConfig): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(cfg));
  } catch {
    /* private mode / quota — non-fatal, settings just won't persist */
  }
}

type BoolKey = {
  [K in keyof EnvironmentConfig]: EnvironmentConfig[K] extends boolean ? K : never;
}[keyof EnvironmentConfig];

export interface EnvStore extends EnvironmentConfig {
  /** Dev-only override: when non-null, forces timeOfDay (0..1) regardless of the clock. */
  debugTimeOfDay: number | null;
  set: (patch: Partial<EnvironmentConfig>) => void;
  toggle: (key: BoolKey) => void;
  reset: () => void;
  setDebugTimeOfDay: (v: number | null) => void;
}

export const useEnvConfig = create<EnvStore>((set) => ({
  ...load(),
  debugTimeOfDay: null,
  set: (patch) =>
    set((s) => {
      const next = { ...s, ...patch };
      save(next);
      return patch;
    }),
  toggle: (key) =>
    set((s) => {
      const patch = { [key]: !s[key] } as Partial<EnvironmentConfig>;
      save({ ...s, ...patch });
      return patch;
    }),
  reset: () => {
    save(DEFAULT_ENV_CONFIG);
    set({ ...DEFAULT_ENV_CONFIG, debugTimeOfDay: null });
  },
  setDebugTimeOfDay: (debugTimeOfDay) => set({ debugTimeOfDay }),
}));

// Dev-only: expose for local visual debugging / time-scrubbing (stripped from prod).
//   window.useEnvConfig.getState().setDebugTimeOfDay(0.75)  // jump to dusk
if (import.meta.env.DEV) {
  (window as unknown as { useEnvConfig?: typeof useEnvConfig }).useEnvConfig = useEnvConfig;
}
