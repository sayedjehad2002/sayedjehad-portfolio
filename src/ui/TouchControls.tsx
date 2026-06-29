import { useEffect, useRef, useState } from 'react';
import { queueInteract, setTouch } from '../engine/input/inputState';
import { useUiStore, isOverlayOpen } from '../store/uiStore';
import { isTouchDevice } from '../hooks/useIsTouch';

export function TouchControls() {
  const [isTouch, setIsTouch] = useState(false);
  // Same gate the engine uses to pause world input. When any overlay is up
  // (title, dialogue, conversation, modal) the controls hide so the joystick + E
  // button never cover a panel's own buttons (Skip / Leave / speaker photo).
  const overlay = useUiStore(isOverlayOpen);
  const stickRef = useRef<HTMLDivElement>(null);
  const pid = useRef<number | null>(null);
  const base = useRef({ x: 0, y: 0 });
  const [nub, setNub] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setIsTouch(isTouchDevice());
  }, []);

  // If an overlay opens mid-drag, release the held movement vector so the player
  // doesn't keep drifting once the overlay closes (the component renders null but
  // stays mounted, so this effect still fires).
  useEffect(() => {
    if (overlay) {
      pid.current = null;
      setNub({ x: 0, y: 0 });
      setTouch(0, 0, false);
    }
  }, [overlay]);

  const move = (cx: number, cy: number) => {
    const dx = cx - base.current.x;
    const dy = cy - base.current.y;
    const d = Math.hypot(dx, dy) || 1;
    const m = Math.min(d, 46);
    const nx = dx / d;
    const ny = dy / d;
    setNub({ x: nx * m, y: ny * m });
    setTouch(nx * (m / 46), ny * (m / 46), true);
  };

  const onDown = (e: React.PointerEvent) => {
    const r = stickRef.current!.getBoundingClientRect();
    base.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    pid.current = e.pointerId;
    stickRef.current!.setPointerCapture(e.pointerId);
    move(e.clientX, e.clientY);
  };
  const onMove = (e: React.PointerEvent) => {
    if (pid.current === e.pointerId) move(e.clientX, e.clientY);
  };
  const onUp = (e: React.PointerEvent) => {
    if (pid.current === e.pointerId) {
      pid.current = null;
      setNub({ x: 0, y: 0 });
      setTouch(0, 0, false);
    }
  };

  if (!isTouch || overlay) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      <div
        ref={stickRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        style={{
          bottom: 'calc(1.5rem + env(safe-area-inset-bottom))',
          left: 'calc(1.5rem + env(safe-area-inset-left))',
        }}
        className="pointer-events-auto absolute h-32 w-32 touch-none rounded-full border border-white/15 bg-black/30"
      >
        <div
          className="absolute h-12 w-12 rounded-full bg-teal/80 shadow-[0_0_16px_rgba(31,138,140,0.5)]"
          style={{ left: `calc(50% - 24px + ${nub.x}px)`, top: `calc(50% - 24px + ${nub.y}px)` }}
        />
      </div>
      <button
        onPointerDown={(e) => {
          e.preventDefault();
          queueInteract();
        }}
        aria-label="Interact"
        style={{
          bottom: 'calc(3rem + env(safe-area-inset-bottom))',
          right: 'calc(2rem + env(safe-area-inset-right))',
        }}
        className="ui-focus-dark pointer-events-auto absolute grid h-20 w-20 touch-none place-items-center rounded-full bg-teal font-pixel text-body text-[#04130d] shadow-[0_6px_0_#0f5a5c] outline-none"
      >
        E
      </button>
    </div>
  );
}
