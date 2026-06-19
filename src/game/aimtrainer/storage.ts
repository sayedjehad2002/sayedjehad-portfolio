// Persisted per-difficulty high scores. The key is kept from the previous version
// so existing bests carry over (the points model is unchanged: sum of per-hit
// points). Fully guarded so a blocked or full localStorage degrades gracefully.
import type { Difficulty } from './aimtrainer';

const KEY = 'sjbh.highscores.v1';
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

// Persists only if it beats the stored best. Returns the resulting best.
export function saveBest(diff: Difficulty, score: number): number {
  const scores = loadScores();
  if (score > scores[diff]) {
    scores[diff] = score;
    try {
      localStorage.setItem(KEY, JSON.stringify(scores));
    } catch {
      // storage unavailable — the session best still shows, it just won't persist
    }
  }
  return scores[diff];
}
