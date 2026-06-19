import type { SceneConfig } from '../types';

// Outdoor studio plaza. Geometry mirrors the proven prototype so movement,
// collision and the door/transition zones are well-tuned; the art re-skins it.
export const plaza: SceneConfig = {
  id: 'plaza',
  w: 480,
  h: 432,
  arriveAt: { x: 240, y: 176, dir: 'down' }, // just below the entrance when returning
  solids: [
    { x: 40, y: 60, w: 172, h: 90 }, // facade left of the door
    { x: 268, y: 60, w: 172, h: 90 }, // facade right of the door
    // The map has no border walls and the facades only span y60..150, so the player could
    // walk over the top (y<60) or around either flank (x<40 / x>440) to reach BEHIND the
    // cottage and enter the studio from the back. These three rects U-cap the cottage so the
    // studio can only ever be entered through the front door. (Solids never render.)
    { x: 36, y: 0, w: 408, h: 60 }, // back/top wall: seals above the facade + door gap
    { x: 0, y: 0, w: 40, h: 150 }, // left flank
    { x: 440, y: 0, w: 40, h: 150 }, // right flank
    { x: 150, y: 152, w: 16, h: 16 }, // planter L
    { x: 316, y: 152, w: 16, h: 16 }, // planter R
    { x: 96, y: 300, w: 10, h: 26 }, // bollard light L
    { x: 374, y: 300, w: 10, h: 26 }, // bollard light R
    { x: 281, y: 258, w: 26, h: 30 }, // side bench beside the path: player walks around it
  ],
  toStudioZone: { x: 216, y: 96, w: 48, h: 30 },
  interactables: [
    { key: 'sayed', type: 'talk', x: 240, y: 182, r: 38, label: 'Talk', name: 'Sayed Jehad', sub: 'AI System Developer', accent: 'teal', up: 34 },
    { key: 'lostone', type: 'lore', x: 294, y: 272, r: 36, label: 'Talk', name: 'The Guide', sub: 'Friendly Local', accent: 'amber', up: 36 },
  ],
};
