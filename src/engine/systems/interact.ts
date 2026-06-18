import type { Interactable, Vec } from '../types';

// Nearest interactable within its own radius, or null.
export function findNearest(actor: Vec, list: Interactable[]): Interactable | null {
  let best: Interactable | null = null;
  let bd = Infinity;
  for (const it of list) {
    const d = Math.hypot(actor.x - it.x, actor.y - it.y);
    if (d < it.r && d < bd) {
      bd = d;
      best = it;
    }
  }
  return best;
}
