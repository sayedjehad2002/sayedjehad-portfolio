export type DoorState = 'closed' | 'opening' | 'open';

export interface Door {
  state: DoorState;
  t: number; // 0..1 opening progress
}

export const DOOR_OPEN_SECONDS = 0.7;

// Advances the opening animation. Returns true on the single frame it finishes
// (so the caller can play a chime / spawn light).
export function stepDoor(door: Door, dt: number): boolean {
  if (door.state === 'opening') {
    door.t += dt / DOOR_OPEN_SECONDS;
    if (door.t >= 1) {
      door.t = 1;
      door.state = 'open';
      return true;
    }
  }
  return false;
}
