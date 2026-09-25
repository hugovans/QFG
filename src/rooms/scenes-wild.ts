import * as A from '../art';
import { FB, fbm, noise, rng } from '../gfx';
import { RAMP, T, darker, hex, mix, rampAt } from '../palette';
import { G } from '../game';
import type { Scene } from './scenes-town';

/** Dense woodland backdrop: layered trunks and canopy with light filtering through. */
function forest(fb: FB, seed: number, dark = false, groundY = 122) {
  const r = rng(seed);
  fb.fill(0, 0, 320, groundY + 4, (x, y) => rampAt(dark ? RAMP.leafDark : RAMP.leaf, (dark ? 0.1 : 0.25) + (fbm(x * 0.03, y * 0.04, seed, 4) - 0.5) * 0.5 + y / 600, x, y));
  if (!dark) fb.fill(0, 0, 320, 70, (x, y) => (noise(x * 0.08, y * 0.12, seed + 3) > 0.62 ? rampAt(RAMP.skyDay, 0.7 + (y / 140), x, y) : T));
  for (let layer = 0; layer < 3; layer++) {
    const R = layer === 0 ? darker(RAMP.bark, 2) : layer === 1 ? darker(RAMP.bark, 1) : RAMP.bark;
    for (let i = 0; i < 7 + layer * 2; i++) {
      const x = r() * 330 - 5, w = 2 + layer * 1.6 + r() * 2;
      fb.limb(x, groundY + 2, x + (r() - 0.5) * 6, -5, w, w * 0.8, R, { amb: 0.15 + layer * 0.08, tex: (px, py) => (noise(px * 0.8, py * 0.1, seed + i) - 0.5) * 0.5 });
    }
    for (let i = 0; i < 12; i++) {
      const x = r() * 320, y = r() * (40 + layer * 12), s = 14 + r() * 16;
      fb.sphere(x, y, s, s * 0.7, darker(dark ? RAMP.leafDark : RAMP.leaf, 2 - layer), { amb: 0.12, tex: (px, py) => (noise(px * 0.5, py * 0.5, seed + layer) - 0.5) * 0.6 });
    }
  }
  if (!dark) for (let i = 0; i < 3; i++) {
    const x = 60 + i * 100 + r() * 40;
    fb.poly([[x, 0], [x + 14, 0], [x + 50, groundY], [x + 26, groundY]], (px, py) => mix(fb.get(px, py), 0xfff3c8, 0.07 + 0.05 * noise(px * 0.1, py * 0.05, i)));
  }
}

function fireflies(fb: FB, t: number, n: number, area: [number, number, number, number], seed = 3) {
  const [x0, y0, w, h] = area;
  for (let i = 0; i < n; i++) {
    const k = (Math.sin(t * 0.7 + i * 1.7) + 1) / 2;
    const x = x0 + ((noise(i, t * 0.1, seed) * 1.4) % 1) * w, y = y0 + (0.5 + 0.5 * Math.sin(t * 0.9 + i)) * h;
    if (k < 0.35) continue;
    fb.glow(x, y, 5, 0xc0ff60, 0.5 * k);
    fb.pset(x, y, 0xf4ffc0);
  }
}

// ---- Crossroads ---------------------------------------------------------------------------

const crossroads: Scene = {
  bg(fb) {
    A.sky(fb, 96, 41, 3);
    A.mountains(fb, 84, 56, 3, 0);
    A.mountains(fb, 100, 30, 13, 1);
    A.hills(fb, 112, 20, 7, RAMP.grass, 0.6);
    A.treeline(fb, 114, 12, 8, RAMP.leafDark, 0.3);
    A.grass(fb, 112, 8);
    A.dirt(fb, [[0, 148], [120, 138], [136, 112], [170, 112], [182, 140], [320, 144], [320, 170], [190, 166], [202, 200], [118, 200], [126, 168], [0, 178]], 9);
    A.tree(fb, 26, 122, 26, 3); A.tree(fb, 290, 118, 22, 4); A.tree(fb, 62, 114, 12, 8, 'pine'); A.tree(fb, 248, 113, 10, 9, 'pine');
    A.bush(fb, 300, 196, 24, 3); A.bush(fb, 18, 198, 22, 6);
    A.rock(fb, 86, 188, 8, 4, 2);
    A.flowers(fb, 210, 176, 90, 20, [hex('#f4e27a'), hex('#ffffff'), hex('#b080e0')], 7, 30);
  },
  props: [{ y: 140, draw(fb) { A.signpost(fb, 155, 141); } }],
};

// ---- North Woods -----------------------------------------------------------------------------

const northwood: Scene = {
  bg(fb) {
    forest(fb, 11, false, 120);
    A.grass(fb, 120, 13);
    fb.fill(0, 120, 320, 8, (x, y) => mix(fb.get(x, y), 0x000000, 0.35 - (y - 120) * 0.04));
    A.dirt(fb, [[116, 200], [138, 150], [0, 140], [0, 160], [150, 166], [320, 150], [320, 136], [180, 140], [184, 200]], 2);
    A.tree(fb, 262, 184, 26, 5); A.bush(fb, 22, 192, 26, 5); A.bush(fb, 300, 130, 20, 4);
    A.rock(fb, 222, 190, 9, 4, 5);
    A.flowers(fb, 0, 170, 110, 28, [hex('#ffffff'), hex('#f4e27a')], 9, 22);
  },
  anim(fb, t) {
    const r = rng(Math.floor(t * 0.5));
    for (let i = 0; i < 3; i++) { const k = (t * 0.15 + i / 3) % 1; fb.pset(40 + i * 110 + Math.sin(k * 12 + i) * 8, k * 120, RAMP.leaf[6]); }
    void r;
  },
  glow(fb, t, dark) { if (dark) fireflies(fb, t, 10, [0, 110, 320, 60], 1); },
  props: [{ y: 142, draw(fb) { A.tree(fb, 79, 142, 36, 21); } }],
};

// ---- Deepwood ------------------------------------------------------------------------------------

const deepwood: Scene = {
  bg(fb) {
    forest(fb, 23, true, 122);
    A.grass(fb, 122, 17, RAMP.leafDark);
    A.dirt(fb, [[0, 150], [140, 145], [150, 122], [178, 122], [185, 150], [320, 148], [320, 170], [180, 172], [170, 200], [140, 200], [140, 172], [0, 174]], 8, RAMP.mud);
    A.tree(fb, 30, 196, 30, 3, 'dead'); A.tree(fb, 294, 140, 24, 7, 'dead');
    for (let i = 0; i < 12; i++) { const x = 20 + i * 27, y = 130 + (i * 37) % 60; fb.sphere(x, y, 3 + (i % 3), 1.5, RAMP.clothRed, { amb: 0.4 }); fb.pset(x - 1, y - 1, 0xffffff); fb.limb(x, y, x, y + 3, 0.6, 0.6, RAMP.clothWhite); }
    fb.fill(0, 0, 320, 200, (x, y) => mix(fb.get(x, y), 0x0a1410, 0.15));
  },
  anim(fb, t) {
    // drifting ground mist
    fb.fill(0, 128, 320, 50, (x, y) => {
      const n = noise(x * 0.03 + t * 0.15, y * 0.12, 5);
      return n > 0.6 ? mix(fb.get(x, y), 0x9aa8b0, (n - 0.6) * 0.8) : T;
    });
    for (let i = 0; i < 5; i++) { const on = Math.sin(t * 0.8 + i * 2) > -0.3; if (on) { fb.pset(40 + i * 55, 135, hex('#f2d44a')); fb.pset(43 + i * 55, 135, hex('#f2d44a')); } }
  },
  glow(fb, t, dark) { if (dark) fireflies(fb, t, 6, [0, 120, 320, 50], 2); },
  props: [{
    y: 162, draw(fb) {
      fb.shadow(226, 163, 30, 3, 0.5);
      fb.limb(200, 157, 248, 156, 5, 5, RAMP.bark, { tex: (x, y) => (noise(x * 0.3, y * 0.9, 4) - 0.5) * 0.5 });
      fb.sphere(249, 156, 3.5, 5, RAMP.woodPale, { amb: 0.5 });
      fb.sphere(249, 156, 2, 3, RAMP.wood);
      fb.fill(200, 150, 48, 5, (x, y) => (fb.get(x, y) !== T && noise(x * 0.3, 0, 7) > 0.5 ? rampAt(RAMP.grass, 0.5, x, y) : T));
    },
  }],
};

// ---- Faerie Glen ------------------------------------------------------------------------------------

const RING = { x: 160, y: 158, rx: 62, ry: 20 };

const faerie: Scene = {
  bg(fb) {
    forest(fb, 51, false, 118);
    fb.fill(70, 0, 180, 60, (x, y) => {
      const d = ((x - 160) / 88) ** 2 + ((y + 8) / 58) ** 2 + (noise(x * 0.12, y * 0.12, 3) - 0.5) * 0.35;
      return d > 1 ? T : rampAt(RAMP.skyDay, 0.55 + y / 110, x, y);
    });
    A.tree(fb, 70, 118, 20, 44); A.tree(fb, 250, 118, 22, 45);
    A.grass(fb, 118, 19);
    fb.fill(0, 118, 320, 6, (x, y) => mix(fb.get(x, y), 0x000000, 0.3 - (y - 118) * 0.05));
    fb.fill(RING.x - RING.rx - 10, RING.y - RING.ry - 6, RING.rx * 2 + 20, RING.ry * 2 + 12, (x, y) => {
      const d = ((x - RING.x) / (RING.rx + 8)) ** 2 + ((y - RING.y) / (RING.ry + 5)) ** 2;
      return d > 1 ? T : rampAt(RAMP.grass, 0.85 - d * 0.2 + (noise(x * 0.3, y * 0.3, 2) - 0.5) * 0.3, x, y);
    });
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2, x = RING.x + Math.cos(a) * RING.rx, y = RING.y + Math.sin(a) * RING.ry;
      fb.limb(x, y, x, y - 3, 0.9, 0.8, RAMP.clothWhite);
      fb.sphere(x, y - 4, 3, 2, RAMP.clothRed, { clip: (_px, py) => py < y - 3 });
      fb.pset(x - 1, y - 5, 0xffffff); fb.pset(x + 1, y - 4, 0xffffff);
    }
    A.tree(fb, 18, 178, 30, 12); A.tree(fb, 302, 180, 30, 13);
    A.flowers(fb, 0, 124, 320, 76, [hex('#e0a0f0'), hex('#ffffff'), hex('#a0e0f0')], 5, 50);
  },
  anim(fb, t) {
    if (G.isNight) return;
    for (let i = 0; i < 4; i++) { const k = (t * 0.1 + i / 4) % 1; const x = 40 + i * 80 + Math.sin(t + i) * 10; fb.pset(x, 60 + k * 60, 0xfff3c0); }
  },
  glow(fb, t, dark) {
    if (!G.isNight) return;
    fb.glow(RING.x, RING.y - 12, 90, 0x80b0ff, dark ? 0.3 : 0.15);
    for (let i = 0; i < 12; i++) {
      const a = t * (0.6 + (i % 3) * 0.2) + (i / 12) * Math.PI * 2;
      const x = RING.x + Math.cos(a) * (RING.rx - 16 + (i % 2) * 10), y = RING.y - 16 + Math.sin(a) * (RING.ry - 4) + Math.sin(t * 5 + i) * 4;
      const c = [0xb0f0ff, 0xf0b0ff, 0xfff0a0][i % 3];
      fb.glow(x, y, 9, c, 0.7);
      fb.pset(x, y, 0xffffff);
      const flap = Math.floor(t * 12 + i) % 2;
      fb.pset(x - 2, y - 1 - flap, c); fb.pset(x + 2, y - 1 - flap, c);
      for (let k = 1; k < 4; k++) fb.pset(x - Math.cos(a) * k * 3, y - Math.sin(a) * k * 1.5, mix(c, 0x000000, k * 0.2));
    }
  },
};

// ---- Meadow ------------------------------------------------------------------------------------------

const meadow: Scene = {
  bg(fb) {
    A.sky(fb, 100, 61, 4);
    A.mountains(fb, 92, 58, 14, 0);
    A.mountains(fb, 106, 30, 24, 1);
    A.hills(fb, 116, 16, 3, RAMP.grass, 0.62);
    A.grass(fb, 116, 23);
    A.flowers(fb, 0, 120, 320, 80, [hex('#fff2a0'), hex('#ffffff'), hex('#c0a0f0')], 17, 70);
    A.dirt(fb, [[150, 116], [168, 116], [175, 150], [320, 160], [320, 172], [170, 166], [100, 150], [0, 152], [0, 142], [100, 140]], 11);
    A.tree(fb, 292, 124, 20, 6); A.tree(fb, 20, 118, 12, 8, 'birch');
    // flame-lily patch
    const r = rng(29);
    for (let i = 0; i < 46; i++) {
      const x = 206 + r() * 104, y = 158 + r() * 38;
      fb.limb(x, y, x + (r() - 0.5) * 2, y - 5, 0.4, 0.4, RAMP.grass);
      fb.cylPoly([[x - 2.2, y - 5], [x + 2.2, y - 5], [x + 0.2, y - 10]], x, 2.2, RAMP.fire, { amb: 0.5 });
      fb.pset(x, y - 7, RAMP.fire[7]);
    }
  },
  anim(fb, t) {
    for (let i = 0; i < 3; i++) {
      const x = 60 + i * 90 + Math.sin(t * 1.3 + i) * 20, y = 150 + Math.sin(t * 2.1 + i * 3) * 12, flap = Math.floor(t * 10 + i) % 2;
      const c = [0xf4e060, 0xffffff, 0xe0a0f0][i];
      fb.pset(x - 1, y - flap, c); fb.pset(x + 1, y - flap, c); fb.pset(x, y, 0x302010);
    }
  },
  glow(fb, t, dark) { if (dark) for (let i = 0; i < 8; i++) fb.glow(215 + i * 12, 170 + (i % 3) * 8, 9, 0xff7020, 0.25 + Math.sin(t * 2 + i) * 0.05); },
  props: [{ y: 168, draw(fb) { A.rock(fb, 80, 158, 24, 12, 7); A.rock(fb, 106, 168, 7, 4, 8); A.rock(fb, 55, 168, 6, 3, 9); } }],
};

// ---- Healer's cottage --------------------------------------------------------------------------------

const nestDown = () => !!G.flag('nestDown');

const healer: Scene = {
  bg(fb) {
    A.sky(fb, 90, 71, 3);
    A.mountains(fb, 86, 44, 31, 0);
    A.hills(fb, 110, 22, 13, RAMP.grass, 0.6);
    A.treeline(fb, 124, 14, 12, RAMP.leafDark, 0.35);
    A.grass(fb, 124, 29);
    // cottage: whitewashed walls, deep thatch, herbs under the eaves
    A.plasterWall(fb, 20, 84, 110, 44, RAMP.plaster, 4);
    fb.fill(20, 84, 110, 44, (x, y) => mix(fb.get(x, y), 0xffffff, 0.12));
    for (const bx of [20, 127]) fb.limb(bx + 1.5, 84, bx + 1.5, 128, 1.5, 1.5, RAMP.timber);
    A.stoneWall(fb, 20, 120, 110, 8, RAMP.stone, 5, 4);
    fb.limb(102, 32, 102, 60, 4, 4, RAMP.brick); fb.fill(96, 30, 12, 3, (x, y) => rampAt(RAMP.stone, 0.6, x, y));
    A.roof(fb, 20, 130, 86, 34, 'thatch');
    A.door(fb, 60, 128, 18, 30, RAMP.clothGreen);
    A.windowPane(fb, 32, 94, 14, 12, RAMP.timber, true);
    A.windowPane(fb, 98, 94, 14, 12, RAMP.timber, true);
    for (let i = 0; i < 6; i++) { const x = 84 + i * 2.5; fb.limb(x, 88, x, 95, 0.3, 0.3, RAMP.clothBrown); fb.sphere(x, 97, 1.4, 2.4, [RAMP.clothGreen, RAMP.clothPurple, RAMP.clothYellow][i % 3]); }
    fb.fill(66, 76, 8, 8, (x, y) => rampAt(RAMP.woodPale, 0.5, x, y)); fb.sphere(70, 80, 2.3, 2.8, RAMP.clothGreen, { amb: 0.6 });
    // herb garden
    fb.fill(150, 128, 48, 20, (x, y) => rampAt(RAMP.mud, 0.45 + (noise(x * 0.3, y * 0.3, 4) - 0.5) * 0.4, x, y));
    const r = rng(41);
    for (let i = 0; i < 26; i++) { const x = 153 + r() * 42, y = 131 + r() * 15; A.bush(fb, x, y, 5, 50 + i, [RAMP.leaf, RAMP.clothGreen, RAMP.grass][i % 3]); if (i % 3 === 0) fb.pset(x, y - 3, [0xe070d0, 0xf0e070, 0xffffff][i % 3]); }
    for (let x = 150; x <= 198; x += 6) fb.limb(x, 148, x, 131, 0.8, 0.7, RAMP.woodPale);
    for (const y of [134, 141]) fb.limb(150, y, 198, y, 0.6, 0.6, RAMP.woodPale);
    A.dirt(fb, [[60, 128], [80, 128], [118, 200], [72, 200]], 3);
    A.dirt(fb, [[96, 152], [320, 156], [320, 168], [96, 170]], 4);
    A.rock(fb, 30, 182, 8, 4, 3);
    A.flowers(fb, 0, 136, 60, 50, [hex('#ffffff'), hex('#f4e27a'), hex('#e87a9a')], 6, 24);
  },
  lights: [{ x: 32, y: 94, w: 14, h: 12 }, { x: 98, y: 94, w: 14, h: 12 }],
  anim(fb, t) {
    for (let i = 0; i < 5; i++) {
      const k = (t * 0.2 + i / 5) % 1, px = 102 + Math.sin(k * 6) * 3 + k * 8, py = 28 - k * 30, rr = 1.5 + k * 4;
      fb.fill(px - rr, py - rr, rr * 2, rr * 2, (x, y) => (((x - px) ** 2 + (y - py) ** 2) / (rr * rr) < 1 && noise(x * 0.5, y * 0.5 + t, 2) > 0.4 ? mix(fb.get(x, y), 0xd8d8dc, 0.35 * (1 - k)) : T));
    }
  },
  props: [{
    y: 154,
    key: () => `${nestDown()}|${!!G.flag('gotRing')}`,
    draw(fb) {
      A.tree(fb, 262, 154, 42, 88);
      if (!nestDown()) {
        fb.limb(262, 92, 292, 80, 1.6, 0.8, RAMP.bark);
        fb.sphere(282, 78, 8, 4, RAMP.woodPale, { tex: (x, y) => (noise(x * 1.2, y * 1.2, 3) - 0.5) * 0.8 });
        fb.sphere(282, 75.5, 5.8, 1.6, RAMP.wood);
        fb.pset(284, 74, 0xf0f4ff);
      } else if (!G.flag('gotRing')) {
        fb.sphere(236, 168, 7, 3, RAMP.woodPale, { tex: (x, y) => (noise(x * 1.2, y * 1.2, 3) - 0.5) * 0.8 });
        fb.pset(237, 166, 0xf0f4ff);
      }
    },
  }],
};

// ---- Hilde's hut interior ------------------------------------------------------------------------------

const healerin: Scene = {
  bg(fb) {
    A.room(fb, { wall: 'plaster', floor: 'wood', wallH: 112, seed: 5 });
    A.beams(fb, 5);
    A.shelves(fb, 14, 24, 120, 4, 17);
    for (let i = 0; i < 9; i++) { const x = 160 + i * 16; fb.limb(x, 10, x, 20, 0.4, 0.4, RAMP.clothBrown); fb.sphere(x, 26, 4, 7, [RAMP.leaf, RAMP.grass, RAMP.clothYellow, RAMP.clothPurple, RAMP.leaf][i % 5], { tex: (px, py) => (noise(px, py, i) - 0.5) * 0.6 }); }
    A.windowPane(fb, 270, 40, 34, 28, RAMP.timber, true);
    A.rug(fb, 140, 172, 60, 14, RAMP.clothTeal, RAMP.clothYellow);
    A.vignette(fb, 0.55);
  },
  anim(fb, t) { A.fire(fb, 220, 141, t, 0.6); A.cauldron(fb, 220, 140, t); },
  glow(fb, t) { fb.glow(220, 128, 70, 0xff9040, 0.4 + Math.sin(t * 8) * 0.04); fb.glow(220, 118, 30, 0x80ff90, 0.18); fb.glow(287, 54, 40, 0xfff0c0, 0.2); },
};

// ---- Troll bridge ----------------------------------------------------------------------------------------

const trollbridge: Scene = {
  bg(fb) {
    A.sky(fb, 90, 81, 3);
    A.mountains(fb, 88, 56, 21, 0);
    A.mountains(fb, 104, 30, 22, 1);
    A.grass(fb, 112, 31);
    // the ravine: rock walls falling to a river
    fb.poly([[168, 112], [320, 112], [320, 200], [180, 200]], (x, y) => rampAt(RAMP.rock, 0.25 + (fbm(x * 0.05, y * 0.12, 3, 4) - 0.5) * 0.7 - (y - 112) / 200, x, y));
    fb.poly([[168, 112], [178, 112], [192, 200], [180, 200]], (x, y) => rampAt(RAMP.rock, 0.55 + (noise(x * 0.3, y * 0.2, 4) - 0.5) * 0.4, x, y));
    A.water(fb, 196, 172, 124, 28, 7);
    fb.fill(186, 118, 134, 60, (x, y) => mix(fb.get(x, y), 0x0a1020, 0.25 + (y - 118) / 200));
    // bridge
    fb.fill(170, 140, 150, 20, (x, y) => rampAt(RAMP.woodPale, 0.5 + ((x - 170) % 7 === 0 ? -0.45 : (x - 170) % 7 === 1 ? 0.2 : 0) + (noise(x * 0.3, y * 0.4, 6) - 0.5) * 0.3 - (y - 140) / 40, x, y));
    fb.fill(170, 160, 150, 3, (x, y) => mix(fb.get(x, y), 0x000000, 0.4));
    for (let x = 176; x < 320; x += 30) { fb.limb(x, 142, x, 124, 1.4, 1.3, RAMP.wood); fb.limb(x, 160, x + 12, 180, 1, 0.9, RAMP.wood); }
    fb.limb(170, 128, 320, 128, 0.7, 0.7, RAMP.clothBrown);
    fb.limb(170, 134, 320, 134, 0.6, 0.6, RAMP.clothBrown);
    A.dirt(fb, [[0, 150], [60, 140], [170, 140], [170, 160], [60, 162], [0, 172]], 5);
    A.dirt(fb, [[118, 112], [140, 112], [120, 150], [96, 150]], 6);
    A.tree(fb, 30, 126, 22, 31); A.bush(fb, 150, 124, 18, 5);
    A.rock(fb, 90, 186, 10, 5, 2); A.rock(fb, 140, 178, 6, 3, 3);
  },
  anim(fb, t) { A.waterAnim(fb, 196, 172, 124, 28, t, 7); },
};

// ---- Wizard's tower ------------------------------------------------------------------------------------

const wizard: Scene = {
  bg(fb) {
    A.sky(fb, 110, 91, 2);
    A.mountains(fb, 104, 64, 17, 0);
    A.hills(fb, 128, 20, 5, RAMP.grass, 0.55);
    A.grass(fb, 128, 33);
    fb.cylPoly([[118, 12], [202, 12], [202, 134], [118, 134]], 160, 42, RAMP.stoneWarm, { tex: (x, y) => ((y % 7 === 0) || ((x + Math.floor(y / 7) * 5) % 11 === 0) ? -0.35 : 0) + (noise(x * 0.4, y * 0.4, 3) - 0.5) * 0.2 });
    fb.cylPoly([[106, 14], [214, 14], [160, -44]], 160, 54, RAMP.clothBlue, { tex: (x, y) => ((y + 44) % 6 === 0 ? -0.3 : 0) });
    for (const [x, y] of [[144, 2], [168, -8], [178, 6], [152, -18]]) { fb.pset(x, y, RAMP.gold[6]); fb.pset(x + 1, y, RAMP.gold[4]); }
    A.archDoor(fb, 148, 134, 24, 36, 0x2a1440);
    fb.fill(150, 102, 20, 32, (x, y) => rampAt(RAMP.clothPurple, 0.4 + ((x - 150) % 5 === 0 ? -0.3 : 0), x, y));
    fb.sphere(166, 118, 1.3, 1.3, RAMP.gold);
    for (const [x, y] of [[160, 58], [140, 88], [180, 88]]) { fb.fill(x - 4, y - 7, 8, 14, () => 0x14102a); fb.sphere(x, y - 4, 4, 3, RAMP.magic, { amb: 0.7, clip: (_px, py) => py < y - 3 }); }
    A.dirt(fb, [[148, 134], [172, 134], [180, 150], [0, 158], [0, 146], [140, 146]], 7);
    A.flowers(fb, 200, 150, 110, 40, [hex('#7aa0ff'), hex('#e0a0ff'), hex('#a0f0ff')], 81, 50);
    A.bush(fb, 106, 136, 16, 3); A.bush(fb, 216, 138, 18, 4);
  },
  anim(fb, t) {
    for (let i = 0; i < 3; i++) {
      const y = 70 + Math.sin(t * 1.5 + i * 2) * 5, x = [60, 250, 290][i];
      fb.shadow(x, 150 + i * 8, 8, 2, 0.25);
      A.rock(fb, x, y + i * 12, 6 + i, 3.5 + i * 0.5, 30 + i);
    }
  },
  glow(fb, t, dark) { for (const [x, y] of [[160, 54], [140, 84], [180, 84]]) fb.glow(x, y, dark ? 26 : 12, 0x8a90ff, 0.35 + Math.sin(t * 2 + x) * 0.08); },
};

const wizardin: Scene = {
  bg(fb) {
    A.room(fb, { wall: 'stone', floor: 'stone', wallH: 112, wallRamp: RAMP.stone, floorRamp: RAMP.clothPurple, seed: 7 });
    A.books(fb, 8, 10, 74, 6, 5);
    A.books(fb, 246, 10, 68, 6, 9);
    fb.fill(118, 18, 64, 54, (x, y) => rampAt(RAMP.woodPale, 0.5 + (x === 118 || y === 18 ? 0.25 : 0), x, y));
    fb.fill(122, 22, 56, 46, (x, y) => mix(0x0a0d24, 0x2a2060, (y - 22) / 60 + noise(x * 0.1, y * 0.1, 3) * 0.2));
    const r = rng(3);
    for (let i = 0; i < 28; i++) fb.pset(123 + r() * 54, 23 + r() * 44, r() < 0.3 ? 0xffe890 : 0xffffff);
    fb.circle(162, 38, 6, 0xf4f0dc); fb.circle(165, 36, 5, 0x151a3a);
    fb.limb(92, 108, 112, 62, 1.4, 1.2, RAMP.wood); fb.limb(108, 64, 120, 58, 2.5, 3.2, RAMP.gold, { rim: 0.3 });
    fb.limb(92, 108, 82, 112, 0.9, 0.9, RAMP.wood); fb.limb(92, 108, 102, 112, 0.9, 0.9, RAMP.wood);
    A.rug(fb, 160, 172, 70, 18, RAMP.clothBlue, RAMP.gold);
    fb.fill(90, 150, 140, 44, (x, y) => {
      const d = ((x - 160) / 60) ** 2 + ((y - 172) / 16) ** 2;
      return Math.abs(d - 0.6) < 0.05 ? RAMP.gold[4] : T;
    });
    A.vignette(fb, 0.6);
  },
  anim(fb, t) {
    const y = 90 + Math.sin(t * 2) * 4;
    fb.shadow(200, 150, 10, 2, 0.3);
    fb.sphere(200, y, 7, 7, RAMP.magic, { amb: 0.5, rim: 0.4 });
    for (let i = 0; i < 4; i++) { const a = t * 2 + i * 1.57; fb.pset(200 + Math.cos(a) * 11, y + Math.sin(a) * 4, 0xe0c0ff); }
  },
  glow(fb, t) { fb.glow(200, 90 + Math.sin(t * 2) * 4, 50, 0x7080ff, 0.45); },
  props: [{
    y: 144, draw(fb) {
      A.table(fb, 214, 128, 60);
      fb.limb(224, 124, 224, 116, 2.4, 1.2, RAMP.glass, { rim: 0.4 }); fb.pset(224, 120, 0x60ff90);
      fb.limb(238, 124, 238, 113, 1.4, 1.4, RAMP.glass, { rim: 0.4 });
      fb.fill(248, 119, 18, 6, (x, y) => rampAt(RAMP.clothWhite, 0.7 - (y - 119) * 0.05, x, y));
      A.candle(fb, 270, 125, 0);
    },
  }],
};

// ---- Kobold caves ---------------------------------------------------------------------------------------

const koboldcave: Scene = {
  bg(fb) {
    A.sky(fb, 60, 101, 1);
    A.mountains(fb, 40, 30, 41, 0);
    fb.fill(0, 18, 320, 110, (x, y) => {
      const top = 22 + Math.sin(x * 0.05) * 6 + (fbm(x * 0.04, 0, 3) - 0.5) * 18;
      if (y < top) return T;
      return rampAt(RAMP.rock, 0.45 + (fbm(x * 0.04, y * 0.07, 9, 5) - 0.5) * 0.9 + ((x + y * 0.5) % 23 < 1 ? -0.3 : 0) - (y - top) / 300, x, y);
    });
    const r = rng(9);
    for (let i = 0; i < 9; i++) {
      const x = r() * 320, y = 40 + r() * 70, w = 16 + r() * 30;
      fb.limb(x - w / 2, y, x + w / 2, y + (r() - 0.5) * 4, 1.6, 1.2, RAMP.rock, { amb: 0.6 });
      fb.fill(x - w / 2, y + 2, w, 4, (px, py) => mix(fb.get(px, py), 0x000000, 0.35 - (py - y - 2) * 0.08));
    }
    for (let i = 0; i < 7; i++) { let x = r() * 320, y = 30 + r() * 40; for (let k = 0; k < 8; k++) { const nx = x + (r() - 0.5) * 8, ny = y + 4 + r() * 5; fb.line(x, y, nx, ny, RAMP.rock[0]); x = nx; y = ny; } }
    fb.fill(144, 58, 82, 70, (x, y) => {
      const d = ((x - 185) / 38) ** 2 + ((y - 128) / 64) ** 2;
      return d > 1 ? T : mix(0x020203, 0x1a1512, Math.max(0, d - 0.55) * 1.8);
    });
    A.grass(fb, 124, 37, RAMP.grassDry);
    fb.fill(0, 124, 320, 6, (x, y) => mix(fb.get(x, y), 0x000000, 0.35 - (y - 124) * 0.05));
    A.dirt(fb, [[160, 124], [210, 124], [222, 150], [320, 160], [320, 172], [200, 170], [0, 160], [0, 148], [150, 145]], 12, RAMP.mud);
    for (let i = 0; i < 6; i++) {
      const x = 110 + i * 30, y = 150 + (i % 2) * 22;
      fb.limb(x, y, x + 7, y + 2, 1, 0.9, RAMP.clothWhite); fb.sphere(x, y, 1.6, 1.6, RAMP.clothWhite); fb.sphere(x + 7, y + 2, 1.5, 1.5, RAMP.clothWhite);
    }
    fb.sphere(88, 176, 4.5, 4, RAMP.clothWhite); fb.pset(87, 176, 0x101010); fb.pset(90, 176, 0x101010);
    A.tree(fb, 20, 132, 22, 44, 'dead');
  },
  props: [{ y: 184, draw(fb) { A.rock(fb, 265, 176, 20, 10, 71); } }],
};

const koboldDead = () => !!G.flag('koboldDead');
const koboldAsleep = () => !koboldDead() && G.isDay && !G.flag('koboldAwake');

const kobold: Scene = {
  bg(fb) {
    A.caveWalls(fb, 41);
    const r = rng(4);
    for (let i = 0; i < 60; i++) { const x = 22 + r() * 50, y = 158 + r() * 18; fb.sphere(x, y, 1.6, 1.2, RAMP.gold, { amb: 0.6 }); }
    fb.sphere(46, 168, 26, 8, RAMP.gold, { amb: 0.35, clip: (_x, y) => y < 170, tex: (x, y) => (noise(x, y, 3) - 0.5) * 0.8 });
    fb.sphere(150, 162, 22, 6, RAMP.clothRed, { tex: (x, y) => (noise(x * 0.3, y * 0.5, 2) - 0.5) * 0.5 });
    fb.sphere(166, 160, 12, 4, RAMP.clothBlue);
    A.vignette(fb, 1.1);
  },
  anim(fb, t) {
    if (!koboldAsleep()) return;
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.5 + i / 3) % 1, x = 170 + k * 12, y = 138 - k * 26;
      const c = mix(0xffffff, fb.get(x, y), k);
      fb.hline(x, x + 3, y, c); fb.pset(x + 2, y + 1, c); fb.pset(x + 1, y + 2, c); fb.hline(x, x + 3, y + 3, c);
    }
  },
  glow(fb, t) {
    fb.glow(46, 160, 50, 0xffc040, 0.3);
    if (!koboldDead()) fb.glow(160, 130, 40, 0xff6040, koboldAsleep() ? 0.1 : 0.3 + Math.sin(t * 6) * 0.1);
  },
  props: [{ y: 150, key: () => `${!!G.flag('chestOpen')}`, draw(fb) { A.chest(fb, 245, 150, !!G.flag('chestOpen')); } }],
};

// ---- Brigand stockade --------------------------------------------------------------------------------------

const gateOpen = () => !!G.flag('gateOpen');

const fortressgate: Scene = {
  bg(fb) {
    forest(fb, 111, false, 132);
    A.grass(fb, 132, 43, RAMP.grassDry);
    // watchtower
    for (const x of [30, 66]) fb.limb(x, 134, x + (x < 50 ? 4 : -4), 40, 1.8, 1.6, RAMP.wood);
    fb.limb(30, 90, 66, 60, 0.9, 0.9, RAMP.wood); fb.limb(66, 90, 30, 60, 0.9, 0.9, RAMP.wood);
    fb.fill(26, 26, 44, 16, (x, y) => rampAt(RAMP.wood, 0.45 + ((x - 26) % 5 === 0 ? -0.3 : 0), x, y));
    A.roof(fb, 26, 70, 26, 12, 'thatch');
    A.palisade(fb, 0, 134, 320, 74, 11);
    fb.fill(134, 58, 52, 76, (x, y) => mix(fb.get(x, y), 0x000000, 0.2));
    // painted crossed daggers over the gate
    fb.fill(142, 34, 36, 24, (x, y) => rampAt(RAMP.clothBlack, 0.4, x, y));
    fb.limb(148, 52, 172, 38, 1, 0.5, RAMP.clothYellow); fb.limb(172, 52, 148, 38, 1, 0.5, RAMP.clothYellow);
    fb.sphere(160, 45, 3, 3, RAMP.clothRed);
    A.dirt(fb, [[136, 134], [184, 134], [214, 200], [106, 200]], 13, RAMP.mud);
    A.bush(fb, 24, 190, 26, 4); A.bush(fb, 300, 186, 22, 6);
    fb.limb(90, 170, 110, 168, 1.2, 1, RAMP.wood); fb.sphere(88, 170, 3, 2, RAMP.clothWhite);
  },
  props: [{
    y: 134, key: () => `${gateOpen()}`,
    draw(fb) {
      if (gateOpen()) {
        fb.fill(136, 60, 48, 74, (x, y) => mix(0x0e0a08, 0x3a2a1c, Math.max(0, (y - 90) / 60)));
        for (const [x0, dir] of [[134, -1], [186, 1]] as const) fb.fill(dir < 0 ? x0 - 10 : x0, 60, 10, 74, (x, y) => rampAt(RAMP.wood, 0.3 + ((x - x0) % 5 === 0 ? -0.3 : 0), x, y));
      } else {
        fb.fill(136, 62, 48, 72, (x, y) => rampAt(RAMP.wood, 0.45 + ((x - 136) % 6 === 0 ? -0.4 : 0) + (noise(x * 0.3, y * 0.1, 4) - 0.5) * 0.3, x, y));
        for (const y of [80, 116]) fb.limb(136, y, 184, y, 1.4, 1.4, RAMP.iron);
        fb.limb(152, 96, 168, 96, 0.8, 0.8, RAMP.iron);
        fb.fill(155, 96, 10, 11, (x, y) => rampAt(RAMP.iron, 0.6 + (x === 155 ? 0.2 : 0) - (y - 96) * 0.03, x, y));
        fb.pset(160, 102, 0x000000);
      }
    },
  }],
};

const courtyard: Scene = {
  bg(fb) {
    A.sky(fb, 60, 121, 1);
    fb.fill(0, 40, 320, 40, (x, y) => rampAt(RAMP.leafDark, 0.25 + (noise(x * 0.1, y * 0.2, 2) - 0.5) * 0.5, x, y));
    A.palisade(fb, 0, 78, 320, 58, 12);
    fb.fill(0, 78, 320, 54, (x, y) => rampAt(RAMP.mud, 0.35 + (y - 78) / 200 + (fbm(x * 0.05, y * 0.2, 5) - 0.5) * 0.5, x, y));
    fb.fill(0, 78, 320, 6, (x, y) => mix(fb.get(x, y), 0x000000, 0.4 - (y - 78) * 0.06));
    // log hall
    fb.fill(88, 42, 144, 90, (x, y) => rampAt(RAMP.wood, 0.45 + ((y - 42) % 7 === 0 ? -0.45 : (y - 42) % 7 === 1 ? 0.2 : 0) + (noise(x * 0.1, y * 0.5, 7) - 0.5) * 0.3, x, y));
    A.roof(fb, 88, 232, 43, 32, 'shingle');
    fb.fill(144, 92, 32, 40, (x, y) => mix(0x0c0806, 0x2a1a10, (y - 92) / 60));
    fb.limb(144, 92, 176, 92, 1.8, 1.8, RAMP.wood);
    for (const x of [100, 206]) { fb.fill(x, 64, 14, 12, () => 0x100a08); fb.limb(x, 70, x + 14, 70, 0.5, 0.5, RAMP.wood); }
    fb.limb(118, 60, 118, 84, 1.2, 1, RAMP.wood); fb.fill(119, 60, 12, 18, (x, y) => rampAt(RAMP.clothRed, 0.45 + (noise(x * 0.4, y * 0.1, 3) - 0.5) * 0.4, x, y));
    for (const [x, w] of [[18, 42], [262, 42]]) {
      fb.cylPoly([[x, 134], [x + w, 134], [x + w / 2, 98]], x + w / 2, w / 2, RAMP.clothWhite, { tex: (px, py) => (noise(px * 0.3, py * 0.1, x) - 0.5) * 0.4 - 0.2 });
      fb.poly([[x + w / 2 - 5, 134], [x + w / 2 + 5, 134], [x + w / 2, 118]], 0x141010);
    }
    fb.fill(0, 130, 320, 70, (x, y) => rampAt(RAMP.mud, 0.45 + (fbm(x * 0.05, y * 0.12, 3, 4) - 0.5) * 0.7, x, y));
    fb.fill(0, 130, 320, 6, (x, y) => mix(fb.get(x, y), 0x000000, 0.35 - (y - 130) * 0.05));
    A.barrel(fb, 76, 150); A.barrel(fb, 250, 152);
    fb.sphere(160, 160, 14, 4, RAMP.stone);
  },
  anim(fb, t) { for (let i = 0; i < 5; i++) fb.limb(146 + i * 7, 158, 150 + i * 7, 154, 1.5, 1.5, RAMP.bark); A.fire(fb, 160, 156, t, 0.9); },
  glow(fb, t, dark) { fb.glow(160, 146, dark ? 90 : 50, 0xff8a30, (dark ? 0.55 : 0.3) + Math.sin(t * 9) * 0.04); },
};

const hall: Scene = {
  bg(fb) {
    A.room(fb, { wall: 'wood', floor: 'stone', wallH: 112, seed: 13 });
    A.beams(fb, 4);
    for (let x = 34; x < 320; x += 70) {
      fb.fill(x, 14, 24, 48, (px, py) => rampAt(RAMP.clothRed, 0.45 + (noise(px * 0.4, py * 0.05, x) - 0.5) * 0.4 + (px === x ? 0.2 : 0), px, py));
      fb.poly([[x, 62], [x + 24, 62], [x + 12, 72]], RAMP.clothRed[3]);
      fb.limb(x + 6, 26, x + 18, 46, 0.9, 0.4, RAMP.clothYellow); fb.limb(x + 18, 26, x + 6, 46, 0.9, 0.4, RAMP.clothYellow);
    }
    // throne of logs and furs
    fb.shadow(160, 116, 34, 5, 0.5);
    for (const px of [138, 182]) fb.limb(px, 116, px, 52, 3, 2.6, RAMP.wood);
    fb.fill(140, 56, 40, 40, (x, y) => rampAt(RAMP.wood, 0.35 + ((x - 140) % 7 === 0 ? -0.4 : 0) + (noise(x * 0.3, y * 0.1, 3) - 0.5) * 0.3, x, y));
    fb.fill(136, 94, 48, 8, (x, y) => rampAt(RAMP.wood, 0.55 - (y - 94) * 0.05, x, y));
    fb.fill(142, 60, 36, 36, (x, y) => rampAt(RAMP.fur, 0.45 + (noise(x * 0.6, y * 0.25, 3) - 0.5) * 0.7 - (y - 60) / 120, x, y));
    for (const px of [138, 182]) fb.sphere(px, 50, 3.5, 3.5, RAMP.clothWhite, { amb: 0.4 });
    A.rug(fb, 160, 162, 72, 22, RAMP.clothRed, RAMP.clothBlack);
    A.barrel(fb, 30, 150); A.barrel(fb, 290, 150);
    for (const x of [20, 300]) { fb.limb(x, 58, x, 44, 1.5, 1.3, RAMP.iron); }
    A.vignette(fb, 0.8);
  },
  anim(fb, t) { A.fire(fb, 20, 44, t, 0.35); A.fire(fb, 300, 44, t, 0.35); },
  glow(fb, t) { for (const x of [20, 300]) fb.glow(x, 38, 70 + Math.sin(t * 8 + x) * 3, 0xff8030, 0.5); },
};

export const WILD_SCENES: Record<string, Scene> = {
  crossroads, northwood, deepwood, faerie, meadow, healer, healerin, trollbridge, wizard, wizardin, koboldcave, kobold, fortressgate, courtyard, hall,
};
