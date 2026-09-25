import { FB, rotate90 } from './gfx';
import { DUSK, T } from './palette';

export type HairStyle = 'short' | 'long' | 'bald' | 'hood' | 'helm' | 'hat' | 'wizard' | 'bun' | 'cap' | 'mask';
export type Weapon = 'sword' | 'dagger' | 'staff' | 'club' | null;
export type Action = 'stand' | 'walk' | 'ready' | 'attack' | 'windup' | 'parry' | 'cast' | 'dead';

export interface Look {
  id: string;
  kind?: 'human' | 'wolf' | 'saurus';
  skin: number;
  hair: number;
  hairStyle: HairStyle;
  hat?: number;
  top: number;
  trim?: number;
  legs: number;
  boots: number;
  belt?: number;
  robe?: number;
  cape?: number;
  beard?: number;
  bigBeard?: boolean;
  ears?: boolean;
  eye?: number;
  weapon?: Weapon;
  shield?: number;
  scale?: number;
}

export const DIR = { DOWN: 0, UP: 1, LEFT: 2, RIGHT: 3 } as const;

const SW = 32, SH = 35;

function mirror(s: FB): FB {
  const o = new FB(s.w, s.h, T);
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) o.px[y * s.w + x] = s.px[y * s.w + (s.w - 1 - x)];
  return o;
}

function scaleUp(s: FB, k: number): FB {
  const o = new FB(Math.round(s.w * k), Math.round(s.h * k), T);
  for (let y = 0; y < o.h; y++)
    for (let x = 0; x < o.w; x++) o.px[y * o.w + x] = s.px[Math.floor(y / k) * s.w + Math.floor(x / k)];
  return o;
}

function drawWeapon(s: FB, w: Weapon, hx: number, hy: number, act: Action) {
  if (!w) return;
  let tx = hx + 3, ty = hy + 6, bx = hx, by = hy; // default: carried low
  switch (act) {
    case 'ready': tx = hx + 6; ty = hy - 8; break;
    case 'attack': tx = hx + 9; ty = hy - 1; break;
    case 'windup': tx = hx - 5; ty = hy - 9; break;
    case 'parry': bx = hx + 1; by = hy + 3; tx = hx + 1; ty = hy - 9; break;
    case 'cast': return;
  }
  if (w === 'staff') {
    const dx = tx - bx, dy = ty - by;
    const len = Math.hypot(dx, dy) || 1;
    s.line(bx - (dx / len) * 6, by - (dy / len) * 6, bx + (dx / len) * 12, by + (dy / len) * 12, 6);
    s.circle(bx + (dx / len) * 12, by + (dy / len) * 12, 1, 11);
    return;
  }
  if (w === 'club') {
    s.line(bx, by, tx, ty, 6, 2);
    s.circle(tx, ty, 2, 6);
    s.pset(tx, ty - 1, 8);
    return;
  }
  const short = w === 'dagger';
  const ex = short ? bx + (tx - bx) * 0.6 : tx, ey = short ? by + (ty - by) * 0.6 : ty;
  s.line(bx, by, ex, ey, 15);
  // cross-guard just past the hand
  const gx = bx + Math.sign(tx - bx), gy = by + Math.sign(ty - by);
  if (Math.abs(tx - bx) > Math.abs(ty - by)) s.vline(gx, gy - 1, gy + 1, 14);
  else s.hline(gx - 1, gx + 1, gy, 14);
}

function drawHeadFront(s: FB, L: Look, back: boolean) {
  const hairC = L.hairStyle === 'bald' ? L.skin : L.hair;
  if (L.hairStyle === 'hood') {
    s.ellipse(16, 7, 4, 5, L.hat ?? 8);
    s.rect(12, 11, 9, 2, L.hat ?? 8);
    if (!back) { s.rect(14, 6, 5, 5, L.skin); s.hline(15, 17, 5, L.skin); }
  } else {
    s.ellipse(16, 7, 3, 4, back ? hairC : (L.hairStyle === 'bald' ? L.skin : hairC));
    if (!back) {
      s.rect(14, 6, 5, 5, L.skin);
      s.hline(15, 17, 5, L.hairStyle === 'bald' ? L.skin : hairC);
      s.hline(15, 17, 11, L.skin);
      if (L.hairStyle === 'bald' || L.hairStyle === 'helm' || L.hairStyle === 'wizard' || L.hairStyle === 'hat' || L.hairStyle === 'cap' || L.hairStyle === 'mask')
        s.rect(13, 5, 7, 5, L.skin);
      if (L.hairStyle !== 'bald') s.hline(13, 19, 4, hairC);
    }
    if (L.hairStyle === 'long') {
      s.rect(12, 6, 2, 7, hairC); s.rect(19, 6, 2, 7, hairC);
      if (back) s.rect(13, 7, 7, 8, hairC);
    }
    if (L.hairStyle === 'bun') s.circle(16, 2, 2, hairC);
  }
  if (L.ears) {
    s.pset(12, 6, L.skin); s.pset(11, 5, L.skin); s.pset(10, 4, L.skin);
    s.pset(20, 6, L.skin); s.pset(21, 5, L.skin); s.pset(22, 4, L.skin);
  }
  if (!back) {
    const e = L.eye ?? 0;
    s.pset(15, 7, e); s.pset(17, 7, e);
    if (L.hairStyle === 'mask') {
      s.hline(13, 19, 6, 0); s.hline(13, 19, 7, 0);
      s.pset(15, 7, 12); s.pset(17, 7, 12);
    }
    if (L.beard !== undefined) {
      if (L.bigBeard) { s.rect(13, 8, 7, 5, L.beard); s.rect(14, 13, 5, 3, L.beard); s.pset(16, 16, L.beard); }
      else { s.rect(14, 9, 5, 3, L.beard); s.hline(15, 17, 12, L.beard); }
      s.pset(15, 7, e); s.pset(17, 7, e);
    }
  }
  const hat = L.hat ?? 8;
  switch (L.hairStyle) {
    case 'helm':
      for (let y = 2; y <= 4; y++) s.hline(13, 19, y, 7);
      s.hline(12, 20, 5, 8);
      if (!back) s.vline(16, 6, 8, 7);
      break;
    case 'hat':
      s.rect(13, 1, 7, 3, hat); s.hline(13, 19, 3, 14);
      s.hline(11, 21, 4, hat); s.hline(12, 20, 5, hat);
      break;
    case 'wizard':
      s.poly([[16, -2], [20, 4], [12, 4]], hat);
      s.hline(10, 22, 4, hat); s.hline(11, 21, 5, hat);
      s.pset(16, 1, 14); s.pset(17, 3, 14);
      break;
    case 'cap':
      s.rect(13, 2, 7, 3, hat);
      if (!back) s.hline(14, 19, 5, hat);
      break;
  }
}

function drawHeadSide(s: FB, L: Look) {
  const hairC = L.hairStyle === 'bald' ? L.skin : L.hair;
  const hat = L.hat ?? 8;
  if (L.hairStyle === 'hood') {
    s.ellipse(16, 7, 4, 5, hat);
    s.rect(13, 11, 6, 2, hat);
    s.rect(17, 6, 3, 5, L.skin);
    s.pset(20, 8, L.skin);
  } else {
    s.ellipse(16, 7, 3, 4, L.skin);
    s.pset(20, 8, L.skin); // nose
    if (L.hairStyle !== 'bald') {
      s.hline(13, 19, 3, hairC); s.hline(13, 19, 4, hairC);
      s.rect(13, 5, 2, 4, hairC);
      if (L.hairStyle === 'long') s.rect(12, 6, 3, 8, hairC);
      if (L.hairStyle === 'bun') s.circle(13, 3, 2, hairC);
    }
  }
  if (L.ears) { s.pset(14, 6, L.skin); s.pset(13, 5, L.skin); s.pset(12, 4, L.skin); s.pset(11, 3, L.skin); }
  const e = L.eye ?? 0;
  s.pset(18, 7, e);
  if (L.hairStyle === 'mask') { s.hline(16, 19, 6, 0); s.hline(16, 19, 7, 0); s.pset(18, 7, 12); }
  if (L.beard !== undefined) {
    if (L.bigBeard) { s.rect(15, 9, 6, 5, L.beard); s.rect(16, 14, 4, 2, L.beard); }
    else { s.rect(17, 9, 3, 3, L.beard); s.pset(18, 12, L.beard); }
  }
  switch (L.hairStyle) {
    case 'helm':
      for (let y = 2; y <= 4; y++) s.hline(13, 19, y, 7);
      s.hline(12, 20, 5, 8);
      break;
    case 'hat':
      s.rect(13, 1, 6, 3, hat); s.hline(13, 18, 3, 14);
      s.hline(11, 21, 4, hat);
      break;
    case 'wizard':
      s.poly([[14, -2], [19, 4], [12, 4]], hat);
      s.hline(10, 22, 4, hat); s.hline(11, 21, 5, hat);
      s.pset(15, 1, 14);
      break;
    case 'cap':
      s.rect(13, 2, 6, 3, hat); s.hline(17, 21, 4, hat);
      break;
  }
}

function humanoid(L: Look, dir: number, frame: number, act: Action): FB {
  const s = new FB(SW, SH, T);
  const phase = act === 'walk' ? frame % 4 : 0;
  const sleeve = L.robe ?? L.top;
  const belt = L.belt ?? 6;
  if (dir === 0 || dir === 1) {
    const back = dir === 1;
    if (L.cape !== undefined && !back) { s.rect(12, 13, 1, 15, L.cape); s.rect(20, 13, 1, 15, L.cape); }
    const liftL = phase === 1 ? 2 : 0, liftR = phase === 3 ? 2 : 0;
    if (L.robe === undefined) {
      s.rect(14, 22, 2, 10 - liftL, L.legs);
      s.rect(17, 22, 2, 10 - liftR, L.legs);
      s.rect(16, 22, 1, 2, L.legs);
      s.rect(13, 32 - liftL, 3, 3, L.boots);
      s.rect(17, 32 - liftR, 3, 3, L.boots);
    } else {
      if (!liftL) s.rect(13, 32, 3, 3, L.boots);
      if (!liftR) s.rect(17, 32, 3, 3, L.boots);
      s.poly([[13, 20], [19, 20], [21, 33], [11, 33]], L.robe);
      if (L.trim !== undefined) s.hline(11, 21, 33, L.trim);
    }
    s.rect(13, 12, 7, 10, L.robe ?? L.top);
    s.hline(12, 20, 12, L.robe ?? L.top);
    if (L.trim !== undefined && !back) s.vline(16, 12, 19, L.trim);
    s.hline(13, 19, 20, belt);
    if (back && L.cape !== undefined) s.rect(12, 12, 9, 17, L.cape);
    const aL = phase === 1 ? 1 : phase === 3 ? -1 : 0;
    s.rect(11, 13 + aL, 2, 7, sleeve); s.rect(11, 20 + aL, 2, 2, L.skin);
    s.rect(20, 13 - aL, 2, 7, sleeve); s.rect(20, 20 - aL, 2, 2, L.skin);
    if (L.shield !== undefined) {
      const x = back ? 9 : 20;
      s.rect(x, 14, 4, 7, L.shield); s.frame(x, 14, 4, 7, 14);
    }
    if (L.weapon === 'staff') { s.vline(back ? 21 : 10, 3, 33, 6); s.circle(back ? 21 : 10, 3, 1, 11); }
    if (L.weapon === 'club') { s.line(back ? 21 : 11, 21, back ? 23 : 9, 12, 6, 2); s.circle(back ? 23 : 9, 11, 2, 6); }
    drawHeadFront(s, L, back);
  } else {
    // Side view facing right; LEFT is the mirror.
    const feet = [[15, 17], [12, 20], [16, 16], [20, 12]][phase];
    const shade = (c: number) => DUSK[c] === c ? (c === 0 ? 8 : 0) : DUSK[c];
    if (L.cape !== undefined) {
      const flap = phase === 1 || phase === 3 ? 2 : 0;
      s.poly([[13, 12], [16, 12], [14, 31], [10 - flap, 30]], L.cape);
    }
    if (L.robe === undefined) {
      s.line(16, 22, feet[0], 31, shade(L.legs), 2);
      s.rect(feet[0] - 1, 32, 4, 3, shade(L.boots));
      s.line(16, 22, feet[1], 31, L.legs, 2);
      s.rect(feet[1] - 1, 32, 4, 3, L.boots);
      s.pset(feet[1] + 3, 34, L.boots);
    } else {
      s.rect(feet[1] - 1, 32, 4, 3, L.boots);
      s.poly([[14, 19], [19, 19], [21, 33], [11, 33]], L.robe);
      if (L.trim !== undefined) s.hline(11, 21, 33, L.trim);
    }
    s.rect(14, 12, 5, 10, L.robe ?? L.top);
    s.hline(14, 18, 20, belt);
    if (L.shield !== undefined) {
      const up = act === 'parry' || act === 'ready' ? 1 : 0;
      s.ellipse(15 + up * 3, 16 - up, 3, 5, L.shield);
      s.pset(15 + up * 3, 16 - up, 14);
    }
    drawHeadSide(s, L);
    let hand: number[];
    switch (act) {
      case 'ready': hand = [19, 18]; break;
      case 'attack': hand = [23, 15]; break;
      case 'windup': hand = [12, 9]; break;
      case 'parry': hand = [20, 12]; break;
      case 'cast': hand = [22, 11]; break;
      case 'walk': hand = [[16, 20], [19, 19], [16, 20], [13, 19]][phase]; break;
      default: hand = [16, 20];
    }
    s.line(16, 13, hand[0], hand[1], sleeve, 2);
    s.rect(hand[0] - 1, hand[1] - 1, 2, 2, L.skin);
    if (act === 'cast') { s.pset(hand[0] + 1, hand[1] - 2, 15); s.pset(hand[0] + 2, hand[1] - 1, 11); }
    drawWeapon(s, L.weapon ?? null, hand[0], hand[1], act);
    if (dir === 2) return mirror(s);
  }
  return s;
}

function beast(L: Look, frame: number, act: Action): FB {
  const s = new FB(40, 24, T);
  const wolf = L.kind === 'wolf';
  const body = L.top, belly = L.trim ?? 7, dark = L.legs;
  const dx = act === 'attack' ? 3 : 0;
  const dy = act === 'windup' ? 2 : 0;
  const off = act === 'walk' ? [[2, -2, -2, 2], [0, 0, 0, 0], [-2, 2, 2, -2], [0, 0, 0, 0]][frame % 4] : [0, 0, 0, 0];
  // tail
  if (wolf) s.line(9 + dx, 10 + dy, 2 + dx, act === 'windup' ? 12 : 7, body, 2);
  else { s.line(10 + dx, 12 + dy, 1 + dx, 18, body, 3); s.line(4 + dx, 16, 0, 20, body, 2); }
  const lx = wolf ? [11, 14, 24, 27] : [12, 15, 23, 26];
  lx.forEach((x, i) => {
    const c = i % 2 === 0 ? dark : body;
    s.line(x + dx, 15 + dy, x + dx + off[i], 22, c, 2);
    s.hline(x + dx + off[i] - 1, x + dx + off[i] + 1, 23, dark);
  });
  s.ellipse(18 + dx, 12 + dy, 10, 5, body);
  s.ellipse(18 + dx, 15 + dy, 8, 2, belly);
  if (wolf) s.dither(10 + dx, 8 + dy, 16, 3, body, dark, 2);
  else {
    for (let i = 0; i < 6; i++) s.poly([[10 + i * 3 + dx, 8 + dy], [12 + i * 3 + dx, 4 + dy], [14 + i * 3 + dx, 8 + dy]], 4);
    s.dither(11 + dx, 9 + dy, 15, 4, body, L.hair, 1);
  }
  const hx = 29 + dx, hy = 9 + dy + (act === 'windup' ? 2 : 0);
  s.ellipse(hx, hy, 4, 3, body);
  s.rect(hx + 3, hy - 1, 5, 3, body);
  s.pset(hx + 8, hy - 1, 0);
  if (act === 'attack') {
    s.line(hx + 2, hy + 3, hx + 8, hy + 5, body, 2);
    s.pset(hx + 5, hy + 2, 15); s.pset(hx + 7, hy + 2, 15); s.pset(hx + 6, hy + 4, 15);
  } else s.hline(hx + 3, hx + 7, hy + 2, dark);
  s.pset(hx + 1, hy - 1, L.eye ?? 14);
  if (wolf) s.poly([[hx - 3, hy - 2], [hx - 1, hy - 7], [hx + 1, hy - 2]], body);
  return s;
}

const cache = new Map<string, FB>();

export function sprite(L: Look, dir: number, frame: number, act: Action): FB {
  const key = `${L.id}|${dir}|${frame % 4}|${act}`;
  let s = cache.get(key);
  if (s) return s;
  if (act === 'dead') {
    const base = sprite(L, L.kind && L.kind !== 'human' ? 3 : 3, 0, 'stand');
    if (L.kind && L.kind !== 'human') {
      s = new FB(base.w, base.h, T);
      for (let y = 0; y < base.h; y++) for (let x = 0; x < base.w; x++) s.px[y * base.w + x] = base.px[(base.h - 1 - y) * base.w + x];
    } else s = rotate90(base);
  } else if (L.kind && L.kind !== 'human') {
    s = beast(L, frame, act);
    if (dir === 2) s = mirror(s);
    if (L.scale && L.scale !== 1) s = scaleUp(s, L.scale);
  } else {
    s = humanoid(L, dir, frame, act);
    if (L.scale && L.scale !== 1) s = scaleUp(s, L.scale);
  }
  cache.set(key, s);
  return s;
}

/** Forget cached frames for a look whose appearance changed (e.g. a shorn troll). */
export function dropSprites(id: string) {
  for (const k of [...cache.keys()]) if (k.startsWith(id + '|')) cache.delete(k);
}

// ---- The cast ------------------------------------------------------------------

const L = (o: Look) => o;

export const LOOKS = {
  heroFighter: L({ id: 'heroF', skin: 12, hair: 14, hairStyle: 'short', top: 9, trim: 1, legs: 6, boots: 8, shield: 7, weapon: 'sword' }),
  heroMage: L({ id: 'heroM', skin: 12, hair: 14, hairStyle: 'short', top: 5, trim: 13, legs: 1, boots: 8, weapon: 'dagger' }),
  heroThief: L({ id: 'heroT', skin: 12, hair: 14, hairStyle: 'short', top: 8, trim: 0, legs: 0, boots: 6, weapon: 'dagger' }),

  sheriff: L({ id: 'sheriff', skin: 12, hair: 8, hairStyle: 'hat', hat: 6, top: 6, trim: 14, legs: 8, boots: 0, beard: 8 }),
  shopkeep: L({ id: 'greta', skin: 12, hair: 4, hairStyle: 'bun', top: 2, legs: 2, boots: 6, robe: 2, trim: 15, belt: 15 }),
  innkeep: L({ id: 'oswin', skin: 12, hair: 7, hairStyle: 'bald', top: 15, legs: 6, boots: 6, beard: 7, belt: 6 }),
  guildmaster: L({ id: 'harrow', skin: 6, hair: 7, hairStyle: 'short', top: 4, trim: 14, legs: 8, boots: 0, beard: 7, cape: 1 }),
  healer: L({ id: 'hilde', skin: 12, hair: 7, hairStyle: 'hood', hat: 3, top: 3, legs: 3, boots: 6, robe: 3, trim: 11 }),
  wizard: L({ id: 'zephram', skin: 12, hair: 15, hairStyle: 'wizard', hat: 1, top: 1, legs: 1, boots: 5, robe: 1, trim: 14, beard: 15, bigBeard: true, weapon: 'staff' }),
  thiefBoss: L({ id: 'nell', skin: 12, hair: 4, hairStyle: 'long', top: 0, trim: 5, legs: 0, boots: 8, cape: 5 }),
  castleGuard: L({ id: 'pike', skin: 12, hair: 6, hairStyle: 'helm', top: 7, trim: 4, legs: 4, boots: 8, weapon: 'sword', shield: 4 }),
  baron: L({ id: 'baron', skin: 12, hair: 15, hairStyle: 'short', top: 5, trim: 14, legs: 5, boots: 0, beard: 15, cape: 4 }),
  wren: L({ id: 'wren', skin: 12, hair: 14, hairStyle: 'long', top: 13, legs: 13, boots: 5, robe: 13, trim: 14 }),
  villager: L({ id: 'tom', skin: 6, hair: 8, hairStyle: 'cap', hat: 2, top: 6, legs: 1, boots: 0 }),
  barmaid: L({ id: 'molly', skin: 12, hair: 6, hairStyle: 'bun', top: 15, legs: 4, boots: 0, robe: 4, trim: 15 }),

  goblin: L({ id: 'goblin', skin: 10, hair: 2, hairStyle: 'bald', ears: true, eye: 4, top: 6, legs: 6, boots: 2, weapon: 'dagger' }),
  brigand: L({ id: 'brigand', skin: 12, hair: 0, hairStyle: 'hood', hat: 8, top: 0, trim: 8, legs: 8, boots: 0, weapon: 'sword' }),
  troll: L({ id: 'troll', skin: 2, hair: 0, hairStyle: 'bald', eye: 12, top: 2, belt: 8, legs: 8, boots: 2, beard: 8, bigBeard: true, weapon: 'club', scale: 1.5 }),
  trollShorn: L({ id: 'trollShorn', skin: 2, hair: 0, hairStyle: 'bald', eye: 12, top: 2, belt: 8, legs: 8, boots: 2, weapon: 'club', scale: 1.5 }),
  kobold: L({ id: 'kobold', skin: 4, hair: 4, hairStyle: 'bald', ears: true, eye: 14, top: 5, legs: 4, boots: 4, robe: 5, trim: 14, weapon: 'staff' }),
  leader: L({ id: 'leader', skin: 12, hair: 14, hairStyle: 'mask', top: 0, trim: 4, legs: 0, boots: 4, cape: 4, weapon: 'sword' }),
  wolf: L({ id: 'wolf', kind: 'wolf', skin: 8, hair: 7, hairStyle: 'bald', top: 8, trim: 7, legs: 0, boots: 0, eye: 14 }),
  saurus: L({ id: 'saurus', kind: 'saurus', skin: 2, hair: 10, hairStyle: 'bald', top: 2, trim: 14, legs: 1, boots: 1, eye: 12 }),
};
