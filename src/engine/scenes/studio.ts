import type { SceneConfig } from '../types';

// Interior studio (the portfolio room).
export const studio: SceneConfig = {
  id: 'studio',
  w: 470,
  h: 362,
  arriveAt: { x: 235, y: 302, dir: 'up' },
  solids: [
    { x: 20, y: 20, w: 430, h: 16 }, // top wall
    { x: 20, y: 20, w: 16, h: 320 }, // left wall
    { x: 434, y: 20, w: 16, h: 320 }, // right wall
    { x: 20, y: 324, w: 190, h: 16 }, // bottom wall (left of exit)
    { x: 262, y: 324, w: 188, h: 16 }, // bottom wall (right of exit)
    { x: 208, y: 212, w: 54, h: 30 }, // resume desk
    { x: 388, y: 150, w: 26, h: 34 }, // tech rack
    { x: 36, y: 113, w: 398, h: 10 }, // gallery counter — full width, so the player views projects from the front AND can never roam behind the gallery (back/left/right sealed)
    { x: 36, y: 60, w: 18, h: 18 }, // plant L
    { x: 416, y: 60, w: 18, h: 18 }, // plant R
  ],
  toPlazaZone: { x: 212, y: 300, w: 48, h: 30 },
  interactables: [
    { key: 'careers', type: 'project', id: 'careers', x: 90, y: 74, r: 62, label: 'View', name: 'careers.lumofy.ai', accent: 'aidev', up: 18 },
    { key: 'pulse', type: 'project', id: 'pulse', x: 175, y: 74, r: 62, label: 'View', name: 'Lumofy Pulse', accent: 'aidev', up: 18 },
    { key: 'dispatch', type: 'project', id: 'dispatch', x: 295, y: 74, r: 62, label: 'View', name: 'Dispatching Tool', accent: 'hr', up: 18 },
    { key: 'curator', type: 'project', id: 'curator', x: 380, y: 74, r: 62, label: 'View', name: 'AI Curator', accent: 'hr', up: 18 },
    { key: 'stack', type: 'stack', x: 401, y: 190, r: 28, label: 'View', name: 'Tech Stack', accent: 'teal', up: 20 },
    { key: 'resume', type: 'resume', x: 235, y: 258, r: 44, label: 'Open', name: 'Career Path', accent: 'teal', up: 14 },
    { key: 'water', type: 'water', x: 52, y: 296, r: 30, label: 'Drink', name: 'Water cooler', accent: 'teal', up: 30 },
  ],
};
