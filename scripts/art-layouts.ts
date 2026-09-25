/**
 * Step 1: render every room's code-drawn scene (background + props) as a layout reference
 * for the image model. Writes art/layouts/<room>.png at 1280x960 (the game's 4:3 display shape).
 *
 *   npm run art:layouts            # all rooms
 *   npm run art:layouts -- meadow  # one room
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import '../src/rooms/town';
import '../src/rooms/wilds';
import { ROOMS } from '../src/registry';
import { G } from '../src/game';
import { FB } from '../src/gfx';
import { T } from '../src/palette';
import { START_MINUTES } from '../src/state';
import { fbToRGBA } from './png';

// Props look at game flags, so give them a fresh game's state.
G.S = { v: 1, hero: null as any, room: 'towngate', x: 0, y: 0, dir: 0, minutes: START_MINUTES + 240, flags: {}, points: {}, lastMealDay: 1 };

const only = process.argv.slice(2);
mkdirSync('art/layouts', { recursive: true });

for (const room of Object.values(ROOMS)) {
  if (only.length && !only.includes(room.id)) continue;
  const fb = new FB();
  room.bg(fb);
  for (const p of room.props ?? []) {
    const layer = new FB(320, 200, T);
    p.draw(layer);
    for (let i = 0; i < layer.px.length; i++) if (layer.px[i] !== T) fb.px[i] = layer.px[i];
  }
  const png = await sharp(Buffer.from(fbToRGBA(fb.px, 0)), { raw: { width: 320, height: 200, channels: 4 } })
    .resize(1280, 960, { kernel: 'nearest' })
    .png()
    .toBuffer();
  writeFileSync(`art/layouts/${room.id}.png`, png);
  console.log(`layout  ${room.id}`);
}
