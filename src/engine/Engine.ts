import { createLoop, type Loop } from './loop';
import { consumeInteract, readAxis } from './input/inputState';
import { attachKeyboard } from './input/keyboard';
import { steer, stepWalk } from './systems/movement';
import { feet, hit, moveX, moveY } from './systems/collision';
import { followClamp, snapClamp } from './systems/camera';
import { stepDoor, type Door } from './systems/door';
import { findNearest } from './systems/interact';
import { createBirds, updateBirds, type BirdsState } from './systems/birds';
import type { Entity, Interactable, Rect, SceneId } from './types';
import { SCENES } from './scenes';
import { screenTransform, worldTransform, type Viewport } from './render';
import { drawPlaza } from './draw/plaza';
import { drawStudio } from './draw/studio';
import { drawHud } from './draw/hud';
import { useUiStore } from '../store/uiStore';
import { useEnvConfig } from '../store/envConfig';
import { useProgress, type Station } from '../store/progressStore';
import { computeEnv, type EnvState } from './env/EnvironmentTimeSystem';
import { drawDayNightTint, drawLightWash } from './env/sky';
import { drawWeather } from './env/weather';
import { DIALOGUE } from '../data/dialogue';
import { LOST_ONE_CONVERSATION } from '../data/lostone';
import { blip, chime, chirp, ambientChirp, ambientCricket, step } from './audio';

interface Transition {
  active: boolean;
  t: number;
  dir: 1 | -1;
  to: SceneId | null;
}

const TRANSITION_HALF = 0.42;

export class Engine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private loop: Loop;
  private detachKb: () => void = () => {};
  private onResize = (): void => this.resize();
  // Pause the rAF loop while the tab is hidden so a backgrounded world is never painted.
  private onVisibility = (): void => {
    if (document.hidden) this.loop.stop();
    else this.loop.start();
  };

  dpr = 1;
  zoom = 3;
  vw = 0;
  vh = 0;
  cam = { x: 0, y: 0 };
  scene: SceneId = 'plaza';
  player: Entity;
  npc: Entity;
  lostOne: Entity; // the seated ronin NPC on the plaza bench
  door: Door = { state: 'closed', t: 0 };

  private transition: Transition = { active: false, t: 0, dir: 1, to: null };
  private talking = false;
  private active: Interactable | null = null;
  private reduced = false;
  // latest environment snapshot (set in render, read by update for bird gating)
  private env: EnvState | null = null;
  // procedural ambience scheduler (occasional day chirps / night crickets)
  private ambientT = 0;
  private ambientNext = 5;
  // footstep cadence + kicked-up dust puffs at the feet (juice)
  private stepT = 0;
  private dust: Array<{ x: number; y: number; t: number }> = [];
  // water-cooler drink + "refreshed" flourish
  private drink = { active: false, t: 0 };
  private refresh = { active: false, t: 0, x: 0, y: 0 };
  // ambient plaza birds: perch on the bench backrest, loop to the feeder
  private birds: BirdsState | null = null;
  private static readonly PLAZA_PERCHES = [
    { x: 302, y: 255 },
    { x: 282, y: 271 },
  ];
  private static readonly PLAZA_FEED = { x: 110, y: 383 };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    this.ctx = ctx;
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.player = { x: 240, y: 344, vx: 0, vy: 0, dir: 'up', frame: 0, anim: 0, moving: false, bob: 0 };
    this.npc = { x: 240, y: 182, vx: 0, vy: 0, dir: 'down', frame: 0, anim: 0, moving: false, bob: 0 };
    this.lostOne = { x: 294, y: 272, vx: 0, vy: 0, dir: 'left', frame: 0, anim: 0, moving: false, bob: 0 };
    this.birds = createBirds({
      count: 2,
      perches: Engine.PLAZA_PERCHES,
      feed: Engine.PLAZA_FEED,
      seed: 20260618,
      reduced: this.reduced,
    });
    this.loop = createLoop((dt) => {
      this.update(dt);
      this.render();
    });
  }

  start(): void {
    this.detachKb = attachKeyboard();
    window.addEventListener('resize', this.onResize);
    document.addEventListener('visibilitychange', this.onVisibility);
    // Dev-only: expose the engine for local visual debugging (stripped from prod builds).
    if (import.meta.env.DEV) (window as unknown as { __engine?: Engine }).__engine = this;
    this.resize();
    snapClamp(this.cam, this.player, this.world().w, this.world().h, this.vw / this.zoom, this.vh / this.zoom);
    this.loop.start();
  }

  stop(): void {
    this.loop.stop();
    this.detachKb();
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onVisibility);
  }

  private world() {
    return SCENES[this.scene];
  }

  resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.vw = window.innerWidth;
    this.vh = window.innerHeight;
    this.canvas.width = Math.floor(this.vw * this.dpr);
    this.canvas.height = Math.floor(this.vh * this.dpr);
    const { w, h } = this.world();
    // Small viewports are cramped vs the 480x432 world, so a floor of 3 crops the
    // scene to a slice. Drop the floor to 2 when the viewport is narrow (portrait
    // phones) OR short (landscape phones, where width is wide but height is small),
    // so more of the world is visible (still an integer scale, so pixel art stays
    // crisp). Desktop windows (>=480 CSS px wide AND tall) keep the original floor
    // of 3, so the camera feel is unchanged.
    const floor = this.vw < 480 || this.vh < 480 ? 2 : 3;
    const z = Math.max(floor, Math.ceil(Math.max(this.vw / w, this.vh / h)));
    this.zoom = Math.min(z, 6);
    this.ctx.imageSmoothingEnabled = false;
  }

  private solids(): Rect[] {
    const W = this.world();
    if (this.scene === 'plaza' && this.door.state !== 'open') {
      return [...W.solids, { x: 213, y: 118, w: 54, h: 34 }];
    }
    return W.solids;
  }

  private update(dt: number): void {
    const ui = useUiStore.getState();
    const overlay = !ui.started || ui.dialogue !== null || ui.modal !== null || ui.conversation !== null;

    if (stepDoor(this.door, dt)) chime();
    this.npc.bob += dt * 2.2;
    this.player.bob += dt * 2.0;

    // transition state machine
    if (this.transition.active) {
      this.transition.t += dt / TRANSITION_HALF;
      if (this.transition.t >= 1) {
        if (this.transition.dir === 1) {
          this.applySwap(this.transition.to!);
          this.transition.dir = -1;
          this.transition.t = 0;
        } else {
          this.transition.active = false;
        }
      }
    }

    // after talking, open the door once dialogue closes
    if (this.talking && ui.dialogue === null) {
      this.talking = false;
      if (this.door.state === 'closed') {
        this.door.state = 'opening';
        this.door.t = 0;
        chime();
      }
    }

    // water-cooler drink animation, then a brief "refreshed" flourish
    if (this.drink.active) {
      this.drink.t += dt;
      if (this.drink.t >= 1.8) {
        this.drink.active = false;
        this.refresh = { active: true, t: 0, x: this.player.x, y: this.player.y };
        chime();
      }
    }
    if (this.refresh.active) {
      this.refresh.t += dt;
      if (this.refresh.t >= 1.2) this.refresh.active = false;
    }

    // ambient birds loop in the plaza by day; they settle/vanish at night and when
    // disabled (the draw side fades them out; here we just stop the flight loop +
    // chirps so the courtyard goes quiet after dusk).
    const birdsActive = !this.env || (this.env.birdsEnabled && this.env.sun.up > 0.12);
    if (this.scene === 'plaza' && this.birds && !this.transition.active && birdsActive) {
      updateBirds(this.birds, dt, this.reduced);
      for (const b of this.birds.birds) {
        if (b.chirp) {
          b.chirp = false;
          chirp();
        }
      }
    }

    // Gentle procedural ambience: an occasional soft day chirp / night cricket in the
    // plaza, spaced out randomly so it never becomes a loop. Quiet + mute-respecting.
    this.ambientT += dt;
    if (this.ambientT >= this.ambientNext) {
      this.ambientT = 0;
      this.ambientNext = 6 + Math.random() * 9;
      if (ui.started && this.scene === 'plaza' && this.env && useEnvConfig.getState().ambientAudioEnabled) {
        if (this.env.sun.up > 0.2) ambientChirp();
        else ambientCricket();
      }
    }

    // age + cull the dust puffs
    if (this.dust.length) {
      for (const d of this.dust) d.t += dt;
      if (this.dust.some((d) => d.t >= 0.5)) this.dust = this.dust.filter((d) => d.t < 0.5);
    }

    const interact = consumeInteract();
    const canAct = ui.started && !overlay && !this.transition.active && !this.drink.active;
    if (canAct && interact && this.active) this.doInteract(this.active);

    if (canAct) {
      const ax = readAxis();
      steer(this.player, ax, dt);
      const solids = this.solids();
      moveX(this.player, this.player.vx * dt, solids);
      moveY(this.player, this.player.vy * dt, solids);
      stepWalk(this.player, dt);
      // soft footstep tick + a dust puff per stride while actually walking
      if (this.player.moving && !this.reduced) {
        this.stepT += dt;
        if (this.stepT >= 0.32) {
          this.stepT = 0;
          step();
          if (this.dust.length < 12) this.dust.push({ x: this.player.x + (Math.random() * 4 - 2), y: this.player.y - 1, t: 0 });
        }
      } else {
        this.stepT = 0.32; // next step fires promptly when walking resumes
      }
      const W = this.world();
      this.player.x = Math.max(8, Math.min(W.w - 8, this.player.x));
      this.player.y = Math.max(14, Math.min(W.h - 4, this.player.y));

      if (this.scene === 'plaza' && this.door.state === 'open' && W.toStudioZone && hit(feet(this.player), W.toStudioZone)) {
        this.beginTransition('studio');
      } else if (this.scene === 'studio' && W.toPlazaZone && hit(feet(this.player), W.toPlazaZone)) {
        // Symmetric with the entrance: walking into the doorway leaves the studio (no
        // hidden "hold Down" needed). arriveAt sits above the zone so it can't bounce.
        this.beginTransition('plaza');
      }
    } else {
      this.player.vx *= 0.8;
      this.player.vy *= 0.8;
      this.player.moving = false;
      this.player.frame = 0;
    }

    const W = this.world();
    if (this.reduced) {
      snapClamp(this.cam, this.player, W.w, W.h, this.vw / this.zoom, this.vh / this.zoom);
    } else {
      followClamp(this.cam, this.player, W.w, W.h, this.vw / this.zoom, this.vh / this.zoom, dt);
    }

    this.active = canAct ? findNearest(this.player, W.interactables) : null;
  }

  private doInteract(it: Interactable): void {
    const ui = useUiStore.getState();
    // Record discovery (drives the progress toast + the "let's connect" finale).
    const station: Record<string, Station> = { talk: 'sayed', about: 'about', arcade: 'arcade', resume: 'resume', stack: 'stack', project: 'project' };
    const st = station[it.type];
    if (st) useProgress.getState().discover(st);
    switch (it.type) {
      case 'talk':
        this.talking = true;
        this.npc.dir = 'down';
        ui.openDialogue(DIALOGUE);
        blip(560);
        break;
      case 'lore':
        // the ronin's Q&A: opens a conversation, never opens the studio door
        ui.openConversation(LOST_ONE_CONVERSATION);
        blip(380);
        break;
      case 'about':
        ui.openModal({ kind: 'about' });
        blip(620);
        break;
      case 'arcade':
        ui.openModal({ kind: 'arcade' });
        blip(720);
        break;
      case 'resume':
        ui.openModal({ kind: 'resume' });
        chime();
        break;
      case 'stack':
        ui.openModal({ kind: 'stack' });
        blip(700);
        break;
      case 'project':
        ui.openModal({ kind: 'project', id: it.id });
        blip(700);
        break;
      case 'water':
        this.drink.active = true;
        this.drink.t = 0;
        this.player.dir = it.x < this.player.x ? 'left' : 'right';
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.moving = false;
        blip(440);
        break;
    }
  }

  private beginTransition(to: SceneId): void {
    this.transition = { active: true, t: 0, dir: 1, to };
    chime();
  }

  private applySwap(to: SceneId): void {
    this.scene = to;
    useUiStore.getState().setScene(to);
    this.resize();
    const a = SCENES[to].arriveAt;
    this.player.x = a.x;
    this.player.y = a.y;
    this.player.dir = a.dir;
    this.player.vx = 0;
    this.player.vy = 0;
    snapClamp(this.cam, this.player, SCENES[to].w, SCENES[to].h, this.vw / this.zoom, this.vh / this.zoom);
  }

  // Soft pale dust kicked up at the player's feet, expanding + fading (world-space).
  private drawDust(): void {
    const ctx = this.ctx;
    ctx.save();
    for (const d of this.dust) {
      const k = d.t / 0.5; // 0..1 life
      const r = 2 + k * 5;
      ctx.globalAlpha = (1 - k) * 0.18;
      ctx.fillStyle = '#C9AD84'; // pale paving dust
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, r, r * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private render(): void {
    const ui = useUiStore.getState();
    // The arcade is a full-bleed opaque overlay running its own loop; skip the world+HUD
    // repaint entirely while it covers the canvas. Cream modals/dialogue are translucent
    // over the world, so those keep rendering.
    if (ui.modal?.kind === 'arcade') return;
    const now = performance.now() / 1000;
    // One environment snapshot per frame, read from config + the Bahrain clock.
    const envCfg = useEnvConfig.getState();
    const env = computeEnv(envCfg, envCfg.debugTimeOfDay, now);
    this.env = env; // cache for the next update() (bird day/night gating)
    const vp: Viewport = {
      ctx: this.ctx,
      cam: this.cam,
      zoom: this.zoom,
      dpr: this.dpr,
      vw: this.vw,
      vh: this.vh,
      t: now,
      reduced: this.reduced,
      env,
    };

    worldTransform(vp);
    if (this.scene === 'plaza') drawPlaza(vp, { player: this.player, npc: this.npc, lostOne: this.lostOne, door: this.door, birds: this.birds });
    else drawStudio(vp, { player: this.player, drinking: this.drink.active, drinkT: this.drink.t });

    if (!this.reduced && this.dust.length) this.drawDust();

    screenTransform(vp);
    // Day/night colour grade + sky (sun/moon/stars/clouds) over the world, BEFORE
    // the HUD so chips/labels stay full-bright. Plaza only (the studio is interior).
    // Tint first (darkens the scene), then the bright bodies punch through it.
    if (this.scene === 'plaza') {
      drawDayNightTint(vp);
      drawLightWash(vp); // directional sun/moon light (no discs), over the grade
      drawWeather(vp);
    }
    // Surface a "talk to Sayed first" hint when the visitor reaches the still-closed door
    // before meeting Sayed, so the gate reads as intentional rather than an invisible wall.
    const nearClosedDoor =
      this.scene === 'plaza' &&
      this.door.state === 'closed' &&
      Math.hypot(this.player.x - 240, this.player.y - 150) < 54;
    drawHud(vp, {
      scene: this.scene,
      player: this.player,
      interactables: this.world().interactables,
      active: this.active,
      started: ui.started,
      dialogueOpen: ui.dialogue !== null || ui.conversation !== null,
      doorOpen: this.door.state === 'open',
      doorHint: nearClosedDoor ? { x: 240, y: 84 } : null,
      refresh: this.refresh.active ? { t: this.refresh.t, x: this.refresh.x, y: this.refresh.y } : null,
    });

    if (this.transition.active) {
      const a = this.transition.dir === 1 ? this.transition.t : 1 - this.transition.t;
      this.ctx.fillStyle = `rgba(255,231,168,${a})`;
      this.ctx.fillRect(0, 0, this.vw, this.vh);
    }
  }
}
