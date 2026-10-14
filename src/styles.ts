import { FB } from './gfx';
import { Col, b8, g8, hex, r8, rgb } from './palette';

/**
 * Visual styles. F (pixel-art scenery with LPC character sprites) is the game's look; A to E
 * run from very chunky to smooth and can be picked from the Style menu to compare.
 */
export type StyleId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface Style {
  id: StyleId;
  name: string;
  /** Short description shown in the HUD and style menu. */
  detail: string;
  /** Pixel density: physical pixels per logical 320x200 pixel. */
  k: number;
  /** Density the scenery is drawn at before being scaled up to `k` (defaults to `k`). */
  art?: number;
  /** Blend colour ramps smoothly instead of dithering. */
  smooth: boolean;
  /** Post-process applied to the finished frame. */
  post?: (fb: FB) => void;
  /** Finishing pass baked into a freshly painted background (cheaper than per frame). */
  bgFinish?: (fb: FB) => void;
}

const C64 = ['#000000', '#ffffff', '#813338', '#75cec8', '#8e3c97', '#56ac4d', '#2e2c9b', '#edf171', '#8e5029', '#553800', '#c46c71', '#4a4a4a', '#7b7b7b', '#a9ff9f', '#706deb', '#b2b2b2'].map(hex);
const EGA = ['#000000', '#0000aa', '#00aa00', '#00aaaa', '#aa0000', '#aa00aa', '#aa5500', '#aaaaaa', '#555555', '#5555ff', '#55ff55', '#55ffff', '#ff5555', '#ff55ff', '#ffff55', '#ffffff'].map(hex);

/**
 * Map a colour to the closest flat palette entry or 50% checkerboard of two entries, the way
 * 16-colour Sierra games shaded: big flat areas, clean blends, no noise. High-contrast pairs
 * are penalised so a mid grey never turns into black-and-white static. Cached on 15-bit keys.
 */
function blender(pal: Col[], maxContrast = 9000, flat = 0.8) {
  const cand: [number, number, number, number, number][] = []; // r, g, b, colour a, colour b
  for (let i = 0; i < pal.length; i++)
    for (let j = i; j < pal.length; j++) {
      const a = pal[i], b = pal[j];
      const dr = r8(a) - r8(b), dg = g8(a) - g8(b), db = b8(a) - b8(b);
      const contrast = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
      if (i !== j && contrast > maxContrast) continue;
      cand.push([(r8(a) + r8(b)) / 2, (g8(a) + g8(b)) / 2, (b8(a) + b8(b)) / 2, i, j]);
    }
  const cache = new Int32Array(32768).fill(-1);
  return (r: number, g: number, b: number, odd: boolean): Col => {
    r = r < 0 ? 0 : r > 255 ? 255 : r; g = g < 0 ? 0 : g > 255 ? 255 : g; b = b < 0 ? 0 : b > 255 ? 255 : b;
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    let hit = cache[key];
    if (hit < 0) {
      let bd = Infinity;
      for (let n = 0; n < cand.length; n++) {
        const c = cand[n], dr = c[0] - r, dg = c[1] - g, db = c[2] - b;
        // A slight preference for flat colour keeps large areas calm.
        const d = (dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11) * (c[3] === c[4] ? flat : 1);
        if (d < bd) { bd = d; hit = n; }
      }
      cache[key] = hit;
    }
    const c = cand[hit];
    return pal[odd ? c[4] : c[3]];
  };
}

const toEGA = blender(EGA);
const toC64 = blender(C64, 3500, 0.55);

/** Reduce a 320x200 frame to the EGA palette with flat fills and checkerboard blends. */
function ega(fb: FB) {
  const { w, h, px } = fb;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x, c = px[i];
      px[i] = toEGA(r8(c), g8(c), b8(c), ((x + y) & 1) === 1);
    }
}

/** Halve the resolution (box filter), reduce to the C64 palette, then blow back up. */
function chunky(fb: FB) {
  const { w, h, px } = fb;
  for (let y = 0; y < h; y += 2)
    for (let x = 0; x < w; x += 2) {
      let r = 0, g = 0, b = 0;
      for (const o of [0, 1, w, w + 1]) { const c = px[y * w + x + o]; r += r8(c); g += g8(c); b += b8(c); }
      const c = toC64(r / 4 * 1.06, g / 4 * 1.06, b / 4 * 1.06, (((x + y) >> 1) & 1) === 1);
      px[y * w + x] = px[y * w + x + 1] = px[(y + 1) * w + x] = px[(y + 1) * w + x + 1] = c;
    }
}

/** A gentle cinematic finish for the smoothest style: soft vignette and warm lift. */
function cinematic(fb: FB) {
  const { w, h, px } = fb;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x, c = px[i];
      const dx = x / w - 0.5, dy = y / h - 0.5, v = 1 - Math.max(0, dx * dx + dy * dy - 0.12) * 0.9;
      px[i] = rgb(r8(c) * v + 3, g8(c) * v + 1, b8(c) * v);
    }
}

export const STYLES: Record<StyleId, Style> = {
  A: { id: 'A', name: '160×100 · 16 colours', detail: 'Early home-computer chunky pixels', k: 1, smooth: true, post: chunky },
  B: { id: 'B', name: '320×200 · 16 colours', detail: 'EGA dithering, like the 1989 originals', k: 1, smooth: false, post: ega },
  C: { id: 'C', name: '320×200 · full colour', detail: 'VGA-era pixel art with dithered shading', k: 1, smooth: false },
  D: { id: 'D', name: '640×400 · smooth', detail: 'Double resolution, smooth shading', k: 2, smooth: true },
  E: { id: 'E', name: '960×600 · illustrated', detail: 'Triple resolution, soft cinematic finish', k: 3, smooth: true, bgFinish: cinematic },
  F: { id: 'F', name: 'Pixel art · LPC characters', detail: '320×200 scenery with sprite characters drawn at 3× detail', k: 3, art: 1, smooth: false },
};

export const STYLE_ORDER: StyleId[] = ['F', 'A', 'B', 'C', 'D', 'E'];

/** The game's look unless the player picks another style to compare. */
export const DEFAULT_STYLE: StyleId = 'F';

const KEY = 'thornwick.style';
let forced: StyleId | null = (() => {
  try { const v = localStorage.getItem(KEY); return v && v in STYLES ? (v as StyleId) : null; } catch { return null; }
})();

export const forcedStyle = () => forced;

export function setForcedStyle(id: StyleId | null) {
  forced = id;
  try { if (id) localStorage.setItem(KEY, id); else localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}

export function styleFor(): Style {
  return STYLES[forced ?? DEFAULT_STYLE];
}
