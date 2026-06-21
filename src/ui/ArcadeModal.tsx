import { useCallback, useEffect, useRef, useState } from 'react';
import { useUiStore } from '../store/uiStore';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { blip, chime } from '../engine/audio';
import { CrtFrame } from './arcade/CrtFrame';
import { StartScreen } from './arcade/StartScreen';
import { GameSelect } from './arcade/GameSelect';
import { GAMES, getGame, allGamesBest, type GameId } from '../game/registry';
import { isTouchDevice } from '../hooks/useIsTouch';

type Screen = 'start' | 'select' | 'game';
const CRT_KEY = 'sjbh.crtfx.v1';

function loadCrtOff(): boolean {
  try {
    return localStorage.getItem(CRT_KEY) === 'off';
  } catch {
    return false;
  }
}

// The arcade OS shell. Owns the role=dialog container, focus capture/trap/restore, the
// two sr-only live regions, the CRT chrome, the CRT-FX toggle, and a 3-screen router
// (start -> select -> game). It hosts NO game logic: each game is a self-contained host
// component mounted on the 'game' screen and handed onExit + reduced/coarse + announce.
export function ArcadeModal() {
  const close = useUiStore((s) => s.closeModal);
  const reduced = useReducedMotion();
  // Use the same touch signal as the world TouchControls so the snake d-pad +
  // tap controls appear exactly when the on-screen joystick does (matchMedia
  // pointer:coarse alone can disagree and hide the d-pad on some touch devices).
  const coarse = isTouchDevice();

  const rootRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  const [screen, setScreen] = useState<Screen>('start');
  const [activeGameId, setActiveGameId] = useState<GameId | null>(null);
  const [live, setLive] = useState('Arcade start screen. Press start, or exit.');
  const [resultLive, setResultLive] = useState('');
  const [crtOff, setCrtOff] = useState(loadCrtOff);

  const announce = useCallback((m: string) => setLive(m), []);
  const announceAlert = useCallback((m: string) => setResultLive(m), []);

  // focus capture on open, restore on close
  useEffect(() => {
    restoreRef.current = document.activeElement as HTMLElement | null;
    rootRef.current?.focus();
    return () => restoreRef.current?.focus?.();
  }, []);

  // announce + re-home focus on every screen change (safety net; each screen also
  // autofocuses its own primary control)
  useEffect(() => {
    if (screen === 'start') setLive('Arcade start screen. Press start, or exit.');
    else if (screen === 'select') setLive('Select a game. Arrows move, enter selects, escape goes back.');
    else if (screen === 'game') setLive((getGame(activeGameId)?.name ?? 'Game') + '. Choose a difficulty.');
    const id = requestAnimationFrame(() => {
      const root = rootRef.current;
      if (!root) return;
      if (!root.contains(document.activeElement) || document.activeElement === document.body) {
        const f = root.querySelector<HTMLElement>('button:not([disabled]),[tabindex="0"]');
        (f ?? root).focus();
      }
    });
    return () => cancelAnimationFrame(id);
  }, [screen, activeGameId]);

  // dev hook for verification (stripped from prod builds)
  useEffect(() => {
    if (import.meta.env.DEV) {
      (window as unknown as { __arcade?: unknown }).__arcade = {
        get screen() {
          return screen;
        },
        setScreen,
        pick: (id: GameId) => {
          setActiveGameId(id);
          setScreen('game');
        },
      };
    }
  });

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Tab' && rootRef.current) {
      // exclude roving tabindex=-1 controls (e.g. GameSelect cards) so the trap's
      // first/last always resolve to genuinely-tabbable elements
      const f = rootRef.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]):not([tabindex="-1"]),input:not([tabindex="-1"]),[tabindex="0"]',
      );
      if (f.length > 0) {
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
      return;
    }
    if (e.key === 'Escape') {
      // start=close, select->start; during a game the host handles Esc and stops propagation
      if (screen === 'start') {
        e.preventDefault();
        close();
      } else if (screen === 'select') {
        e.preventDefault();
        setScreen('start');
        blip(420);
      } else if (screen === 'game') {
        // the host stops propagation when it handles Esc itself; this only fires for
        // off-host Escapes (e.g. focus on the CRT FX toggle) so it is never a dead-end
        e.preventDefault();
        backToSelect();
      }
    }
  }

  function goStart() {
    setScreen('start');
  }
  function goSelect() {
    setScreen('select');
    blip(660);
  }
  function pickGame(id: GameId) {
    setActiveGameId(id);
    setScreen('game');
    chime();
  }
  function backToSelect() {
    setResultLive('');
    setScreen('select');
    blip(520);
  }
  function toggleCrt() {
    setCrtOff((v) => {
      const next = !v;
      try {
        localStorage.setItem(CRT_KEY, next ? 'off' : 'on');
      } catch {
        // ignore
      }
      return next;
    });
  }

  const activeGame = getGame(activeGameId);
  const Host = activeGame?.host;
  const ariaLabel =
    screen === 'start'
      ? "Sayed's Arcade. Start screen"
      : screen === 'select'
        ? "Sayed's Arcade. Game select"
        : "Sayed's Arcade. " + (activeGame?.name ?? 'Game');

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className="anim-fade fixed inset-0 z-40 grid place-items-center bg-[#04050a] p-3 outline-none sm:p-5"
    >
      <div className="sr-only" role="status" aria-live="polite">
        {live}
      </div>
      <div className="sr-only" role="alert">
        {resultLive}
      </div>

      <CrtFrame reduced={reduced} crtOff={crtOff} flicker={screen !== 'game'} onToggleCrt={toggleCrt}>
        {screen === 'start' && <StartScreen onStart={goSelect} onExit={close} hiScore={allGamesBest()} reduced={reduced} />}
        {screen === 'select' && <GameSelect games={GAMES} onPick={pickGame} onBack={goStart} hiScore={allGamesBest()} />}
        {screen === 'game' && Host && (
          <Host key={activeGameId} onExit={backToSelect} reduced={reduced} coarse={coarse} announce={announce} announceAlert={announceAlert} />
        )}
      </CrtFrame>
    </div>
  );
}
