import { FB } from './gfx';

/**
 * Optional painted backgrounds (src/art/bg/<room>.png). Vite bundles whatever files exist;
 * rooms without one keep their code-drawn scene. Outside Vite (the art tools) this is empty.
 */
let urls: Record<string, string> = {};
try {
  urls = import.meta.glob('./art/bg/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
} catch {
  urls = {};
}

const loaded = new Map<string, FB>();

export const paintedRooms = () => Object.keys(urls).map((k) => k.replace(/^.*\//, '').replace(/\.png$/, ''));

export function backgroundFor(room: string): FB | null {
  return loaded.get(room) ?? null;
}

/** Decode every painted background into a framebuffer. Resolves even if some fail. */
export async function loadBackgrounds(): Promise<void> {
  const jobs = Object.entries(urls).map(async ([path, url]) => {
    const id = path.replace(/^.*\//, '').replace(/\.png$/, '');
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = 320;
      c.height = 200;
      const ctx = c.getContext('2d')!;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(img, 0, 0, 320, 200);
      const d = ctx.getImageData(0, 0, 320, 200).data;
      const fb = new FB();
      for (let i = 0; i < 320 * 200; i++) fb.px[i] = (d[i * 4] << 16) | (d[i * 4 + 1] << 8) | d[i * 4 + 2];
      loaded.set(id, fb);
    } catch (e) {
      console.warn(`Could not load painted background for ${id}`, e);
    }
  });
  await Promise.all(jobs);
}
