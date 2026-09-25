import { PalMap, RGBA, T } from './palette';

export const W = 320;
export const H = 200;

/** Seeded PRNG so every scene paints identically each visit. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * An indexed-colour framebuffer. Every write goes through `map` (when set), which is
 * how whole scenes are tinted for dusk and night without redrawing them.
 */
export class FB {
  w: number;
  h: number;
  px: Uint8Array;
  map: PalMap | null = null;

  constructor(w = W, h = H, fill = 0) {
    this.w = w;
    this.h = h;
    this.px = new Uint8Array(w * h).fill(fill);
  }

  clear(c = 0) {
    this.px.fill(c);
  }

  pset(x: number, y: number, c: number) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || c === T) return;
    this.px[y * this.w + x] = this.map ? this.map[c] : c;
  }

  get(x: number, y: number) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return T;
    return this.px[y * this.w + x];
  }

  hline(x0: number, x1: number, y: number, c: number) {
    y = Math.floor(y);
    if (y < 0 || y >= this.h) return;
    let a = Math.floor(Math.min(x0, x1)), b = Math.floor(Math.max(x0, x1));
    if (a < 0) a = 0;
    if (b >= this.w) b = this.w - 1;
    const v = this.map ? this.map[c] : c;
    const row = y * this.w;
    for (let x = a; x <= b; x++) this.px[row + x] = v;
  }

  hlineD(x0: number, x1: number, y: number, a: number, b: number, pat = 0) {
    y = Math.floor(y);
    const s = Math.floor(Math.min(x0, x1)), e = Math.floor(Math.max(x0, x1));
    for (let x = s; x <= e; x++) this.pset(x, y, ditherPick(x, y, a, b, pat));
  }

  vline(x: number, y0: number, y1: number, c: number) {
    for (let y = Math.floor(Math.min(y0, y1)); y <= Math.max(y0, y1); y++) this.pset(x, y, c);
  }

  rect(x: number, y: number, w: number, h: number, c: number) {
    for (let yy = 0; yy < h; yy++) this.hline(x, x + w - 1, y + yy, c);
  }

  /** Two-colour fill. pat 0 = 50% checker, 1 = 25% b, 2 = 12% b, 3 = horizontal stripes. */
  dither(x: number, y: number, w: number, h: number, a: number, b: number, pat = 0) {
    for (let yy = Math.floor(y); yy < y + h; yy++)
      for (let xx = Math.floor(x); xx < x + w; xx++) this.pset(xx, yy, ditherPick(xx, yy, a, b, pat));
  }

  frame(x: number, y: number, w: number, h: number, c: number) {
    this.hline(x, x + w - 1, y, c);
    this.hline(x, x + w - 1, y + h - 1, c);
    this.vline(x, y, y + h - 1, c);
    this.vline(x + w - 1, y, y + h - 1, c);
  }

  line(x0: number, y0: number, x1: number, y1: number, c: number, thick = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      if (thick === 1) this.pset(x0, y0, c);
      else this.rect(x0 - (thick >> 1), y0 - (thick >> 1), thick, thick, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, c: number, c2 = -1, pat = 0) {
    for (let dy = -ry; dy <= ry; dy++) {
      const half = rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry + 0.0001)));
      if (c2 < 0) this.hline(cx - half, cx + half, cy + dy, c);
      else this.hlineD(cx - half, cx + half, cy + dy, c, c2, pat);
    }
  }

  circle(cx: number, cy: number, r: number, c: number, c2 = -1, pat = 0) {
    this.ellipse(cx, cy, r, r, c, c2, pat);
  }

  /** Scanline polygon fill. */
  poly(pts: number[][], c: number, c2 = -1, pat = 0) {
    let minY = Infinity, maxY = -Infinity;
    for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
          xs.push(a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
        }
      }
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        if (c2 < 0) this.hline(Math.round(xs[i]), Math.round(xs[i + 1]), y, c);
        else this.hlineD(Math.round(xs[i]), Math.round(xs[i + 1]), y, c, c2, pat);
      }
    }
  }

  /** Scatter single pixels. */
  speckle(x: number, y: number, w: number, h: number, c: number, density: number, seed: number) {
    const r = rng(seed);
    const n = Math.floor(w * h * density);
    for (let i = 0; i < n; i++) this.pset(x + r() * w, y + r() * h, c);
  }

  /** Draw a sprite (another FB with T as transparent) anchored at its bottom-centre. */
  blit(s: FB, x: number, y: number, opts: { flip?: boolean; map?: PalMap | null; scale?: number; anchor?: 'bc' | 'tl' } = {}) {
    const sc = opts.scale ?? 1;
    const dw = Math.round(s.w * sc), dh = Math.round(s.h * sc);
    const ox = opts.anchor === 'tl' ? Math.round(x) : Math.round(x - dw / 2);
    const oy = opts.anchor === 'tl' ? Math.round(y) : Math.round(y - dh + 1);
    const m = opts.map;
    for (let yy = 0; yy < dh; yy++) {
      const ty = oy + yy;
      if (ty < 0 || ty >= this.h) continue;
      const sy = Math.floor(yy / sc);
      for (let xx = 0; xx < dw; xx++) {
        const tx = ox + xx;
        if (tx < 0 || tx >= this.w) continue;
        let sx = Math.floor(xx / sc);
        if (opts.flip) sx = s.w - 1 - sx;
        const c = s.px[sy * s.w + sx];
        if (c === T) continue;
        this.px[ty * this.w + tx] = m ? m[c] : c;
      }
    }
  }

  copyFrom(src: FB, m: PalMap | null = null) {
    if (!m) { this.px.set(src.px); return; }
    const a = src.px, b = this.px;
    for (let i = 0; i < a.length; i++) b[i] = m[a[i]];
  }

  remap(m: PalMap) {
    const p = this.px;
    for (let i = 0; i < p.length; i++) p[i] = m[p[i]];
  }

  toImage(img: ImageData) {
    const out = new Uint32Array(img.data.buffer);
    const p = this.px;
    for (let i = 0; i < p.length; i++) out[i] = RGBA[p[i]];
  }
}

export function ditherPick(x: number, y: number, a: number, b: number, pat: number) {
  switch (pat) {
    case 1: return (x & 1) === 0 && (y & 1) === 0 ? b : a;
    case 2: return (x & 3) === 0 && (y & 3) === 0 ? b : ((x & 3) === 2 && (y & 3) === 2 ? b : a);
    case 3: return (y & 1) === 0 ? a : b;
    default: return ((x + y) & 1) === 0 ? a : b;
  }
}

/** Nearest-neighbour rotate 90° clockwise (used for fallen bodies). */
export function rotate90(s: FB): FB {
  const o = new FB(s.h, s.w, T);
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++) o.px[x * o.w + (s.h - 1 - y)] = s.px[y * s.w + x];
  return o;
}
