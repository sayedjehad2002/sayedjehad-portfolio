import { useEffect, useRef } from 'react';
import { Engine } from '../engine/Engine';

// The only component that touches the engine. Mounts once; the engine owns the
// rAF loop and all world state, so React never re-renders per frame.
export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new Engine(canvasRef.current);
    engine.start();
    return () => engine.stop();
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 block h-full w-full touch-none" aria-hidden="true" />;
}
