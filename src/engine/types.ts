export interface Vec {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Dir = 'up' | 'down' | 'left' | 'right';

export type SceneId = 'plaza' | 'studio';

export interface Entity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  dir: Dir;
  frame: number; // 0 | 1 walk frame
  anim: number; // walk-frame accumulator
  moving: boolean;
  bob: number; // idle bob phase
}

export type InteractType = 'talk' | 'lore' | 'about' | 'project' | 'stack' | 'resume' | 'water';

export type PhaseAccent = 'sales' | 'hr' | 'aidev' | 'teal' | 'amber';

export interface Interactable {
  key: string;
  type: InteractType;
  id?: string;
  x: number;
  y: number;
  r: number;
  label: string; // action verb: 'Talk' | 'View' | 'Open'
  name?: string; // display name on the HUD plate
  sub?: string; // optional secondary line (e.g. an NPC role) on the plaza nameplate
  accent?: PhaseAccent; // plate/label accent colour
  up: number; // hint vertical offset above the point
}

export interface SceneConfig {
  id: SceneId;
  w: number;
  h: number;
  arriveAt: { x: number; y: number; dir: Dir };
  solids: Rect[];
  interactables: Interactable[];
  toStudioZone?: Rect; // plaza: overlap while door open -> studio
  toPlazaZone?: Rect; // studio: overlap (+ pressing down) -> plaza
}
