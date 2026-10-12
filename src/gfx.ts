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
 *
 * All drawing calls take *logical* coordinates on the game's 320x200 grid. A buffer can
 * have a pixel density `k` (physical pixels per logical pixel): k=1 is the classic
 * 320x200 look, k=2 renders the same scene at 640x400, and so on. Shader callbacks are
 * given logical (possibly fractional) coordinates. Sprites are built at physical size.
 * Colours below 16 are read as the legacy 16-colour palette.
 */
export class FB {
  /** Physical size in pixels. */
  w: number;
  h: number;
  /** Physical pixels per logical pixel. */
  k: number;
  px: Uint32Array;

  constructor(w = W, h = H, fill: Col = 0, k = 1) {
    this.k = k;
    this.w = Math.round(w * k);
    this.h = Math.round(h * k);
    this.px = new Uint32Array(this.w * this.h).fill(fill);
  }

  clear(c: Col = 0) { this.px.fill(c); }

  /** Paint one logical pixel (a k-by-k block). */
  pset(x: number, y: number, c: Col) {
    if (c === T) return;
    const k = this.k, s = k <= 1 ? 1 : Math.round(k);
    const x0 = Math.floor(x * k), y0 = Math.floor(y * k), v = c < 16 ? PAL16[c] : c;
    for (let yy = y0; yy < y0 + s; yy++) {
      if (yy < 0 || yy >= this.h) continue;
      for (let xx = x0; xx < x0 + s; xx++) if (xx >= 0 && xx < this.w) this.px[yy * this.w + xx] = v;
    }
  }

  get(x: number, y: number): Col {
    const px = Math.floor(x * this.k), py = Math.floor(y * this.k);
    if (px < 0 || py < 0 || px >= this.w || py >= this.h) return T;
    return this.px[py * this.w + px];
  }

  /** Alpha-blend a colour onto one logical pixel. */
  blend(x: number, y: number, c: Col, a: number) {
    if (a <= 0) return;
    this.fill(x, y, 1, 1, (px, py) => { const d = this.get(px, py); return d === T ? T : a >= 1 ? c : mix(d, c, a); });
  }

  /** Fill a physical-pixel rectangle (inclusive bounds, clipped). */
  private block(x0: number, y0: number, x1: number, y1: number, c: Col) {
    const v = c < 16 ? PAL16[c] : c;
    const xa = Math.max(0, x0), xb = Math.min(this.w - 1, x1), ya = Math.max(0, y0), yb = Math.min(this.h - 1, y1);
    for (let y = ya; y <= yb; y++) this.px.fill(v, y * this.w + xa, y * this.w + xb + 1);
  }

  hline(x0: number, x1: number, y: number, c: Col) {
    const k = this.k, a = Math.min(x0, x1), b = Math.max(x0, x1);
    const py = Math.floor(y * k);
    this.block(Math.floor(a * k), py, Math.floor((b + 1) * k) - 1, Math.max(py, Math.floor((y + 1) * k) - 1), c);
  }

  vline(x: number, y0: number, y1: number, c: Col) {
    const k = this.k, a = Math.min(y0, y1), b = Math.max(y0, y1);
    const px = Math.floor(x * k);
    this.block(px, Math.floor(a * k), Math.max(px, Math.floor((x + 1) * k) - 1), Math.floor((b + 1) * k) - 1, c);
  }

  rect(x: number, y: number, w: number, h: number, c: Col) {
    const k = this.k;
    this.block(Math.floor(x * k), Math.floor(y * k), Math.floor((x + w) * k) - 1, Math.floor((y + h) * k) - 1, c);
  }

  frame(x: number, y: number, w: number, h: number, c: Col) {
    this.hline(x, x + w - 1, y, c); this.hline(x, x + w - 1, y + h - 1, c);
    this.vline(x, y, y + h - 1, c); this.vline(x + w - 1, y, y + h - 1, c);
  }

  /** A line `thick` logical pixels wide (thin lines stay fairly thin at high density). */
  line(x0: number, y0: number, x1: number, y1: number, c: Col, thick = 1) {
    const k = this.k;
    const pen = thick <= 1 ? Math.max(1, Math.round(k * 0.7)) : Math.max(1, Math.round(thick * k));
    let ax = Math.round(x0 * k), ay = Math.round(y0 * k);
    const bx = Math.round(x1 * k), by = Math.round(y1 * k);
    const dx = Math.abs(bx - ax), dy = -Math.abs(by - ay), sx = ax < bx ? 1 : -1, sy = ay < by ? 1 : -1;
    let err = dx + dy;
    const off = pen >> 1;
    for (;;) {
      this.block(ax - off, ay - off, ax - off + pen - 1, ay - off + pen - 1, c);
      if (ax === bx && ay === by) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; ax += sx; }
      if (e2 <= dx) { err += dx; ay += sy; }
    }
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, c: Col) {
    this.fill(cx - rx - 1, cy - ry - 1, rx * 2 + 3, ry * 2 + 3, (x, y) => {
      const k = this.k, nx = (x + 0.5 / k - cx) / rx, ny = (y + 0.5 / k - cy) / (ry + 0.01);
      return nx * nx + ny * ny <= 1 ? c : T;
    });
  }

  circle(cx: number, cy: number, r: number, c: Col) { this.ellipse(cx, cy, r, r, c); }

  /** Run a shader over every pixel of a logical rectangle; return T to skip a pixel. */
  fill(x0: number, y0: number, w: number, h: number, fn: (x: number, y: number) => Col) {
    const k = this.k;
    const xa = Math.max(0, Math.floor(x0 * k)), ya = Math.max(0, Math.floor(y0 * k));
    const xb = Math.min(this.w - 1, Math.ceil((x0 + w) * k) - 1), yb = Math.min(this.h - 1, Math.ceil((y0 + h) * k) - 1);
    for (let y = ya; y <= yb; y++)
      for (let x = xa; x <= xb; x++) {
        const c = fn(x / k, y / k);
        if (c !== T) this.px[y * this.w + x] = c < 16 ? PAL16[c] : c;
      }
  }

  /** Scanline polygon fill in logical coordinates; `fn` may be a colour or a per-pixel shader. */
  poly(pts: number[][], fn: Col | ((x: number, y: number) => Col)) {
    const k = this.k;
    let minY = Infinity, maxY = -Infinity;
    for (const p of pts) { minY = Math.min(minY, p[1] * k); maxY = Math.max(maxY, p[1] * k); }
    const shader = typeof fn === 'function' ? fn : null;
    for (let y = Math.max(0, Math.floor(minY)); y <= Math.min(this.h - 1, Math.ceil(maxY)); y++) {
      const yc = y + 0.5, xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const ax = pts[i][0] * k, ay = pts[i][1] * k, bx = pts[(i + 1) % pts.length][0] * k, by = pts[(i + 1) % pts.length][1] * k;
        if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const xa = Math.max(0, Math.round(xs[i])), xb = Math.min(this.w - 1, Math.round(xs[i + 1]) - 1);
        for (let x = xa; x <= xb; x++) {
          const c = shader ? shader(x / k, y / k) : (fn as Col);
          if (c !== T) this.px[y * this.w + x] = c < 16 ? PAL16[c] : c;
        }
      }
    }
  }

  /** A lit ellipsoid: the workhorse for foliage, rocks, heads, bodies and clouds. */
  sphere(cx: number, cy: number, rx: number, ry: number, ramp: Ramp, o: ShadeOpts = {}) {
    if (rx <= 0 || ry <= 0) return;
    const dith = o.dither ?? 1, h = 0.5 / this.k;
    this.fill(cx - rx - 1, cy - ry - 1, rx * 2 + 3, ry * 2 + 3, (x, y) => {
      const nx = (x + h - cx) / rx, ny = (y + h - cy) / ry, d = nx * nx + ny * ny;
      if (d > 1) return T;
      if (o.clip && !o.clip(x, y)) return T;
      let i = lightAt(nx, ny, Math.sqrt(1 - d), o);
      if (o.tex) i += o.tex(x, y);
      return rampAt(ramp, i, x * this.k, y * this.k, dith);
    });
  }

  /** A tapered capsule (arms, legs, branches, blades), lit across its width. */
  limb(x0: number, y0: number, x1: number, y1: number, r0: number, r1: number, ramp: Ramp, o: ShadeOpts = {}) {
    const dx = x1 - x0, dy = y1 - y0, len2 = dx * dx + dy * dy || 1e-6;
    const rmax = Math.max(r0, r1);
    const dith = o.dither ?? 1, h = 0.5 / this.k;
    this.fill(Math.min(x0, x1) - rmax - 1, Math.min(y0, y1) - rmax - 1, Math.abs(dx) + rmax * 2 + 3, Math.abs(dy) + rmax * 2 + 3, (x, y) => {
      const px = x + h, py = y + h;
      let t = ((px - x0) * dx + (py - y0) * dy) / len2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const cx = x0 + dx * t, cy = y0 + dy * t, r = r0 + (r1 - r0) * t;
      const ox = px - cx, oy = py - cy, d2 = ox * ox + oy * oy;
      if (d2 > r * r || r <= 0) return T;
      if (o.clip && !o.clip(x, y)) return T;
      const nx = ox / r, ny = oy / r, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      let i = lightAt(nx, ny, nz, o);
      if (o.tex) i += o.tex(x, y);
      return rampAt(ramp, i, x * this.k, y * this.k, dith);
    });
  }

  /** A polygon lit like a vertical cylinder centred on cx with half-width hw. */
  cylPoly(pts: number[][], cx: number, hw: number, ramp: Ramp, o: ShadeOpts = {}) {
    const dith = o.dither ?? 1, h = 0.5 / this.k;
    this.poly(pts, (x, y) => {
      if (o.clip && !o.clip(x, y)) return T;
      const nx = Math.max(-1, Math.min(1, (x + h - cx) / hw));
      let i = lightAt(nx, -0.15, Math.sqrt(1 - nx * nx), o);
      if (o.tex) i += o.tex(x, y);
      return rampAt(ramp, i, x * this.k, y * this.k, dith);
    });
  }

  /** A flat polygon with a brightness from a function (for textured surfaces). */
  shadePoly(pts: number[][], ramp: Ramp, fn: (x: number, y: number) => number, dither = 1) {
    this.poly(pts, (x, y) => rampAt(ramp, fn(x, y), x * this.k, y * this.k, dither));
  }

  /** Dithered vertical gradient through a ramp from brightness t0 (top) to t1 (bottom). */
  gradient(x: number, y: number, w: number, h: number, ramp: Ramp, t0: number, t1: number, tex?: (x: number, y: number) => number) {
    this.fill(x, y, w, h, (px, py) => rampAt(ramp, t0 + ((py - y) / Math.max(1, h - 1)) * (t1 - t0) + (tex ? tex(px, py) : 0), px * this.k, py * this.k));
  }

  /** Multiply-darken a soft ellipse (contact shadows, ambient occlusion). */
  shadow(cx: number, cy: number, rx: number, ry: number, strength = 0.45) {
    this.fill(cx - rx, cy - ry, rx * 2 + 1, ry * 2 + 1, (x, y) => {
      const nx = (x - cx) / rx, ny = (y - cy) / ry, d = nx * nx + ny * ny;
      if (d > 1) return T;
      const c = this.get(x, y);
      if (c === T) return T;
      const f = 1 - strength * (1 - d) * (1 - d * 0.3);
      return rgb(r8(c) * f, g8(c) * f, b8(c) * f);
    });
  }

  /** Additive light with quadratic falloff (window glow, fire, magic). */
  glow(cx: number, cy: number, r: number, c: Col, intensity = 0.6) {
    const cr = r8(c), cg = g8(c), cb = b8(c);
    this.fill(cx - r, cy - r, r * 2 + 1, r * 2 + 1, (x, y) => {
      const dx = x - cx, dy = y - cy, d = (dx * dx + dy * dy) / (r * r);
      if (d >= 1) return T;
      const kk = (1 - d) * (1 - d) * intensity, p = this.get(x, y);
      if (p === T) return T;
      return rgb(r8(p) + cr * kk, g8(p) + cg * kk, b8(p) + cb * kk);
    });
  }

  /** Scatter single logical pixels. */
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

  /** Dark selective outline around a sprite's silhouette (physical pixels). */
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

  /**
   * Draw a sprite (built at physical size) at a logical position, anchored at its bottom
   * centre or top-left. A full-screen layer with the same density blits pixel for pixel.
   */
  blit(s: FB, x: number, y: number, opts: { flip?: boolean; fx?: Grade | null; scale?: number; anchor?: 'bc' | 'tl'; alpha?: number } = {}) {
    const sc = opts.scale ?? 1;
    const dw = Math.round(s.w * sc), dh = Math.round(s.h * sc);
    const px = x * this.k, py = y * this.k;
    const ox = opts.anchor === 'tl' ? Math.round(px) : Math.round(px - dw / 2);
    const oy = opts.anchor === 'tl' ? Math.round(py) : Math.round(py - dh + 1);
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

  copyFrom(src: FB) {
    if (src.px.length === this.px.length) { this.px.set(src.px); return; }
    // different densities: nearest-neighbour resample
    for (let y = 0; y < this.h; y++) {
      const sy = Math.min(src.h - 1, Math.floor((y * src.h) / this.h));
      for (let x = 0; x < this.w; x++) this.px[y * this.w + x] = src.px[sy * src.w + Math.min(src.w - 1, Math.floor((x * src.w) / this.w))];
    }
  }

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
