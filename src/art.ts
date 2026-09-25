import { FB, fbm, noise, rng } from './gfx';
import { Col, RAMP, Ramp, T, darker, hex, mix, rampAt } from './palette';

/**
 * Painterly scene helpers. Everything is lit from the upper left and textured with noise,
 * so scenes read as hand-painted VGA backgrounds rather than flat shapes.
 */

export interface Window { x: number; y: number; w: number; h: number }
export interface Glow { x: number; y: number; r: number; c: Col; i: number }

// ---- sky, land & distance --------------------------------------------------------------

export function sky(fb: FB, h: number, seed = 1, clouds = 3) {
  const R = RAMP.skyDay;
  fb.fill(0, 0, 320, h + 70, (x, y) => rampAt(R, 0.05 + Math.min(1, y / (h + 20)) * 0.95 + (noise(x * 0.02, y * 0.05, seed) - 0.5) * 0.08, x, y));
  const r = rng(seed);
  for (let i = 0; i < clouds; i++) cloud(fb, 20 + r() * 280, 10 + r() * h * 0.4, 16 + r() * 22, seed + i);
}

export function cloud(fb: FB, x: number, y: number, s: number, seed = 1) {
  const r = rng(seed * 31 + 7);
  const puffs: number[][] = [];
  for (let i = 0; i < 7; i++) puffs.push([x + (r() - 0.5) * s * 1.8, y - r() * s * 0.35, s * (0.28 + r() * 0.24)]);
  puffs.sort((a, b) => a[1] - b[1]);
  const flat = y + s * 0.12;
  for (const [px, py, pr] of puffs) fb.sphere(px, py, pr, pr * 0.72, RAMP.cloud, { amb: 0.45, clip: (_x, yy) => yy < flat });
}

/** A range of mountains; `layer` 0 = far (hazy), 1 = mid. Lit on left-facing slopes. */
export function mountains(fb: FB, base: number, height: number, seed: number, layer = 0) {
  const R = layer === 0 ? RAMP.mountFar : RAMP.mountMid;
  const r = rng(seed);
  const peaks: number[][] = [];
  let x = -20;
  while (x < 340) { const w = 40 + r() * 60; peaks.push([x + w / 2, base - height * (0.4 + r() * 0.6)]); x += w; }
  const ridge = (xx: number) => {
    let best = base + 60;
    for (const [px, py] of peaks) {
      const d = Math.abs(xx - px), slope = (base - py) / 45;
      const yy = py + d * slope + (fbm(xx * 0.06, 0, seed) - 0.5) * 8;
      if (yy < best) best = yy;
    }
    return best;
  };
  const top = new Float32Array(320);
  for (let i = 0; i < 320; i++) top[i] = ridge(i);
  fb.fill(0, base - height - 5, 320, height + 70, (xx, yy) => {
    if (yy < top[xx]) return T;
    const slope = (top[Math.min(319, xx + 2)] - top[Math.max(0, xx - 2)]) * 0.25;
    const lit = 0.5 + slope * 0.35 - (yy - top[xx]) / (height * 3) + (fbm(xx * 0.08, yy * 0.08, seed + 3) - 0.5) * 0.35;
    const snowLine = top[xx] + height * 0.22 + (noise(xx * 0.2, 0, seed) - 0.5) * 6;
    if (layer === 0 && yy < snowLine && top[xx] < base - height * 0.55) return rampAt(RAMP.snow, 0.3 + lit * 0.8, xx, yy);
    return rampAt(R, lit, xx, yy);
  });
}

/** Rolling hills with a soft lit crest. */
export function hills(fb: FB, base: number, height: number, seed: number, R: Ramp = RAMP.grass, bright = 0.5) {
  const top = new Float32Array(320);
  for (let i = 0; i < 320; i++) top[i] = base - height * (0.35 + 0.65 * fbm(i * 0.012, 0, seed, 3));
  fb.fill(0, base - height - 2, 320, 200 - base + height + 2, (x, y) => {
    if (y < top[x]) return T;
    const d = (y - top[x]) / 30;
    return rampAt(R, bright + 0.25 - d * 0.35 + (fbm(x * 0.05, y * 0.09, seed + 5) - 0.5) * 0.4, x, y);
  });
}

/** A distant tree line: rounded crowns packed along a horizon. */
export function treeline(fb: FB, base: number, height: number, seed: number, R: Ramp = RAMP.leafDark, far = 0) {
  const r = rng(seed);
  for (let x = -10; x < 330; x += 5 + r() * 6) {
    const h = height * (0.55 + r() * 0.45), w = 5 + r() * 6;
    fb.sphere(x, base - h + w * 0.5, w, h * 0.6, R, { amb: 0.25 + far * 0.3, tex: (px, py) => (noise(px * 0.5, py * 0.5, seed) - 0.5) * 0.4 });
  }
  fb.fill(0, base - 3, 320, 5, (x, y) => rampAt(R, 0.15 + far * 0.2, x, y));
}

/** Textured grass from y to the bottom of the screen. Nearer ground is darker and richer. */
export function grass(fb: FB, y0: number, seed = 7, R: Ramp = RAMP.grass) {
  fb.fill(0, y0, 320, 200 - y0, (x, y) => {
    const depth = (y - y0) / (200 - y0);
    const n = fbm(x * 0.045, y * 0.11, seed, 4);
    const blades = noise(x * 0.9, y * 0.25, seed + 9);
    return rampAt(R, 0.72 - depth * 0.28 + (n - 0.5) * 0.55 + (blades - 0.5) * 0.18, x, y);
  });
  const r = rng(seed + 2);
  for (let i = 0; i < 90; i++) {
    const x = r() * 320, y = y0 + 6 + r() * (194 - y0), h = 2 + ((y - y0) / 40) * r() * 2.5;
    for (let k = -1; k <= 1; k++) fb.line(x + k * 1.2, y, x + k * 2, y - h, rampAt(R, 0.8, x | 0, y | 0));
    fb.pset(x, y, R[1]);
  }
}

export function flowers(fb: FB, x: number, y: number, w: number, h: number, colors: Col[], seed: number, n = 30) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const fx = x + r() * w, fy = y + r() * h, c = colors[Math.floor(r() * colors.length)];
    fb.pset(fx, fy + 1, RAMP.grass[2]);
    fb.pset(fx, fy, c); fb.pset(fx + 1, fy, mix(c, 0x000000, 0.25));
    if (r() < 0.4) fb.pset(fx, fy - 1, mix(c, 0xffffff, 0.35));
  }
}

/** A dirt path/area inside a polygon: packed earth, ruts, pebbles, grassy fringe. */
export function dirt(fb: FB, pts: number[][], seed = 3, R: Ramp = RAMP.dirt) {
  const mask = new FB(320, 200, 0);
  mask.poly(pts, 1);
  fb.fill(0, 0, 320, 200, (x, y) => {
    if (mask.px[y * 320 + x] !== 1) return T;
    const n = fbm(x * 0.07, y * 0.16, seed, 4), fine = noise(x * 0.8, y * 0.8, seed + 4);
    let edge = 0;
    for (const [dx, dy] of [[3, 0], [-3, 0], [0, 2], [0, -2]]) if (mask.get(x + dx, y + dy) !== 1) edge++;
    if (edge && noise(x * 0.6, y * 0.6, seed + 8) > 0.55) return rampAt(RAMP.grass, 0.45 + fine * 0.3, x, y);
    return rampAt(R, 0.55 + (n - 0.5) * 0.6 + (fine - 0.5) * 0.15 - edge * 0.06, x, y);
  });
  const r = rng(seed + 11);
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(r() * 320), y = Math.floor(r() * 200);
    if (mask.get(x, y) === 1 && mask.get(x + 2, y) === 1) { fb.pset(x, y, R[6] ?? R[R.length - 1]); fb.pset(x + 1, y + 1, R[1]); }
  }
}

// ---- trees, bushes, rocks --------------------------------------------------------------

export function tree(fb: FB, x: number, base: number, size: number, seed: number, kind: 'oak' | 'pine' | 'dead' | 'birch' = 'oak') {
  const r = rng(seed);
  fb.shadow(x + size * 0.25, base + 1, size * (kind === 'pine' ? 0.7 : 1.1), size * 0.16, 0.45);
  if (kind === 'pine') {
    const th = size * 0.45;
    fb.limb(x, base, x, base - th, size * 0.09 + 1, size * 0.07 + 1, RAMP.bark);
    const layers = 5;
    for (let i = 0; i < layers; i++) {
      const ly = base - th - i * size * 0.34, lw = size * (0.78 - i * 0.13);
      fb.poly([[x - lw, ly + 2], [x + lw, ly + 2], [x + lw * 0.2, ly - size * 0.55], [x - lw * 0.15, ly - size * 0.58]], (px, py) =>
        rampAt(RAMP.pine, 0.3 + (x - px) / (lw * 2) * -0.7 + 0.35 - (py - (ly - size * 0.55)) / (size * 0.9) * 0.2 + (noise(px * 0.5, py * 0.5, seed) - 0.5) * 0.45, px, py));
    }
    return;
  }
  const th = size * (kind === 'birch' ? 1.2 : 0.95), tw = Math.max(2.2, size * 0.13);
  const barkR = kind === 'birch' ? RAMP.clothWhite : RAMP.bark;
  const barkTex = (px: number, py: number) => (noise(px * 0.9, py * 0.12, seed) - 0.5) * 0.55 + (kind === 'birch' && noise(px * 0.3, py * 0.8, seed + 2) > 0.72 ? -0.8 : 0);
  // roots and trunk
  fb.limb(x - tw * 1.8, base + 0.5, x - tw * 0.3, base - tw * 1.5, tw * 0.55, tw * 0.3, barkR, { tex: barkTex });
  fb.limb(x + tw * 1.9, base + 0.5, x + tw * 0.3, base - tw * 1.4, tw * 0.55, tw * 0.3, barkR, { tex: barkTex });
  fb.limb(x, base, x + (r() - 0.5) * tw, base - th, tw, tw * 0.65, barkR, { tex: barkTex });
  const branches = kind === 'dead' ? 7 : 4;
  for (let i = 0; i < branches; i++) {
    const by = base - th * (0.55 + r() * 0.45), dir = i % 2 ? 1 : -1, len = size * (0.35 + r() * 0.35);
    fb.limb(x, by, x + dir * len, by - len * (0.5 + r() * 0.4), tw * 0.45, tw * 0.18, barkR, { tex: barkTex });
    if (kind === 'dead') fb.limb(x + dir * len * 0.7, by - len * 0.4, x + dir * len * 1.05, by - len * 0.95, tw * 0.22, tw * 0.1, barkR);
  }
  if (kind === 'dead') return;
  // canopy: clumps back to front, darker behind
  const cy = base - th - size * 0.28;
  const clumps: number[][] = [];
  for (let i = 0; i < 16; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r());
    clumps.push([x + Math.cos(a) * d * size * 0.78, cy + Math.sin(a) * d * size * 0.48 - size * 0.05, size * (0.24 + r() * 0.2)]);
  }
  clumps.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  const R = kind === 'birch' ? RAMP.grass : RAMP.leaf;
  for (const [bx, by, br] of clumps) fb.sphere(bx + 2, by + 2, br, br * 0.85, darker(R, 2), { amb: 0.1 });
  for (const [bx, by, br] of clumps) {
    const back = (by - cy) / (size * 0.5);
    fb.sphere(bx, by, br, br * 0.85, R, { amb: 0.18, bright: 0.95 + back * 0.08, tex: (px, py) => (noise(px * 0.55, py * 0.55, seed + 5) - 0.5) * 0.55 });
  }
}

export function bush(fb: FB, x: number, y: number, w: number, seed: number, R: Ramp = RAMP.leaf) {
  const r = rng(seed);
  fb.shadow(x + 2, y + 1, w * 0.7, w * 0.16, 0.4);
  const clumps: number[][] = [];
  for (let i = 0; i < 7; i++) clumps.push([x + (r() - 0.5) * w * 0.9, y - w * 0.18 - r() * w * 0.28, w * (0.2 + r() * 0.16)]);
  clumps.sort((a, b) => a[1] - b[1]);
  for (const [bx, by, br] of clumps) fb.sphere(bx, by, br, br * 0.85, R, { amb: 0.15, tex: (px, py) => (noise(px * 0.6, py * 0.6, seed) - 0.5) * 0.55 });
}

export function rock(fb: FB, x: number, y: number, w: number, h: number, seed = 1, R: Ramp = RAMP.rock) {
  fb.shadow(x + w * 0.2, y + h * 0.7, w * 1.1, h * 0.35, 0.5);
  fb.sphere(x, y, w, h, R, { amb: 0.2, tex: (px, py) => (fbm(px * 0.25, py * 0.25, seed, 3) - 0.5) * 0.5 + (noise(px * 1.2, py * 1.2, seed) > 0.85 ? -0.4 : 0), clip: (_px, py) => py < y + h * 0.75 });
  fb.fill(x - w, y + h * 0.4, w * 2, h * 0.5, (px, py) => (fb.get(px, py) !== T && py > y + h * 0.3 && noise(px * 0.4, 0, seed) > 0.6 ? rampAt(RAMP.grass, 0.4, px, py) : T));
}

export function water(fb: FB, x: number, y: number, w: number, h: number, seed = 5) {
  fb.fill(x, y, w, h, (px, py) => rampAt(RAMP.water, 0.25 + ((py - y) / h) * 0.2 + (fbm(px * 0.03, py * 0.2, seed) - 0.5) * 0.35, px, py));
}

export function waterAnim(fb: FB, x: number, y: number, w: number, h: number, t: number, seed = 5) {
  for (let py = y + 1; py < y + h; py += 2) {
    const ph = t * 1.4 + py * 0.7;
    for (let px = x; px < x + w; px++) {
      const v = Math.sin(px * 0.21 + ph) * Math.sin(px * 0.057 - ph * 0.6 + seed);
      if (v > 0.82) fb.pset(px, py, RAMP.water[7]);
      else if (v > 0.6) fb.pset(px, py, RAMP.water[6]);
    }
  }
}

export function sparkle(fb: FB, x: number, y: number, w: number, h: number, t: number, seed = 9) {
  const r = rng(seed + Math.floor(t * 3));
  for (let i = 0; i < 6; i++) fb.hline(x + r() * w, x + r() * w + 2, y + r() * h, r() < 0.5 ? RAMP.water[7] : 0xffffff);
}

// ---- masonry & buildings ----------------------------------------------------------------

/** Irregular dressed stones with bevelled edges and mortar. */
export function stoneWall(fb: FB, x: number, y: number, w: number, h: number, R: Ramp = RAMP.stone, seed = 3, course = 7) {
  const r = rng(seed + x * 7 + y * 13);
  const mortar = darker(R, 2)[0];
  fb.rect(x, y, w, h, mortar);
  for (let row = 0, yy = y; yy < y + h; row++, yy += course) {
    let xx = x - (row % 2 ? course : 0) - r() * 6;
    while (xx < x + w) {
      const sw = course * (1.3 + r() * 1.5), tone = (r() - 0.5) * 0.3;
      const x0 = Math.max(x, xx + 1), x1 = Math.min(x + w - 1, xx + sw - 1), y0 = yy + 1, y1 = Math.min(y + h - 1, yy + course - 1);
      fb.fill(x0, y0, x1 - x0 + 1, y1 - y0 + 1, (px, py) => {
        const edge = px === x0 || py === y0 ? 0.25 : px === x1 || py === y1 ? -0.3 : 0;
        return rampAt(R, 0.5 + tone + edge + (noise(px * 0.5, py * 0.5, seed) - 0.5) * 0.3, px, py);
      });
      xx += sw;
    }
  }
}

export function crenels(fb: FB, x: number, y: number, w: number, R: Ramp = RAMP.stone) {
  for (let xx = x; xx < x + w - 4; xx += 12) { stoneWall(fb, xx, y - 8, 8, 8, R, xx, 4); fb.hline(xx, xx + 7, y - 8, R[6]); }
}

export function plasterWall(fb: FB, x: number, y: number, w: number, h: number, R: Ramp = RAMP.plaster, seed = 1) {
  fb.fill(x, y, w, h, (px, py) => rampAt(R, 0.62 + (fbm(px * 0.06, py * 0.06, seed, 4) - 0.5) * 0.45 - Math.max(0, (py - (y + h - 8)) / 8) * 0.35, px, py));
}

/** Pitched roof seen from the front: rows of tiles, slate or thatch, with an eave shadow. */
export function roof(fb: FB, x0: number, x1: number, eaveY: number, height: number, kind: 'tile' | 'slate' | 'thatch' | 'shingle' = 'tile', R?: Ramp) {
  const ramp = R ?? (kind === 'thatch' ? RAMP.thatch : kind === 'slate' ? RAMP.roofSlate : kind === 'shingle' ? RAMP.roofBrown : RAMP.roofRed);
  const inset = height * 0.55;
  const pts = [[x0 - 5, eaveY], [x1 + 5, eaveY], [x1 + 5 - inset, eaveY - height], [x0 - 5 + inset, eaveY - height]];
  const rowH = kind === 'thatch' ? 3 : 4;
  fb.poly(pts, (px, py) => {
    const v = eaveY - py, row = Math.floor(v / rowH), within = (v % rowH) / rowH;
    let t = 0.45 + (1 - v / height) * 0.1;
    if (kind === 'thatch') t += (noise(px * 0.8, py * 0.25, 5) - 0.5) * 0.7 + within * 0.15;
    else {
      const tileW = kind === 'slate' ? 6 : 5, col = Math.floor((px + row * (tileW / 2)) / tileW);
      t += within * 0.35 - 0.12 + (((col * 7 + row * 3) % 5) / 5 - 0.4) * 0.22;
      if ((px + row * (tileW / 2)) % tileW < 1) t -= 0.35;
    }
    const sideL = px < x0 - 5 + inset * (v / height) + 3, sideR = px > x1 + 5 - inset * (v / height) - 3;
    if (sideL) t += 0.25; if (sideR) t -= 0.2;
    return rampAt(ramp, t, px, py);
  });
  fb.limb(x0 - 5, eaveY, x1 + 5, eaveY, 1.2, 1.2, darker(ramp, 1));
  fb.limb(x0 - 5 + inset, eaveY - height, x1 + 5 - inset, eaveY - height, 1.3, 1.3, darker(ramp, 1));
  for (let px = x0; px < x1; px++) fb.fill(px, eaveY + 1, 1, 4, (xx, yy) => { const c = fb.get(xx, yy); return c === T ? T : mix(c, 0x000000, 0.35 - (yy - eaveY) * 0.07); });
}

export function windowPane(fb: FB, x: number, y: number, w: number, h: number, frame: Ramp = RAMP.timber, shutters = false): Window {
  if (shutters) {
    for (const sx of [x - 5, x + w + 1]) fb.fill(sx, y - 1, 4, h + 2, (px, py) => rampAt(RAMP.clothGreen, 0.45 + (px === sx ? 0.25 : 0) + ((py - y) % 4 === 0 ? -0.3 : 0), px, py));
  }
  fb.rect(x - 2, y - 2, w + 4, h + 4, frame[1]);
  fb.hline(x - 2, x + w + 1, y - 2, frame[3]);
  fb.fill(x, y, w, h, (px, py) => rampAt(RAMP.glass, 0.85 - (py - y) / h * 0.7 + ((px - x + py - y) % 7 < 2 ? 0.25 : 0), px, py));
  fb.vline(x + (w >> 1), y, y + h - 1, frame[2]);
  fb.hline(x, x + w - 1, y + (h >> 1), frame[2]);
  fb.rect(x - 3, y + h + 1, w + 6, 2, frame[3]);
  fb.hline(x - 3, x + w + 2, y + h + 3, frame[0]);
  return { x, y, w, h };
}

export function door(fb: FB, x: number, base: number, w: number, h: number, R: Ramp = RAMP.wood, arch = true) {
  const top = base - h;
  fb.fill(x - 3, top - 3, w + 6, h + 3, (px, py) => rampAt(RAMP.stoneWarm, 0.45 + (px < x ? 0.2 : px >= x + w ? -0.15 : 0) + (noise(px, py, 4) - 0.5) * 0.3, px, py));
  const inside = (px: number, py: number) => px >= x && px < x + w && py >= top + (arch ? Math.max(0, w / 2 - Math.sqrt(Math.max(0, (w / 2) ** 2 - (px + 0.5 - x - w / 2) ** 2))) : 0) && py < base;
  fb.fill(x, top, w, h, (px, py) => {
    if (!inside(px, py)) return T;
    const plank = (px - x) % 5;
    return rampAt(R, 0.5 + (plank === 0 ? -0.35 : plank === 1 ? 0.18 : 0) + (noise(px * 0.3, py * 0.15, 7) - 0.5) * 0.3 - (py - top) / h * 0.1, px, py);
  });
  for (const hy of [top + h * 0.28, base - h * 0.28]) fb.limb(x + 1, hy, x + w * 0.7, hy, 0.8, 0.6, RAMP.iron);
  fb.sphere(x + w - 3.5, base - h * 0.48, 1.2, 1.2, RAMP.gold);
  fb.rect(x - 4, base, w + 8, 2, RAMP.stone[3]);
  fb.hline(x - 4, x + w + 3, base, RAMP.stone[5]);
}

export function archDoor(fb: FB, x: number, base: number, w: number, h: number, c: Col = 0x08080a) {
  fb.fill(x, base - h, w, h, (px, py) => {
    const cx = x + w / 2, r = w / 2, top = base - h + r;
    if (py < top && (px + 0.5 - cx) ** 2 + (py + 0.5 - top) ** 2 > r * r) return T;
    return mix(c, 0x000000, 0.3 * ((py - (base - h)) / h));
  });
}

/** Half-timbered house seen from the street. Returns windows so they can glow at night. */
export function house(
  fb: FB, x: number, base: number, w: number, h: number,
  o: { roof?: 'tile' | 'slate' | 'thatch' | 'shingle'; roofRamp?: Ramp; door?: number; doorW?: number; windows?: number[]; roofH?: number; stone?: boolean; chimney?: number; seed?: number } = {},
): Window[] {
  const top = base - h, seed = o.seed ?? x;
  if (o.stone) stoneWall(fb, x, top, w, h, RAMP.stoneWarm, seed, 6);
  else {
    plasterWall(fb, x, top, w, h, RAMP.plaster, seed);
    const beam = (x0: number, y0: number, x1: number, y1: number) => fb.limb(x0, y0, x1, y1, 1.3, 1.3, RAMP.timber, { amb: 0.35 });
    beam(x + 1, top, x + 1, base); beam(x + w - 2, top, x + w - 2, base);
    beam(x, top + 1, x + w - 1, top + 1); beam(x, top + Math.floor(h * 0.46), x + w - 1, top + Math.floor(h * 0.46));
    for (let bx = x + 2; bx < x + w - 14; bx += 26) beam(bx, top + 2, bx + 12, top + Math.floor(h * 0.46) - 1);
  }
  fb.fill(x, base - 6, w, 6, (px, py) => mix(fb.get(px, py), 0x000000, (py - (base - 6)) / 6 * 0.35));
  if (o.chimney !== undefined) {
    const cx = x + o.chimney, ch = (o.roofH ?? 24) + 14;
    stoneWall(fb, cx, top - ch, 9, ch, RAMP.brick, seed, 4);
    fb.rect(cx - 1, top - ch - 2, 11, 3, RAMP.stone[3]);
  }
  roof(fb, x, x + w, top + 1, o.roofH ?? 24, o.roof ?? 'tile', o.roofRamp);
  const wins: Window[] = [];
  for (const wx of o.windows ?? []) wins.push(windowPane(fb, x + wx, top + 9, 12, 12, RAMP.timber, !o.stone));
  if (o.door !== undefined) door(fb, x + o.door, base, o.doorW ?? 18, Math.min(h - 4, 38));
  return wins;
}

export function hangingSign(fb: FB, x: number, y: number, w: number, h: number, draw: (cx: number, cy: number) => void) {
  fb.limb(x - 6, y - 4, x + w + 2, y - 4, 1, 1, RAMP.iron);
  fb.line(x + 2, y - 4, x + 2, y, RAMP.iron[3]); fb.line(x + w - 3, y - 4, x + w - 3, y, RAMP.iron[3]);
  fb.fill(x, y, w, h, (px, py) => rampAt(RAMP.woodPale, 0.5 + (px === x || py === y ? 0.25 : px === x + w - 1 || py === y + h - 1 ? -0.3 : 0) + (noise(px * 0.4, py, 2) - 0.5) * 0.3, px, py));
  draw(x + w / 2, y + h / 2);
}

export function signpost(fb: FB, x: number, base: number) {
  fb.shadow(x + 6, base + 1, 10, 2.5, 0.45);
  fb.limb(x, base, x, base - 36, 1.8, 1.5, RAMP.wood);
  const board = (pts: number[][]) => fb.poly(pts, (px, py) => rampAt(RAMP.woodPale, 0.5 + (noise(px * 0.3, py, 1) - 0.5) * 0.4, px, py));
  board([[x + 1, base - 33], [x + 27, base - 33], [x + 31, base - 29], [x + 27, base - 25], [x + 1, base - 25]]);
  board([[x - 1, base - 23], [x - 27, base - 23], [x - 31, base - 19], [x - 27, base - 15], [x - 1, base - 15]]);
  for (let i = 0; i < 18; i += 3) { fb.pset(x + 5 + i, base - 29, RAMP.wood[1]); fb.pset(x - 22 + i, base - 19, RAMP.wood[1]); }
}

export function palisade(fb: FB, x: number, base: number, w: number, h: number, seed = 1) {
  fb.shadow(x + w / 2, base + 2, w / 2 + 6, 4, 0.4);
  for (let px = x; px < x + w; px += 6) {
    const hh = h - ((px * 7) % 5);
    fb.limb(px + 2.5, base, px + 2.5, base - hh, 3, 3, RAMP.wood, { tex: (xx, yy) => (noise(xx * 0.5, yy * 0.15, seed) - 0.5) * 0.45 });
    fb.poly([[px - 0.5, base - hh], [px + 5.5, base - hh], [px + 2.5, base - hh - 6]], (xx, yy) => rampAt(RAMP.woodPale, 0.4 + (xx < px + 2.5 ? 0.25 : -0.1), xx, yy));
  }
  for (const f of [0.3, 0.78]) fb.limb(x, base - h * f, x + w, base - h * f, 1.3, 1.3, RAMP.leather);
}

// ---- interiors --------------------------------------------------------------------------

export function room(fb: FB, o: { wall: 'plaster' | 'wood' | 'stone' | 'brick'; floor: 'wood' | 'stone' | 'dirt'; wallH?: number; wallRamp?: Ramp; floorRamp?: Ramp; seed?: number }) {
  const wh = o.wallH ?? 110, seed = o.seed ?? 1;
  if (o.wall === 'stone') stoneWall(fb, 0, 0, 320, wh, o.wallRamp ?? RAMP.stoneWarm, seed, 9);
  else if (o.wall === 'brick') stoneWall(fb, 0, 0, 320, wh, o.wallRamp ?? RAMP.brick, seed, 5);
  else if (o.wall === 'wood') fb.fill(0, 0, 320, wh, (x, y) => rampAt(o.wallRamp ?? RAMP.wood, 0.5 + (x % 16 === 0 ? -0.45 : x % 16 === 1 ? 0.2 : 0) + (noise(x * 0.15, y * 0.03, seed) - 0.5) * 0.45, x, y));
  else plasterWall(fb, 0, 0, 320, wh, o.wallRamp ?? RAMP.plaster, seed);
  // skirting & floor
  const FR = o.floorRamp ?? (o.floor === 'stone' ? RAMP.stone : o.floor === 'dirt' ? RAMP.mud : RAMP.wood);
  fb.fill(0, wh, 320, 200 - wh, (x, y) => {
    const d = (y - wh) / (200 - wh);
    const persp = (x - 160) / (0.25 + d * 0.75);
    let t = 0.4 + d * 0.25;
    if (o.floor === 'wood') {
      const plank = Math.floor(persp / 22);
      t += (Math.abs(persp % 22) < 1.4 ? -0.4 : 0) + ((plank * 13) % 5) / 5 * 0.15 + (noise(persp * 0.02, y * 0.6, seed + plank) - 0.5) * 0.25;
    } else if (o.floor === 'stone') {
      const row = Math.floor((y - wh) / (4 + d * 10)), cx = Math.floor((persp + row * 14) / 28);
      t += (Math.abs((persp + row * 14) % 28) < 1.5 ? -0.4 : 0) + (((cx * 7 + row * 3) % 5) / 5 - 0.4) * 0.25 + (noise(x * 0.3, y * 0.3, seed) - 0.5) * 0.2;
    } else t += (fbm(x * 0.05, y * 0.1, seed) - 0.5) * 0.5;
    return rampAt(FR, t, x, y);
  });
  fb.fill(0, wh - 5, 320, 5, (x, y) => rampAt(RAMP.wood, 0.4 + (y === wh - 5 ? 0.3 : 0), x, y));
  fb.fill(0, wh, 320, 6, (x, y) => mix(fb.get(x, y), 0x000000, 0.35 - (y - wh) * 0.05));
}

/** Darken the corners of an interior. */
export function vignette(fb: FB, strength = 0.45) {
  fb.fill(0, 0, 320, 200, (x, y) => {
    const dx = (x - 160) / 180, dy = (y - 100) / 130, d = dx * dx + dy * dy;
    return mix(fb.get(x, y), 0x05040a, Math.min(0.8, Math.max(0, d - 0.35) * strength));
  });
}

export function beams(fb: FB, count = 5, y = 6) {
  for (let i = 0; i < count; i++) {
    const x = (i + 0.5) * (320 / count);
    fb.limb(x, 0, x, 112, 3, 3, RAMP.timber, { amb: 0.35 });
  }
  fb.limb(0, y, 320, y, 3, 3, RAMP.timber, { amb: 0.35 });
}

export function table(fb: FB, x: number, y: number, w: number) {
  fb.shadow(x + w / 2 + 3, y + 19, w * 0.6, 4, 0.5);
  for (const lx of [x + 3, x + w - 4]) fb.limb(lx, y + 3, lx, y + 18, 1.3, 1.2, RAMP.wood);
  fb.fill(x, y - 3, w, 6, (px, py) => rampAt(RAMP.wood, 0.55 + (py === y - 3 ? 0.35 : py > y + 1 ? -0.35 : 0) + (noise(px * 0.2, py, 3) - 0.5) * 0.3, px, py));
}

export function stool(fb: FB, x: number, y: number) {
  fb.shadow(x + 2, y + 10, 6, 2, 0.4);
  for (const lx of [x - 3, x + 3]) fb.limb(lx, y, lx + (lx < x ? -1 : 1), y + 10, 0.9, 0.8, RAMP.wood);
  fb.sphere(x, y, 5, 2, RAMP.wood);
}

export function barrel(fb: FB, x: number, y: number) {
  fb.shadow(x + 3, y, 9, 2.5, 0.45);
  fb.cylPoly([[x - 7, y - 20], [x + 7, y - 20], [x + 8, y - 10], [x + 7, y], [x - 7, y], [x - 8, y - 10]], x, 8, RAMP.wood, { tex: (px) => ((px - x + 20) % 4 === 0 ? -0.3 : 0) });
  for (const hy of [y - 17, y - 3]) fb.limb(x - 7.6, hy, x + 7.6, hy, 0.8, 0.8, RAMP.iron);
  fb.sphere(x, y - 20, 7, 2, RAMP.wood, { amb: 0.6 });
}

const BOTTLES = [RAMP.clothRed, RAMP.clothGreen, RAMP.clothBlue, RAMP.clothYellow, RAMP.clothPurple, RAMP.clothTeal, RAMP.glass];

export function shelves(fb: FB, x: number, y: number, w: number, rows: number, seed: number) {
  const r = rng(seed);
  fb.fill(x, y, w, rows * 15 + 3, (px, py) => rampAt(RAMP.wood, 0.25 + (noise(px * 0.2, py * 0.1, seed) - 0.5) * 0.25, px, py));
  for (let i = 0; i < rows; i++) {
    const sy = y + 2 + i * 15;
    for (let bx = x + 3; bx < x + w - 6; bx += 4 + Math.floor(r() * 4)) {
      const R = BOTTLES[Math.floor(r() * BOTTLES.length)], bh = 5 + Math.floor(r() * 6), bw = 1.6 + r() * 1.2;
      if (r() < 0.25) { fb.sphere(bx + 1.5, sy + 11, 2.4, 2.4, RAMP.woodPale); continue; }
      fb.limb(bx + 1.5, sy + 12 - bh, bx + 1.5, sy + 11, bw * 0.55, bw, R, { amb: 0.35, rim: 0.3 });
      fb.pset(bx + 1, sy + 12 - bh, 0xffffff);
    }
    fb.fill(x, sy + 12, w, 3, (px, py) => rampAt(RAMP.wood, py === sy + 12 ? 0.8 : 0.35, px, py));
  }
  fb.limb(x, y, x, y + rows * 15 + 3, 1.3, 1.3, RAMP.wood); fb.limb(x + w, y, x + w, y + rows * 15 + 3, 1.3, 1.3, RAMP.wood);
}

export function books(fb: FB, x: number, y: number, w: number, rows: number, seed: number) {
  const r = rng(seed);
  fb.fill(x, y, w, rows * 15 + 3, (px, py) => rampAt(RAMP.wood, 0.2 + (noise(px * 0.2, py * 0.1, seed) - 0.5) * 0.2, px, py));
  for (let i = 0; i < rows; i++) {
    const sy = y + 2 + i * 15;
    let bx = x + 2;
    while (bx < x + w - 4) {
      const R = BOTTLES[Math.floor(r() * 6)], bw = 2 + Math.floor(r() * 2), bh = 9 + Math.floor(r() * 3), lean = r() < 0.1 ? 2 : 0;
      fb.fill(bx, sy + 12 - bh, bw, bh, (px, py) => rampAt(R, 0.45 + (px === bx ? 0.3 : 0) + (py === sy + 14 - bh ? 0.2 : 0), px, py));
      if (r() < 0.5) fb.pset(bx + 1, sy + 14 - bh, RAMP.gold[5]);
      bx += bw + (lean ? 1 : 0);
    }
    fb.fill(x, sy + 12, w, 3, (px, py) => rampAt(RAMP.wood, py === sy + 12 ? 0.8 : 0.35, px, py));
  }
}

export function fireplace(fb: FB, x: number, base: number) {
  stoneWall(fb, x - 28, base - 54, 56, 54, RAMP.stone, 4, 6);
  fb.fill(x - 19, base - 32, 38, 32, (px, py) => {
    const top = base - 32 + 10 - Math.sqrt(Math.max(0, 100 - ((px - x) / 1.9) ** 2));
    return py < top ? T : mix(0x120c0a, 0x2a1810, (py - (base - 32)) / 32);
  });
  fb.fill(x - 32, base - 58, 64, 5, (px, py) => rampAt(RAMP.wood, 0.5 + (py === base - 58 ? 0.3 : 0), px, py));
  for (let i = 0; i < 3; i++) fb.limb(x - 10 + i * 6, base - 3, x - 4 + i * 6, base - 5, 1.6, 1.4, RAMP.bark);
}

export function fire(fb: FB, x: number, base: number, t: number, s = 1) {
  const r = rng(Math.floor(t * 12));
  for (let i = 0; i < 18 * s; i++) {
    const fx = x + (r() - 0.5) * 16 * s, fh = (5 + r() * 13) * s, sway = Math.sin(t * 9 + i) * 1.5;
    fb.limb(fx, base - 2, fx + sway, base - 2 - fh, 1.6 * s, 0.3, RAMP.fire, { amb: 0.55, bright: 0.7 + r() * 0.5 });
  }
  for (let i = 0; i < 3; i++) fb.pset(x + (r() - 0.5) * 14 * s, base - 16 * s - r() * 10 * s, RAMP.fire[6]);
}

export function bed(fb: FB, x: number, y: number) {
  fb.shadow(x + 28, y + 17, 32, 4, 0.5);
  fb.fill(x, y, 54, 16, (px, py) => rampAt(RAMP.wood, 0.45 + (py === y ? 0.25 : 0), px, py));
  fb.sphere(x + 30, y - 2, 22, 5, RAMP.clothRed);
  fb.sphere(x + 9, y - 4, 7, 3.5, RAMP.clothWhite);
  fb.limb(x - 1, y - 16, x - 1, y + 16, 2, 2, RAMP.wood);
}

export function cauldron(fb: FB, x: number, base: number, t: number) {
  fb.shadow(x + 3, base + 1, 16, 3, 0.5);
  fb.limb(x - 12, base, x - 9, base - 8, 1, 1, RAMP.iron);
  fb.limb(x + 12, base, x + 9, base - 8, 1, 1, RAMP.iron);
  fb.sphere(x, base - 12, 13, 10, RAMP.iron, { rim: 0.2, clip: (_px, py) => py > base - 20 });
  fb.sphere(x, base - 19.5, 11.5, 3, RAMP.clothGreen, { amb: 0.7 });
  const r = rng(Math.floor(t * 5));
  for (let i = 0; i < 4; i++) fb.sphere(x - 8 + r() * 16, base - 20 - r() * 1.5, 1.2, 1.2, RAMP.grass, { amb: 0.9 });
  for (let i = 0; i < 5; i++) fb.pset(x - 6 + r() * 12, base - 24 - ((t * 12 + i * 5) % 18), mix(0x9fb8a0, 0xffffff, r() * 0.5));
}

export function caveWalls(fb: FB, seed: number) {
  fb.fill(0, 0, 320, 124, (x, y) => {
    const n = fbm(x * 0.025, y * 0.04, seed, 5), strata = Math.sin(y * 0.35 + n * 6) * 0.12;
    return rampAt(RAMP.rock, 0.28 + (n - 0.5) * 0.9 + strata - y / 500 + (noise(x * 0.6, y * 0.6, seed) - 0.5) * 0.12, x, y);
  });
  const r = rng(seed);
  for (let i = 0; i < 10; i++) {
    const x = r() * 320, y = 20 + r() * 90, w = 20 + r() * 40;
    fb.limb(x - w / 2, y, x + w / 2, y + (r() - 0.5) * 6, 2, 1.5, RAMP.rock, { amb: 0.5 });
    fb.fill(x - w / 2, y + 2, w, 5, (px, py) => mix(fb.get(px, py), 0x000000, 0.4 - (py - y - 2) * 0.07));
  }
  for (let x = 4; x < 320; x += 14 + r() * 22) {
    const len = 12 + r() * 30, w = 3 + r() * 4;
    fb.cylPoly([[x - w, 0], [x + w, 0], [x + 0.5, len]], x, w, RAMP.rock, { amb: 0.3 });
    fb.pset(x, len - 1, RAMP.water[6]);
  }
  fb.fill(0, 118, 320, 82, (x, y) => rampAt(RAMP.mud, 0.35 + (fbm(x * 0.06, y * 0.15, seed + 9, 4) - 0.5) * 0.6 + (y - 118) / 300, x, y));
  fb.fill(0, 116, 320, 8, (x, y) => mix(fb.get(x, y), 0x000000, 0.4 - (y - 116) * 0.04));
  for (let i = 0; i < 30; i++) { const x = r() * 320, y = 125 + r() * 70; fb.sphere(x, y, 1.5 + r() * 3, 1 + r() * 1.5, RAMP.rock); }
}

export function chest(fb: FB, x: number, base: number, open = false) {
  fb.shadow(x + 3, base + 1, 15, 3, 0.5);
  const wood = (px: number, py: number) => rampAt(RAMP.wood, 0.5 + ((px - x) % 6 === 0 ? -0.3 : 0) + (noise(px * 0.2, py, 3) - 0.5) * 0.3, px, py);
  fb.fill(x - 12, base - 12, 24, 12, wood);
  if (open) {
    fb.fill(x - 12, base - 24, 24, 10, wood);
    fb.fill(x - 10, base - 13, 20, 3, () => 0x100a06);
  } else {
    fb.sphere(x, base - 12, 12, 4.5, RAMP.wood, { clip: (_px, py) => py <= base - 12 });
    fb.sphere(x, base - 7, 2.2, 2.2, RAMP.gold);
  }
  for (const bx of [x - 9, x + 8]) fb.limb(bx, base - (open ? 24 : 15), bx, base - 1, 0.8, 0.8, RAMP.iron);
}

export function rug(fb: FB, cx: number, cy: number, rx: number, ry: number, R: Ramp = RAMP.clothRed, trim: Ramp = RAMP.gold) {
  fb.fill(cx - rx, cy - ry, rx * 2, ry * 2, (x, y) => {
    const nx = (x - cx) / rx, ny = (y - cy) / ry, d = nx * nx + ny * ny;
    if (d > 1) return T;
    if (d > 0.82) return rampAt(trim, 0.45, x, y);
    const pat = Math.sin(nx * 9) * Math.sin(ny * 7) > 0.4 ? 0.25 : 0;
    return rampAt(R, 0.35 + pat + (1 - d) * 0.15, x, y);
  });
}

export function candle(fb: FB, x: number, y: number, t: number) {
  fb.limb(x, y, x, y - 5, 1.1, 1, RAMP.clothWhite);
  const f = Math.sin(t * 14 + x) * 0.5;
  fb.limb(x, y - 6, x + f, y - 9, 1, 0.2, RAMP.fire, { amb: 0.8 });
}

export function glowAt(x: number, y: number, r: number, c: Col = hex('#ffb060'), i = 0.5): Glow { return { x, y, r, c, i }; }
