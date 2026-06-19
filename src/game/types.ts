import type { ComponentType } from 'react';

// The contract every arcade game host implements. It is a React PROP SHAPE, not an
// imperative engine interface: each game owns its own canvas + rAF loop + input +
// difficulty menu + game over, because the games' input schemes legitimately differ
// (the gridshot aims a crosshair; Snake steers a direction). The OS shell only routes
// to a host and hands it these callbacks.
export interface GameHostProps {
  onExit: () => void; // return to the game-select screen
  reduced: boolean; // prefers-reduced-motion (live)
  coarse: boolean; // coarse pointer (touch) -> larger targets + assist
  announce: (msg: string) => void; // polite aria-live (screen changes, round start)
  announceAlert: (msg: string) => void; // assertive aria-live (game-over summary)
}

export type GameHost = ComponentType<GameHostProps>;
