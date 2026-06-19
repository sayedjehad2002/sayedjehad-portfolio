import { forwardRef, type PointerEvent, type ReactNode } from 'react';

interface CanvasStageProps {
  width?: number;
  height?: number;
  cursorNone?: boolean;
  onPointerMove?: (e: PointerEvent) => void;
  onPointerDown?: (e: PointerEvent) => void;
  onPointerUp?: (e: PointerEvent) => void;
  children?: ReactNode;
}

// The pixel-crisp game canvas that fills the CRT screen area, plus any DOM overlays
// (difficulty menu, game over, d-pad) layered on top. The CRT glass / scanlines /
// bezel come from the surrounding CrtFrame; the canvas stays aria-hidden.
export const CanvasStage = forwardRef<HTMLCanvasElement, CanvasStageProps>(function CanvasStage(
  { width = 320, height = 240, cursorNone, onPointerMove, onPointerDown, onPointerUp, children },
  ref,
) {
  return (
    <>
      <canvas
        ref={ref}
        width={width}
        height={height}
        aria-hidden="true"
        onPointerMove={onPointerMove}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        className="absolute inset-0 h-full w-full touch-none select-none"
        style={{ imageRendering: 'pixelated', cursor: cursorNone ? 'none' : 'default' }}
      />
      {children}
    </>
  );
});
