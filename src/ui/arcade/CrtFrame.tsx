import type { ReactNode } from 'react';

interface CrtFrameProps {
  reduced: boolean;
  crtOff: boolean;
  flicker: boolean; // gentle screen flicker on the menu screens, off during a game
  onToggleCrt: () => void;
  children: ReactNode;
}

// The arcade monitor: a moulded bezel around a 4:3 CRT "glass" with scanlines, a
// vignette, a faint grid and a sub-strobe flicker. All effects are pure CSS (zero
// rAF); reduced-motion + the CRT-FX toggle dial the CSS vars to flat. Decorative
// layers are pointer-events:none + aria-hidden so they never eat clicks or pollute AT.
export function CrtFrame({ reduced, crtOff, flicker, onToggleCrt, children }: CrtFrameProps) {
  const scan = crtOff ? 0 : reduced ? 0.18 : 0.42;
  const vig = crtOff ? 0 : 0.5;
  const screenStyle = {
    aspectRatio: '4 / 3',
    maxHeight: '72vh',
    '--crt-scanline': String(scan),
    '--crt-vignette': String(vig),
  } as React.CSSProperties;

  return (
    <div className="relative w-full max-w-[760px]">
      <div
        className="relative rounded-[22px] p-[10px] shadow-[0_24px_70px_rgba(0,0,0,0.7),inset_0_2px_2px_rgba(255,255,255,0.08),inset_0_-3px_6px_rgba(0,0,0,0.6)]"
        style={{ background: 'linear-gradient(#23262e,#0d0f14)' }}
      >
        <span className="absolute left-[7px] top-[7px] h-2 w-2 rounded-full" style={{ background: 'radial-gradient(circle at 35% 35%, #4a4d55, #16181d)' }} aria-hidden="true" />
        <span className="absolute bottom-[7px] right-[7px] h-2 w-2 rounded-full" style={{ background: 'radial-gradient(circle at 35% 35%, #4a4d55, #16181d)' }} aria-hidden="true" />

        <div className={'crt-screen relative rounded-xl ' + (!crtOff && !reduced && flicker ? 'crt-flicker' : '')} style={screenStyle}>
          <div className="crt-grid pointer-events-none absolute inset-0 z-0" aria-hidden="true" />
          {children}
        </div>

        <div className="mt-[6px] flex items-center justify-between px-1">
          <span className="font-pixel text-[7px] uppercase tracking-[0.2em] text-[#5a5e68]" aria-hidden="true">
            SAYED-OS · MODEL SJ-88
          </span>
          <button
            onClick={onToggleCrt}
            className="ui-focus-dark inline-flex min-h-[44px] items-center rounded px-3 font-pixel text-[8px] uppercase tracking-wider text-[#7c8aa0] outline-none transition-colors hover:text-[#cdd8e4]"
          >
            CRT FX {crtOff ? 'OFF' : 'ON'}
          </button>
        </div>
      </div>
    </div>
  );
}
