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
import { DIALOGUE } from '../data/dialogue';
import { LOST_ONE_CONVERSATION } from '../data/lostone';
import { blip, chime, chirp } from './audio';

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
    this.resize();
    snapClamp(this.cam, this.player, this.world().w, this.world().h, this.vw / this.zoom, this.vh / this.zoom);
    this.loop.start();
  }

  stop(): void {
    this.loop.stop();
    this.detachKb();
    window.removeEventListener('resize', this.onResize);
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
    const z = Math.max(3, Math.ceil(Math.max(this.vw / w, this.vh / h)));
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

    // ambient birds loop in the plaza; pause only during the scene swap
    if (this.scene === 'plaza' && this.birds && !this.transition.active) {
      updateBirds(this.birds, dt, this.reduced);
      for (const b of this.birds.birds) {
        if (b.chirp) {
          b.chirp = false;
          chirp();
        }
      }
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
      const W = this.world();
      this.player.x = Math.max(8, Math.min(W.w - 8, this.player.x));
      this.player.y = Math.max(14, Math.min(W.h - 4, this.player.y));

      if (this.scene === 'plaza' && this.door.state === 'open' && W.toStudioZone && hit(feet(this.player), W.toStudioZone)) {
        this.beginTransition('studio');
      } else if (this.scene === 'studio' && W.toPlazaZone && hit(feet(this.player), W.toPlazaZone) && ax.y > 0) {
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

  private render(): void {
    const ui = useUiStore.getState();
    const vp: Viewport = {
      ctx: this.ctx,
      cam: this.cam,
      zoom: this.zoom,
      dpr: this.dpr,
      vw: this.vw,
      vh: this.vh,
      t: performance.now() / 1000,
      reduced: this.reduced,
    };

    worldTransform(vp);
    if (this.scene === 'plaza') drawPlaza(vp, { player: this.player, npc: this.npc, lostOne: this.lostOne, door: this.door, birds: this.birds });
    else drawStudio(vp, { player: this.player, drinking: this.drink.active, drinkT: this.drink.t });

    screenTransform(vp);
    drawHud(vp, {
      scene: this.scene,
      player: this.player,
      interactables: this.world().interactables,
      active: this.active,
      started: ui.started,
      dialogueOpen: ui.dialogue !== null || ui.conversation !== null,
      doorOpen: this.door.state === 'open',
      refresh: this.refresh.active ? { t: this.refresh.t, x: this.refresh.x, y: this.refresh.y } : null,
    });

    if (this.transition.active) {
      const a = this.transition.dir === 1 ? this.transition.t : 1 - this.transition.t;
      this.ctx.fillStyle = `rgba(255,231,168,${a})`;
      this.ctx.fillRect(0, 0, this.vw, this.vh);
    }
  }
}
