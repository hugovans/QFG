/**
 * Step 2: ask a Gemini image model to repaint each layout. Writes art/raw/<room>.png.
 * Needs GEMINI_API_KEY in the environment (or a .env file). Skips rooms that already have
 * a raw image unless you pass --force.
 *
 *   GEMINI_API_KEY=... npm run art:generate                 # every room
 *   GEMINI_API_KEY=... npm run art:generate -- inn meadow   # just these
 *   GEMINI_IMAGE_MODEL=... to use a different image model
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { GoogleGenAI } from '@google/genai';
import { ROOM_PROMPTS, STYLE } from './art-prompts';

if (existsSync('.env')) for (const line of readFileSync('.env', 'utf8').split('\n')) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.error('Set GEMINI_API_KEY (in your shell or a .env file) to generate art.');
  process.exit(1);
}
const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
const args = process.argv.slice(2);
const force = args.includes('--force');
const rooms = args.filter((a) => !a.startsWith('--'));
const ai = new GoogleGenAI({ apiKey: key });
mkdirSync('art/raw', { recursive: true });

let ok = 0, failed = 0;
for (const [room, desc] of Object.entries(ROOM_PROMPTS)) {
  if (rooms.length && !rooms.includes(room)) continue;
  const out = `art/raw/${room}.png`;
  if (existsSync(out) && !force) { console.log(`skip    ${room} (already generated; --force to redo)`); continue; }
  const layout = `art/layouts/${room}.png`;
  if (!existsSync(layout)) { console.error(`missing ${layout}; run npm run art:layouts first`); failed++; continue; }
  process.stdout.write(`paint   ${room} ... `);
  try {
    const res = await ai.models.generateContent({
      model,
      contents: [{
        role: 'user',
        parts: [
          { text: `${STYLE}\n\nScene: ${desc}` },
          { inlineData: { mimeType: 'image/png', data: readFileSync(layout).toString('base64') } },
        ],
      }],
      config: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '4:3' } } as any,
    });
    const part = res.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data);
    if (!part?.inlineData?.data) throw new Error(res.text || 'no image in response');
    writeFileSync(out, Buffer.from(part.inlineData.data, 'base64'));
    console.log('done');
    ok++;
  } catch (e: any) {
    console.log(`failed: ${e.message ?? e}`);
    failed++;
  }
}
console.log(`\n${ok} painted, ${failed} failed. Next: npm run art:process`);
