// Framework-agnostic input bus shared by the keyboard listener, the React touch
// controls, and the engine. No React, no DOM coupling beyond the key strings.
export interface TouchVec {
  x: number;
  y: number;
  active: boolean;
}

export interface InputState {
  keys: Set<string>;
  touch: TouchVec;
  interactQueued: boolean;
}

export const input: InputState = {
  keys: new Set<string>(),
  touch: { x: 0, y: 0, active: false },
  interactQueued: false,
};

export function readAxis(): { x: number; y: number } {
  let x = 0;
  let y = 0;
  const k = input.keys;
  if (k.has('a') || k.has('arrowleft')) x -= 1;
  if (k.has('d') || k.has('arrowright')) x += 1;
  if (k.has('w') || k.has('arrowup')) y -= 1;
  if (k.has('s') || k.has('arrowdown')) y += 1;
  if (input.touch.active) {
    x = input.touch.x;
    y = input.touch.y;
  }
  return { x, y };
}

export function consumeInteract(): boolean {
  const q = input.interactQueued;
  input.interactQueued = false;
  return q;
}

export function queueInteract(): void {
  input.interactQueued = true;
}

export function setTouch(x: number, y: number, active: boolean): void {
  input.touch.x = x;
  input.touch.y = y;
  input.touch.active = active;
}
