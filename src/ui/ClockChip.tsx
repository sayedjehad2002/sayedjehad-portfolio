import { useEffect, useState } from 'react';
import { useEnvConfig } from '../store/envConfig';
import { bahrainTimeString } from '../utils/bahrainTime';

// A small, non-intrusive live clock showing real Bahrain local time. On-brand
// chrome chip; sits BELOW the top corner chips (Brand top-left / Help+Sound
// top-right) so nothing overlaps, and clears the device safe-area. Position +
// visibility are config-driven (Atmosphere settings).
export function ClockChip() {
  const visible = useEnvConfig((s) => s.clockVisible);
  const position = useEnvConfig((s) => s.clockPosition);
  const [time, setTime] = useState(() => bahrainTimeString());

  useEffect(() => {
    const id = window.setInterval(() => setTime(bahrainTimeString()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!visible) return null;

  const pos =
    position === 'top-left'
      ? { top: 'calc(4rem + env(safe-area-inset-top))', left: 'calc(1rem + env(safe-area-inset-left))' }
      : { top: 'calc(4rem + env(safe-area-inset-top))', right: 'calc(1rem + env(safe-area-inset-right))' };

  return (
    <div style={pos} aria-label={`Bahrain time ${time}`} className="ui-chip fixed z-30 h-9 gap-1.5 px-3">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-teal">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
      <span className="font-sans text-[12.5px] font-semibold leading-none text-white tabular-nums">{time}</span>
      <span className="font-sans text-[10px] font-medium leading-none text-on-dark-faint">Bahrain</span>
    </div>
  );
}
