import { useEffect, useRef, useState } from 'react';
import { queueInteract, setTouch } from '../engine/input/inputState';

export function TouchControls() {
  const [isTouch, setIsTouch] = useState(false);
  const stickRef = useRef<HTMLDivElement>(null);
  const pid = useRef<number | null>(null);
  const base = useRef({ x: 0, y: 0 });
  const [nub, setNub] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

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

  if (!isTouch) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      <div
        ref={stickRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className="pointer-events-auto absolute bottom-6 left-6 h-32 w-32 touch-none rounded-full border border-white/15 bg-black/30"
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
        className="pointer-events-auto absolute bottom-12 right-8 grid h-20 w-20 touch-none place-items-center rounded-full bg-teal font-pixel text-[14px] text-[#04130d] shadow-[0_6px_0_#0f5a5c]"
      >
        E
      </button>
    </div>
  );
}
