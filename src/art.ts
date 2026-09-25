import { FB, rng } from './gfx';

/** Painterly helpers for building 320x200 EGA scenes out of primitives. */

export function sky(fb: FB, h: number, seed = 1, clouds = 3) {
  fb.rect(0, 0, 320, Math.round(h * 0.45), 9);
  fb.dither(0, Math.round(h * 0.45), 320, Math.round(h * 0.25), 9, 11, 0);
  fb.dither(0, Math.round(h * 0.7), 320, h - Math.round(h * 0.7), 11, 9, 1);
  fb.rect(0, h, 320, 60, 11);
  const r = rng(seed);
  for (let i = 0; i < clouds; i++) cloud(fb, 20 + r() * 280, 8 + r() * h * 0.35, 14 + r() * 18);
}

export function cloud(fb: FB, x: number, y: number, s: number) {
  fb.ellipse(x, y + 2, s, s * 0.28, 7);
  fb.ellipse(x - s * 0.4, y, s * 0.5, s * 0.3, 15);
  fb.ellipse(x + s * 0.2, y - s * 0.12, s * 0.55, s * 0.36, 15);
  fb.ellipse(x + s * 0.6, y + 1, s * 0.4, s * 0.25, 15);
}

export function mountains(fb: FB, base: number, height: number, seed: number, col = 8, snow = true) {
  const r = rng(seed);
  const pts: number[][] = [[0, base + 60]];
  let x = 0;
  while (x < 320) {
    const peak = base - height * (0.45 + r() * 0.55);
    const w = 30 + r() * 50;
    pts.push([x + w / 2, peak]);
    x += w;
    pts.push([x, base - height * (0.15 + r() * 0.25)]);
  }
  pts.push([320, base + 60]);
  fb.poly(pts, col);
  if (snow)
    for (let i = 1; i < pts.length - 1; i += 2) {
      const [px, py] = pts[i];
      if (py < base - height * 0.7) fb.poly([[px, py], [px + 6, py + 7], [px + 2, py + 5], [px - 3, py + 8], [px - 6, py + 7]], 15);
    }
}

export function hills(fb: FB, base: number, height: number, seed: number, a = 2, b = 10) {
  const r = rng(seed);
  const pts: number[][] = [[0, 200], [0, base - height * r()]];
  for (let x = 0; x <= 320; x += 20) pts.push([x, base - height * (0.3 + 0.7 * Math.abs(Math.sin(x / 60 + seed)) * (0.6 + r() * 0.4))]);
  pts.push([320, 200]);
  fb.poly(pts, a, b, 1);
}

export function grass(fb: FB, y: number, seed = 7, h = 200 - y) {
  fb.rect(0, y, 320, h, 2);
  fb.speckle(0, y, 320, h, 10, 0.05, seed);
  fb.speckle(0, y, 320, h, 0, 0.012, seed + 1);
  const r = rng(seed + 2);
  for (let i = 0; i < 40; i++) {
    const x = r() * 320, yy = y + 4 + r() * (h - 4);
    fb.pset(x, yy, 10); fb.pset(x - 1, yy + 1, 10); fb.pset(x + 1, yy + 1, 10);
  }
}

export function dirt(fb: FB, pts: number[][], seed = 3) {
  fb.poly(pts, 6);
  const tmp = new FB();
  tmp.poly(pts, 1);
  const r = rng(seed);
  for (let i = 0; i < 1600; i++) {
    const x = Math.floor(r() * 320), y = Math.floor(r() * 200);
    if (tmp.get(x, y) === 1) fb.pset(x, y, r() < 0.75 ? 8 : 14);
  }
}

export function flowers(fb: FB, x: number, y: number, w: number, h: number, colors: number[], seed: number, n = 30) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const fx = x + r() * w, fy = y + r() * h, c = colors[Math.floor(r() * colors.length)];
    fb.pset(fx, fy + 1, 2);
    fb.pset(fx, fy, c); fb.pset(fx - 1, fy, c); fb.pset(fx + 1, fy, c); fb.pset(fx, fy - 1, c);
  }
}

export function tree(fb: FB, x: number, base: number, size: number, seed: number, kind: 'oak' | 'pine' | 'dead' = 'oak') {
  const r = rng(seed);
  const th = size * 1.1, tw = Math.max(4, Math.round(size / 5));
  if (kind === 'pine') {
    fb.rect(x - tw / 2, base - th * 0.5, tw, th * 0.5, 6);
    fb.vline(x - tw / 2, base - th * 0.5, base, 0);
    const layers = 4;
    for (let i = 0; i < layers; i++) {
      const ly = base - th * 0.35 - i * size * 0.45, lw = size * (0.9 - i * 0.18);
      fb.poly([[x - lw, ly], [x + lw, ly], [x, ly - size * 0.75]], 2, 0, 2);
      fb.line(x, ly - size * 0.75, x - lw, ly, 10);
    }
    return;
  }
  // trunk
  fb.poly([[x - tw, base], [x + tw, base], [x + tw / 2, base - th], [x - tw / 2, base - th]], 6);
  fb.line(x - tw, base, x - tw / 2, base - th, 0);
  fb.speckle(x - tw, base - th, tw * 2, th, 8, 0.15, seed);
  fb.line(x - tw, base, x - tw - 4, base + 1, 6);
  fb.line(x + tw, base, x + tw + 4, base + 1, 6);
  if (kind === 'dead') {
    for (let i = 0; i < 5; i++) {
      const by = base - th * (0.5 + r() * 0.5), dir = r() < 0.5 ? -1 : 1, len = size * (0.4 + r() * 0.4);
      fb.line(x, by, x + dir * len, by - len * 0.6, 6, 2);
      fb.line(x + dir * len * 0.6, by - len * 0.36, x + dir * len * 0.9, by - len * 0.9, 8);
    }
    return;
  }
  const cy = base - th - size * 0.35;
  const blobs: number[][] = [];
  for (let i = 0; i < 7; i++) blobs.push([x + (r() - 0.5) * size * 1.3, cy + (r() - 0.5) * size * 0.7, size * (0.35 + r() * 0.25)]);
  for (const [bx, by, br] of blobs) fb.circle(bx, by + 3, br, 2, 0, 1);
  for (const [bx, by, br] of blobs) fb.circle(bx, by, br * 0.92, 2);
  for (const [bx, by, br] of blobs) fb.circle(bx - br * 0.3, by - br * 0.3, br * 0.5, 2, 10, 0);
  fb.speckle(x - size, cy - size * 0.6, size * 2, size * 1.2, 10, 0.03, seed + 9);
}

export function bush(fb: FB, x: number, y: number, w: number, seed: number) {
  const r = rng(seed);
  for (let i = 0; i < 5; i++) fb.circle(x + (r() - 0.5) * w, y - r() * w * 0.3, w * (0.25 + r() * 0.2), 2, 0, 1);
  for (let i = 0; i < 5; i++) fb.circle(x + (r() - 0.5) * w * 0.8, y - w * 0.15 - r() * w * 0.3, w * 0.2, 2, 10, 0);
}

export function rock(fb: FB, x: number, y: number, w: number, h: number) {
  fb.ellipse(x, y, w, h, 8);
  fb.ellipse(x - w * 0.2, y - h * 0.3, w * 0.6, h * 0.45, 7, 8, 0);
  fb.hline(x - w * 0.7, x + w * 0.7, y + h, 0);
}

export function water(fb: FB, x: number, y: number, w: number, h: number, seed = 5) {
  fb.rect(x, y, w, h, 1);
  const r = rng(seed);
  for (let i = 0; i < w * h * 0.02; i++) {
    const wx = x + r() * w, wy = y + r() * h;
    fb.hline(wx, wx + 3 + r() * 6, wy, 9);
  }
}

export function sparkle(fb: FB, x: number, y: number, w: number, h: number, t: number, seed = 9) {
  const r = rng(seed + Math.floor(t * 3));
  for (let i = 0; i < 6; i++) fb.hline(x + r() * w, x + r() * w + 2, y + r() * h, r() < 0.5 ? 11 : 15);
}

export function stoneWall(fb: FB, x: number, y: number, w: number, h: number, base = 7, mortar = 8) {
  fb.rect(x, y, w, h, base);
  for (let row = 0; row * 6 < h; row++) {
    const yy = y + row * 6;
    fb.hline(x, x + w - 1, yy, mortar);
    for (let xx = x + (row % 2 ? 5 : 0); xx < x + w; xx += 11) fb.vline(xx, yy, Math.min(yy + 5, y + h - 1), mortar);
  }
  fb.speckle(x, y, w, h, 15, 0.01, x + y);
}

export function crenels(fb: FB, x: number, y: number, w: number) {
  for (let xx = x; xx < x + w; xx += 12) stoneWall(fb, xx, y - 7, 7, 7);
}

export interface Window { x: number; y: number; w: number; h: number }

/** Half-timbered house seen from the street. Returns its windows so they can glow at night. */
export function house(
  fb: FB, x: number, base: number, w: number, h: number,
  o: { roof?: number; wall?: number; door?: number; windows?: number[]; roofH?: number; sign?: number; stone?: boolean } = {},
): Window[] {
  const wall = o.wall ?? 15, roof = o.roof ?? 4, roofH = o.roofH ?? 24;
  const top = base - h;
  if (o.stone) stoneWall(fb, x, top, w, h);
  else {
    fb.rect(x, top, w, h, wall);
    fb.speckle(x, top, w, h, 7, 0.04, x);
    fb.rect(x, top, 3, h, 6); fb.rect(x + w - 3, top, 3, h, 6);
    fb.rect(x, top + Math.floor(h * 0.45), w, 2, 6);
    fb.rect(x, top, w, 2, 6);
    for (let bx = x + 3; bx < x + w - 10; bx += 26) {
      fb.line(bx, top + 2, bx + 10, top + Math.floor(h * 0.45), 6, 2);
    }
  }
  // roof
  fb.poly([[x - 5, top + 1], [x + w + 5, top + 1], [x + w - 6, top - roofH], [x + 6, top - roofH]], roof);
  for (let ry = top - roofH + 3; ry < top; ry += 4) {
    fb.hline(x - 4, x + w + 4, ry, 0);
    for (let rx = x + ((ry >> 2) % 2 ? 0 : 4); rx < x + w; rx += 8) fb.pset(rx, ry + 1, 0);
  }
  fb.line(x - 5, top + 1, x + 6, top - roofH, 0);
  fb.line(x + w + 5, top + 1, x + w - 6, top - roofH, 0);
  const wins: Window[] = [];
  for (const wx of o.windows ?? []) {
    const win = { x: x + wx, y: top + 8, w: 14, h: 12 };
    fb.rect(win.x - 1, win.y - 1, win.w + 2, win.h + 2, 6);
    fb.rect(win.x, win.y, win.w, win.h, 3);
    fb.vline(win.x + 7, win.y, win.y + win.h - 1, 6);
    fb.hline(win.x, win.x + win.w - 1, win.y + 6, 6);
    fb.pset(win.x + 2, win.y + 2, 15);
    wins.push(win);
  }
  if (o.door !== undefined) door(fb, x + o.door, base, 18, 30);
  if (o.sign !== undefined) {
    fb.hline(x + o.sign - 2, x + o.sign + 20, top + 6, 0);
    fb.rect(x + o.sign, top + 7, 18, 10, 6);
    fb.frame(x + o.sign, top + 7, 18, 10, 14);
  }
  return wins;
}

export function door(fb: FB, x: number, base: number, w: number, h: number, c = 6) {
  fb.rect(x - 2, base - h - 2, w + 4, h + 2, 8);
  fb.rect(x, base - h, w, h, c);
  for (let px = x + 4; px < x + w; px += 5) fb.vline(px, base - h, base - 1, 0);
  fb.hline(x, x + w - 1, base - h + 5, 0);
  fb.hline(x, x + w - 1, base - 8, 0);
  fb.pset(x + w - 4, base - h / 2, 14);
}

export function archDoor(fb: FB, x: number, base: number, w: number, h: number, c = 0) {
  fb.rect(x, base - h + w / 2, w, h - w / 2, c);
  fb.ellipse(x + w / 2, base - h + w / 2, w / 2, w / 2, c);
}

export function signpost(fb: FB, x: number, base: number) {
  fb.rect(x - 1, base - 34, 3, 34, 6);
  fb.vline(x - 1, base - 34, base, 0);
  fb.poly([[x + 2, base - 32], [x + 26, base - 32], [x + 30, base - 28], [x + 26, base - 24], [x + 2, base - 24]], 6);
  fb.poly([[x - 2, base - 22], [x - 26, base - 22], [x - 30, base - 18], [x - 26, base - 14], [x - 2, base - 14]], 6);
  for (let i = 0; i < 18; i += 3) { fb.hline(x + 5 + i, x + 6 + i, base - 28, 0); fb.hline(x - 22 + i, x - 21 + i, base - 18, 0); }
}

export function palisade(fb: FB, x: number, base: number, w: number, h: number) {
  for (let px = x; px < x + w; px += 6) {
    const hh = h - ((px * 7) % 5);
    fb.rect(px, base - hh, 5, hh, 6);
    fb.poly([[px, base - hh], [px + 5, base - hh], [px + 2.5, base - hh - 5]], 6);
    fb.vline(px, base - hh, base, 0);
    fb.vline(px + 3, base - hh + 3, base - 2, 8);
  }
  fb.rect(x, base - h * 0.35, w, 2, 8);
  fb.rect(x, base - h * 0.8, w, 2, 8);
}

// ---- interiors ------------------------------------------------------------------

export function room(fb: FB, o: { wall: number; wall2: number; floor: number; floor2: number; wallH?: number; stone?: boolean }) {
  const wh = o.wallH ?? 110;
  if (o.stone) stoneWall(fb, 0, 0, 320, wh, o.wall, o.wall2);
  else {
    fb.rect(0, 0, 320, wh, o.wall);
    for (let x = 0; x < 320; x += 14) fb.vline(x, 0, wh - 1, o.wall2);
    fb.speckle(0, 0, 320, wh, o.wall2, 0.03, 11);
  }
  fb.rect(0, wh, 320, 200 - wh, o.floor);
  for (let i = -12; i <= 12; i++) fb.line(160 + i * 12, wh, 160 + i * 40, 200, o.floor2);
  for (let y = wh + 6, g = 6; y < 200; g += 3, y += g) fb.hline(0, 319, y, o.floor2);
  fb.hline(0, 319, wh, 0);
  fb.rect(0, wh - 4, 320, 4, o.wall2);
}

export function table(fb: FB, x: number, y: number, w: number) {
  fb.rect(x, y, w, 4, 6);
  fb.hline(x, x + w - 1, y, 14);
  fb.rect(x + 2, y + 4, 3, 14, 6);
  fb.rect(x + w - 5, y + 4, 3, 14, 6);
  fb.hline(x, x + w - 1, y + 4, 0);
}

export function barrel(fb: FB, x: number, y: number) {
  fb.rect(x - 7, y - 18, 14, 18, 6);
  fb.ellipse(x, y - 18, 7, 2, 8);
  fb.hline(x - 7, x + 6, y - 14, 8); fb.hline(x - 7, x + 6, y - 5, 8);
  fb.vline(x - 7, y - 18, y - 1, 0);
}

export function shelves(fb: FB, x: number, y: number, w: number, rows: number, seed: number) {
  const r = rng(seed);
  fb.rect(x, y, w, rows * 14 + 2, 6);
  fb.frame(x, y, w, rows * 14 + 2, 0);
  for (let i = 0; i < rows; i++) {
    const sy = y + 2 + i * 14;
    fb.rect(x + 2, sy, w - 4, 11, 0);
    for (let bx = x + 3; bx < x + w - 5; bx += 4 + Math.floor(r() * 3)) {
      const c = [4, 12, 2, 10, 1, 9, 5, 13, 14, 3][Math.floor(r() * 10)];
      const bh = 5 + Math.floor(r() * 5);
      fb.rect(bx, sy + 11 - bh, 3, bh, c);
      fb.pset(bx + 1, sy + 11 - bh - 1, 7);
    }
    fb.hline(x, x + w - 1, sy + 11, 6);
  }
}

export function books(fb: FB, x: number, y: number, w: number, rows: number, seed: number) {
  const r = rng(seed);
  fb.rect(x, y, w, rows * 14 + 2, 6);
  for (let i = 0; i < rows; i++) {
    const sy = y + 2 + i * 14;
    fb.rect(x + 2, sy, w - 4, 11, 0);
    for (let bx = x + 3; bx < x + w - 3; bx += 3) {
      const c = [4, 1, 2, 5, 6, 3, 8][Math.floor(r() * 7)];
      const bh = 8 + Math.floor(r() * 3);
      fb.rect(bx, sy + 11 - bh, 2, bh, c);
      fb.pset(bx, sy + 13 - bh, 14);
    }
  }
}

export function fireplace(fb: FB, x: number, base: number) {
  stoneWall(fb, x - 26, base - 50, 52, 50, 8, 0);
  fb.rect(x - 18, base - 28, 36, 28, 0);
  fb.ellipse(x, base - 28, 18, 6, 0);
  fb.rect(x - 30, base - 54, 60, 5, 6);
}

export function fire(fb: FB, x: number, base: number, t: number, s = 1) {
  const r = rng(Math.floor(t * 10));
  fb.hline(x - 10 * s, x + 10 * s, base - 1, 6);
  for (let i = 0; i < 14; i++) {
    const fx = x + (r() - 0.5) * 16 * s, fh = (6 + r() * 12) * s;
    fb.line(fx, base - 2, fx + (r() - 0.5) * 3, base - 2 - fh, r() < 0.3 ? 14 : r() < 0.6 ? 12 : 4);
  }
}

export function bed(fb: FB, x: number, y: number) {
  fb.rect(x, y, 50, 16, 6);
  fb.rect(x + 2, y - 4, 46, 8, 4);
  fb.rect(x + 2, y - 5, 12, 5, 15);
  fb.rect(x - 2, y - 14, 4, 30, 6);
}

export function cauldron(fb: FB, x: number, base: number, t: number) {
  fb.line(x - 12, base, x - 9, base - 8, 8, 2);
  fb.line(x + 12, base, x + 9, base - 8, 8, 2);
  fb.ellipse(x, base - 12, 13, 9, 0);
  fb.ellipse(x, base - 19, 12, 3, 2);
  const r = rng(Math.floor(t * 4));
  for (let i = 0; i < 3; i++) fb.circle(x - 8 + r() * 16, base - 19 - r() * 2, 1, 10);
  for (let i = 0; i < 3; i++) fb.pset(x - 6 + r() * 12, base - 26 - r() * 14, 7);
}

export function caveWalls(fb: FB, seed: number) {
  fb.rect(0, 0, 320, 200, 0);
  fb.dither(0, 0, 320, 120, 8, 0, 1);
  const r = rng(seed);
  for (let i = 0; i < 26; i++) {
    const x = r() * 320, y = r() * 110;
    fb.ellipse(x, y, 10 + r() * 20, 6 + r() * 10, 8, 0, 0);
    fb.ellipse(x - 3, y - 3, 6 + r() * 6, 3 + r() * 3, 8);
  }
  for (let x = 0; x < 320; x += 14 + r() * 20) {
    const len = 10 + r() * 30;
    fb.poly([[x, 0], [x + 8, 0], [x + 4, len]], 8);
    fb.pset(x + 4, len - 2, 7);
  }
  fb.rect(0, 120, 320, 80, 8);
  fb.dither(0, 120, 320, 80, 8, 6, 2);
  fb.speckle(0, 120, 320, 80, 0, 0.05, seed + 1);
  fb.speckle(0, 120, 320, 80, 7, 0.01, seed + 2);
  fb.hline(0, 319, 120, 0);
}

export function chest(fb: FB, x: number, base: number, open = false) {
  fb.rect(x - 12, base - 12, 24, 12, 6);
  fb.frame(x - 12, base - 12, 24, 12, 0);
  fb.hline(x - 12, x + 11, base - 7, 8);
  if (open) {
    fb.rect(x - 12, base - 22, 24, 9, 6);
    fb.frame(x - 12, base - 22, 24, 9, 0);
    fb.rect(x - 10, base - 12, 20, 3, 0);
  } else {
    fb.ellipse(x, base - 12, 12, 4, 6);
    fb.hline(x - 12, x + 11, base - 12, 0);
    fb.rect(x - 2, base - 10, 4, 4, 14);
    fb.pset(x, base - 8, 0);
  }
}
