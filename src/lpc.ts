import { FB } from './gfx';
import { T } from './palette';

/**
 * Character sprites from the Liberated Pixel Cup library (built by scripts/lpc.ts into
 * src/art/lpc/<id>-<anim>.png). Each sheet has one row per direction in LPC order
 * (up, left, down, right) and square cells; a 64px cell holds a figure about 48px tall,
 * which the game draws at 75% so it matches the scenery. Looks without a sheet keep
 * their code-drawn sprite.
 */
export type LpcAnim = 'walk' | 'slash' | 'thrust' | 'spellcast' | 'hurt';

/** On-screen size relative to the scenery: LPC figures are drawn at 75%. */
export const LPC_SCALE = 0.75;

/** Per-character size tweaks on top of LPC_SCALE. */
const SIZE: Record<string, number> = { troll: 1.3, trollShorn: 1.3, goblin: 0.9, kobold: 0.88 };

/** Game directions (down, up, left, right) to LPC rows (up, left, down, right). */
const ROW = [2, 0, 1, 3];

interface Sheet { fb: FB; cell: number; rows: number; cols: number }

let urls: Record<string, string> = {};
try {
  urls = import.meta.glob('./art/lpc/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
} catch {
  urls = {};
}

const sheets = new Map<string, Sheet>();
const frames = new Map<string, FB>();

/** Whether a look id has LPC sprites. */
export const hasLpc = (id: string) => sheets.has(`${id}-walk`);

export const lpcSize = (id: string) => LPC_SCALE * (SIZE[id] ?? 1);

/** Number of frames in an animation, or 0 if the character doesn't have it. */
export function lpcFrames(id: string, anim: LpcAnim) {
  return sheets.get(`${id}-${anim}`)?.cols ?? 0;
}

/**
 * One frame as a native-resolution sprite. `dir` uses the game's directions; the hurt
 * animation (falling down) only exists facing the viewer.
 */
export function lpcFrame(id: string, anim: LpcAnim, dir: number, frame: number): FB | null {
  const sh = sheets.get(`${id}-${anim}`);
  if (!sh) return null;
  const row = sh.rows === 1 ? 0 : ROW[dir] ?? 2;
  const col = Math.max(0, Math.min(sh.cols - 1, frame));
  const key = `${id}|${anim}|${row}|${col}`;
  let f = frames.get(key);
  if (f) return f;
  f = new FB(sh.cell, sh.cell, T);
  for (let y = 0; y < sh.cell; y++)
    f.px.set(sh.fb.px.subarray((row * sh.cell + y) * sh.fb.w + col * sh.cell, (row * sh.cell + y) * sh.fb.w + (col + 1) * sh.cell), y * sh.cell);
  frames.set(key, f);
  return f;
}

/**
 * Pixels between the bottom of a cell and the figure's feet. LPC bodies stand 4px above
 * the bottom of a 64px cell; bigger cells (weapon swings) are centred on that.
 */
export const lpcFoot = (cell: number) => (cell - 64) / 2 + 4;

/** Head-and-shoulders portrait cut from the front-facing standing frame. */
export function lpcPortrait(id: string): FB | null {
  const f = lpcFrame(id, 'walk', 0, 0);
  if (!f) return null;
  const size = 34, ox = 15, oy = 4;
  const out = new FB(size, size, T);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) out.px[y * size + x] = f.px[(oy + y) * f.w + ox + x];
  return out;
}

/** Decode every sheet. Resolves even if some fail. */
export async function loadLpc(): Promise<void> {
  await Promise.all(Object.entries(urls).map(async ([path, url]) => {
    const name = path.replace(/^.*\//, '').replace(/\.png$/, '');
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, img.width, img.height).data;
      const fb = new FB(img.width, img.height, T);
      for (let i = 0; i < img.width * img.height; i++)
        fb.px[i] = d[i * 4 + 3] < 128 ? T : (d[i * 4] << 16) | (d[i * 4 + 1] << 8) | d[i * 4 + 2];
      const rows = name.endsWith('-hurt') ? 1 : 4, cell = img.height / rows;
      sheets.set(name, { fb, cell, rows, cols: Math.round(img.width / cell) });
    } catch (e) {
      console.warn(`Could not load sprite sheet ${name}`, e);
    }
  }));
}
