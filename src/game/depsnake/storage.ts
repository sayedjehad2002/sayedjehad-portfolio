// Per-difficulty high scores for DEPENDENCY DASH, in its own key so neither game can
// corrupt the other. Fully guarded so a blocked/full localStorage degrades gracefully.
import type { Difficulty } from './depsnake';

const KEY = 'sjbh.snake.highscores.v1';
type Scores = Record<Difficulty, number>;

function empty(): Scores {
  return { easy: 0, medium: 0, hard: 0 };
}

export function loadScores(): Scores {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const p = JSON.parse(raw) as Partial<Record<Difficulty, unknown>>;
    return {
      easy: Number(p?.easy) || 0,
      medium: Number(p?.medium) || 0,
      hard: Number(p?.hard) || 0,
    };
  } catch {
    return empty();
  }
}

export function loadBest(diff: Difficulty): number {
  return loadScores()[diff];
}

export function saveBest(diff: Difficulty, score: number): number {
  const scores = loadScores();
  if (score > scores[diff]) {
    scores[diff] = score;
    try {
      localStorage.setItem(KEY, JSON.stringify(scores));
    } catch {
      // storage unavailable
    }
  }
  return scores[diff];
}
