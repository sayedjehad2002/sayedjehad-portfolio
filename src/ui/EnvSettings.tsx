import { useEnvConfig, type EnvironmentConfig } from '../store/envConfig';

// User-facing atmosphere toggles (the full config object has more knobs that stay
// code-/dev-tunable; these are the ones worth surfacing). Rendered inside the Help
// dialog so we don't add another HUD chip. Each row is a 44px accessible switch.
type BoolKey = {
  [K in keyof EnvironmentConfig]: EnvironmentConfig[K] extends boolean ? K : never;
}[keyof EnvironmentConfig];

const WEATHER_ORDER = ['auto', 'mist', 'rain', 'off'] as const;
const WEATHER_LABEL: Record<(typeof WEATHER_ORDER)[number], string> = { auto: 'Auto', mist: 'Mist', rain: 'Rain', off: 'Off' };

const ROWS: Array<{ key: BoolKey; label: string }> = [
  { key: 'dayNightCycleEnabled', label: 'Day / night cycle' },
  { key: 'clockVisible', label: 'Bahrain clock' },
  { key: 'birdsEnabled', label: 'Birds' },
  { key: 'ambientParticlesEnabled', label: 'Ambient particles' },
  { key: 'ambientAudioEnabled', label: 'Ambient sound' },
];

export function EnvSettings() {
  const cfg = useEnvConfig();
  return (
    <div className="mt-5 border-t border-line/70 pt-4">
      <span className="font-pixel text-[9px] uppercase tracking-widest text-teal-deep">Atmosphere</span>
      <ul className="mt-2 flex flex-col">
        {ROWS.map((r) => {
          const on = cfg[r.key];
          return (
            <li key={r.key}>
              <button
                type="button"
                onClick={() => cfg.toggle(r.key)}
                role="switch"
                aria-checked={on}
                className="ui-focus-panel flex min-h-[44px] w-full items-center justify-between gap-3 rounded-lg px-1 text-left outline-none"
              >
                <span className="font-sans text-[14px] text-ink-soft">{r.label}</span>
                <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? 'bg-teal' : 'bg-line'}`} aria-hidden="true">
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex min-h-[44px] items-center justify-between gap-3 px-1">
        <span className="font-sans text-[14px] text-ink-soft">Weather</span>
        <button
          type="button"
          onClick={() => {
            const i = WEATHER_ORDER.indexOf(cfg.weather);
            cfg.set({ weather: WEATHER_ORDER[(i + 1) % WEATHER_ORDER.length] });
          }}
          aria-label={`Weather: ${WEATHER_LABEL[cfg.weather]}, tap to change`}
          className="ui-focus-panel rounded-lg border border-line bg-sunken px-3 py-1.5 font-sans text-[13px] font-semibold text-teal-deep outline-none transition-colors hover:border-teal"
        >
          {WEATHER_LABEL[cfg.weather]}
        </button>
      </div>
    </div>
  );
}
