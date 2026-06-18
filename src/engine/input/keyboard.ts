import { input } from './inputState';

const MOVE_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);

function onKeyDown(e: KeyboardEvent): void {
  const k = e.key.toLowerCase();
  // Don't swallow keys when a UI control is focused (overlay buttons activate on
  // Space/Enter); still prevent the page scrolling during normal gameplay.
  const onUi =
    e.target instanceof HTMLElement &&
    !!e.target.closest('button, a, input, textarea, select, [role="button"], [role="dialog"]');
  if ((MOVE_KEYS.has(k) || k === ' ') && !onUi) e.preventDefault();
  if (!input.keys.has(k) && k === 'e') input.interactQueued = true; // edge-triggered
  input.keys.add(k);
}

function onKeyUp(e: KeyboardEvent): void {
  input.keys.delete(e.key.toLowerCase());
}

function onBlur(): void {
  input.keys.clear();
}

export function attachKeyboard(): () => void {
  window.addEventListener('keydown', onKeyDown, { passive: false });
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
  };
}
