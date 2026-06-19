import type { ReactNode } from 'react';
import type { GameHost } from './types';
import { AimGameHost } from './aimtrainer/AimGameHost';
import { loadScores as loadAimScores } from './aimtrainer/storage';
import { DepSnakeHost } from './depsnake/DepSnakeHost';
import { loadScores as loadSnakeScores } from './depsnake/storage';

export type GameId = 'gridshot' | 'depsnake';

export interface GameMeta {
  id: GameId;
  name: string;
  tagline: string;
  accent: string; // cartridge / selector tint
  icon: ReactNode;
  host: GameHost;
  best: () => number; // top score across this game's difficulties
}

const gridshotIcon = (
  <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden="true" fill="none" stroke="#5FE0D0" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="7" />
    <path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4" />
    <circle cx="12" cy="12" r="1.6" fill="#5FE0D0" stroke="none" />
  </svg>
);

const depsnakeIcon = (
  <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden="true" fill="#7A5BA6" stroke="#0d0a16" strokeWidth="1">
    <rect x="4.5" y="4.5" width="15" height="4" rx="1" />
    <rect x="4.5" y="10" width="15" height="4" rx="1" />
    <rect x="4.5" y="15.5" width="15" height="4" rx="1" />
    <circle cx="16" cy="6.5" r="0.9" fill="#C0A8DC" stroke="none" />
    <circle cx="16" cy="12" r="0.9" fill="#C0A8DC" stroke="none" />
  </svg>
);

// One row per game. Adding a game = append a row + write its host.
export const GAMES: GameMeta[] = [
  {
    id: 'gridshot',
    name: 'GRIDSHOT',
    tagline: 'Snap-aim. Pop targets. Beat the clock.',
    accent: '#5FE0D0',
    icon: gridshotIcon,
    host: AimGameHost,
    best: () => Math.max(0, ...Object.values(loadAimScores())),
  },
  {
    id: 'depsnake',
    name: 'DEPENDENCY DASH',
    tagline: "Eat the packages. Don't import yourself.",
    accent: '#7A5BA6',
    icon: depsnakeIcon,
    host: DepSnakeHost,
    best: () => Math.max(0, ...Object.values(loadSnakeScores())),
  },
];

export function getGame(id: GameId | null): GameMeta | undefined {
  if (!id) return undefined;
  return GAMES.find((g) => g.id === id);
}

// Best across every game (the start screen's all-games HI-SCORE).
export function allGamesBest(): number {
  return Math.max(0, ...GAMES.map((g) => g.best()));
}
