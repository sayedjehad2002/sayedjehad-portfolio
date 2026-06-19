import { useEffect, useRef, useState } from 'react';
import { createLoop } from '../../engine/loop';
import { CanvasStage } from '../../ui/arcade/CanvasStage';
import type { GameHostProps } from '../types';
import { createState, startRound, update, shoot, LOGICAL_W, LOGICAL_H, ROUND_SECONDS, type Difficulty, type Phase } from './aimtrainer';
import { render } from './render';
import { loadBest, saveBest, loadScores } from './storage';

interface Result {
  difficulty: Difficulty;
  score: number;
  best: number;
  newBest: boolean;
  hits: number;
  shots: number;
  accuracy: number;
  avgReactionMs: number | null;
  bestCombo: number;
}

const DIFFS: { key: Difficulty; label: string; blurb: string }[] = [
  { key: 'easy', label: 'Easy', blurb: 'Big targets, no drift. Find your aim.' },
  { key: 'medium', label: 'Medium', blurb: 'Smaller, and they start to drift.' },
  { key: 'hard', label: 'Hard', blurb: 'Tiny and fast. Pure flick reflex.' },
];

// GRIDSHOT host: owns the 320x240 canvas + rAF loop + aim input + difficulty menu +
// game over. The OS shell owns the dialog/focus-trap/live-regions and hands this host
// onExit + reduced/coarse + announce. Esc steps back (playing -> menu, menu -> onExit).
export function AimGameHost({ onExit, reduced, coarse, announce, announceAlert }: GameHostProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(createState());
  const lastPhaseRef = useRef<Phase>('menu');
  const keysRef = useRef({ left: false, right: false, up: false, down: false });

  const [phase, setPhase] = useState<Phase>('menu');
  const [result, setResult] = useState<Result | null>(null);
  const [bests, setBests] = useState(() => loadScores());

  // ---- lifecycle: canvas + loop ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    const st = stateRef.current;
    st.reduced = reduced;
    st.touchAssist = coarse ? 7 : 0;
    rootRef.current?.focus();
    if (import.meta.env.DEV) {
      (window as unknown as { __aim?: unknown }).__aim = {
        get state() {
          return stateRef.current;
        },
        shoot: (x: number, y: number) => shoot(stateRef.current, x, y),
      };
    }

    const loop = createLoop((dt) => {
      const s = stateRef.current;
      if (s.phase === 'playing') {
        const sp = 230 * dt;
        const k = keysRef.current;
        if (k.left) s.cross.x -= sp;
        if (k.right) s.cross.x += sp;
        if (k.up) s.cross.y -= sp;
        if (k.down) s.cross.y += sp;
        if (s.cross.x < 0) s.cross.x = 0;
        else if (s.cross.x > LOGICAL_W) s.cross.x = LOGICAL_W;
        if (s.cross.y < 0) s.cross.y = 0;
        else if (s.cross.y > LOGICAL_H) s.cross.y = LOGICAL_H;
      }
      update(s, dt);
      if (s.phase !== lastPhaseRef.current) {
        lastPhaseRef.current = s.phase;
        if (s.phase === 'gameover') {
          const prevBest = loadBest(s.difficulty);
          const best = saveBest(s.difficulty, s.score);
          s.best = best;
          const newBest = s.score > prevBest;
          const accuracy = s.shots > 0 ? Math.round((s.hits / s.shots) * 100) : 100;
          const avgReactionMs = s.reactCount > 0 ? Math.round((s.reactSum / s.reactCount) * 1000) : null;
          setResult({ difficulty: s.difficulty, score: s.score, best, newBest, hits: s.hits, shots: s.shots, accuracy, avgReactionMs, bestCombo: s.bestCombo });
          setBests(loadScores());
          const reactPart = avgReactionMs === null ? 'No targets hit. ' : 'Average reaction ' + avgReactionMs + ' milliseconds. ';
          announceAlert((newBest ? 'New best. ' : '') + 'Game over. Score ' + s.score + '. Accuracy ' + accuracy + ' percent. ' + reactPart + 'Best streak ' + s.bestCombo + '. Best ' + best + '.');
        } else if (s.phase === 'playing') {
          announce('Go. Targets are live.');
        }
        setPhase(s.phase);
      }
      render(ctx, s, reduced, performance.now() / 1000);
    });
    loop.start();
    return () => loop.stop();
  }, [reduced, coarse, announce, announceAlert]);

  // ---- pointer (mouse + touch): move crosshair; press = aim + fire ----
  function setCrossFromClient(clientX: number, clientY: number): void {
    const c = canvasRef.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    let x = ((clientX - r.left) / r.width) * LOGICAL_W;
    let y = ((clientY - r.top) / r.height) * LOGICAL_H;
    if (x < 0) x = 0;
    else if (x > LOGICAL_W) x = LOGICAL_W;
    if (y < 0) y = 0;
    else if (y > LOGICAL_H) y = LOGICAL_H;
    stateRef.current.cross.x = x;
    stateRef.current.cross.y = y;
  }
  function onPointerMove(e: React.PointerEvent) {
    setCrossFromClient(e.clientX, e.clientY);
  }
  function onPointerDown(e: React.PointerEvent) {
    e.preventDefault();
    setCrossFromClient(e.clientX, e.clientY);
    const s = stateRef.current;
    if (s.phase === 'playing') shoot(s, s.cross.x, s.cross.y);
  }

  // ---- keyboard: Esc steps back; arrows/WASD aim; Space fires ----
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (stateRef.current.phase === 'menu') onExit();
      else goToMenu();
      return;
    }
    const s = stateRef.current;
    if (s.phase !== 'playing') return;
    const k = keysRef.current;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      k.left = true;
      e.preventDefault();
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      k.right = true;
      e.preventDefault();
    } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      k.up = true;
      e.preventDefault();
    } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      k.down = true;
      e.preventDefault();
    } else if (e.key === ' ') {
      e.preventDefault();
      shoot(s, s.cross.x, s.cross.y);
    }
  }
  function onKeyUp(e: React.KeyboardEvent) {
    const k = keysRef.current;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') k.left = false;
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') k.right = false;
    else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') k.up = false;
    else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') k.down = false;
  }

  // ---- phase controls ----
  function startGame(diff: Difficulty) {
    const s = stateRef.current;
    startRound(s, diff, loadBest(diff));
    keysRef.current = { left: false, right: false, up: false, down: false };
    lastPhaseRef.current = 'countdown';
    setResult(null);
    setPhase('countdown');
    announce('Starting ' + diff + ' round. Aim and click the targets. Get ready.');
    rootRef.current?.focus();
  }
  function goToMenu() {
    const s = stateRef.current;
    s.phase = 'menu';
    for (const tg of s.targets) tg.active = false;
    lastPhaseRef.current = 'menu';
    setBests(loadScores());
    setPhase('menu');
    announce('Gridshot. Choose a difficulty.');
  }

  const playing = phase === 'countdown' || phase === 'playing';

  return (
    <div ref={rootRef} tabIndex={-1} onKeyDown={onKeyDown} onKeyUp={onKeyUp} className="absolute inset-0 outline-none">
      <CanvasStage ref={canvasRef} cursorNone={playing} onPointerMove={onPointerMove} onPointerDown={onPointerDown}>
        {playing && (
          <button
            onClick={goToMenu}
            className="ui-focus-dark absolute right-2 top-2 grid min-h-[44px] place-items-center rounded-lg bg-black/40 px-3 font-sans text-[12px] font-semibold text-[#cdd8e4] outline-none backdrop-blur-sm transition hover:bg-black/60"
          >
            <span>
              <kbd className="mr-1 font-pixel text-[8px] text-[#8aa0b2]">Esc</kbd> Menu
            </span>
          </button>
        )}

        {phase === 'menu' && (
          <div className="absolute inset-0 grid place-items-center bg-[#070a0f]/82 p-4 backdrop-blur-[2px]">
            <div className="w-full max-w-md text-center">
              <span className="font-pixel text-[9px] uppercase tracking-[0.34em] text-[#5FE0D0]">Gridshot</span>
              <h2 className="mt-2 font-pixel text-[clamp(20px,5vw,30px)] leading-[1.4] text-[#FFE08A] [text-shadow:0_3px_0_#1c130a]">Sayed&apos;s Arcade</h2>
              <p className="mx-auto mt-2 max-w-xs font-sans text-[12.5px] leading-snug text-[#9fb0c0]">
                {ROUND_SECONDS}s gridshot. Snap to the targets, pop them fast, keep the streak alive.
              </p>
              <div className="mt-5 grid gap-2.5">
                {DIFFS.map((d) => (
                  <button
                    key={d.key}
                    onClick={() => startGame(d.key)}
                    autoFocus={d.key === 'medium'}
                    className="ui-focus-dark group flex min-h-[44px] items-center justify-between gap-3 rounded-xl border-2 border-[#243240] bg-[#0f1822] px-4 py-3 text-left outline-none transition-colors hover:border-[#5FE0D0] hover:bg-[#11212b]"
                  >
                    <span>
                      <span className="font-pixel text-[13px] text-[#FFE08A]">{d.label}</span>
                      <span className="mt-0.5 block font-sans text-[11px] leading-snug text-[#8aa0b2]">{d.blurb}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-pixel text-[8px] uppercase tracking-wider text-[#5d6b7c]">Best</span>
                      <span className="font-pixel text-[13px] text-[#5FE0D0]">{bests[d.key]}</span>
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-center gap-3 font-sans text-[11px] text-[#6c7d8f]">
                <span>Mouse or tap to aim and fire</span>
                <span aria-hidden="true">/</span>
                <span>Arrows + Space</span>
              </div>
              <button
                onClick={onExit}
                className="ui-focus-dark mt-3 min-h-[44px] rounded-lg px-4 font-sans text-[12px] font-semibold text-[#8aa0b2] outline-none transition-colors hover:text-[#dfeaf2]"
              >
                <kbd className="mr-1 rounded border border-[#2a3a48] bg-[#0f1822] px-1.5 py-0.5 font-pixel text-[8px]">Esc</kbd>
                Back to games
              </button>
            </div>
          </div>
        )}

        {phase === 'gameover' && result && (
          <div className="absolute inset-0 grid place-items-center bg-[#070a0f]/95 p-4 backdrop-blur-[3px]">
            <div className="w-full max-w-sm text-center">
              {result.newBest ? (
                <span className="font-pixel text-[11px] uppercase tracking-[0.2em] text-[#FFB454] [text-shadow:0_0_12px_rgba(255,180,84,0.6)]">★ New best ★</span>
              ) : (
                <span className="font-pixel text-[10px] uppercase tracking-[0.3em] text-[#7c8aa0]">Round over</span>
              )}
              <div className="mt-3 font-pixel text-[44px] leading-none text-[#FFE08A] [text-shadow:0_4px_0_#1c130a]">{result.score}</div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                <Stat label="Accuracy" value={result.accuracy + '%'} tone="#5FE0D0" />
                <Stat label="Avg react" value={result.avgReactionMs === null ? '--' : result.avgReactionMs + 'ms'} tone="#E8EDF4" />
                <Stat label="Best streak" value={String(result.bestCombo)} tone="#FF8A3D" />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Stat label="Hits" value={result.hits + ' / ' + result.shots} tone="#cdd8e4" />
                <Stat label="Best" value={String(result.best)} tone="#5FE0D0" />
              </div>
              <div className="mt-6 flex flex-col gap-2.5">
                <button
                  onClick={() => startGame(result.difficulty)}
                  autoFocus
                  className="ui-focus-dark min-h-[44px] rounded-xl bg-[#5FE0D0] px-6 font-pixel text-[12px] tracking-wide text-[#04130d] shadow-[0_5px_0_#1f8a7e] outline-none transition active:translate-y-[2px] active:shadow-[0_3px_0_#1f8a7e]"
                >
                  Play again
                </button>
                <div className="flex gap-2.5">
                  <button onClick={goToMenu} className="ui-focus-dark min-h-[44px] flex-1 rounded-xl border-2 border-[#243240] bg-[#0f1822] font-sans text-[13px] font-semibold text-[#cdd8e4] outline-none transition-colors hover:border-[#37566a]">
                    Change difficulty
                  </button>
                  <button onClick={onExit} className="ui-focus-dark min-h-[44px] flex-1 rounded-xl border-2 border-transparent font-sans text-[13px] font-semibold text-[#8aa0b2] outline-none transition-colors hover:text-[#dfeaf2]">
                    Games
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CanvasStage>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-lg border border-[#1c2735] bg-[#0f1822]/70 px-2 py-1.5">
      <div className="font-pixel text-[7px] uppercase tracking-wider text-[#5d6b7c]">{label}</div>
      <div className="mt-0.5 font-pixel text-[13px]" style={{ color: tone }}>
        {value}
      </div>
    </div>
  );
}
