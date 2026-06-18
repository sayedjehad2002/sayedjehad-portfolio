// Single requestAnimationFrame loop with a clamped delta-time.
// Owns no game state; the Engine passes a `step(dt)` callback.
export interface Loop {
  start(): void;
  stop(): void;
}

export function createLoop(step: (dt: number) => void): Loop {
  let raf = 0;
  let last = 0;
  let running = false;

  const frame = (now: number): void => {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.05); // clamp: tab-restore can't teleport
    last = now;
    step(dt);
    raf = requestAnimationFrame(frame);
  };

  return {
    start(): void {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    },
    stop(): void {
      running = false;
      cancelAnimationFrame(raf);
    },
  };
}
