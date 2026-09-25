import { G } from '../game';
import type { Parsed } from '../parser';
import { FB } from '../gfx';

/** Exit handler that drops the hero at a specific spot in another room. */
export function leave(to: string, x: number, y: number, dir?: number) {
  return () => { G.go(to, x, y, dir); return ''; };
}

export interface Ware {
  id: string;
  words: string[];
  price: number;
  /** Return a refusal message, or null if the sale can go ahead. */
  can?: () => string | null;
  give?: () => void;
}

/** Handle BUY for a shopkeeper. Returns true if the command was about buying. */
export function buy(p: Parsed, wares: Ware[], who: string, list: string): boolean {
  if (p.verb !== 'buy') return false;
  const w = wares.find((x) => x.words.some((k) => p.has(k)));
  if (!w) { G.say(list, who); return true; }
  const no = w.can?.();
  if (no) { G.say(no, who); return true; }
  if (!G.pay(w.price)) { G.say(`"That's ${w.price} silver, and you don't have it."`, who); return true; }
  if (w.give) w.give();
  else { G.give(w.id); G.say(`You pay ${w.price} silver.`, who); }
  return true;
}

export function cobbles(fb: FB, y0: number, y1 = 200) {
  fb.rect(0, y0, 320, y1 - y0, 7);
  for (let y = y0, r = 0; y < y1; y += 5, r++) {
    fb.hline(0, 319, y, 8);
    for (let x = (r % 2) * 5; x < 320; x += 10) fb.vline(x, y, Math.min(y + 4, y1 - 1), 8);
  }
  fb.speckle(0, y0, 320, y1 - y0, 15, 0.01, y0);
}

export const within = (a: number, b: number) => { const h = G.hour; return a <= b ? h >= a && h < b : h >= a || h < b; };
