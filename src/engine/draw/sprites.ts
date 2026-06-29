import { palette as P } from '../../theme/palette';
import { R, softShadow, groundShadow, type Viewport } from '../render';
import type { Entity } from '../types';

// Sayed: warm, approachable developer in formal smart-casual — crisp cream shirt
// with a slim teal tie under a tailored teal waistcoat, pressed trousers, polished
// shoes, swinging arms, and rich curly dark hair with a mustache and goatee.
export function drawSayed(vp: Viewport, e: Entity): void {
  const ctx = vp.ctx;
  const x = Math.round(e.x);
  // lively walk bounce (body lifts at mid-stride over a planted shadow); soft idle breathe
  const gy = Math.round(e.y);
  const off = vp.reduced ? 0 : e.moving ? -Math.abs(Math.sin(e.anim * Math.PI)) * 1.3 : Math.sin(e.bob) * 0.8;
  const y = Math.round(e.y + off);
  groundShadow(vp, x, gy + 1, 10, P.shadowSoft);
  groundShadow(vp, x, gy + 1, 7, P.shadow);
  const step = e.moving ? (e.frame ? 1 : -1) : 0;
  const back = e.dir === 'up';

  // local HD shading tones (warm-harmonised; palette.ts owned by another package)
  const TROU_HI = '#82603A';
  const TROU_SH = '#553720';
  const SLEEVE = P.sayed.shirt; // cream shirt sleeves
  const SLEEVE_SH = P.sayed.shirtSh;
  const TIE = '#15625A'; // deep teal slim tie
  const TIE_HI = '#2A9C8E';
  const BTN = P.sayed.badge; // brass buttons

  // pressed trousers + polished shoes (with a lit/shaded side for form)
  R(ctx, x - 5, y - 8, 4, 8 + step, P.sayed.trousers);
  R(ctx, x + 1, y - 8, 4, 8 - step, P.sayed.trousers);
  R(ctx, x - 5, y - 8, 1, 8 + step, TROU_HI); // outer lit edge
  R(ctx, x + 4, y - 8, 1, 8 - step, TROU_SH); // outer shaded edge
  R(ctx, x - 2, y - 8, 1, 7, TROU_SH); // crisp centre press crease
  R(ctx, x - 5, y - 1, 4, 2, '#2a1c10');
  R(ctx, x + 1, y - 1, 4, 2, '#2a1c10');
  R(ctx, x - 5, y - 1, 2, 1, '#4a3322'); // shoe shine
  R(ctx, x + 1, y - 1, 2, 1, '#4a3322');

  // gently swinging shirt-sleeve arms with skin hands, opposite phase to the legs
  const la = step;
  const ra = -step;
  R(ctx, x - 9, y - 18 + la, 2, 7, SLEEVE);
  R(ctx, x - 9, y - 18 + la, 1, 7, SLEEVE_SH); // sleeve shade
  R(ctx, x - 9, y - 12 + la, 2, 1, P.sayed.shirtHi); // cuff
  R(ctx, x - 9, y - 11 + la, 2, 2, P.skin.hi); // hand
  R(ctx, x + 7, y - 18 + ra, 2, 7, SLEEVE);
  R(ctx, x + 8, y - 18 + ra, 1, 7, SLEEVE_SH);
  R(ctx, x + 7, y - 12 + ra, 2, 1, P.sayed.shirtHi); // cuff
  R(ctx, x + 7, y - 11 + ra, 2, 2, P.skin.hi); // hand

  // torso: crisp cream shirt under a tailored teal waistcoat
  R(ctx, x - 7, y - 19, 14, 12, P.sayed.shirt);
  if (back) {
    R(ctx, x - 7, y - 19, 14, 12, P.sayed.vest);
    R(ctx, x - 7, y - 19, 3, 12, P.sayed.vestSh); // shaded left panel
    R(ctx, x + 5, y - 19, 2, 12, P.sayed.vestSh); // shaded right edge
    R(ctx, x - 4, y - 19, 1, 12, '#2A9C8E'); // centre-back highlight seam
    R(ctx, x - 2, y - 20, 4, 1, P.sayed.collar); // shirt collar at the back
  } else {
    R(ctx, x - 7, y - 19, 14, 1, P.sayed.shirtHi); // lit shoulder line
    // waistcoat panels with an open V neck (shirt + tie showing between)
    R(ctx, x - 7, y - 19, 5, 12, P.sayed.vest);
    R(ctx, x + 2, y - 19, 5, 12, P.sayed.vest);
    R(ctx, x - 7, y - 19, 2, 12, P.sayed.vestSh); // shaded outer-left
    R(ctx, x + 5, y - 19, 2, 12, P.sayed.vestSh); // shaded outer-right
    R(ctx, x - 5, y - 18, 1, 11, TIE_HI); // lit inner-left lapel
    R(ctx, x + 2, y - 18, 1, 11, P.sayed.vestSh); // shaded inner-right lapel
    // crisp shirt strip + slim tie down the open V
    R(ctx, x - 1, y - 19, 2, 12, P.sayed.shirt);
    R(ctx, x - 1, y - 17, 2, 7, TIE);
    R(ctx, x - 1, y - 17, 1, 7, TIE_HI); // tie sheen
    R(ctx, x - 1, y - 10, 2, 1, '#0E4A44'); // tie tip
    // pointed shirt collar framing the tie knot
    R(ctx, x - 3, y - 20, 2, 2, P.sayed.collar);
    R(ctx, x + 1, y - 20, 2, 2, P.sayed.collar);
    R(ctx, x - 3, y - 18, 1, 1, P.sayed.shirtSh);
    R(ctx, x + 2, y - 18, 1, 1, P.sayed.shirtSh);
    // brass waistcoat buttons down the closure (just right of the tie)
    R(ctx, x + 1, y - 13, 1, 1, BTN);
    R(ctx, x + 1, y - 10, 1, 1, BTN);
    // a clipped ID badge + pocket pen on the left breast (the developer detail)
    R(ctx, x - 5, y - 12, 3, 3, P.sayed.badge);
    R(ctx, x - 5, y - 12, 3, 1, '#FFE0A0'); // badge top highlight
    R(ctx, x - 5, y - 10, 3, 1, '#D9A84E'); // badge bottom shade
    R(ctx, x - 6, y - 16, 1, 3, '#1F8A7E'); // breast-pocket pen clip
  }

  // neck + head
  R(ctx, x - 2, y - 21, 4, 2, P.skin.mid);
  R(ctx, x - 2, y - 20, 4, 1, P.skin.shadow); // soft neck shadow under the jaw
  drawSayedHead(vp, ctx, x, y - 31, back);
}

function drawSayedHead(vp: Viewport, ctx: CanvasRenderingContext2D, x: number, top: number, back: boolean): void {
  const HAIR = P.hair.dark;
  const HAIR_SH = P.hair.brow; // darkest curl pockets
  const HAIR_HI = P.hair.hi; // warm sheen
  const HAIR_GLOSS = '#5A4028'; // brightest curl catch-light
  // a slow, occasional blink (reduced-motion keeps the eyes open)
  const blink = !vp.reduced && vp.t % 3.1 < 0.13;

  if (back) {
    R(ctx, x - 6, top, 12, 11, HAIR);
    ctx.fillStyle = HAIR;
    for (const dx of [-6, -3, 0, 3]) ctx.fillRect(x + dx, top - 1, 4, 4); // curl crown
    ctx.fillStyle = HAIR_HI;
    for (const dx of [-5, -2, 1, 4]) ctx.fillRect(x + dx, top, 2, 2); // curl sheen
    R(ctx, x - 6, top, 1, 11, HAIR_SH); // outline (left)
    R(ctx, x + 5, top, 1, 11, HAIR_SH); // outline (right)
    R(ctx, x - 1, top + 3, 1, 6, HAIR_SH); // a couple of strand seams
    R(ctx, x + 2, top + 4, 1, 5, HAIR_SH);
    return;
  }

  // skin base with a lit side, a shaded side and cheek modelling
  R(ctx, x - 5, top + 1, 10, 10, P.skin.hi);
  R(ctx, x + 1, top + 1, 4, 10, P.skin.mid); // shaded right of the face
  R(ctx, x - 6, top + 4, 2, 3, P.skin.mid); // jaw shade (left)
  R(ctx, x + 4, top + 4, 2, 3, P.skin.mid); // jaw shade (right)
  R(ctx, x - 5, top + 7, 2, 2, P.skin.mid); // lower-left cheek shade
  R(ctx, x + 3, top + 8, 2, 1, P.skin.shadow); // deeper cheek shadow
  R(ctx, x - 5, top + 1, 1, 9, P.skin.mid); // soft left edge
  R(ctx, x - 2, top + 6, 1, 1, P.skin.hi); // cheek catch-light

  // rich curly hair: dark mass, deep curl pockets, warm sheen + a side sweep
  ctx.fillStyle = HAIR;
  ctx.fillRect(x - 6, top, 12, 4); // fringe mass
  for (const dx of [-7, -4, -1, 2, 4]) ctx.fillRect(x + dx, top - 1, 4, 4); // bumpy curl crown
  ctx.fillRect(x - 6, top + 1, 2, 8); // left side hair down past the temple
  ctx.fillRect(x + 4, top + 1, 2, 8); // right side hair
  ctx.fillStyle = HAIR_SH; // darker pockets between curls + temple outlines
  ctx.fillRect(x - 6, top + 5, 1, 4);
  ctx.fillRect(x + 5, top + 5, 1, 4);
  ctx.fillRect(x - 3, top + 1, 1, 2);
  ctx.fillRect(x + 1, top, 1, 2);
  ctx.fillStyle = HAIR_HI; // warm curl sheen, biased to the lit top-left
  ctx.fillRect(x - 5, top - 1, 2, 2);
  ctx.fillRect(x - 1, top - 1, 2, 2);
  ctx.fillRect(x + 2, top, 2, 1);
  ctx.fillStyle = HAIR_GLOSS;
  ctx.fillRect(x - 4, top, 1, 1); // brightest catch-light
  ctx.fillRect(x - 1, top, 1, 1);
  ctx.fillStyle = HAIR; // a curl sweeping onto the brow + side sideburns
  ctx.fillRect(x - 4, top + 3, 2, 1);
  ctx.fillRect(x - 5, top + 9, 1, 1); // left sideburn
  ctx.fillRect(x + 4, top + 9, 1, 1); // right sideburn

  // brows + eyes (or a closed blink line)
  ctx.fillStyle = HAIR_SH;
  ctx.fillRect(x - 4, top + 4, 3, 1);
  ctx.fillRect(x + 1, top + 4, 3, 1);
  if (blink) {
    ctx.fillStyle = P.skin.shadow;
    ctx.fillRect(x - 3, top + 6, 2, 1);
    ctx.fillRect(x + 1, top + 6, 2, 1);
  } else {
    ctx.fillStyle = '#2A2620';
    ctx.fillRect(x - 3, top + 5, 2, 2);
    ctx.fillRect(x + 1, top + 5, 2, 2);
    ctx.fillStyle = '#FBF3E0';
    ctx.fillRect(x - 3, top + 5, 1, 1); // bright catch-light glints so the eyes read as alive
    ctx.fillRect(x + 2, top + 5, 1, 1);
  }
  ctx.fillStyle = P.skin.shadow;
  ctx.fillRect(x - 1, top + 7, 2, 1); // soft nose/brow shadow
  ctx.fillStyle = P.skin.hi;
  ctx.fillRect(x, top + 6, 1, 1); // lit nose bridge → a touch more facial structure

  // groomed mustache + goatee with friendly up-curled tips
  ctx.fillStyle = HAIR;
  ctx.fillRect(x - 3, top + 8, 6, 1); // mustache
  ctx.fillRect(x - 3, top + 7, 1, 1); // left tip curling up (a warm smile read)
  ctx.fillRect(x + 2, top + 7, 1, 1); // right tip curling up
  ctx.fillRect(x - 1, top + 9, 2, 2); // goatee
  ctx.fillStyle = HAIR_HI;
  ctx.fillRect(x - 1, top + 10, 2, 1); // faint goatee highlight
  // warm cheeks for a friendly, approachable look
  ctx.fillStyle = '#E89A76';
  ctx.fillRect(x - 4, top + 7, 1, 1);
  ctx.fillStyle = '#CE8862';
  ctx.fillRect(x + 3, top + 7, 1, 1);
}

// Visitor: the guest you play as, in a smart earthy blazer with lapels, a tie, a
// pocket square, a visitor badge, swinging arms and a neat side-parted cut.
export function drawVisitor(vp: Viewport, e: Entity, drinking = false, drinkT = 0): void {
  const ctx = vp.ctx;
  const x = Math.round(e.x);
  // lively walk bounce over a planted shadow; gentle idle breathe when still
  const gy = Math.round(e.y);
  const off = vp.reduced ? 0 : e.moving ? -Math.abs(Math.sin(e.anim * Math.PI)) * 1.3 : Math.sin(e.bob) * 0.7;
  const y = Math.round(e.y + off);
  groundShadow(vp, x, gy + 1, 10, P.shadowSoft);
  groundShadow(vp, x, gy + 1, 7, P.shadow);
  const step = e.moving ? (e.frame ? 1 : -1) : 0;
  const back = e.dir === 'up';

  // local HD shading tones (warm-earthy; palette.ts owned by another package)
  const TROU_HI = '#6E6042';
  const TROU_DK = '#4A3E2A';
  const COAT_DK = '#4A3E2A';
  const SHIRT = '#F1E7D2';
  const SHIRT_HI = '#FBF4E2';
  const TIE = '#7A3A2A'; // deep burgundy tie
  const TIE_HI = '#9C5238';

  // pressed trousers + polished shoes
  R(ctx, x - 5, y - 8, 4, 8 + step, P.visitor.coatSh);
  R(ctx, x + 1, y - 8, 4, 8 - step, P.visitor.coatSh);
  R(ctx, x - 5, y - 8, 1, 8 + step, TROU_HI);
  R(ctx, x + 4, y - 8, 1, 8 - step, TROU_DK);
  R(ctx, x - 2, y - 8, 1, 7, TROU_DK); // centre press crease
  R(ctx, x - 5, y - 1, 4, 2, '#2a1c10');
  R(ctx, x + 1, y - 1, 4, 2, '#2a1c10');
  R(ctx, x - 5, y - 1, 2, 1, '#3a2c1c'); // shoe shine
  R(ctx, x + 1, y - 1, 2, 1, '#3a2c1c');

  // gently swinging blazer-sleeve arms with skin hands, opposite phase to the legs
  const la = step;
  const ra = -step;
  R(ctx, x - 9, y - 18 + la, 2, 7, P.visitor.coat);
  R(ctx, x - 9, y - 18 + la, 1, 7, P.visitor.coatHi); // sleeve lit edge
  R(ctx, x - 9, y - 12 + la, 2, 1, COAT_DK); // cuff
  R(ctx, x - 9, y - 11 + la, 2, 2, P.skin.hi); // hand
  R(ctx, x + 7, y - 18 + ra, 2, 7, P.visitor.coat);
  R(ctx, x + 8, y - 18 + ra, 1, 7, P.visitor.coatSh); // sleeve shade
  R(ctx, x + 7, y - 12 + ra, 2, 1, COAT_DK); // cuff
  R(ctx, x + 7, y - 11 + ra, 2, 2, P.skin.hi); // hand

  // tailored blazer body with highlight (left) and shadow (right) sides
  R(ctx, x - 7, y - 19, 14, 12, P.visitor.coat);
  R(ctx, x - 7, y - 19, 3, 12, P.visitor.coatHi);
  R(ctx, x + 4, y - 19, 3, 12, P.visitor.coatSh);
  R(ctx, x - 7, y - 19, 1, 12, '#A08C64'); // bright lit outer edge
  R(ctx, x + 6, y - 19, 1, 12, COAT_DK); // deep shaded outer edge
  R(ctx, x - 7, y - 19, 14, 1, '#8E7C58'); // lit shoulder line
  if (!back) {
    // cream shirt + tie down the open lapel V
    R(ctx, x - 2, y - 19, 4, 11, SHIRT);
    R(ctx, x - 2, y - 19, 1, 11, SHIRT_HI); // lit shirt edge
    R(ctx, x - 1, y - 17, 2, 8, TIE);
    R(ctx, x - 1, y - 17, 1, 8, TIE_HI); // tie sheen
    R(ctx, x - 1, y - 9, 2, 1, '#4A2418'); // tie tip
    // notched blazer lapels flaring from the collar
    R(ctx, x - 4, y - 19, 2, 1, P.visitor.coatHi);
    R(ctx, x - 3, y - 18, 1, 2, P.visitor.coatHi); // left lapel
    R(ctx, x + 2, y - 19, 2, 1, P.visitor.coatSh);
    R(ctx, x + 2, y - 18, 1, 2, P.visitor.coatSh); // right lapel
    R(ctx, x - 2, y - 19, 4, 1, COAT_DK); // collar break shadow
    R(ctx, x, y - 11, 1, 1, '#2f2416'); // coat button
    // visitor badge on the lapel + a pocket square
    R(ctx, x - 5, y - 13, 2, 2, P.visitor.badge);
    R(ctx, x - 5, y - 13, 2, 1, '#F0A55E'); // badge top highlight
    R(ctx, x + 3, y - 14, 2, 1, SHIRT_HI); // pocket square
  } else {
    R(ctx, x - 1, y - 19, 2, 12, COAT_DK); // centre-back vent seam
    R(ctx, x - 2, y - 20, 4, 1, '#8E7C58'); // collar back
  }
  R(ctx, x - 2, y - 21, 4, 2, P.skin.mid);
  R(ctx, x - 2, y - 20, 4, 1, P.skin.shadow); // soft neck shadow

  drawVisitorHead(vp, ctx, x, y - 31, back);

  if (drinking) {
    // ---- phased drinking pose: cooler tray cup fills first, then the visitor
    // raises a full cup and sips it empty over discrete gulps ----
    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
    const easeOut = (v: number) => 1 - (1 - v) * (1 - v);
    const T_FILL_END = 0.32,
      T_SIP_END = 1.46; // 1.8 total
    const sip = clamp01((drinkT - T_FILL_END) / (T_SIP_END - T_FILL_END));
    const finish = clamp01((drinkT - T_SIP_END) / (1.8 - T_SIP_END));
    const phase = drinkT < T_FILL_END ? 'fill' : drinkT < T_SIP_END ? 'sip' : 'finish';
    const GULPS = 3;
    const gi = Math.min(GULPS - 1, Math.floor(sip * GULPS));
    const gf = sip * GULPS - gi;
    const bobA = !vp.reduced && phase === 'sip' ? Math.sin(gf * Math.PI) : 0;

    // During 'fill' the cup is still on the cooler tray (drawn by drawWaterCooler).
    // The visitor only lifts a cup once it is full, centered on the mouth so it
    // covers the lips/chin and never the eyes.
    if (phase !== 'fill') {
      const cupFill = phase === 'sip' ? 1 - (gi + easeOut(gf)) / GULPS : 0;
      const raise = vp.reduced ? 4 : phase === 'sip' ? 4 + Math.round(bobA) : Math.round((1 - easeOut(finish)) * 4);
      const cupX = x - 3;
      const cupTop = y - 20 - raise;

      // forearm/sleeve raising the cup to the lips
      R(ctx, cupX + 4, cupTop + 6, 2, 4 + raise, P.visitor.coatHi);

      // cup body + shade/highlight + rim
      R(ctx, cupX, cupTop, 6, 7, '#FBF6EA');
      R(ctx, cupX, cupTop, 1, 7, '#D2CCBE');
      R(ctx, cupX + 5, cupTop, 1, 7, '#FFFFFF');
      R(ctx, cupX, cupTop, 6, 1, '#D7EFEA');

      // water column draining with each gulp
      const waterH = vp.reduced ? 3 : Math.round(cupFill * 5);
      if (waterH > 0) {
        R(ctx, cupX + 1, cupTop + 1 + (5 - waterH), 4, waterH, '#7FC9D6');
        R(ctx, cupX + 1, cupTop + 1 + (5 - waterH), 4, 1, '#A9E0E8');
      }

      // throat tick on the gulp down-beat
      if (!vp.reduced && phase === 'sip' && bobA > 0.6) R(ctx, x - 1, y - 18, 2, 1, P.skin.shadow);

      // a satisfied droplet falling from the emptied cup
      if (!vp.reduced && phase === 'finish') {
        const dy = Math.round(easeOut(finish) * 6);
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - finish);
        R(ctx, cupX + 2, cupTop + 7 + dy, 1, 2, '#A9E0E8');
        ctx.restore();
      }
    }
  }
}

function drawVisitorHead(vp: Viewport, ctx: CanvasRenderingContext2D, x: number, top: number, back: boolean): void {
  const HAIR = P.visitor.hair;
  const HAIR_HI = P.visitor.hairHi;
  const HAIR_DK = '#473722';
  // a slow blink, phase-offset from Sayed so the two never blink in sync
  const blink = !vp.reduced && (vp.t + 1.6) % 3.4 < 0.13;
  if (back) {
    R(ctx, x - 6, top, 12, 11, HAIR);
    R(ctx, x - 6, top, 12, 3, HAIR_HI); // lit crown
    R(ctx, x - 6, top, 1, 11, HAIR_DK);
    R(ctx, x + 5, top, 1, 11, HAIR_DK);
    R(ctx, x - 1, top + 2, 1, 7, HAIR_DK); // nape strand
    return;
  }
  // face
  R(ctx, x - 5, top + 1, 10, 9, P.skin.hi);
  R(ctx, x + 1, top + 1, 4, 9, P.skin.mid); // shaded right side
  R(ctx, x - 5, top + 1, 1, 9, P.skin.mid); // soft left edge
  R(ctx, x + 3, top + 7, 1, 1, P.skin.shadow); // cheek shadow
  // neat side-parted business cut
  R(ctx, x - 5, top, 10, 3, HAIR);
  R(ctx, x - 5, top - 1, 4, 2, HAIR); // a little volume at the part
  R(ctx, x - 5, top, 10, 1, HAIR_HI); // lit hairline sheen
  R(ctx, x - 2, top, 1, 3, HAIR_HI); // the side part
  R(ctx, x - 5, top + 1, 1, 4, HAIR); // left temple
  R(ctx, x + 4, top + 1, 1, 4, HAIR); // right temple
  R(ctx, x - 5, top + 4, 1, 1, HAIR_DK); // left sideburn
  R(ctx, x + 4, top + 4, 1, 1, HAIR_DK); // right sideburn
  R(ctx, x - 4, top, 1, 1, HAIR_HI); // strand sheen
  R(ctx, x + 1, top, 1, 1, HAIR_HI);
  // brows + eyes (or a closed blink line)
  R(ctx, x - 3, top + 3, 3, 1, HAIR_DK);
  R(ctx, x + 1, top + 3, 3, 1, HAIR_DK);
  if (blink) {
    R(ctx, x - 3, top + 5, 2, 1, P.skin.shadow);
    R(ctx, x + 1, top + 5, 2, 1, P.skin.shadow);
  } else {
    R(ctx, x - 3, top + 4, 2, 2, '#3a2f25');
    R(ctx, x + 1, top + 4, 2, 2, '#3a2f25');
    R(ctx, x - 3, top + 4, 1, 1, '#FBF3E0'); // bright eye catch-light
    R(ctx, x + 2, top + 4, 1, 1, '#FBF3E0');
  }
  R(ctx, x - 1, top + 6, 1, 1, P.skin.shadow); // nose
  // a warm friendly smile (corners lifted) + a hint of cheek colour
  R(ctx, x - 1, top + 7, 2, 1, '#9C6A4E'); // mouth
  R(ctx, x - 2, top + 6, 1, 1, '#9C6A4E'); // left corner up
  R(ctx, x + 1, top + 6, 1, 1, '#9C6A4E'); // right corner up
  R(ctx, x - 4, top + 6, 1, 1, '#E89A76'); // warm left cheek
  R(ctx, x + 3, top + 6, 1, 1, '#CE8862'); // warm right cheek
}

// The Guide: a calm, friendly Arabic man who SITS on a side-profile park bench in a
// white Gulf thobe, a red-and-white checkered shemagh with a black agal, a short
// neat dark beard and a slight warm smile. His bench is rotated to a side profile
// beside a path running along his LEFT, so he is re-posed to FACE LEFT
// (three-quarter-left seated profile): back to the right, face/nose/eye pointing
// left, knees and shoes forward to the left. Fully static. His e.y is his seated hip
// line, e.x his center. Bounds: figure within ~x-9..x+7, y-30..y+9; head near
// (x-1, y-20); feet/shoes to the LEFT near x-7..x-3; his back near x+5.
export function drawLostOne(vp: Viewport, e: Entity): void {
  const ctx = vp.ctx;
  const x = Math.round(e.x);
  const y = Math.round(e.y);
  // gentle idle breathing on the upper body + an occasional blink (reduced-motion stays still)
  const br = vp.reduced ? 0 : Math.sin(vp.t * 1.05) > 0.5 ? -1 : 0;
  const blink = !vp.reduced && (vp.t + 0.7) % 3.7 < 0.14;

  // --- local guide palette (hardcoded; palette.ts is owned by another package) ---
  const THOBE = '#EDE7D6'; // off-white Gulf robe
  const THOBE_HI = '#F7F3E8'; // lit folds / highlight
  const THOBE_SH = '#D2C9B2'; // fold + form shadow
  const THOBE_SH2 = '#C2B89C'; // deeper crease shadow
  const SHEMAGH = '#EDE7D6'; // white headcloth (shares the thobe white)
  const SHEMAGH_SH = '#D2C9B2';
  const RED = '#B23A36'; // red shemagh check
  const RED_DK = '#8E2C2A'; // darker red check weave
  const AGAL = '#1A1714'; // black agal cord band
  const AGAL_HI = '#332C26'; // faint sheen on the cord
  const BEARD = '#2E2620'; // short neat dark beard
  const BEARD_HI = '#3A2F25'; // beard highlight / mustache
  const SHOE = '#3A2A1C'; // plain shoe / sandal
  const OUTLINE = '#B7AD93'; // soft thobe edge outline

  // 1. contact shadow — pools under the bench, grounding him (drifts left toward
  //    the forward legs/feet)
  softShadow(ctx, x - 2, y + 9, 10, P.shadow);

  // 2. bent legs/lower body, knees & shoes forward to the LEFT. The lap cloth
  //    juts left, the lower legs drop down at the front, and plain shoes sit at
  //    the front (x-7..x-3). Lit on the front-left, shaded toward the back-right.
  R(ctx, x - 8, y - 1, 7, 6, THOBE); // upper thigh/lap cloth thrust forward-left
  R(ctx, x - 8, y - 1, 1, 6, THOBE_HI); // lit front edge of the lap
  R(ctx, x - 8, y + 5, 7, 1, OUTLINE); // soft underside of the thigh
  R(ctx, x - 8, y + 4, 5, 4, THOBE_SH); // shin/ankle cloth dropping down at the front
  R(ctx, x - 8, y + 4, 1, 4, THOBE_SH2); // deeper crease on the front shin
  R(ctx, x - 7, y + 8, 5, 2, SHOE); // forward shoe / sandal
  R(ctx, x - 3, y + 8, 3, 2, SHOE); // slightly tucked-back near foot
  R(ctx, x - 7, y + 8, 5, 1, BEARD_HI); // thin lit shoe top
  R(ctx, x - 3, y + 8, 3, 1, BEARD_HI);

  // 3. seat/hip block — the thobe over the seat, set back toward the bench (right).
  R(ctx, x - 4, y - 2, 11, 7, THOBE);
  R(ctx, x + 5, y - 2, 2, 7, THOBE_SH); // shaded back of the seat (toward the bench)
  R(ctx, x - 4, y - 2, 1, 7, THOBE_HI); // lit front of the seat
  R(ctx, x - 4, y + 4, 11, 1, OUTLINE); // soft hem edge
  // soft fold shadows so the lap reads as draped fabric, not a flat block
  R(ctx, x - 1, y - 1, 1, 6, THOBE_SH); // fold where the lap bends to the knee
  R(ctx, x + 2, y, 1, 5, THOBE_SH2); // crease toward the hip
  R(ctx, x - 4, y + 1, 1, 4, THOBE_SH); // front-drape fold

  // 4. torso turned LEFT: white thobe over the chest, with the placket on the
  //    front-left side and form shading on the back-right.
  R(ctx, x - 6, y - 14, 12, 13, THOBE);
  R(ctx, x - 6, y - 14, 2, 13, THOBE_HI); // lit chest/front of the robe (left)
  R(ctx, x + 4, y - 14, 2, 13, THOBE_SH); // shaded back of the robe (right)
  R(ctx, x + 5, y - 14, 1, 13, THOBE_SH2); // deeper shade down the spine
  R(ctx, x - 6, y - 14, 12, 1, OUTLINE); // shoulder seam edge
  // neckline opens toward the LEFT (the front) + placket running down the chest
  R(ctx, x - 4, y - 14, 4, 2, THOBE_SH); // collar shadow under the chin (front)
  R(ctx, x - 3, y - 13, 1, 8, THOBE_SH); // placket seam down the front-left
  R(ctx, x - 3, y - 12, 1, 1, BEARD_HI); // top placket button
  R(ctx, x - 3, y - 9, 1, 1, BEARD_HI); // lower placket button
  // a fine gold-and-maroon embroidered collar trim (tatreez) at the neckline
  R(ctx, x - 4, y - 14, 3, 1, '#A9842E');
  R(ctx, x - 4, y - 14, 1, 1, RED);
  R(ctx, x - 2, y - 14, 1, 1, RED);
  R(ctx, x - 3, y - 11, 1, 1, '#A9842E'); // a stitch down the placket
  // soft fold shadows so the chest reads as draped cloth
  R(ctx, x - 1, y - 6, 3, 1, THOBE_SH); // belly fold
  R(ctx, x + 1, y - 9, 2, 1, THOBE_SH); // side fold toward the back
  R(ctx, x - 5, y - 11, 1, 6, THOBE_HI); // lit fold down the front
  R(ctx, x + 3, y - 12, 1, 4, THOBE_SH2); // deeper side crease
  R(ctx, x - 2, y - 4, 2, 1, THOBE_SH); // lower hem fold

  // 5. neck + warm friendly face in LEFT profile (tan skin). The neck sits a touch
  //    left-of-center under the chin; the face is shaded along the back/right.
  R(ctx, x - 3, y - 16, 4, 2, P.skin.mid); // neck
  // the head, headdress and face breathe together as one unit
  ctx.save();
  ctx.translate(0, br);
  R(ctx, x - 6, y - 26, 9, 11, P.skin.hi); // head base
  R(ctx, x + 1, y - 26, 2, 11, P.skin.mid); // shaded back of the head/cheek (right)
  R(ctx, x - 6, y - 26, 1, 4, P.skin.mid); // soft upper-left edge
  R(ctx, x - 6, y - 20, 1, 1, P.skin.shadow); // brow-line shadow at the front
  // the nose juts out to the LEFT (the front of the profile)
  R(ctx, x - 7, y - 22, 1, 2, P.skin.hi); // nose bridge/tip pointing left
  R(ctx, x - 7, y - 20, 1, 1, P.skin.shadow); // soft shadow under the nose

  // 6. shemagh — white headcloth draping down the BACK of the head (right) and the
  //    near side, leaving the face (left) open. Crown over the top.
  R(ctx, x - 5, y - 30, 10, 6, SHEMAGH); // crown of the headcloth
  R(ctx, x + 3, y - 28, 4, 14, SHEMAGH); // long drape down the BACK (right) to shoulder
  R(ctx, x + 6, y - 28, 1, 14, SHEMAGH_SH); // soft outer fold on the back drape
  R(ctx, x - 5, y - 28, 1, 8, SHEMAGH); // short near-side fall in front of the ear
  R(ctx, x - 5, y - 28, 1, 8, SHEMAGH_SH); // soft fold on the near-side fall
  R(ctx, x - 5, y - 30, 10, 1, THOBE_HI); // lit top of the cloth
  // red check accents — small grid / cross of red pixels over the white cloth
  R(ctx, x - 4, y - 29, 1, 1, RED);
  R(ctx, x - 1, y - 29, 1, 1, RED);
  R(ctx, x + 2, y - 29, 1, 1, RED);
  R(ctx, x - 3, y - 27, 1, 1, RED_DK);
  R(ctx, x, y - 27, 1, 1, RED);
  R(ctx, x + 3, y - 27, 1, 1, RED_DK);
  R(ctx, x + 4, y - 26, 1, 1, RED); // checks running down the back drape (right)
  R(ctx, x + 4, y - 23, 1, 1, RED_DK);
  R(ctx, x + 4, y - 20, 1, 1, RED);
  R(ctx, x + 5, y - 17, 1, 1, RED_DK);

  // 7. black agal — the cord band across the top of the head
  R(ctx, x - 5, y - 31, 10, 2, AGAL);
  R(ctx, x - 5, y - 31, 10, 1, AGAL_HI); // faint sheen on the cord
  R(ctx, x - 5, y - 29, 1, 1, AGAL); // little front wrap
  R(ctx, x + 4, y - 29, 1, 1, AGAL); // little back wrap

  // 8. one kind eye (left profile shows the near eye) + calm slight smile
  R(ctx, x - 4, y - 24, 3, 1, BEARD); // soft brow over the visible eye
  if (blink) {
    R(ctx, x - 4, y - 22, 2, 1, P.skin.shadow); // eye closed on the blink
  } else {
    R(ctx, x - 4, y - 23, 2, 2, '#2A2620'); // the one visible eye
    R(ctx, x - 4, y - 23, 1, 1, '#FBF3E0'); // bright catch-light → a kind, alive eye
  }
  R(ctx, x - 6, y - 19, 2, 1, P.skin.shadow); // slight smile line near the front
  R(ctx, x - 5, y - 21, 1, 1, '#E2926E'); // a warm friendly cheek

  // 9. short neat dark beard along the jaw (front-left) + small mustache
  R(ctx, x - 6, y - 19, 1, 3, BEARD); // front jaw line under the cheek
  R(ctx, x - 5, y - 17, 6, 2, BEARD); // chin beard wrapping the jaw
  R(ctx, x + 1, y - 18, 1, 3, BEARD); // beard along the back of the jaw (right)
  R(ctx, x - 5, y - 16, 5, 1, BEARD_HI); // lit lower beard edge
  R(ctx, x - 6, y - 18, 1, 1, BEARD_HI); // front beard corner
  R(ctx, x - 5, y - 20, 3, 1, BEARD); // small mustache above the smile (front)
  ctx.restore();
}
