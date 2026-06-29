import { useEffect, useRef, useState } from 'react';
import { createLoop } from '../../engine/loop';
import { CanvasStage } from '../../ui/arcade/CanvasStage';
import type { GameHostProps } from '../types';
import { createState, startRound, update, turn, togglePause, type Difficulty, type Phase, type DeathCause } from './depsnake';
import { render } from './render';
import { loadBest, saveBest, loadScores } from './storage';

interface Result {
  difficulty: Difficulty;
  score: number;
  best: number;
  newBest: boolean;
  deps: number;
  packages: number;
  bestStreak: number;
  moves: number;
  cause: DeathCause | null;
}

const DIFFS: { key: Difficulty; label: string; blurb: string }[] = [
  { key: 'easy', label: 'Easy', blurb: 'A tidy package.json. Plenty of room.' },
  { key: 'medium', label: 'Medium', blurb: 'The chain is growing. Mind the cycles.' },
  { key: 'hard', label: 'Hard', blurb: 'node_modules runs deep. Steady now.' },
];

const CAUSE: Record<DeathCause, { title: string; tone: string; sub: string }> = {
  self: { title: 'CIRCULAR DEPENDENCY DETECTED', tone: '#FF6B6B', sub: 'you imported yourself' },
  wall: { title: 'OUT OF BOUNDS', tone: '#FF6B6B', sub: 'you ran off the edge' },
  overflow: { title: 'STACK OVERFLOW', tone: '#FF6B6B', sub: 'the stack got a little too deep' },
  clear: { title: 'CLEAN BUILD, 0 vulnerabilities', tone: '#5FE0D0', sub: 'the whole graph resolved' },
};

// DEPENDENCY DASH host: owns the canvas + rAF loop + Snake input (arrows/WASD, swipe,
// on-screen d-pad) + pause + difficulty menu + dev-flavoured game over. Esc steps back.
export function DepSnakeHost({ onExit, reduced, coarse, announce, announceAlert }: GameHostProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(createState());
  const lastPhaseRef = useRef<Phase>('menu');
  const swipeRef = useRef<{ x: number; y: number } | null>(null);

  const [phase, setPhase] = useState<Phase>('menu');
  const [paused, setPausedState] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [bests, setBests] = useState(() => loadScores());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    stateRef.current.reduced = reduced;
    rootRef.current?.focus();
    if (import.meta.env.DEV) {
      (window as unknown as { __snake?: unknown }).__snake = {
        get state() {
          return stateRef.current;
        },
        turn: (dx: number, dy: number) => turn(stateRef.current, dx, dy),
        update: (dt: number) => update(stateRef.current, dt),
        startRound: (d: Difficulty) => startRound(stateRef.current, d, 0),
      };
    }

    const loop = createLoop((dt) => {
      const s = stateRef.current;
      update(s, dt);
      if (s.phase !== lastPhaseRef.current) {
        lastPhaseRef.current = s.phase;
        if (s.phase === 'gameover') {
          const prevBest = loadBest(s.difficulty);
          const best = saveBest(s.difficulty, s.score);
          s.best = best;
          const newBest = s.score > prevBest;
          setResult({ difficulty: s.difficulty, score: s.score, best, newBest, deps: s.length, packages: s.packages, bestStreak: s.bestStreak, moves: s.totalTicks, cause: s.cause });
          setBests(loadScores());
          const c = s.cause ? CAUSE[s.cause] : null;
          announceAlert((newBest ? 'New best. ' : '') + 'Game over. ' + (c ? c.title + '. ' : '') + 'Score ' + s.score + '. ' + s.length + ' deps. Best ' + best + '.');
        } else if (s.phase === 'playing') {
          announce('Go. Eat the packages.');
        }
        setPhase(s.phase);
      }
      render(ctx, s, reduced, performance.now() / 1000);
    });
    loop.start();
    return () => loop.stop();
  }, [reduced, announce, announceAlert]);

  function doPause() {
    const s = stateRef.current;
    togglePause(s);
    setPausedState(s.paused);
  }

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
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      turn(s, -1, 0);
      e.preventDefault();
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      turn(s, 1, 0);
      e.preventDefault();
    } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      turn(s, 0, -1);
      e.preventDefault();
    } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      turn(s, 0, 1);
      e.preventDefault();
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      doPause();
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    e.preventDefault();
    swipeRef.current = { x: e.clientX, y: e.clientY };
  }
  function onPointerUp(e: React.PointerEvent) {
    const st = swipeRef.current;
    swipeRef.current = null;
    if (!st) return;
    const dx = e.clientX - st.x;
    const dy = e.clientY - st.y;
    const s = stateRef.current;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 16) {
      if (s.phase === 'playing') doPause();
      return;
    }
    if (Math.abs(dx) > Math.abs(dy)) turn(s, dx > 0 ? 1 : -1, 0);
    else turn(s, 0, dy > 0 ? 1 : -1);
  }

  function startGame(diff: Difficulty) {
    const s = stateRef.current;
    startRound(s, diff, loadBest(diff));
    lastPhaseRef.current = 'countdown';
    setResult(null);
    setPausedState(false);
    setPhase('countdown');
    announce('Starting ' + diff + ' run. Steer with arrows or swipe. Get ready.');
    rootRef.current?.focus();
  }
  function goToMenu() {
    const s = stateRef.current;
    s.phase = 'menu';
    s.paused = false;
    lastPhaseRef.current = 'menu';
    setBests(loadScores());
    setPausedState(false);
    setPhase('menu');
    announce('Dependency Dash. Choose a difficulty.');
  }

  const playing = phase === 'countdown' || phase === 'playing';
  const dpad: { label: string; dx: number; dy: number; pos: string }[] = [
    { label: '▲', dx: 0, dy: -1, pos: 'left-1/2 -translate-x-1/2 bottom-[52px]' },
    { label: '▼', dx: 0, dy: 1, pos: 'left-1/2 -translate-x-1/2 bottom-1' },
    { label: '◀', dx: -1, dy: 0, pos: 'left-[calc(50%-48px)] bottom-[26px]' },
    { label: '▶', dx: 1, dy: 0, pos: 'left-[calc(50%+12px)] bottom-[26px]' },
  ];

  return (
    <div ref={rootRef} tabIndex={-1} onKeyDown={onKeyDown} className="absolute inset-0 outline-none">
      <CanvasStage ref={canvasRef} onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
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

        {/* pause overlay (Resume is a real focusable button) */}
        {phase === 'playing' && paused && (
          <div className="absolute inset-0 grid place-items-center">
            <button
              onClick={doPause}
              autoFocus
              className="ui-focus-dark min-h-[44px] rounded-xl bg-[#5FE0D0] px-6 font-pixel text-[12px] tracking-wide text-[#04130d] shadow-[0_5px_0_#1f8a7e] outline-none"
            >
              Resume build
            </button>
          </div>
        )}

        {/* touch d-pad */}
        {coarse && phase === 'playing' && !paused &&
          dpad.map((b) => (
            <button
              key={b.label}
              onPointerDown={(e) => {
                e.preventDefault();
                turn(stateRef.current, b.dx, b.dy);
              }}
              aria-label={'Steer ' + (b.dy < 0 ? 'up' : b.dy > 0 ? 'down' : b.dx < 0 ? 'left' : 'right')}
              className={'ui-focus-dark absolute grid h-11 w-11 touch-none place-items-center rounded-lg bg-black/45 font-pixel text-[14px] text-[#cdd8e4] outline-none backdrop-blur-sm ' + b.pos}
            >
              {b.label}
            </button>
          ))}

        {phase === 'menu' && (
          <div className="absolute inset-0 flex flex-col items-center overflow-y-auto bg-[#070a16]/85 p-4 backdrop-blur-[2px]">
            <div className="my-auto w-full max-w-md text-center">
              <span className="font-pixel text-[9px] uppercase tracking-[0.34em] text-[#7A5BA6]">Dependency Dash</span>
              <h2 className="mt-2 font-pixel text-[clamp(18px,4.6vw,26px)] leading-[1.4] text-[#FFE08A] [text-shadow:0_3px_0_#1c130a]">npm install --survive</h2>
              <p className="mx-auto mt-2 max-w-xs font-sans text-[12.5px] leading-snug text-[#9fb0c0]">Eat the packages, grow your import chain, and never import yourself.</p>
              <div className="mt-5 grid gap-2.5">
                {DIFFS.map((d) => (
                  <button
                    key={d.key}
                    onClick={() => startGame(d.key)}
                    autoFocus={d.key === 'medium'}
                    className="ui-focus-dark group flex min-h-[44px] items-center justify-between gap-3 rounded-xl border-2 border-[#243240] bg-[#0f1226] px-4 py-3 text-left outline-none transition-colors hover:border-[#7A5BA6] hover:bg-[#15183a]"
                  >
                    <span>
                      <span className="font-pixel text-[13px] text-[#FFE08A]">{d.label}</span>
                      <span className="mt-0.5 block font-sans text-[11px] leading-snug text-[#8aa0b2]">{d.blurb}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-pixel text-[8px] uppercase tracking-wider text-[#5d6b7c]">Best</span>
                      <span className="font-pixel text-[13px] text-[#C0A8DC]">{bests[d.key]}</span>
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-center gap-3 font-sans text-[11px] text-[#6c7d8f]">
                {coarse ? (
                  <>
                    <span>Swipe or d-pad to steer</span>
                    <span aria-hidden="true">/</span>
                    <span>tap pauses</span>
                  </>
                ) : (
                  <>
                    <span>Arrows / WASD to steer</span>
                    <span aria-hidden="true">/</span>
                    <span>Space pauses</span>
                  </>
                )}
              </div>
              <button onClick={onExit} className="ui-focus-dark mt-3 min-h-[44px] rounded-lg px-4 font-sans text-[12px] font-semibold text-[#8aa0b2] outline-none transition-colors hover:text-[#dfeaf2]">
                <kbd className="mr-1 rounded border border-[#2a3a48] bg-[#0f1226] px-1.5 py-0.5 font-pixel text-[8px]">Esc</kbd>
                Back to games
              </button>
            </div>
          </div>
        )}

        {phase === 'gameover' && result && (
          <div className="absolute inset-0 flex flex-col items-center overflow-y-auto bg-[#070a16]/95 p-4 backdrop-blur-[3px]">
            <div className="my-auto w-full max-w-sm text-center">
              {result.cause && (
                <span className="font-pixel text-[10px] uppercase tracking-[0.12em]" style={{ color: CAUSE[result.cause].tone, textShadow: '0 0 10px ' + CAUSE[result.cause].tone + '55' }}>
                  {CAUSE[result.cause].title}
                </span>
              )}
              {result.cause && <div className="mt-1 font-pixel text-[7px] uppercase tracking-wider text-[#6c7d8f]">{CAUSE[result.cause].sub}</div>}
              {result.newBest && <div className="mt-2 font-pixel text-[10px] uppercase tracking-[0.2em] text-[#FFB454] [text-shadow:0_0_12px_rgba(255,180,84,0.6)]">★ New best ★</div>}
              <div className="mt-3 font-pixel text-[42px] leading-none text-[#FFE08A] [text-shadow:0_4px_0_#1c130a]">{result.score}</div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                <Stat label="Deps" value={String(result.deps)} tone="#5FE0D0" />
                <Stat label="Packages" value={String(result.packages)} tone="#E8EDF4" />
                <Stat label="Fresh" value={'x' + result.bestStreak} tone="#FF8A3D" />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Stat label="Moves" value={String(result.moves)} tone="#cdd8e4" />
                <Stat label="Best" value={String(result.best)} tone="#C0A8DC" />
              </div>
              <div className="mt-6 flex flex-col gap-2.5">
                <button onClick={() => startGame(result.difficulty)} autoFocus className="ui-focus-dark min-h-[44px] rounded-xl bg-[#7A5BA6] px-6 font-pixel text-[12px] tracking-wide text-[#0d0a16] shadow-[0_5px_0_#4a3268] outline-none transition active:translate-y-[2px] active:shadow-[0_3px_0_#4a3268]">
                  Run again
                </button>
                <div className="flex gap-2.5">
                  <button onClick={goToMenu} className="ui-focus-dark min-h-[44px] flex-1 rounded-xl border-2 border-[#243240] bg-[#0f1226] font-sans text-[13px] font-semibold text-[#cdd8e4] outline-none transition-colors hover:border-[#37566a]">
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
    <div className="rounded-lg border border-[#1c2030] bg-[#0f1226]/70 px-2 py-1.5">
      <div className="font-pixel text-[7px] uppercase tracking-wider text-[#5d6b7c]">{label}</div>
      <div className="mt-0.5 font-pixel text-[13px]" style={{ color: tone }}>
        {value}
      </div>
    </div>
  );
}
