# Sayed Jehad — Developer's World

An interactive, pixel-art portfolio you can **walk through**. Instead of scrolling a CV, you explore a cozy top-down world: meet Sayed, read his story, browse his live projects, open his career timeline, and download his CV — all inside a hand-built game.

Built as a front-end-only experience with a **custom HTML5 Canvas engine** (no game framework) wrapped in a modern React app.

## Highlights

- **A real little game** — WASD/arrow movement, smooth camera, collisions, an NPC you talk to, a door that opens into an interior studio, and a scene transition.
- **Custom Canvas2D engine** — movement, collision, camera, interaction, and a day-lit Moonlighter-inspired art style, all written by hand. The engine is framework-agnostic and never imports React.
- **Portfolio content as interactables** — project "easels", a tech-stack shelf, a company-grouped resume/career timeline, and an About board, each opening a clean accessible modal.
- **Crafted, animated pixel art** — detailed characters (idle breathing, blinking, a bouncy walk), warm lighting, swaying grass, and weathered props.
- **Accessible & responsive** — keyboard navigation, focus management, `prefers-reduced-motion` support, on-screen touch controls for mobile, and AA-contrast UI.
- **Performant** — a steady 60fps via batched draw calls and cached light gradients.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | React 18 + Vite + TypeScript |
| Game world | Custom 2D Canvas engine (hand-written) |
| UI overlays | Tailwind CSS |
| Engine ⇄ UI bridge | Zustand |

## Run it locally

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
```

Other scripts:

```bash
npm run build    # type-check + production build
npm run preview  # preview the production build
npm run test     # run unit tests (Vitest)
npm run lint     # lint
```

## Controls

| Action | Keys |
|---|---|
| Move | `W` `A` `S` `D` or arrow keys |
| Interact / talk | `E` |
| Continue dialogue | `Space`, `Enter`, or tap |
| Close a panel | `Esc` |

On touch devices, an on-screen joystick and an interact button appear automatically.

## Project structure

```
src/
  engine/      # framework-agnostic canvas engine (zero React)
    draw/      # scene + sprite rendering
    scenes/    # scene configs (geometry, interactables)
    systems/   # movement, collision, camera, interaction, door
  store/       # Zustand store — the single engine ⇄ React seam
  ui/          # React overlays (dialogue, modals, HUD, title)
  data/        # the content layer — roles, projects, about, dialogue
  theme/       # palette + typography
public/source/ # the real CV (PDF) and photo
```

All portfolio content lives in `src/data/**`, so the world is updated by editing one folder.
