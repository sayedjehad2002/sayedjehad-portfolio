import { useRef, useState } from 'react';

interface StartScreenProps {
  onStart: () => void;
  onExit: () => void;
  hiScore: number; // all-games best
  reduced: boolean;
}

function pad7(n: number): string {
  return String(Math.max(0, Math.min(9999999, Math.round(n)))).padStart(7, '0');
}

// The attract / boot screen: classic arcade start menu adapted to single player
// (START / EXIT). Real <button>s + focus; the red selector is decorative. The
// 1UP / HI-SCORE / CREDIT tokens are aria-hidden so they don't pollute the AT tree.
export function StartScreen({ onStart, onExit, hiScore, reduced }: StartScreenProps) {
  const [sel, setSel] = useState(0);
  const startRef = useRef<HTMLButtonElement>(null);
  const exitRef = useRef<HTMLButtonElement>(null);

  function onMenuKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      (sel === 0 ? exitRef : startRef).current?.focus();
    }
  }

  const items = [
    { label: 'START', ref: startRef, onClick: onStart },
    { label: 'EXIT', ref: exitRef, onClick: onExit },
  ];

  return (
    <div className="anim-fade absolute inset-0 z-10 flex flex-col items-center justify-between px-5 py-3 text-center" onKeyDown={onMenuKey}>
      {/* top status row (decorative) */}
      <div className="flex w-full items-start justify-between font-pixel text-[8px] uppercase tracking-wider" aria-hidden="true">
        <div className="text-left leading-tight">
          <div className="text-[#5FE0D0]">1UP</div>
          <div className="text-[#E8EDF4]">{pad7(0)}</div>
        </div>
        <div className="leading-tight">
          <div className="text-[#9fb0c0]">HI-SCORE</div>
          <div className="text-[#FFE08A] [text-shadow:0_0_8px_rgba(255,224,138,0.5)]">{pad7(hiScore)}</div>
        </div>
        <div className={'text-right leading-tight text-[#FFE08A] ' + (reduced ? '' : 'caret')}>
          INSERT
          <br />
          COIN
        </div>
      </div>

      {/* hero wordmark */}
      <div className="flex flex-col items-center">
        <span className="font-pixel text-[10px] uppercase tracking-[0.34em] text-[#5FE0D0]" aria-hidden="true">
          Sayed Jehad
        </span>
        <h2
          className="mt-2 font-pixel uppercase leading-[1.08] text-[#FFE08A] [text-shadow:0_0_1px_#fff,0_0_8px_rgba(255,224,138,0.55),0_3px_0_#6b4e0a,0_0_22px_rgba(255,224,138,0.3)]"
          style={{ fontSize: 'clamp(22px,6.4vw,42px)' }}
        >
          Developer&apos;s
          <br />
          World
        </h2>
        <span className="mt-2 font-pixel text-[9px] uppercase tracking-[0.3em] text-[#5FE0D0]" aria-hidden="true">
          Arcade System
        </span>
      </div>

      {/* menu */}
      <div className="flex flex-col items-center">
        <div className="flex flex-col items-stretch gap-0.5">
          {items.map((it, i) => (
            <button
              key={it.label}
              ref={it.ref}
              onClick={it.onClick}
              onFocus={() => setSel(i)}
              autoFocus={i === 0}
              className="ui-focus-dark flex min-h-[44px] items-center gap-2 rounded-md px-4 font-pixel text-[16px] uppercase tracking-wider text-[#FFE08A] outline-none transition-colors hover:text-[#ffffff]"
            >
              <span className={'w-4 text-[#FF5A4D] [text-shadow:0_0_6px_rgba(255,90,77,0.7)] ' + (sel === i ? 'opacity-100' : 'opacity-0')} aria-hidden="true">
                ▸
              </span>
              {it.label}
            </button>
          ))}
        </div>
        <div className={'mt-1.5 font-pixel text-[10px] uppercase tracking-[0.3em] text-[#FFE08A] ' + (reduced ? '' : 'caret')} aria-hidden="true">
          Press Start
        </div>
      </div>

      {/* bottom row (decorative) */}
      <div className="flex w-full items-end justify-between font-pixel text-[8px] uppercase tracking-wider" aria-hidden="true">
        <span className="text-[#9fb0c0]">Credit 01</span>
        <span className="text-[#6c7d8f]">(C) 2026 Sayed-OS</span>
      </div>
    </div>
  );
}
