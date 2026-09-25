import * as A from '../art';
import { FB, noise, rng } from '../gfx';
import { RAMP, T, hex, mix, rampAt } from '../palette';
import type { Room } from '../registry';
import { within } from './common';

export type Scene = Pick<Room, 'bg' | 'anim' | 'glow' | 'props' | 'lights'>;

const gateClosed = () => within(22, 6);

// ---- shared town pieces --------------------------------------------------------------

export function cobbles(fb: FB, y0: number, y1 = 200, seed = 5) {
  fb.fill(0, y0, 320, y1 - y0, (x, y) => {
    const d = (y - y0) / (y1 - y0);
    const rowH = 3 + d * 5, row = Math.floor((y - y0) / rowH), cw = 5 + d * 9;
    const cx = (x + (row % 2) * cw * 0.5) / cw, fx = cx - Math.floor(cx), fy = ((y - y0) / rowH) % 1;
    const stone = Math.floor(cx) * 7 + row * 13;
    const edge = fx < 0.12 || fy < 0.16 ? -0.45 : fx > 0.85 || fy > 0.82 ? -0.2 : fy < 0.35 ? 0.15 : 0;
    return rampAt(RAMP.stone, 0.48 + edge + ((stone % 5) / 5 - 0.5) * 0.25 + (noise(x * 0.4, y * 0.4, seed) - 0.5) * 0.2 - d * 0.08, x, y);
  });
}

function smoke(fb: FB, x: number, y: number, t: number, seed = 1) {
  for (let i = 0; i < 6; i++) {
    const k = ((t * 0.25 + i / 6 + seed * 0.13) % 1);
    const px = x + Math.sin(k * 6 + seed) * 3 + k * 10, py = y - k * 36, r = 1.5 + k * 5;
    fb.fill(px - r, py - r, r * 2, r * 2, (xx, yy) => {
      const d = ((xx - px) ** 2 + (yy - py) ** 2) / (r * r);
      if (d > 1 || noise(xx * 0.4, yy * 0.4 + t, seed) < 0.35 + d * 0.3) return T;
      return mix(fb.get(xx, yy), 0xcfd2d8, 0.35 * (1 - k));
    });
  }
}

// ---- Thornwick gate -------------------------------------------------------------------

const towngate: Scene = {
  bg(fb) {
    A.sky(fb, 96, 11, 3);
    A.mountains(fb, 88, 52, 5, 0);
    A.hills(fb, 108, 26, 2, RAMP.grass, 0.55);
    A.treeline(fb, 118, 16, 4, RAMP.leafDark, 0.4);
    // rooftops of the town peeking over the wall
    for (const [x, w, h, kind] of [[8, 34, 14, 'tile'], [40, 30, 20, 'slate'], [150, 36, 16, 'tile'], [178, 26, 22, 'tile']] as const) A.roof(fb, x, x + w, 52, h, kind);
    fb.limb(94, 22, 94, 52, 2.2, 2, RAMP.stoneWarm); fb.cylPoly([[89, 24], [99, 24], [94, 8]], 94, 5, RAMP.roofSlate);
    // wall & towers
    A.stoneWall(fb, 0, 50, 222, 72, RAMP.stoneWarm, 3, 7);
    A.crenels(fb, 0, 50, 222, RAMP.stoneWarm);
    for (const [tx, tw, ty] of [[46, 32, 30], [112, 32, 30], [194, 34, 26]]) {
      A.stoneWall(fb, tx, ty, tw, 122 - ty, RAMP.stoneWarm, tx, 7);
      fb.fill(tx, ty, 4, 122 - ty, (x, y) => mix(fb.get(x, y), 0xffffff, 0.12));
      fb.fill(tx + tw - 5, ty, 5, 122 - ty, (x, y) => mix(fb.get(x, y), 0x000000, 0.25));
      A.crenels(fb, tx - 2, ty, tw + 4, RAMP.stoneWarm);
      fb.fill(tx + tw / 2 - 1, ty + 16, 3, 9, () => 0x0c0a0a);
    }
    // gate arch with the road beyond
    A.archDoor(fb, 76, 122, 38, 58, 0x1a1512);
    fb.fill(80, 88, 30, 34, (x, y) => rampAt(RAMP.dirt, 0.35 + (y - 88) / 60, x, y));
    fb.fill(80, 76, 30, 14, (x, y) => rampAt(RAMP.plaster, 0.4 + (noise(x * 0.3, y * 0.3, 2) - 0.5) * 0.4, x, y));
    for (let x = 80; x < 111; x += 5) fb.limb(x, 67, x, 76, 0.9, 0.7, RAMP.iron);
    fb.limb(77, 67, 113, 67, 1, 1, RAMP.iron);
    for (let a = 0; a <= Math.PI; a += 0.14) { const x = 95 - Math.cos(a) * 21, y = 83 - Math.sin(a) * 21; fb.sphere(x, y, 2.6, 2, RAMP.stone, { amb: 0.4 }); }
    // banners
    for (const bx of [62, 128]) { fb.limb(bx, 14, bx, 32, 0.7, 0.7, RAMP.wood); fb.poly([[bx + 1, 15], [bx + 13, 17], [bx + 11, 21], [bx + 13, 25], [bx + 1, 24]], (x, y) => rampAt(RAMP.clothPurple, 0.5 + (noise(x * 0.3, y, 1) - 0.5) * 0.5, x, y)); }
    // ground
    A.grass(fb, 122, 4);
    fb.fill(0, 122, 222, 5, (x, y) => mix(fb.get(x, y), 0x000000, 0.35 - (y - 122) * 0.06));
    A.dirt(fb, [[78, 122], [112, 122], [150, 142], [230, 150], [320, 154], [320, 184], [220, 180], [150, 176], [110, 186], [104, 200], [42, 200], [66, 158]], 4);
    A.dirt(fb, [[232, 122], [268, 122], [262, 150], [228, 150]], 5);
    A.tree(fb, 300, 150, 30, 7);
    A.tree(fb, 252, 124, 14, 9, 'pine');
    A.bush(fb, 18, 162, 26, 3); A.bush(fb, 232, 190, 18, 9);
    A.rock(fb, 262, 186, 9, 4, 3);
    A.flowers(fb, 150, 182, 70, 16, [hex('#f4e27a'), hex('#ffffff'), hex('#e87a9a')], 3, 26);
    A.flowers(fb, 0, 170, 60, 26, [hex('#f4e27a'), hex('#9ab8f0')], 5, 18);
  },
  anim(fb) {
    if (gateClosed()) {
      fb.fill(80, 68, 30, 54, (x, y) => rampAt(RAMP.wood, 0.4 + ((x - 80) % 6 === 0 ? -0.4 : 0) + (noise(x * 0.3, y * 0.1, 3) - 0.5) * 0.3, x, y));
      for (const y of [80, 106]) fb.limb(80, y, 110, y, 1, 1, RAMP.iron);
    }
  },
  props: [{
    y: 145, draw(fb) {
      fb.shadow(176, 146, 14, 2.5, 0.45);
      for (const px of [162, 180]) fb.limb(px, 146, px, 118, 1.3, 1.2, RAMP.wood);
      fb.fill(158, 116, 27, 18, (x, y) => rampAt(RAMP.wood, 0.5 + (x === 158 || y === 116 ? 0.25 : x === 184 || y === 133 ? -0.3 : 0), x, y));
      for (const [x, y, w, h] of [[161, 119, 9, 8], [172, 118, 9, 11], [162, 128, 7, 4]]) fb.fill(x, y, w, h, (px, py) => rampAt(RAMP.clothWhite, 0.7 - (py - y) * 0.03 + ((py - y) % 2 === 1 && px > x && px < x + w - 1 ? -0.3 : 0), px, py));
      fb.pset(165, 119, hex('#c0302a')); fb.pset(176, 118, hex('#c0302a'));
    },
  }],
};

// ---- Main Street ----------------------------------------------------------------------

// Filled in when the street is painted; rooms keep a reference to this same array.
const streetLights: A.Window[] = [];

const mainstreet: Scene = {
  bg(fb) {
    A.sky(fb, 70, 21, 2);
    A.mountains(fb, 56, 30, 8, 0);
    fb.fill(0, 50, 320, 60, (x, y) => (y > 60 ? rampAt(RAMP.leafDark, 0.3 + (noise(x * 0.2, y * 0.2, 4) - 0.5) * 0.5, x, y) : T));
    const w1 = A.house(fb, 8, 122, 88, 56, { roof: 'shingle', door: 34, windows: [9, 66], chimney: 70, seed: 1 });
    const w2 = A.house(fb, 104, 122, 112, 72, { roof: 'tile', door: 47, doorW: 18, windows: [10, 88], chimney: 20, roofH: 28, seed: 2 });
    const w3 = A.house(fb, 224, 122, 76, 62, { roof: 'slate', stone: true, door: 29, windows: [6, 56], roofH: 24, seed: 3 });
    // upper-storey windows on the inn
    w2.push(A.windowPane(fb, 104 + 36, 62, 10, 10), A.windowPane(fb, 104 + 64, 62, 10, 10));
    streetLights.length = 0;
    streetLights.push(...w1, ...w2, ...w3);
    // hanging signs
    A.hangingSign(fb, 58, 68, 18, 12, (cx, cy) => fb.sphere(cx, cy, 6, 3.5, RAMP.woodPale, { amb: 0.5 }));
    A.hangingSign(fb, 172, 56, 22, 14, (cx, cy) => { fb.sphere(cx - 2, cy + 1, 5, 3.4, RAMP.clothWhite); fb.sphere(cx + 3, cy - 3, 2.2, 2.2, RAMP.clothWhite); fb.pset(cx + 5, cy - 3, RAMP.gold[4]); fb.pset(cx + 4, cy - 4, 0x101010); });
    A.hangingSign(fb, 250, 60, 22, 14, (cx, cy) => { fb.limb(cx - 6, cy + 5, cx + 6, cy - 5, 0.7, 0.5, RAMP.metal); fb.limb(cx + 6, cy + 5, cx - 6, cy - 5, 0.7, 0.5, RAMP.metal); });
    // alley mouth
    fb.fill(300, 34, 20, 88, (x, y) => mix(0x0a0a10, 0x2a2a34, (noise(x * 0.3, y * 0.1, 3) * 0.6) * (1 - (x - 300) / 30)));
    cobbles(fb, 122);
    fb.fill(0, 122, 320, 6, (x, y) => mix(fb.get(x, y), 0x000000, 0.4 - (y - 122) * 0.06));
    // barrels & crates along the frontage
    A.barrel(fb, 100, 128); A.barrel(fb, 218, 129);
    fb.fill(4, 120, 18, 10, (x, y) => rampAt(RAMP.wood, 0.45 + ((x - 4) % 6 === 0 ? -0.3 : 0), x, y));
  },
  lights: streetLights,
  anim(fb, t) { smoke(fb, 81, 42, t, 1); smoke(fb, 128, 22, t, 2); },
  props: [{
    y: 172, draw(fb) {
      fb.shadow(162, 175, 24, 4, 0.5);
      A.stoneWall(fb, 141, 162, 38, 12, RAMP.stone, 4, 4);
      fb.sphere(160, 162, 19, 4, RAMP.stone, { amb: 0.5 });
      fb.sphere(160, 162, 16, 2.6, RAMP.water, { amb: 0.2 });
      for (const px of [144, 176]) fb.limb(px, 162, px, 137, 1.4, 1.2, RAMP.wood);
      A.roof(fb, 142, 178, 139, 9, 'shingle');
      fb.limb(144, 145, 176, 145, 0.8, 0.8, RAMP.wood);
      fb.limb(160, 145, 160, 153, 0.3, 0.3, RAMP.clothBrown);
      fb.cylPoly([[156, 153], [164, 153], [163, 159], [157, 159]], 160, 4, RAMP.wood);
    },
  }],
};

// ---- Greta's shop -----------------------------------------------------------------------

const shop: Scene = {
  bg(fb) {
    A.room(fb, { wall: 'wood', floor: 'wood', wallH: 112, seed: 2 });
    A.beams(fb, 4);
    A.shelves(fb, 14, 18, 112, 5, 3);
    A.shelves(fb, 178, 8, 130, 4, 7);
    A.windowPane(fb, 142, 24, 26, 30);
    fb.limb(250, 70, 290, 70, 1, 1, RAMP.wood);
    for (let i = 0; i < 6; i++) { const x = 254 + i * 6; fb.limb(x, 70, x, 78 + (i % 3) * 3, 0.3, 0.3, RAMP.clothBrown); fb.sphere(x, 81 + (i % 3) * 3, 2.2, 3, [RAMP.clothRed, RAMP.clothYellow, RAMP.clothGreen][i % 3]); }
    A.barrel(fb, 32, 152); A.barrel(fb, 52, 160);
    fb.sphere(22, 178, 13, 9, RAMP.clothBrown); fb.sphere(22, 171, 10, 3, RAMP.clothYellow, { amb: 0.6 });
    A.rug(fb, 100, 176, 50, 13, RAMP.clothBlue, RAMP.clothYellow);
    A.vignette(fb, 0.5);
  },
  glow(fb) { fb.glow(155, 60, 60, 0xffe8b0, 0.25); fb.glow(155, 150, 80, 0xffd890, 0.12); },
  props: [{
    y: 136, draw(fb) {
      fb.shadow(236, 138, 90, 5, 0.5);
      fb.fill(150, 108, 170, 28, (x, y) => rampAt(RAMP.wood, 0.4 + ((x - 150) % 22 === 0 ? -0.35 : 0) + (noise(x * 0.2, y * 0.1, 4) - 0.5) * 0.3 - (y - 108) / 60, x, y));
      fb.fill(148, 104, 172, 5, (x, y) => rampAt(RAMP.woodPale, 0.7 - (y - 104) * 0.12, x, y));
      fb.sphere(206, 98, 8, 6, RAMP.metal, { rim: 0.3, clip: (_x, y) => y < 103 });
      fb.limb(198, 103, 214, 103, 1, 1, RAMP.metal);
      fb.fill(270, 96, 14, 8, (x, y) => rampAt(RAMP.clothWhite, 0.6 - (y - 96) * 0.05, x, y));
      A.candle(fb, 290, 104, 0);
    },
  }],
};

// ---- The Hanged Goose -------------------------------------------------------------------

const inn: Scene = {
  bg(fb) {
    A.room(fb, { wall: 'plaster', floor: 'wood', wallH: 116, seed: 4 });
    A.beams(fb, 5);
    A.fireplace(fb, 270, 116);
    A.shelves(fb, 14, 22, 90, 3, 11);
    fb.fill(148, 28, 40, 28, (x, y) => rampAt(RAMP.wood, 0.3 + (x === 148 || y === 28 ? 0.5 : 0), x, y));
    fb.fill(151, 31, 34, 22, (x, y) => rampAt(RAMP.clothTeal, 0.4 + (y - 31) / 40, x, y));
    fb.sphere(162, 44, 5, 3.4, RAMP.clothWhite); fb.sphere(167, 39, 2.3, 2.3, RAMP.clothWhite); fb.pset(169, 39, RAMP.gold[4]);
    A.windowPane(fb, 210, 40, 22, 20);
    for (let i = 0; i < 5; i++) { const x = 30 + i * 12; fb.limb(x, 94, x, 100, 1.3, 1.5, RAMP.metal, { rim: 0.4 }); }
    A.vignette(fb, 0.55);
  },
  anim(fb, t) { A.fire(fb, 270, 114, t); },
  glow(fb, t) {
    const f = 0.55 + Math.sin(t * 7) * 0.05 + Math.sin(t * 13) * 0.04;
    fb.glow(270, 104, 90, 0xff8a30, f * 0.55);
    fb.glow(270, 160, 70, 0xff8a30, f * 0.25);
    fb.glow(221, 50, 30, 0xfff0c0, 0.2);
  },
  props: [
    {
      y: 136, draw(fb) {
        fb.shadow(60, 138, 60, 5, 0.5);
        fb.fill(0, 106, 112, 30, (x, y) => rampAt(RAMP.wood, 0.4 + (x % 18 === 0 ? -0.35 : 0) + (noise(x * 0.2, y * 0.1, 4) - 0.5) * 0.3 - (y - 106) / 70, x, y));
        fb.fill(0, 102, 114, 5, (x, y) => rampAt(RAMP.woodPale, 0.75 - (y - 102) * 0.12, x, y));
        fb.limb(22, 94, 22, 101, 2.2, 2.4, RAMP.clothBrown); fb.limb(62, 96, 62, 101, 1.8, 2, RAMP.glass, { rim: 0.4 });
        A.barrel(fb, 102, 102);
      },
    },
    { y: 152, draw(fb) { A.table(fb, 120, 140, 44); A.stool(fb, 116, 150); fb.limb(130, 134, 130, 137, 1.5, 1.8, RAMP.metal); fb.sphere(148, 136, 4, 1.4, RAMP.clothWhite); } },
    { y: 172, draw(fb) { A.table(fb, 196, 158, 44); A.stool(fb, 244, 168); fb.limb(214, 151, 214, 155, 1.5, 1.8, RAMP.metal); } },
  ],
};

// ---- Adventurers' Guild -------------------------------------------------------------------

const guild: Scene = {
  bg(fb) {
    A.room(fb, { wall: 'stone', floor: 'stone', wallH: 112, seed: 6 });
    // quest board
    fb.fill(118, 20, 74, 54, (x, y) => rampAt(RAMP.wood, 0.4 + (x === 118 || y === 20 ? 0.35 : x === 191 || y === 73 ? -0.4 : 0) + (noise(x * 0.5, y * 0.5, 2) - 0.5) * 0.2, x, y));
    const r = rng(9);
    for (const [x, y, w, h] of [[124, 26, 18, 16], [146, 24, 14, 20], [164, 28, 20, 14], [126, 48, 20, 18], [152, 48, 30, 18]]) {
      const tilt = r() - 0.5;
      fb.fill(x, y, w, h, (px, py) => rampAt(RAMP.clothWhite, 0.75 - (py - y) * 0.02 + ((py - y) % 3 === 2 && px > x + 1 && px < x + w - 2 ? -0.35 : 0) + tilt * 0.1, px, py));
      fb.sphere(x + w / 2, y + 1, 1, 1, RAMP.clothRed, { amb: 0.6 });
    }
    // trophies
    fb.fill(26, 28, 26, 22, (x, y) => rampAt(RAMP.wood, 0.45 + (x === 26 ? 0.3 : 0), x, y));
    fb.sphere(39, 40, 8, 7, RAMP.goblin); fb.cylPoly([[31, 38], [25, 30], [34, 35]], 30, 4, RAMP.goblin); fb.cylPoly([[47, 38], [53, 30], [44, 35]], 48, 4, RAMP.goblin);
    fb.pset(36, 39, hex('#f0c030')); fb.pset(42, 39, hex('#f0c030'));
    fb.fill(60, 24, 30, 24, (x, y) => rampAt(RAMP.wood, 0.45 + (x === 60 ? 0.3 : 0), x, y));
    fb.sphere(72, 36, 9, 7, RAMP.scale); fb.limb(78, 37, 90, 38, 3, 2, RAMP.scale); fb.pset(74, 33, hex('#ff5a3a'));
    for (let i = 0; i < 4; i++) fb.cylPoly([[64 + i * 4, 31], [66 + i * 4, 25], [68 + i * 4, 31]], 66 + i * 4, 2, RAMP.clothRed);
    fb.limb(218, 28, 252, 62, 1.2, 1, RAMP.metal, { rim: 0.4 }); fb.limb(252, 28, 218, 62, 1.2, 1, RAMP.metal, { rim: 0.4 });
    fb.sphere(235, 45, 11, 11, RAMP.clothRed); fb.sphere(235, 45, 8, 8, RAMP.gold); fb.sphere(235, 45, 4, 4, RAMP.clothRed);
    A.fireplace(fb, 286, 112);
    fb.fill(98, 84, 114, 12, (x, y) => rampAt(RAMP.clothRed, 0.45 + Math.sin(x * 0.4) * 0.15 - (y - 84) * 0.02, x, y));
    fb.limb(98, 84, 212, 84, 1, 1, RAMP.gold);
    A.rug(fb, 170, 170, 70, 16, RAMP.clothRed, RAMP.gold);
    A.vignette(fb, 0.55);
  },
  anim(fb, t) { A.fire(fb, 286, 110, t); },
  glow(fb, t) { const f = 0.5 + Math.sin(t * 8) * 0.05; fb.glow(286, 100, 90, 0xff8a30, f * 0.55); fb.glow(250, 160, 70, 0xff8a30, f * 0.2); },
  props: [{
    y: 146, draw(fb) {
      fb.shadow(63, 147, 12, 3, 0.5);
      fb.limb(61, 146, 61, 120, 2, 1.6, RAMP.wood);
      fb.poly([[48, 112], [76, 112], [72, 122], [52, 122]], (x, y) => rampAt(RAMP.wood, 0.5 - (y - 112) / 20, x, y));
      fb.fill(51, 106, 22, 8, (x, y) => rampAt(RAMP.clothWhite, 0.75 + (x === 61 || x === 62 ? -0.4 : 0) + ((y - 106) % 2 ? -0.2 : 0), x, y));
      fb.limb(66, 104, 70, 97, 0.4, 0.2, RAMP.clothWhite);
    },
  }],
};

// ---- Back alley -----------------------------------------------------------------------------

const alley: Scene = {
  bg(fb) {
    fb.fill(0, 0, 320, 40, (x, y) => rampAt(RAMP.skyDay, 0.25 + y / 60, x, y));
    A.stoneWall(fb, 0, 8, 122, 120, RAMP.brick, 11, 5);
    A.stoneWall(fb, 198, 14, 122, 114, RAMP.brick, 12, 5);
    A.stoneWall(fb, 122, 38, 76, 90, RAMP.stone, 13, 7);
    fb.fill(122, 38, 76, 90, (x, y) => mix(fb.get(x, y), 0x0a0a14, 0.45));
    fb.fill(0, 8, 122, 120, (x, y) => mix(fb.get(x, y), 0x000000, 0.08 + (x / 122) * 0.2));
    fb.fill(198, 14, 122, 114, (x, y) => mix(fb.get(x, y), 0x000000, 0.25 - ((x - 198) / 122) * 0.2));
    // thieves' door (black, peephole) and merchant's back door
    fb.fill(56, 88, 28, 40, (x, y) => rampAt(RAMP.stone, 0.35 + (x < 58 ? 0.2 : 0), x, y));
    fb.fill(60, 92, 20, 36, (x, y) => rampAt(RAMP.clothBlack, 0.35 + ((x - 60) % 5 === 0 ? -0.3 : 0) + (noise(x * 0.3, y * 0.1, 1) - 0.5) * 0.2, x, y));
    fb.fill(66, 100, 8, 4, (x, y) => rampAt(RAMP.iron, 0.6 + (y === 100 ? 0.2 : 0), x, y));
    A.door(fb, 222, 128, 20, 34, RAMP.clothGreen, false);
    for (const [x, y] of [[28, 38], [248, 44]]) A.windowPane(fb, x, y, 14, 12);
    fb.limb(2, 30, 120, 36, 0.4, 0.4, RAMP.clothBrown);
    for (const [x, c] of [[24, RAMP.clothWhite], [48, RAMP.clothRed], [76, RAMP.clothBlue], [98, RAMP.clothWhite]] as const) fb.fill(x, 32 + x * 0.05, 12, 12 + (x % 3) * 2, (px, py) => rampAt(c, 0.55 + (noise(px * 0.4, py * 0.2, x) - 0.5) * 0.4, px, py));
    cobbles(fb, 128, 200, 8);
    fb.fill(0, 128, 320, 72, (x, y) => mix(fb.get(x, y), 0x101018, 0.25 + noise(x * 0.05, y * 0.1, 3) * 0.2));
    fb.fill(0, 128, 320, 5, (x, y) => mix(fb.get(x, y), 0x000000, 0.45 - (y - 128) * 0.08));
    fb.fill(110, 170, 60, 12, (x, y) => (noise(x * 0.1, y * 0.3, 4) > 0.55 ? rampAt(RAMP.water, 0.4 + noise(x, y, 5) * 0.4, x, y) : T));
    A.barrel(fb, 22, 168);
    fb.sphere(22, 148, 7, 2, RAMP.water, { amb: 0.4 });
  },
  lights: [{ x: 28, y: 38, w: 14, h: 12 }],
  props: [{
    y: 156, draw(fb) {
      const crate = (x: number, y: number, w: number, h: number) => {
        fb.fill(x, y, w, h, (px, py) => rampAt(RAMP.woodPale, 0.5 + (px === x || py === y ? 0.25 : px === x + w - 1 || py === y + h - 1 ? -0.35 : 0) + ((px - x) % 5 === 0 ? -0.2 : 0), px, py));
        fb.limb(x + 1, y + 1, x + w - 2, y + h - 2, 0.7, 0.7, RAMP.wood);
      };
      fb.shadow(148, 157, 26, 4, 0.5);
      crate(128, 132, 22, 22); crate(147, 139, 18, 17); crate(132, 116, 16, 16);
    },
  }],
};

// ---- Thieves' Guild ------------------------------------------------------------------------

const thieves: Scene = {
  bg(fb) {
    A.room(fb, { wall: 'stone', floor: 'stone', wallH: 114, seed: 8, wallRamp: RAMP.stone });
    fb.fill(38, 26, 54, 38, (x, y) => rampAt(RAMP.clothPurple, 0.35 + (noise(x * 0.2, y * 0.4, 3) - 0.5) * 0.3, x, y));
    fb.limb(44, 32, 86, 58, 1, 1, RAMP.gold); fb.limb(86, 32, 44, 58, 1, 1, RAMP.gold);
    A.shelves(fb, 228, 18, 66, 4, 15);
    for (let i = 0; i < 8; i++) fb.sphere(240 + (i % 4) * 12, 94 + Math.floor(i / 4) * 5, 3, 2, RAMP.gold, { amb: 0.5 });
    A.vignette(fb, 0.9);
  },
  anim(fb, t) { for (const x of [134, 186]) A.candle(fb, x, 128, t); },
  glow(fb, t) { for (const x of [134, 186]) fb.glow(x, 118, 55 + Math.sin(t * 9 + x) * 3, 0xffa040, 0.45); },
  props: [{
    y: 146, draw(fb) {
      A.table(fb, 126, 132, 68);
      for (let i = 0; i < 6; i++) fb.sphere(146 + i * 5, 129, 2, 1.2, RAMP.gold, { amb: 0.6 });
      fb.fill(158, 126, 10, 4, (x, y) => rampAt(RAMP.clothWhite, 0.7, x, y));
    },
  }],
};

// ---- Fenwick's parlour -----------------------------------------------------------------------

const merchant: Scene = {
  bg(fb) {
    A.room(fb, { wall: 'plaster', floor: 'wood', wallH: 112, wallRamp: RAMP.clothBlue, seed: 9 });
    fb.fill(0, 0, 320, 112, (x, y) => (x % 20 < 2 ? mix(fb.get(x, y), 0xffffff, 0.06) : T));
    fb.fill(40, 22, 40, 52, (x, y) => rampAt(RAMP.gold, 0.5 + (x === 40 || y === 22 ? 0.3 : x === 79 || y === 73 ? -0.4 : 0), x, y));
    fb.fill(44, 26, 32, 44, (x, y) => rampAt(RAMP.clothBrown, 0.3 + (y - 26) / 100, x, y));
    fb.sphere(60, 42, 8, 10, RAMP.skin); fb.sphere(60, 60, 13, 9, RAMP.clothRed, { clip: (_x, y) => y < 70 });
    fb.pset(57, 41, 0x201010); fb.pset(63, 41, 0x201010);
    A.windowPane(fb, 120, 38, 30, 40);
    A.books(fb, 268, 16, 46, 6, 3);
    A.rug(fb, 130, 170, 72, 18, RAMP.clothRed, RAMP.gold);
    A.vignette(fb, 1.2);
    fb.grade((c) => mix(c, 0x0a0c1a, 0.45));
  },
  glow(fb) { fb.glow(135, 58, 40, 0x8090c0, 0.2); },
  props: [{
    y: 148, draw(fb) {
      fb.shadow(234, 149, 40, 4, 0.5);
      fb.fill(196, 118, 70, 28, (x, y) => rampAt(RAMP.wood, 0.25 + (x === 196 ? 0.2 : 0) + (noise(x * 0.2, y * 0.1, 7) - 0.5) * 0.25, x, y));
      fb.fill(194, 114, 74, 5, (x, y) => rampAt(RAMP.wood, 0.5 - (y - 114) * 0.1, x, y));
      fb.fill(206, 124, 22, 9, (x, y) => rampAt(RAMP.wood, 0.35 + (x === 206 || y === 124 ? 0.2 : 0), x, y));
      fb.sphere(217, 128, 1.3, 1.3, RAMP.gold);
      fb.limb(244, 114, 244, 106, 2, 1.6, RAMP.metal);
    },
  }],
};

// ---- Castle Thornwick --------------------------------------------------------------------------

const castlegate: Scene = {
  bg(fb) {
    A.sky(fb, 110, 31, 3);
    A.mountains(fb, 76, 48, 12, 0);
    const towerTop = (x: number, w: number, y: number) => {
      fb.cylPoly([[x - 3, y], [x + w + 3, y], [x + w / 2, y - w * 0.9]], x + w / 2, w / 2 + 3, RAMP.roofSlate, { tex: (px, py) => ((py - y) % 4 === 0 ? -0.3 : 0) });
      fb.limb(x + w / 2, y - w * 0.9, x + w / 2, y - w * 0.9 - 8, 0.5, 0.5, RAMP.wood);
      fb.poly([[x + w / 2 + 1, y - w * 0.9 - 8], [x + w / 2 + 9, y - w * 0.9 - 6], [x + w / 2 + 1, y - w * 0.9 - 4]], RAMP.clothPurple[4]);
    };
    A.stoneWall(fb, 150, 4, 40, 40, RAMP.stone, 21, 7); towerTop(150, 40, 4);
    A.stoneWall(fb, 20, 40, 280, 92, RAMP.stone, 22, 8);
    A.crenels(fb, 20, 40, 280);
    for (const x of [6, 272]) {
      A.stoneWall(fb, x, 16, 42, 116, RAMP.stone, x, 8);
      fb.fill(x, 16, 5, 116, (px, py) => mix(fb.get(px, py), 0xffffff, 0.12));
      fb.fill(x + 36, 16, 6, 116, (px, py) => mix(fb.get(px, py), 0x000000, 0.28));
      towerTop(x, 42, 16);
      for (const wy of [40, 80]) fb.fill(x + 19, wy, 4, 12, () => 0x0c0c10);
    }
    // gatehouse
    A.archDoor(fb, 136, 132, 48, 64, 0x151012);
    fb.fill(140, 72, 40, 60, (x, y) => ((x - 140) % 6 < 2 || (y - 72) % 8 < 2 ? rampAt(RAMP.iron, 0.5 + ((x - 140) % 6 === 0 ? 0.3 : 0), x, y) : T));
    for (let a = 0; a <= Math.PI; a += 0.12) { const x = 160 - Math.cos(a) * 27, y = 92 - Math.sin(a) * 27; fb.sphere(x, y, 3, 2.4, RAMP.stone, { amb: 0.4 }); }
    for (const bx of [96, 214]) {
      fb.fill(bx, 56, 16, 34, (x, y) => rampAt(RAMP.clothPurple, 0.45 + (noise(x * 0.3, y * 0.05, bx) - 0.5) * 0.4 + (x === bx ? 0.2 : 0), x, y));
      fb.sphere(bx + 8, 70, 4, 4, RAMP.gold);
      fb.poly([[bx, 90], [bx + 8, 96], [bx + 16, 90]], RAMP.clothPurple[3]);
    }
    A.grass(fb, 132, 21);
    fb.fill(20, 132, 280, 5, (x, y) => mix(fb.get(x, y), 0x000000, 0.35 - (y - 132) * 0.07));
    A.dirt(fb, [[138, 132], [182, 132], [206, 160], [264, 200], [214, 200], [168, 160]], 3);
    A.bush(fb, 40, 184, 26, 2); A.bush(fb, 296, 176, 22, 4);
    A.tree(fb, 12, 196, 34, 5);
  },
};

export const TOWN_SCENES: Record<string, Scene> = { towngate, mainstreet, shop, inn, guild, alley, thieves, merchant, castlegate };

