import { useEffect, useRef, useState } from 'react';
import type { GameId, GameMeta } from '../../game/registry';

interface GameSelectProps {
  games: GameMeta[];
  onPick: (id: GameId) => void;
  onBack: () => void;
  hiScore: number;
}

function pad7(n: number): string {
  return String(Math.max(0, Math.round(n))).padStart(7, '0');
}
function pad5(n: number): string {
  return String(Math.max(0, Math.round(n))).padStart(5, '0');
}

// Cartridge picker. Real <button> cards with roving tabindex (arrows move focus,
// Enter/Space pick, Esc back). Each card exposes its best score to assistive tech.
export function GameSelect({ games, onPick, onBack, hiScore }: GameSelectProps) {
  const [sel, setSel] = useState(0);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    cardRefs.current[0]?.focus();
  }, []);

  function move(delta: number) {
    const n = games.length;
    const next = (sel + delta + n) % n;
    setSel(next);
    cardRefs.current[next]?.focus();
  }
  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      move(1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      move(-1);
    }
  }

  return (
    <div className="anim-fade absolute inset-0 z-10 flex flex-col px-4 py-3" onKeyDown={onKey}>
      <div className="flex items-start justify-between">
        <button
          onClick={onBack}
          className="ui-focus-dark inline-flex min-h-[44px] items-center rounded px-3 font-pixel text-eyebrow uppercase tracking-wider text-[#9fb0c0] outline-none transition-colors hover:text-[#ffffff]"
        >
          <span className="mr-1 text-[#FF5A4D]" aria-hidden="true">
            &lsaquo;
          </span>
          Back
        </button>
        <div className="text-center">
          <h2 className="font-pixel text-body uppercase tracking-wider text-[#FFE08A] [text-shadow:0_0_8px_rgba(255,224,138,0.4)]">Select Game</h2>
          <div className="font-pixel text-nano uppercase tracking-[0.3em] text-[#5FE0D0]" aria-hidden="true">
            Choose your cartridge
          </div>
        </div>
        <div className="text-right font-pixel text-nano uppercase leading-tight" aria-hidden="true">
          <div className="text-[#9fb0c0]">HI-SCORE</div>
          <div className="text-[#FFE08A]">{pad7(hiScore)}</div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center gap-3 sm:gap-4">
        {games.map((g, i) => (
          <div key={g.id} className="flex flex-col items-center">
            <span
              className={'mb-1 font-pixel text-small text-[#FF5A4D] [text-shadow:0_0_6px_rgba(255,90,77,0.7)] ' + (sel === i ? 'opacity-100' : 'opacity-0')}
              aria-hidden="true"
            >
              ▾
            </span>
            <button
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              tabIndex={sel === i ? 0 : -1}
              aria-current={sel === i ? 'true' : undefined}
              onFocus={() => setSel(i)}
              onClick={() => onPick(g.id)}
              aria-label={g.name + '. Best ' + g.best() + '. ' + g.tagline}
              className={'ui-focus-dark w-[clamp(118px,30vw,152px)] overflow-hidden rounded-xl border-2 bg-[#0c1230] text-center outline-none transition-transform ' + (sel === i ? 'scale-[1.04]' : '')}
              style={{ borderColor: sel === i ? g.accent : '#243240' }}
            >
              <div className="px-2 py-1 font-pixel text-nano uppercase tracking-wider text-[#04130d]" style={{ background: g.accent }}>
                {g.name}
              </div>
              <div className="flex flex-col items-center gap-1.5 px-2 py-3">
                <div className="grid h-12 w-12 place-items-center rounded-lg bg-[#070a22]" style={{ boxShadow: sel === i ? '0 0 14px ' + g.accent + '66' : 'none' }}>
                  {g.icon}
                </div>
                <div className="font-pixel text-label text-[#FFE08A]">{g.name}</div>
                <div className="min-h-[26px] font-sans text-micro leading-snug text-[#9fb0c0]">{g.tagline}</div>
                <div className="font-pixel text-eyebrow uppercase tracking-wider" style={{ color: g.accent }}>
                  Best {pad5(g.best())}
                </div>
              </div>
            </button>
          </div>
        ))}
      </div>

      <div className="text-center font-pixel text-nano uppercase tracking-[0.2em] text-[#6c7d8f]" aria-hidden="true">
        Arrows Move &nbsp;&nbsp; Enter Select &nbsp;&nbsp; Esc Back
      </div>
    </div>
  );
}
