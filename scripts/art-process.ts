/**
 * Step 3: turn raw generated paintings into game backgrounds. Each image is resized to
 * 320x200 (the game's pixel grid), reduced to its own 256-colour palette like a real VGA
 * screen, lightly dithered, and written to src/art/bg/<room>.png where the game finds it.
 *
 *   npm run art:process               # every image in art/raw
 *   npm run art:process -- inn        # one room
 *   npm run art:process -- --colors=64 --no-dither
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { encodePNG } from './png';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d);
const COLORS = Number(opt('colors', '256'));
const DITHER = !args.includes('--no-dither');
const rooms = args.filter((a) => !a.startsWith('--'));

/** Median-cut palette from a set of RGB pixels. */
function medianCut(px: Uint8Array, n: number): number[][] {
  const pts: number[][] = [];
  for (let i = 0; i < px.length; i += 4) pts.push([px[i], px[i + 1], px[i + 2]]);
  let boxes = [pts];
  while (boxes.length < n) {
    let bi = -1, bestRange = -1, bestCh = 0;
    boxes.forEach((b, i) => {
      if (b.length < 2) return;
      for (let ch = 0; ch < 3; ch++) {
        let lo = 255, hi = 0;
        for (const p of b) { if (p[ch] < lo) lo = p[ch]; if (p[ch] > hi) hi = p[ch]; }
        const range = (hi - lo) * Math.sqrt(b.length);
        if (range > bestRange) { bestRange = range; bi = i; bestCh = ch; }
      }
    });
    if (bi < 0) break;
    const box = boxes[bi].sort((a, b) => a[bestCh] - b[bestCh]);
    const mid = box.length >> 1;
    boxes.splice(bi, 1, box.slice(0, mid), box.slice(mid));
  }
  return boxes.map((b) => {
    const s = [0, 0, 0];
    for (const p of b) { s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; }
    return s.map((v) => Math.round(v / b.length));
  });
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

function quantize(px: Uint8Array, w: number, h: number) {
  const pal = medianCut(px, COLORS);
  const cache = new Map<number, number>();
  const nearest = (r: number, g: number, b: number) => {
    const k = ((r >> 2) << 12) | ((g >> 2) << 6) | (b >> 2);
    const hit = cache.get(k);
    if (hit !== undefined) return hit;
    let best = 0, bd = Infinity;
    pal.forEach((p, i) => {
      const d = (p[0] - r) ** 2 * 0.3 + (p[1] - g) ** 2 * 0.59 + (p[2] - b) ** 2 * 0.11;
      if (d < bd) { bd = d; best = i; }
    });
    cache.set(k, best);
    return best;
  };
  const out = new Uint8Array(px.length);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const d = DITHER ? (BAYER[((y & 3) << 2) | (x & 3)] / 16 - 0.47) * 10 : 0;
      const p = pal[nearest(Math.max(0, Math.min(255, px[i] + d)), Math.max(0, Math.min(255, px[i + 1] + d)), Math.max(0, Math.min(255, px[i + 2] + d)))];
      out[i] = p[0]; out[i + 1] = p[1]; out[i + 2] = p[2]; out[i + 3] = 255;
    }
  return out;
}

if (!existsSync('art/raw')) { console.error('No art/raw folder yet. Run npm run art:generate first.'); process.exit(1); }
mkdirSync('src/art/bg', { recursive: true });
for (const file of readdirSync('art/raw')) {
  const m = /^([a-z]+)\.(png|jpe?g|webp)$/i.exec(file);
  if (!m || (rooms.length && !rooms.includes(m[1]))) continue;
  const { data } = await sharp(`art/raw/${file}`)
    .removeAlpha().ensureAlpha()
    .resize(320, 200, { fit: 'fill', kernel: 'lanczos3' })
    .modulate({ saturation: 1.08 })
    .sharpen({ sigma: 0.6 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const px = quantize(new Uint8Array(data), 320, 200);
  writeFileSync(`src/art/bg/${m[1]}.png`, encodePNG(320, 200, px));
  console.log(`bg      ${m[1]}  (${COLORS} colours${DITHER ? ', dithered' : ''})`);
}
console.log('\nDone. Painted rooms replace their code-drawn backgrounds the next time the game builds.');
