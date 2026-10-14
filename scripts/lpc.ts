/**
 * Builds the character sprite sheets from the Liberated Pixel Cup library
 * (https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator).
 *
 * For every character in lpc-cast.ts it downloads the layers it needs, recolours them,
 * stacks them, and writes one sheet per animation to src/art/lpc/<id>-<anim>.png. Each
 * sheet is a grid with one row per direction (up, left, down, right; hurt has one row)
 * and square cells; big weapon swings use larger cells, centred on the 64px body.
 * It also writes CREDITS.md, which the LPC licences require.
 *
 *   npm run lpc            # every character
 *   npm run lpc -- hero    # just these
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import sharp from 'sharp';
import { Anim, CAST, EXTRA_RAMPS } from './lpc-cast';

const REPO = 'https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator.git';
const RAW = 'https://raw.githubusercontent.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator/HEAD/';
const CACHE = 'art/lpc-cache';
const OUT = 'src/art/lpc';

const FRAMES: Record<Anim, number> = { walk: 9, slash: 6, thrust: 8, spellcast: 7, hurt: 6 };
const ROWS: Record<Anim, number> = { walk: 4, slash: 4, thrust: 4, spellcast: 4, hurt: 1 };
const ALIASES: Record<Anim, string[]> = {
  walk: ['walk'], slash: ['slash', 'attack_slash'], thrust: ['thrust', 'attack_thrust'], spellcast: ['spellcast'], hurt: ['hurt'],
};
const BEHIND = ['bg', 'behind', 'background', 'universal_behind'];
const BASE: Record<string, string> = { cloth: 'white', hair: 'orange', body: 'light', metal: 'steel', wood: 'maple' };

async function cached(path: string): Promise<Buffer> {
  const file = `${CACHE}/files/${path}`;
  if (existsSync(file)) return readFileSync(file);
  const r = await fetch(RAW + path);
  if (!r.ok) throw new Error(`download failed (${r.status}): ${path}`);
  const buf = Buffer.from(await r.arrayBuffer());
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, buf);
  return buf;
}

/** The list of every file in the LPC repo, from a metadata-only clone. */
function listing(): string[] {
  const list = `${CACHE}/paths.txt`;
  if (!existsSync(list)) {
    mkdirSync(CACHE, { recursive: true });
    if (!existsSync(`${CACHE}/repo`)) execFileSync('git', ['clone', '-q', '--depth', '1', '--filter=blob:none', '--no-checkout', REPO, `${CACHE}/repo`], { stdio: 'inherit' });
    const out = execFileSync('git', ['-C', `${CACHE}/repo`, 'ls-tree', '-r', '--name-only', 'HEAD', 'spritesheets'], { maxBuffer: 1 << 28 }).toString();
    writeFileSync(list, out);
  }
  return readFileSync(list, 'utf8').split('\n').filter(Boolean).map((p) => p.replace(/^spritesheets\//, ''));
}

/** Find the sheet a layer uses for an animation. */
function resolve(paths: string[], prefix: string, variant: string | undefined, behind: boolean, anim: Anim): string | null {
  const names = ALIASES[anim];
  const hits = paths.filter((p) => {
    if (!p.startsWith(prefix + '/')) return false;
    const parts = p.slice(prefix.length + 1).split('/');
    const file = parts.pop()!;
    if (parts.some((d) => BEHIND.includes(d)) !== behind) return false;
    if (variant) return parts.some((d) => names.includes(d)) && file === `${variant}.png`;
    return names.some((n) => file === `${n}.png`);
  });
  hits.sort((a, b) => a.split('/').length - b.split('/').length || a.length - b.length);
  return hits[0] ?? null;
}

const palettes: Record<string, Record<string, string[]>> = {};
async function ramp(material: string, name: string): Promise<number[]> {
  if (!palettes[material]) {
    palettes[material] = JSON.parse((await cached(`palette_definitions/${material}/${material}_ulpc.json`)).toString());
    Object.assign(palettes[material], EXTRA_RAMPS[material] ?? {});
  }
  const r = palettes[material][name];
  if (!r) throw new Error(`no ${material} colour "${name}"`);
  return r.map((h) => parseInt(h.slice(1), 16));
}

interface Layer { data: Uint8Array; w: number; h: number; file: string }

async function loadLayer(spec: string, paths: string[], anim: Anim): Promise<Layer | null> {
  const [body, rec] = spec.split('@');
  const behind = body.endsWith('!bg');
  const [prefix, variant] = body.replace(/!bg$/, '').split('#');
  const file = resolve(paths, prefix, variant, behind, anim);
  if (!file) return null;
  const { data, info } = await sharp(await cached('spritesheets/' + file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const map = new Map<number, number>();
  let hue = 0;
  for (const part of (rec ?? '').split(',').filter(Boolean)) {
    const [m, c] = part.split(':');
    if (m === 'hue') { hue = Number(c); continue; }
    const from = await ramp(m, BASE[m]), to = await ramp(m, c);
    from.forEach((f, i) => map.set(f, to[i]));
  }
  if (map.size)
    for (let i = 0; i < data.length; i += 4) {
      const t = map.get((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
      if (t !== undefined) { data[i] = t >> 16; data[i + 1] = (t >> 8) & 255; data[i + 2] = t & 255; }
    }
  if (hue)
    for (let i = 0; i < data.length; i += 4) if (data[i + 3]) [data[i], data[i + 1], data[i + 2]] = rotateHue(data[i], data[i + 1], data[i + 2], hue);
  return { data: new Uint8Array(data), w: info.width, h: info.height, file };
}

/** Rotate a colour's hue by `deg` degrees, keeping its lightness and saturation. */
function rotateHue(r: number, g: number, b: number, deg: number): [number, number, number] {
  const mx = Math.max(r, g, b) / 255, mn = Math.min(r, g, b) / 255, l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [r, g, b];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = mx === r / 255 ? ((g - b) / 255 / d) % 6 : mx === g / 255 ? (b - r) / 255 / d + 2 : (r - g) / 255 / d + 4;
  h = (((h * 60 + deg) % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [a, b2, c2] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [Math.round((a + m) * 255), Math.round((b2 + m) * 255), Math.round((c2 + m) * 255)];
}

async function build(id: string, credits: Set<string>) {
  const def = CAST[id];
  const paths = listing();
  for (const anim of def.anims) {
    const layers: Layer[] = [];
    for (const spec of def.layers) {
      const l = await loadLayer(spec, paths, anim);
      if (!l) { if (anim === 'walk') console.warn(`  ${id}: no ${anim} sheet for ${spec}`); continue; }
      layers.push(l);
      credits.add(l.file);
    }
    const rows = ROWS[anim], cols = FRAMES[anim];
    const cell = Math.max(64, ...layers.map((l) => l.h / rows));
    const W = cols * cell, H = rows * cell, out = new Uint8Array(W * H * 4);
    for (const l of layers) {
      const c = l.h / rows, off = (cell - c) / 2, lc = Math.min(cols, Math.floor(l.w / c));
      for (let r = 0; r < rows; r++)
        for (let f = 0; f < lc; f++)
          for (let y = 0; y < c; y++)
            for (let x = 0; x < c; x++) {
              const si = ((r * c + y) * l.w + f * c + x) * 4;
              if (l.data[si + 3] < 128) continue;
              const di = ((r * cell + off + y) * W + f * cell + off + x) * 4;
              out[di] = l.data[si]; out[di + 1] = l.data[si + 1]; out[di + 2] = l.data[si + 2]; out[di + 3] = 255;
            }
    }
    await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png({ compressionLevel: 9, palette: true }).toFile(`${OUT}/${id}-${anim}.png`);
  }
  console.log(`${id}: ${def.anims.join(', ')}`);
}

/** CREDITS.md from LPC's own CREDITS.csv, for every file used. */
async function writeCredits(used: Set<string>) {
  const csv = (await cached('CREDITS.csv')).toString();
  const rows = new Map<string, { authors: string; licenses: string; urls: string; notes: string }>();
  const parse = (line: string) => {
    const cells: string[] = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
      else if (ch === ',' && !q) { cells.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    cells.push(cur.trim());
    return cells;
  };
  for (const line of csv.split('\n').slice(1)) {
    if (!line.trim()) continue;
    const [filename, notes, authors, licenses, urls] = parse(line);
    rows.set(filename, { notes, authors, licenses, urls });
  }
  const lines = [
    '# Credits',
    '',
    'Glory of Thornwick is an original game. Its story, code, music and scenery were made for it; no Sierra assets are used.',
    '',
    '## Character sprites',
    '',
    'The characters are built from the [Liberated Pixel Cup](https://lpc.opengameart.org/) sprites, via the',
    '[Universal LPC Spritesheet Character Generator](https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator).',
    'They are used under the licences listed for each file (CC-BY-SA 3.0, CC-BY 3.0/4.0, OGA-BY 3.0, GPL 2.0/3.0 or CC0),',
    'and were recoloured and combined for this game by `scripts/lpc.ts`. The combined sheets in `src/art/lpc` are',
    'shared under the same terms.',
    '',
  ];
  const all = new Set<string>(), files: string[] = [];
  const names = (s: string) => s.split(',').map((a) => a.trim().replace(/;$/, '')).filter(Boolean).map((a) => (a === '??' ? 'unknown artist' : a));
  for (const f of [...used].sort()) {
    const r = rows.get(f) ?? [...rows.entries()].find(([k]) => k.startsWith(dirname(f)))?.[1];
    if (!r) { files.push(`- \`${f}\``); continue; }
    names(r.authors).forEach((a) => all.add(a));
    files.push(`- \`${f}\`: ${names(r.authors).join(', ')}. Licence: ${r.licenses.split(',').map((a) => a.trim()).join(', ')}. ${r.urls.split(',').map((u) => u.trim()).filter(Boolean).map((u) => `<${u}>`).join(' ')}`);
  }
  lines.push(`Artists: ${[...all].sort((a, b) => a.localeCompare(b)).join(', ')}.`, '', '### Files', '', ...files);
  writeFileSync('CREDITS.md', lines.join('\n') + '\n');
}

const only = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
const used = new Set<string>();
for (const id of Object.keys(CAST)) if (!only.length || only.includes(id)) await build(id, used);
if (!only.length) await writeCredits(used);
