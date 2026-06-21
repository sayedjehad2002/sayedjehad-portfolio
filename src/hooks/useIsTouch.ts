import { useEffect, useState } from 'react';

// Single source of truth for "is this a touch device". ORs the three reliable
// signals so the world joystick, the arcade d-pad, and the onboarding hints all
// agree (the arcade previously used only pointer:coarse, which could disagree
// with TouchControls' ontouchstart/maxTouchPoints check and hide the d-pad).
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches) ||
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0
  );
}

// Reactive variant: re-checks when the coarse-pointer media query flips (e.g.
// devtools device-mode toggling, or a 2-in-1 switching between touch and mouse).
export function useIsTouch(): boolean {
  const [touch, setTouch] = useState<boolean>(isTouchDevice);
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const on = (): void => setTouch(isTouchDevice());
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return touch;
}
