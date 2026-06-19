// Single source of truth for every colour. The canvas engine imports this directly;
// Tailwind mirrors the leaf hexes in tailwind.config.js so React overlays use class names.
//
// VISUAL DIRECTION: Moonlighter-1-inspired (original, not copied) — cozy, warm, clean,
// readable pixel art with soft shadows and a gentle glow on interactables.
export const palette = {
  // --- exterior courtyard ---
  plaza: { stone: '#B89A73', stone2: '#A88F6A', seam: '#8A6E4C', walk: '#C9AD84', crack: '#7A5E3C', edge: '#9A7E58', hi: '#D6BC92', moss: '#5E7E3E' },
  lawn: { base: '#6F9A4A', hi: '#84B25A', shadow: '#547A38', tip: '#93C062', tone2: '#659046', dry: '#8AA858', clover: '#4E8C3E' },
  facade: { wall: '#E8D6B0', wallSh: '#D6C29A', pilaster: '#EFE0C2', plinth: '#B89A6E', parapet: '#8A5E38' },
  // warm windows (wooden frames, golden glow)
  glass: { pane: '#C98A4B', hi: '#E0B87A', mullion: '#7A4F2C', reflect: '#FFE6B0', lit: '#FFD98A', warm: '#FFCF6E' },
  metal: { base: '#7A5E44', hi: '#A98A64' },
  door: { glass: '#6B4A2A', spill: '#FFD98A', frame: '#7A5230' },
  wood: { light: '#C4925A', mid: '#8A5E38', dark: '#5A3A22' },
  plant: { base: '#3F7A3A', hi: '#56A04A', dark: '#2F5E30' },
  // tree foliage: lush warm-green canopy with a golden sun-catch, harmonised with the
  // green lawn/plants (key kept as `autumn` for stability; only the trees use it).
  autumn: { dark: '#356A33', mid: '#5A9A40', hi: '#86C25A', pocket: '#2C5526', sun: '#F0C060', sun2: '#F5D070', red: '#3C7A36' },

  // --- interior room materials ---
  floor: {
    plank: '#B07A46',
    plankSh: '#9C6838',
    plankHi: '#C4925A',
    seam: '#7A4F2C',
    plankTones: ['#B98A52', '#B07A46', '#A8743F', '#BD9056', '#AC7848'],
    grain: '#9A6A3C',
    seamHi: '#C8975C',
  },
  room: { wall: '#E6D4AD', wallHi: '#F2E4C4', wallSh: '#CDB888', wainscot: '#8A5E38', trim: '#6E4A2A' },
  rug: { base: '#2A8F86', deep: '#1F6F68', pattern: '#E8D6B0' },
  lamp: { glow: '#FFCF6E', warm: '#FFD98A' },
  glow: { cyan: '#5FE0D0', gold: '#FFCF6E' },

  // --- UI surfaces (modern, warm, clean) ---
  surface: { panel: '#FBF6EA', white: '#FFFFFF', line: '#E2D2AC', sunken: '#F1E6CE' },
  ink: { text: '#2E241A', soft: '#5A4A36', faint: '#7A6748' },
  accent: { teal: '#1FA89C', tealDeep: '#14756C', indigo: '#7A5BA6', amber: '#E0843C', golden: '#FFCF6E' },
  shadow: 'rgba(60,40,20,0.30)',
  shadowSoft: 'rgba(60,40,20,0.16)',

  // --- sprites ---
  skin: { hi: '#E8B68C', mid: '#C98A5E', shadow: '#9C6038' },
  hair: { dark: '#2E2014', hi: '#46301D', brow: '#241A10' },
  // Sayed: cream shirt + teal shopkeeper vest, warm trousers, lanyard badge
  sayed: {
    shirt: '#E6DCC6',
    shirtHi: '#F2E8D4',
    shirtSh: '#C9BB9E',
    collar: '#FFFFFF',
    vest: '#1F8A7E',
    vestSh: '#16685F',
    trousers: '#6E4A2A',
    lanyard: '#16685F',
    badge: '#FFCF6E',
  },
  recruiter: { coat: '#7A6A4A', coatHi: '#8E7C58', coatSh: '#5E5038', hair: '#5A4631', hairHi: '#6E5640', badge: '#E0843C' },

  // --- shared visual-system tokens (unified world upgrade) ---
  outline: 'rgba(42,28,14,0.5)', // consistent soft prop edge
  ground: { pebble: '#A89A82', pebbleHi: '#C6BAA0', dirt: '#9C7A4E', dirtHi: '#B08A5A', dirtSh: '#7E5E38' },
  flower: { red: '#D8593A', gold: '#FFCF6E', violet: '#8A6CB0', pink: '#E59AB4', cream: '#F2EAD6', stem: '#4C7E37', leaf: '#5E9A46', core: '#FFE6A8' },
  glowKit: { lamp: '#FFD98A', window: '#FFE6B0', interact: '#FFE08A' },

  // --- timeline phase accents (warm-harmonised, colourblind-safe) ---
  phase: {
    sales: { base: '#C2682B', tint: '#F6E0CC', deep: '#7E3F12' },
    hr: { base: '#1F8A8C', tint: '#D2E9ED', deep: '#125562' },
    aidev: { base: '#7A5BA6', tint: '#E8E0F0', deep: '#4A3268' },
  },
} as const;

export const PHASE_ORDER = ['sales', 'hr', 'aidev'] as const;
export type PhaseKey = (typeof PHASE_ORDER)[number];
