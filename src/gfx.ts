import { BAYER, Col, Grade, PAL16, Ramp, T, b8, g8, mix, r8, rampAt, rgb } from './palette';

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

// ---- value noise ----------------------------------------------------------------------

function hash2(x: number, y: number, seed: number) {
  let h = (x * 374761393 + y * 668265263 + seed * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function noise(x: number, y: number, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed), c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fbm(x: number, y: number, seed = 0, oct = 4) {
  let s = 0, amp = 0.5, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) { s += noise(x * f, y * f, seed + i * 17) * amp; norm += amp; amp *= 0.5; f *= 2; }
  return s / norm;
}

// ---- lighting -------------------------------------------------------------------------

/** Light comes from the upper left, slightly in front. */
const LX = -0.52, LY = -0.62, LZ = 0.58;

export interface ShadeOpts {
  amb?: number;
  /** Extra brightness (-1..1) per pixel, e.g. texture noise. */
  tex?: (x: number, y: number) => number;
  /** Only paint pixels where this returns true. */
  clip?: (x: number, y: number) => boolean;
  dither?: number;
  /** Overall brightness multiplier/offset. */
  bright?: number;
  rim?: number;
}

function lightAt(nx: number, ny: number, nz: number, o: ShadeOpts) {
  const amb = o.amb ?? 0.22;
  const d = Math.max(0, nx * LX + ny * LY + nz * LZ);
  let i = amb + (1 - amb) * d;
  if (o.rim) i += o.rim * Math.max(0, 1 - nz) * (nx > 0 ? 1 : 0.4);
  return i * (o.bright ?? 1);
}

/**
 * A 24-bit framebuffer (0xRRGGBB, with T meaning transparent) plus painterly shaders.
 * Colours below 16 are read as the legacy 16-colour palette.
 */
export class FB {
  w: number;
  h: number;
  px: Uint32Array;

  constructor(w = W, h = H, fill: Col = 0) {
    this.w = w;
    this.h = h;
    this.px = new Uint32Array(w * h).fill(fill);
  }

  clear(c: Col = 0) { this.px.fill(c); }

  pset(x: number, y: number, c: Col) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || c === T) return;
    this.px[y * this.w + x] = c < 16 ? PAL16[c] : c;
  }

  get(x: number, y: number): Col {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return T;
    return this.px[y * this.w + x];
  }

  /** Alpha-blend a colour onto a pixel. */
  blend(x: number, y: number, c: Col, a: number) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || a <= 0) return;
    const i = y * this.w + x, d = this.px[i];
    if (d === T) return;
    this.px[i] = a >= 1 ? c : mix(d, c, a);
  }

  hline(x0: number, x1: number, y: number, c: Col) {
    y = Math.floor(y);
    if (y < 0 || y >= this.h) return;
    const a = Math.max(0, Math.floor(Math.min(x0, x1))), b = Math.min(this.w - 1, Math.floor(Math.max(x0, x1)));
    const v = c < 16 ? PAL16[c] : c;
    for (let x = a; x <= b; x++) this.px[y * this.w + x] = v;
  }

  vline(x: number, y0: number, y1: number, c: Col) {
    for (let y = Math.floor(Math.min(y0, y1)); y <= Math.max(y0, y1); y++) this.pset(x, y, c);
  }

  rect(x: number, y: number, w: number, h: number, c: Col) {
    for (let yy = 0; yy < h; yy++) this.hline(x, x + w - 1, y + yy, c);
  }

  frame(x: number, y: number, w: number, h: number, c: Col) {
    this.hline(x, x + w - 1, y, c); this.hline(x, x + w - 1, y + h - 1, c);
    this.vline(x, y, y + h - 1, c); this.vline(x + w - 1, y, y + h - 1, c);
  }

  line(x0: number, y0: number, x1: number, y1: number, c: Col, thick = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      if (thick <= 1) this.pset(x0, y0, c); else this.rect(x0 - (thick >> 1), y0 - (thick >> 1), thick, thick, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, c: Col) {
    for (let dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy++) {
      const k = 1 - (dy * dy) / (ry * ry + 0.01);
      if (k < 0) continue;
      const half = rx * Math.sqrt(k);
      this.hline(cx - half, cx + half, cy + dy, c);
    }
  }

  circle(cx: number, cy: number, r: number, c: Col) { this.ellipse(cx, cy, r, r, c); }

  /** Run a shader over every pixel of a rectangle; return T to skip a pixel. */
  fill(x0: number, y0: number, w: number, h: number, fn: (x: number, y: number) => Col) {
    const xa = Math.max(0, Math.floor(x0)), ya = Math.max(0, Math.floor(y0));
    const xb = Math.min(this.w - 1, Math.ceil(x0 + w - 1)), yb = Math.min(this.h - 1, Math.ceil(y0 + h - 1));
    for (let y = ya; y <= yb; y++)
      for (let x = xa; x <= xb; x++) {
        const c = fn(x, y);
        if (c !== T) this.px[y * this.w + x] = c;
      }
  }

  /** Scanline polygon fill; `fn` may be a colour or a per-pixel shader. */
  poly(pts: number[][], fn: Col | ((x: number, y: number) => Col)) {
    let minY = Infinity, maxY = -Infinity;
    for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
    const shader = typeof fn === 'function' ? fn : null;
    for (let y = Math.max(0, Math.floor(minY)); y <= Math.min(this.h - 1, Math.ceil(maxY)); y++) {
      const yc = y + 0.5, xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const xa = Math.max(0, Math.round(xs[i])), xb = Math.min(this.w - 1, Math.round(xs[i + 1]) - 1);
        for (let x = xa; x <= xb; x++) {
          const c = shader ? shader(x, y) : (fn as Col);
          if (c !== T) this.px[y * this.w + x] = c < 16 ? PAL16[c] : c;
        }
      }
    }
  }

  /** A lit ellipsoid: the workhorse for foliage, rocks, heads, bodies and clouds. */
  sphere(cx: number, cy: number, rx: number, ry: number, ramp: Ramp, o: ShadeOpts = {}) {
    if (rx <= 0 || ry <= 0) return;
    const dith = o.dither ?? 1;
    this.fill(cx - rx - 1, cy - ry - 1, rx * 2 + 3, ry * 2 + 3, (x, y) => {
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry, d = nx * nx + ny * ny;
      if (d > 1) return T;
      if (o.clip && !o.clip(x, y)) return T;
      let i = lightAt(nx, ny, Math.sqrt(1 - d), o);
      if (o.tex) i += o.tex(x, y);
      return rampAt(ramp, i, x, y, dith);
    });
  }

  /** A tapered capsule (arms, legs, branches, blades), lit across its width. */
  limb(x0: number, y0: number, x1: number, y1: number, r0: number, r1: number, ramp: Ramp, o: ShadeOpts = {}) {
    const dx = x1 - x0, dy = y1 - y0, len2 = dx * dx + dy * dy || 1e-6;
    const rmax = Math.max(r0, r1);
    const dith = o.dither ?? 1;
    this.fill(Math.min(x0, x1) - rmax - 1, Math.min(y0, y1) - rmax - 1, Math.abs(dx) + rmax * 2 + 3, Math.abs(dy) + rmax * 2 + 3, (x, y) => {
      const px = x + 0.5, py = y + 0.5;
      let t = ((px - x0) * dx + (py - y0) * dy) / len2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const cx = x0 + dx * t, cy = y0 + dy * t, r = r0 + (r1 - r0) * t;
      const ox = px - cx, oy = py - cy, d2 = ox * ox + oy * oy;
      if (d2 > r * r || r <= 0) return T;
      if (o.clip && !o.clip(x, y)) return T;
      const nx = ox / r, ny = oy / r, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      let i = lightAt(nx, ny, nz, o);
      if (o.tex) i += o.tex(x, y);
      return rampAt(ramp, i, x, y, dith);
    });
  }

  /** A polygon lit like a vertical cylinder centred on cx with half-width hw. */
  cylPoly(pts: number[][], cx: number, hw: number, ramp: Ramp, o: ShadeOpts = {}) {
    const dith = o.dither ?? 1;
    this.poly(pts, (x, y) => {
      if (o.clip && !o.clip(x, y)) return T;
      const nx = Math.max(-1, Math.min(1, (x + 0.5 - cx) / hw));
      let i = lightAt(nx, -0.15, Math.sqrt(1 - nx * nx), o);
      if (o.tex) i += o.tex(x, y);
      return rampAt(ramp, i, x, y, dith);
    });
  }

  /** A flat polygon with a brightness from a function (for textured surfaces). */
  shadePoly(pts: number[][], ramp: Ramp, fn: (x: number, y: number) => number, dither = 1) {
    this.poly(pts, (x, y) => rampAt(ramp, fn(x, y), x, y, dither));
  }

  /** Dithered vertical gradient through a ramp from brightness t0 (top) to t1 (bottom). */
  gradient(x: number, y: number, w: number, h: number, ramp: Ramp, t0: number, t1: number, tex?: (x: number, y: number) => number) {
    this.fill(x, y, w, h, (px, py) => rampAt(ramp, t0 + ((py - y) / Math.max(1, h - 1)) * (t1 - t0) + (tex ? tex(px, py) : 0), px, py));
  }

  /** Multiply-darken a soft ellipse (contact shadows, ambient occlusion). */
  shadow(cx: number, cy: number, rx: number, ry: number, strength = 0.45) {
    this.fill(cx - rx, cy - ry, rx * 2 + 1, ry * 2 + 1, (x, y) => {
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry, d = nx * nx + ny * ny;
      if (d > 1) return T;
      const c = this.px[y * this.w + x];
      if (c === T) return T;
      const f = 1 - strength * (1 - d) * (1 - d * 0.3);
      return rgb(r8(c) * f, g8(c) * f, b8(c) * f);
    });
  }

  /** Additive light with quadratic falloff (window glow, fire, magic). */
  glow(cx: number, cy: number, r: number, c: Col, intensity = 0.6) {
    const cr = r8(c), cg = g8(c), cb = b8(c);
    this.fill(cx - r, cy - r, r * 2 + 1, r * 2 + 1, (x, y) => {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = (dx * dx + dy * dy) / (r * r);
      if (d >= 1) return T;
      const k = (1 - d) * (1 - d) * intensity, p = this.px[y * this.w + x];
      if (p === T) return T;
      return rgb(r8(p) + cr * k, g8(p) + cg * k, b8(p) + cb * k);
    });
  }

  /** Scatter dithered pixels from a ramp using noise; `density` 0..1. */
  speckle(x: number, y: number, w: number, h: number, c: Col, density: number, seed: number) {
    const r = rng(seed);
    const n = Math.floor(w * h * density);
    for (let i = 0; i < n; i++) this.pset(x + r() * w, y + r() * h, c);
  }

  /** Apply a colour grade to every opaque pixel. */
  grade(fn: Grade) {
    const p = this.px;
    for (let i = 0; i < p.length; i++) if (p[i] !== T) p[i] = fn(p[i]);
  }

  /** Dark selective outline around a sprite's silhouette. */
  outline(dark = 0.42) {
    const { w, h, px } = this;
    const out = px.slice();
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (px[y * w + x] !== T) continue;
        let n = T;
        if (x > 0 && px[y * w + x - 1] !== T) n = px[y * w + x - 1];
        else if (x < w - 1 && px[y * w + x + 1] !== T) n = px[y * w + x + 1];
        else if (y > 0 && px[(y - 1) * w + x] !== T) n = px[(y - 1) * w + x];
        else if (y < h - 1 && px[(y + 1) * w + x] !== T) n = px[(y + 1) * w + x];
        if (n !== T) out[y * w + x] = rgb(r8(n) * dark * 0.6 + 6, g8(n) * dark * 0.55 + 4, b8(n) * dark * 0.6 + 10);
      }
    this.px = out;
  }

  /** Draw a sprite anchored at its bottom centre (or top-left). */
  blit(s: FB, x: number, y: number, opts: { flip?: boolean; fx?: Grade | null; scale?: number; anchor?: 'bc' | 'tl'; alpha?: number } = {}) {
    const sc = opts.scale ?? 1;
    const dw = Math.round(s.w * sc), dh = Math.round(s.h * sc);
    const ox = opts.anchor === 'tl' ? Math.round(x) : Math.round(x - dw / 2);
    const oy = opts.anchor === 'tl' ? Math.round(y) : Math.round(y - dh + 1);
    const fx = opts.fx, a = opts.alpha ?? 1;
    for (let yy = 0; yy < dh; yy++) {
      const ty = oy + yy;
      if (ty < 0 || ty >= this.h) continue;
      const sy = Math.floor(yy / sc);
      for (let xx = 0; xx < dw; xx++) {
        const tx = ox + xx;
        if (tx < 0 || tx >= this.w) continue;
        let sx = Math.floor(xx / sc);
        if (opts.flip) sx = s.w - 1 - sx;
        let c = s.px[sy * s.w + sx];
        if (c === T) continue;
        if (fx) c = fx(c);
        const i = ty * this.w + tx;
        this.px[i] = a < 1 ? mix(this.px[i], c, a) : c;
      }
    }
  }

  copyFrom(src: FB) { this.px.set(src.px); }

  toImage(img: ImageData) {
    const out = new Uint32Array(img.data.buffer), p = this.px;
    for (let i = 0; i < p.length; i++) {
      const c = p[i] === T ? 0 : p[i];
      out[i] = 0xff000000 | ((c & 255) << 16) | (c & 0xff00) | ((c >> 16) & 255);
    }
  }
}

export function mirror(s: FB): FB {
  const o = new FB(s.w, s.h, T);
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) o.px[y * s.w + x] = s.px[y * s.w + (s.w - 1 - x)];
  return o;
}

/** Rotate 90° clockwise (fallen bodies). */
export function rotate90(s: FB): FB {
  const o = new FB(s.h, s.w, T);
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) o.px[x * o.w + (s.h - 1 - y)] = s.px[y * s.w + x];
  return o;
}

/** Trim transparent borders (keeps the bottom-centre anchor meaningful for sprites). */
export function bayerAt(x: number, y: number) { return BAYER[((y & 3) << 2) | (x & 3)] / 16; }

// ---- tiny pixel font (digits and a few symbols) for floating numbers -------------------

const GLYPHS: Record<string, string> = {
  '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111', '4': '101101111001001',
  '5': '111100111001111', '6': '111100111101111', '7': '111001010010010', '8': '111101111101111', '9': '111101111001111',
  '+': '000010111010000', '-': '000000111000000', '!': '010010010000010',
};

export function drawNumber(fb: FB, text: string, x: number, y: number, c: Col, shadow: Col = 0x000000) {
  let cx = Math.round(x - (text.length * 4) / 2);
  for (const ch of text) {
    const g = GLYPHS[ch];
    if (g) for (let i = 0; i < 15; i++) if (g[i] === '1') { const gx = cx + (i % 3), gy = Math.round(y) + Math.floor(i / 3); fb.pset(gx + 1, gy + 1, shadow); fb.pset(gx, gy, c); }
    cx += 4;
  }
}
