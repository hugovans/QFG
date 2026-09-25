import { FB, rng } from './gfx';
import { DUSK, IDENT, NIGHT, PalMap } from './palette';
import { DIR, Look, LOOKS, sprite } from './sprites';
import { NPC, Rect, Room, ROOMS, Side } from './registry';
import { parse, Parsed } from './parser';
import { AUDIO } from './audio';
import { MonsterDef, MONSTERS } from './monsters';
import { Combat, CombatOpts } from './combat';
import * as UI from './ui';
import {
  DAY, Hero, ITEMS, MAX_SCORE, POINTS, Save, Skill, SPELLS, Stat, START_MINUTES, maxHP, maxMP, maxSP,
} from './state';

interface Actor { def: MonsterDef; x: number; y: number; dir: number; frame: number; ft: number; noticed: boolean; wt: number; vx: number; vy: number; opts?: CombatOpts }
interface Corpse { def: MonsterDef; x: number; y: number; looted: boolean }
interface NpcRT { x: number; y: number; dir: number; frame: number; ft: number; pause: number; goal: number; moving: boolean }

/** Words that name each inventory item in the parser. */
export const ITEM_WORDS: Record<string, string[]> = {
  sword: ['sword', 'longsword', 'blade'],
  dagger: ['dagger', 'knife', 'daggers'],
  shield: ['shield'],
  leather: ['armor', 'armour', 'leather'],
  rations: ['ration', 'food', 'bread', 'cheese', 'meat'],
  healing: ['healing potion', 'healing', 'health potion', 'red potion', 'heal'],
  vigor: ['vigor potion', 'vigor', 'stamina potion', 'green potion', 'stamina'],
  mana: ['mana potion', 'mana', 'blue potion', 'magic potion'],
  rocks: ['rock', 'stone', 'pebble'],
  flamelily: ['flame-lily', 'flamelily', 'lily', 'flower', 'lilies', 'flame'],
  faeriedust: ['faerie dust', 'fairy dust', 'dust', 'powder', 'glitter'],
  beard: ['beard', 'troll beard', 'hair'],
  dispel: ['dispel potion', 'dispel', 'potion'],
  ring: ['ring', 'silver ring'],
  chestkey: ['iron key', 'key'],
  brasskey: ['brass key', 'key'],
  lockpick: ['lockpick', 'lock pick', 'pick', 'picks'],
  toolkit: ['toolkit', 'tools', 'kit', 'tool kit'],
  locket: ['locket', 'necklace'],
  purse: ['purse', 'coins', 'money bag'],
};

const SKILL_ATTR: Record<Skill, Stat> = {
  weapon: 'str', parry: 'str', dodge: 'agi', stealth: 'agi', lockpick: 'agi', throwing: 'agi', climbing: 'str', magic: 'int',
};

const SAVE_KEY = 'thornwick.save.';

export class Game {
  S: Save;
  mode: 'title' | 'create' | 'play' | 'combat' | 'end' = 'title';
  fb = new FB();
  bg = new FB();
  bgId = '';
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  img: ImageData;
  t = 0;
  keys: string[] = [];
  target: { x: number; y: number } | null = null;
  moving = false;
  frame = 0;
  ft = 0;
  sneaking = false;
  sneakT = 0;
  monsters: Actor[] = [];
  corpses: Corpse[] = [];
  combat: Combat | null = null;
  combatActor: Actor | null = null;
  minuteAcc = 0;
  doorCool = 0;
  npcRT: Record<string, NpcRT> = {};
  prev: { room: string; x: number; y: number } | null = null;
  hudT = 0;
  titleRoom = 'crossroads';

  // ---- lifecycle ----------------------------------------------------------------

  init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.img = this.ctx.createImageData(320, 200);
    UI.setOnMessageOpen(() => { this.keys = []; this.target = null; });
  }

  start(hero: Hero) {
    this.S = {
      v: 1, hero, room: 'towngate', x: 250, y: 170, dir: DIR.LEFT, minutes: START_MINUTES,
      flags: {}, points: {}, lastMealDay: 1,
    };
    this.mode = 'play';
    this.sneaking = false;
    this.go('towngate', 250, 170, DIR.LEFT);
    this.updateHUD();
  }

  get room(): Room { return ROOMS[this.S.room]; }
  get hero(): Hero { return this.S.hero; }
  get day() { return Math.floor(this.S.minutes / DAY) + 1; }
  get hour() { return (this.S.minutes % DAY) / 60; }
  get isNight() { const h = this.hour; return h >= 21 || h < 5; }
  get isDusk() { const h = this.hour; return (h >= 19 && h < 21) || (h >= 5 && h < 7); }
  get isDay() { return !this.isNight; }

  get heroLook(): Look {
    return this.hero.cls === 'fighter' ? LOOKS.heroFighter : this.hero.cls === 'mage' ? LOOKS.heroMage : LOOKS.heroThief;
  }

  flag(k: string) { return this.S.flags[k]; }
  set(k: string, v: any = true) { this.S.flags[k] = v; }

  // ---- messages & scoring ---------------------------------------------------------

  say(text: string, who?: string, then?: () => void) { UI.say(text, who, then); }

  award(id: string) {
    if (this.S.points[id] || POINTS[id] === undefined) return;
    this.S.points[id] = true;
    AUDIO.sfx('point');
    UI.toast(`Your score went up by ${POINTS[id]}.`);
    this.updateHUD();
  }

  get score() {
    return Object.keys(this.S.points).reduce((a, k) => a + (POINTS[k] ?? 0), 0);
  }

  // ---- inventory -------------------------------------------------------------------

  has(item: string) { return (this.hero.inv[item] ?? 0) > 0; }
  count(item: string) { return this.hero.inv[item] ?? 0; }
  give(item: string, n = 1) {
    this.hero.inv[item] = (this.hero.inv[item] ?? 0) + n;
    this.updateHUD();
  }
  take(item: string, n = 1) {
    this.hero.inv[item] = Math.max(0, (this.hero.inv[item] ?? 0) - n);
    if (this.hero.inv[item] === 0) delete this.hero.inv[item];
    this.updateHUD();
  }
  pay(n: number) {
    if (this.hero.silver < n) return false;
    this.hero.silver -= n;
    AUDIO.sfx('coin');
    this.updateHUD();
    return true;
  }
  earn(n: number) {
    this.hero.silver += n;
    AUDIO.sfx('coin');
    this.updateHUD();
  }

  /** Which carried item the player means, if any. */
  itemIn(p: Parsed, prefer: string[] = []): string | null {
    for (const id of prefer) if (this.has(id) && ITEM_WORDS[id].some((w) => p.has(w))) return id;
    for (const id of Object.keys(this.hero.inv)) if (this.has(id) && ITEM_WORDS[id]?.some((w) => p.has(w))) return id;
    return null;
  }

  // ---- skills ------------------------------------------------------------------------

  skill(s: Skill) { return this.hero.skills[s]; }
  stat(s: Stat) { return this.hero.stats[s]; }

  /** Skills improve with use, a little less as they get higher. */
  train(s: Skill, rate = 1) {
    const v = this.hero.skills[s];
    if (v <= 0) return;
    if (Math.random() < 0.4 * rate * (1 - v / 110)) {
      this.hero.skills[s] = Math.min(100, v + 1);
      if (Math.random() < 0.3) this.trainStat(SKILL_ATTR[s]);
    }
  }

  trainStat(s: Stat) {
    const before = { hp: maxHP(this.hero), sp: maxSP(this.hero), mp: maxMP(this.hero) };
    this.hero.stats[s] = Math.min(100, this.hero.stats[s] + 1);
    this.hero.hp += maxHP(this.hero) - before.hp;
    this.hero.sp += maxSP(this.hero) - before.sp;
    this.hero.mp += maxMP(this.hero) - before.mp;
  }

  /** Probability roll: skill value against a difficulty, nudged by luck. */
  roll(value: number, difficulty: number) {
    const p = Math.max(0.05, Math.min(0.95, 0.5 + (value - difficulty) / 50 + this.hero.stats.luck / 500));
    return Math.random() < p;
  }

  hurt(n: number, cause: string) {
    this.hero.hp -= n;
    AUDIO.sfx('hurt');
    this.updateHUD();
    if (this.hero.hp <= 0) {
      this.hero.hp = 0;
      this.die(cause);
      return true;
    }
    return false;
  }

  heal(hp = 0, sp = 0, mp = 0) {
    const h = this.hero;
    h.hp = Math.min(maxHP(h), h.hp + hp);
    h.sp = Math.min(maxSP(h), h.sp + sp);
    h.mp = Math.min(maxMP(h), h.mp + mp);
    this.updateHUD();
  }

  /** Spend stamina; returns false (and complains) if too tired. */
  tire(n: number) {
    if (this.hero.sp >= n) { this.hero.sp -= n; this.updateHUD(); return true; }
    this.say("You're too exhausted. You need to REST first.");
    return false;
  }

  knows(spell: string) { return this.hero.spells.includes(spell); }

  learn(spell: string) {
    if (this.knows(spell)) return false;
    this.hero.spells.push(spell);
    this.award('learn_' + spell);
    return true;
  }

  /** Cast a spell outside combat. Returns true if the magic went off. */
  cast(spell: string): boolean {
    if (!SPELLS[spell]) { this.say("You don't know any spell by that name."); return false; }
    if (!this.knows(spell)) { this.say(`You don't know the ${SPELLS[spell].name} spell.`); return false; }
    const cost = SPELLS[spell].cost;
    if (this.hero.mp < cost) { this.say("You don't have enough magic power left. Rest a while, or drink a mana potion."); return false; }
    this.hero.mp -= cost;
    AUDIO.sfx('spell');
    this.train('magic', 1.5);
    this.updateHUD();
    return true;
  }

  // ---- time -------------------------------------------------------------------------

  advance(mins: number) {
    const before = this.S.minutes;
    this.S.minutes += mins;
    const h = this.hero;
    h.hp = Math.min(maxHP(h), h.hp + (maxHP(h) / 600) * mins);
    h.sp = Math.min(maxSP(h), h.sp + (maxSP(h) / 200) * mins);
    h.mp = Math.min(maxMP(h), h.mp + (maxMP(h) / 400) * mins);
    // Hunger is judged each morning at seven.
    const firstCheck = Math.floor((before - 7 * 60) / DAY) + 1;
    const lastCheck = Math.floor((this.S.minutes - 7 * 60) / DAY);
    for (let k = firstCheck; k <= lastCheck; k++) {
      const dayOf = k + 1;
      if (this.S.lastMealDay < dayOf - 1) {
        this.say("Your stomach growls painfully. You haven't eaten in over a day, and you feel weak. (Remember to EAT once a day.)");
        this.hero.hp = Math.max(1, this.hero.hp - Math.ceil(maxHP(h) * 0.25));
      }
    }
    const was = Math.floor(before / 60), now = Math.floor(this.S.minutes / 60);
    if (was !== now) this.hourChanged();
  }

  hourChanged() {
    AUDIO.music(this.roomMusic());
    this.updateHUD();
  }

  /** Jump the clock forward to the next occurrence of an hour of day. */
  skipTo(hour: number) {
    const cur = this.S.minutes % DAY;
    let d = hour * 60 - cur;
    if (d <= 0) d += DAY;
    this.advance(d);
    return d;
  }

  timeString() {
    const m = this.S.minutes % DAY;
    let h = Math.floor(m / 60);
    const mm = m % 60;
    const ap = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    return `Day ${this.day}, ${h}:${String(Math.floor(mm)).padStart(2, '0')} ${ap}`;
  }

  // ---- rooms --------------------------------------------------------------------------

  roomMusic() {
    const r = this.room;
    if (!r) return '';
    if (r.music) return r.music();
    if (r.area === 'cave' || r.area === 'fortress') return 'cave';
    if (this.isNight && r.outdoor) return 'night';
    if (r.area === 'town' || r.area === 'inside' || r.area === 'castle') return 'town';
    return 'forest';
  }

  go(id: string, x: number, y: number, dir?: number) {
    const from = this.S.room;
    if (from && from !== id && this.mode === 'play') this.prev = { room: from, x: this.S.x, y: this.S.y };
    this.S.room = id;
    this.S.x = x;
    this.S.y = y;
    if (dir !== undefined) this.S.dir = dir;
    this.monsters = [];
    this.corpses = [];
    this.target = null;
    this.npcRT = {};
    this.doorCool = 0.6;
    const r = this.room;
    const pos = this.findFree(x, y);
    this.S.x = pos[0];
    this.S.y = pos[1];
    const first = !this.S.flags['visited_' + id];
    this.S.flags['visited_' + id] = true;
    AUDIO.music(this.roomMusic());
    r.enter?.(first);
    if (first && !r.enter) this.describe();
    this.rollEncounter();
    this.autosave();
    this.updateHUD();
  }

  describe() {
    const d = this.room.desc;
    this.say(typeof d === 'function' ? d() : d);
  }

  exit(side: Side) {
    const ex = this.room.exits?.[side];
    if (!ex) return false;
    const id = typeof ex === 'function' ? ex() : ex;
    if (id === '') return true; // the exit handled the transition itself
    if (!id) {
      // pushed back from a blocked edge
      if (side === 'left') this.S.x = 6;
      if (side === 'right') this.S.x = 313;
      if (side === 'up') this.S.y = this.room.minY + 5;
      if (side === 'down') this.S.y = (this.room.maxY ?? 199) - 5;
      this.target = null;
      this.keys = [];
      return true;
    }
    const nr = ROOMS[id];
    let x = this.S.x, y = this.S.y;
    if (side === 'left') x = 314;
    if (side === 'right') x = 5;
    if (side === 'up') y = (nr.maxY ?? 199) - 3;
    if (side === 'down') y = nr.minY + 4;
    y = Math.max(nr.minY + 1, Math.min(nr.maxY ?? 199, y));
    this.go(id, x, y);
    return true;
  }

  free(x: number, y: number, room = this.room, npcs = true) {
    if (x < 0 || x > 319 || y < room.minY || y > (room.maxY ?? 199)) return false;
    for (const b of room.blocks ?? []) if (x >= b.x - 3 && x <= b.x + b.w + 3 && y >= b.y && y <= b.y + b.h) return false;
    if (npcs) for (const n of this.visibleNpcs()) {
      const p = this.npcPos(n);
      if (Math.abs(x - p.x) < 7 && Math.abs(y - p.y) < 4) return false;
    }
    return true;
  }

  findFree(x: number, y: number): [number, number] {
    if (this.free(x, y)) return [x, y];
    for (let r = 2; r < 120; r += 2)
      for (let a = 0; a < 16; a++) {
        const nx = x + Math.cos((a / 16) * Math.PI * 2) * r, ny = y + Math.sin((a / 16) * Math.PI * 2) * r * 0.6;
        if (this.free(nx, ny)) return [nx, ny];
      }
    return [x, y];
  }

  near(x: number, y: number, d = 30) {
    return Math.hypot(this.S.x - x, (this.S.y - y) * 1.4) <= d;
  }

  inRect(r: Rect, x = this.S.x, y = this.S.y) {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  /** Walk the hero to a spot (used by the parser when you name something far away). */
  walkTo(x: number, y: number) { this.target = { x, y }; }

  // ---- NPCs -----------------------------------------------------------------------------

  visibleNpcs(): NPC[] {
    return (this.room.npcs ?? []).filter((n) => !n.visible || n.visible());
  }

  npcPos(n: NPC): NpcRT {
    let rt = this.npcRT[n.id];
    if (!rt) rt = this.npcRT[n.id] = { x: n.x, y: n.y, dir: n.dir, frame: 0, ft: 0, pause: 1 + Math.random() * 2, goal: n.x, moving: false };
    return rt;
  }

  findNpc(p: Parsed, text?: string): NPC | null {
    const list = this.visibleNpcs();
    const words = (text ?? `${p.obj} ${p.target}`).split(' ').filter(Boolean);
    for (const n of list) if (n.names.some((nm) => nm.split(' ').every((w) => words.includes(w)))) return n;
    return null;
  }

  // ---- monsters ---------------------------------------------------------------------------

  rollEncounter(bonus = 0) {
    const e = this.room.encounters;
    if (!e || this.mode !== 'play') return;
    if (this.S.minutes - (this.S.flags.lastEnc ?? -999) < 20 && bonus === 0) return;
    let ch = e.chance * (this.isNight ? 1.7 : 1) + bonus;
    if (this.sneaking) ch *= 1 - this.skill('stealth') / 160;
    if (Math.random() >= ch) return;
    const list = this.isNight ? e.night : e.day;
    if (!list.length) return;
    this.spawn(list[Math.floor(Math.random() * list.length)]);
    this.S.flags.lastEnc = this.S.minutes;
  }

  spawn(id: string, x?: number, y?: number, opts?: CombatOpts, noticed = false) {
    const def = MONSTERS[id];
    const r = this.room;
    const sx = x ?? (this.S.x < 160 ? 300 : 20);
    const sy = y ?? r.minY + 8 + Math.random() * ((r.maxY ?? 199) - r.minY - 16);
    const a: Actor = { def, x: sx, y: sy, dir: sx > this.S.x ? DIR.LEFT : DIR.RIGHT, frame: 0, ft: 0, noticed, wt: 0, vx: 0, vy: 0, opts };
    this.monsters.push(a);
    return a;
  }

  startCombat(id: string, opts: CombatOpts = {}, actor: Actor | null = null) {
    if (this.combat) return;
    UI.clearMessages();
    this.keys = [];
    this.target = null;
    this.mode = 'combat';
    this.combatActor = actor;
    this.combat = new Combat(MONSTERS[id], { arena: this.room.arena ?? 'forest', ...opts });
    AUDIO.music('combat');
    UI.$('combat').hidden = false;
    this.combat.syncUI();
  }

  endCombat(outcome: 'win' | 'flee' | 'calm') {
    const c = this.combat!;
    const a = this.combatActor;
    this.combat = null;
    this.combatActor = null;
    this.mode = 'play';
    UI.$('combat').hidden = true;
    const def = c.def;
    if (a) this.monsters = this.monsters.filter((m) => m !== a);
    AUDIO.music(this.roomMusic());
    if (outcome === 'win') {
      if (!c.opts.noCorpse) {
        const pos = a ? [a.x, a.y] : [Math.min(300, this.S.x + 30), this.S.y];
        this.corpses.push({ def, x: pos[0], y: pos[1], looted: false });
      }
      this.award('kill_' + def.id);
      if (c.opts.onWin) c.opts.onWin();
      else this.say(`You have defeated the ${def.name}!${c.opts.noCorpse ? '' : ' (You might SEARCH the BODY.)'}`);
    } else if (outcome === 'calm') {
      if (c.opts.onCalm) c.opts.onCalm();
      else this.say(`The ${def.name}'s eyes glaze over. It yawns, loses all interest in you, and wanders off.`);
    } else {
      if (c.opts.onFlee) c.opts.onFlee();
      else if (this.prev) {
        const p = this.prev;
        this.go(p.room, p.x, p.y);
        this.say('You run for your life, and make it back the way you came.');
      } else this.say('You back away and escape.');
    }
    this.autosave();
    this.updateHUD();
  }

  // ---- update ------------------------------------------------------------------------------

  update(dt: number) {
    this.t += dt;
    if (this.mode === 'combat' && this.combat) {
      if (!UI.msgOpen() && !UI.panelOpen()) this.combat.update(dt);
      return;
    }
    if (this.mode !== 'play' || UI.msgOpen() || UI.panelOpen()) return;
    this.minuteAcc += dt;
    while (this.minuteAcc >= 0.5) { this.minuteAcc -= 0.5; this.advance(1); }
    this.doorCool -= dt;
    this.moveHero(dt);
    this.updateNpcs(dt);
    this.updateMonsters(dt);
    this.room.tick?.(dt);
    this.hudT -= dt;
    if (this.hudT <= 0) { this.hudT = 0.5; this.updateHUD(); }
  }

  moveHero(dt: number) {
    let vx = 0, vy = 0;
    for (const k of this.keys) {
      if (k === 'ArrowLeft') vx -= 1;
      if (k === 'ArrowRight') vx += 1;
      if (k === 'ArrowUp') vy -= 1;
      if (k === 'ArrowDown') vy += 1;
    }
    if (vx || vy) this.target = null;
    else if (this.target) {
      const dx = this.target.x - this.S.x, dy = this.target.y - this.S.y;
      const d = Math.hypot(dx, dy);
      if (d < 1.5) this.target = null;
      else { vx = dx / d; vy = dy / d; }
    }
    if (!vx && !vy) { this.moving = false; this.frame = 0; return; }
    const len = Math.hypot(vx, vy);
    vx /= len; vy /= len;
    this.S.dir = Math.abs(vx) >= Math.abs(vy) * 0.9 ? (vx < 0 ? DIR.LEFT : DIR.RIGHT) : vy < 0 ? DIR.UP : DIR.DOWN;
    const speed = this.sneaking ? 28 : 54;
    let nx = this.S.x + vx * speed * dt;
    let ny = this.S.y + vy * speed * dt * 0.75;
    const r = this.room;
    const maxY = r.maxY ?? 199;
    if (nx < 0.5 && vx < 0 && this.exit('left')) return;
    if (nx > 318.5 && vx > 0 && this.exit('right')) return;
    if (ny < r.minY + 0.5 && vy < 0 && this.exit('up')) return;
    if (ny > maxY - 0.5 && vy > 0 && this.exit('down')) return;
    nx = Math.max(0, Math.min(319, nx));
    ny = Math.max(r.minY, Math.min(maxY, ny));
    const ox = this.S.x, oy = this.S.y;
    if (this.free(nx, ny)) { this.S.x = nx; this.S.y = ny; }
    else if (vx && this.free(nx, oy)) this.S.x = nx;
    else if (vy && this.free(ox, ny)) this.S.y = ny;
    else { this.moving = false; this.target = null; return; }
    this.moving = true;
    this.ft += dt;
    if (this.ft > (this.sneaking ? 0.18 : 0.12)) { this.ft = 0; this.frame = (this.frame + 1) % 4; }
    if (this.sneaking) {
      this.sneakT += dt;
      if (this.sneakT > 4) { this.sneakT = 0; this.train('stealth', 0.6); if (this.skill('stealth') > 0) this.award('sneak_practice'); }
    }
    if (this.doorCool <= 0)
      for (const d of r.doors ?? []) {
        if (!this.inRect(d.rect)) continue;
        if (d.check && !d.check()) { this.S.x = ox; this.S.y = oy - (this.S.dir === DIR.UP ? -4 : 0); this.target = null; this.doorCool = 0.8; return; }
        AUDIO.sfx('door');
        this.go(d.to, d.at[0], d.at[1], d.dir);
        return;
      }
  }

  updateNpcs(dt: number) {
    for (const n of this.visibleNpcs()) {
      const rt = this.npcPos(n);
      if (n.wander) {
        rt.pause -= dt;
        if (rt.pause <= 0) {
          const dx = rt.goal - rt.x;
          if (Math.abs(dx) < 1) {
            rt.goal = n.wander[0] + Math.random() * (n.wander[1] - n.wander[0]);
            rt.pause = 2 + Math.random() * 4;
            rt.moving = false;
          } else {
            const step = Math.sign(dx) * Math.min(Math.abs(dx), 18 * dt);
            if (Math.abs(rt.x + step - this.S.x) < 9 && Math.abs(rt.y - this.S.y) < 5) { rt.pause = 1; rt.moving = false; }
            else { rt.x += step; rt.dir = dx < 0 ? DIR.LEFT : DIR.RIGHT; rt.moving = true; }
          }
        }
      }
      if (!rt.moving) {
        const dx = this.S.x - rt.x, dy = this.S.y - rt.y;
        if (Math.hypot(dx, dy) < 70) rt.dir = Math.abs(dx) > Math.abs(dy) * 1.5 ? (dx < 0 ? DIR.LEFT : DIR.RIGHT) : DIR.DOWN;
        else rt.dir = n.dir;
      }
      rt.ft += dt;
      if (rt.ft > 0.15) { rt.ft = 0; rt.frame = (rt.frame + 1) % 4; }
    }
  }

  updateMonsters(dt: number) {
    for (const m of this.monsters) {
      const dx = this.S.x - m.x, dy = this.S.y - m.y;
      const d = Math.hypot(dx, dy);
      if (!m.noticed) {
        const radius = this.sneaking ? Math.max(25, 110 - this.skill('stealth')) : 180;
        if (d < radius) m.noticed = true;
      }
      let vx: number, vy: number, sp: number;
      if (m.noticed) { vx = dx / (d || 1); vy = dy / (d || 1); sp = m.def.speed; }
      else {
        m.wt -= dt;
        if (m.wt <= 0) { m.wt = 1.5 + Math.random() * 2; const a = Math.random() * Math.PI * 2; m.vx = Math.cos(a); m.vy = Math.sin(a); }
        vx = m.vx; vy = m.vy; sp = m.def.speed * 0.4;
      }
      const nx = m.x + vx * sp * dt, ny = m.y + vy * sp * dt * 0.75;
      if (this.free(nx, ny, this.room, false) || m.noticed) { m.x = Math.max(2, Math.min(317, nx)); m.y = Math.max(this.room.minY, Math.min(this.room.maxY ?? 199, ny)); }
      else m.wt = 0;
      m.dir = Math.abs(vx) >= Math.abs(vy) ? (vx < 0 ? DIR.LEFT : DIR.RIGHT) : vy < 0 ? DIR.UP : DIR.DOWN;
      if (m.def.look.kind && m.def.look.kind !== 'human') m.dir = vx < 0 ? DIR.LEFT : DIR.RIGHT;
      m.ft += dt;
      if (m.ft > 0.14) { m.ft = 0; m.frame = (m.frame + 1) % 4; }
      if (m.noticed && d < 12) {
        this.startCombat(m.def.id, m.opts ?? {}, m);
        return;
      }
    }
  }

  // ---- render -------------------------------------------------------------------------------

  ambient(): PalMap {
    if (!this.room.outdoor || this.mode === 'title') return IDENT;
    return this.isNight ? NIGHT : this.isDusk ? DUSK : IDENT;
  }

  render() {
    if (this.mode === 'combat' && this.combat) this.combat.render(this.fb, this.t);
    else if (this.S || this.mode === 'title' || this.mode === 'create') this.drawScene();
    this.fb.toImage(this.img);
    this.ctx.putImageData(this.img, 0, 0);
  }

  drawScene() {
    const r = this.S ? this.room : ROOMS[this.titleRoom];
    const amb = this.S ? this.ambient() : IDENT;
    const ambM = amb === IDENT ? null : amb;
    if (this.bgId !== r.id) { this.bg.map = null; this.bg.clear(0); r.bg(this.bg); this.bgId = r.id; }
    const fb = this.fb;
    fb.map = null;
    fb.copyFrom(this.bg, ambM);
    if (this.S && r.outdoor && this.isNight) this.stars(fb);
    fb.map = ambM;
    r.anim?.(fb, this.t);
    fb.map = null;
    if (this.S && r.lights && (this.isNight || this.isDusk))
      for (const w of r.lights) { fb.rect(w.x, w.y, w.w, w.h, 14); fb.vline(w.x + (w.w >> 1), w.y, w.y + w.h - 1, 6); fb.hline(w.x, w.x + w.w - 1, w.y + (w.h >> 1), 6); }
    if (!this.S) return;
    const sm = r.outdoor && this.isNight ? DUSK : null;
    const list: { y: number; draw: () => void }[] = [];
    for (const p of r.props ?? []) if (!p.visible || p.visible()) list.push({ y: p.y, draw: () => { fb.map = ambM; p.draw(fb, this.t); fb.map = null; } });
    for (const n of this.visibleNpcs()) {
      const rt = this.npcPos(n);
      const L = typeof n.look === 'function' ? n.look() : n.look;
      const act = rt.moving ? 'walk' : typeof n.act === 'function' ? n.act() : n.act ?? 'stand';
      list.push({ y: rt.y, draw: () => fb.blit(sprite(L, rt.dir, rt.frame, act), rt.x, rt.y, { map: sm }) });
    }
    for (const c of this.corpses) list.push({ y: c.y - 8, draw: () => fb.blit(sprite(c.def.look, 3, 0, 'dead'), c.x, c.y, { map: sm }) });
    for (const m of this.monsters) list.push({ y: m.y, draw: () => fb.blit(sprite(m.def.look, m.dir, m.frame, 'walk'), m.x, m.y, { map: sm }) });
    list.push({ y: this.S.y, draw: () => fb.blit(sprite(this.heroLook, this.S.dir, this.frame, this.moving ? 'walk' : 'stand'), this.S.x, this.S.y, { map: sm }) });
    list.sort((a, b) => a.y - b.y);
    for (const d of list) d.draw();
  }

  stars(fb: FB) {
    const r = rng(77);
    const tw = Math.floor(this.t * 2);
    for (let i = 0; i < 70; i++) {
      const x = Math.floor(r() * 320), y = Math.floor(r() * 110);
      const c = this.bg.get(x, y);
      if (c !== 9 && c !== 11) continue;
      if ((i + tw) % 11 === 0) continue;
      fb.pset(x, y, i % 5 === 0 ? 15 : 7);
    }
    const mx = 40 + ((this.S.minutes % DAY) / DAY) * 240;
    if (this.bg.get(mx, 18) === 9) { fb.circle(mx, 18, 6, 15); fb.circle(mx + 3, 16, 5, 1); }
  }

  // ---- HUD -------------------------------------------------------------------------------------

  updateHUD() {
    if (!this.S) return;
    const h = this.hero;
    UI.$('st-score').textContent = `Score: ${this.score} of ${MAX_SCORE}`;
    UI.$('st-name').textContent = `${h.name} the ${h.cls === 'fighter' ? 'Fighter' : h.cls === 'mage' ? 'Magic User' : 'Thief'}`;
    UI.meter('m-hp', h.hp, maxHP(h));
    UI.meter('m-sp', h.sp, maxSP(h));
    UI.meter('m-mp', h.mp, maxMP(h));
    UI.$('hud-time').textContent = this.timeString();
    UI.$('hud-silver').textContent = `${h.silver} silver`;
    UI.$('hud-room').textContent = this.room?.name ?? '';
    UI.$('btn-sneak').setAttribute('aria-pressed', String(this.sneaking));
  }

  // ---- saving --------------------------------------------------------------------------------

  saveTo(slot: string) {
    try {
      localStorage.setItem(SAVE_KEY + slot, JSON.stringify({ at: Date.now(), room: this.room.name, score: this.score, name: this.hero.name, state: this.S }));
      return true;
    } catch { return false; }
  }

  autosave() { if (this.mode === 'play') this.saveTo('auto'); }

  listSaves() {
    const out: { slot: string; at: number; room: string; score: number; name: string }[] = [];
    for (const slot of ['auto', '1', '2', '3']) {
      try {
        const raw = localStorage.getItem(SAVE_KEY + slot);
        if (raw) { const d = JSON.parse(raw); out.push({ slot, at: d.at, room: d.room, score: d.score, name: d.name }); }
      } catch { /* storage unavailable */ }
    }
    return out;
  }

  loadFrom(slot: string) {
    try {
      const raw = localStorage.getItem(SAVE_KEY + slot);
      if (!raw) return false;
      const d = JSON.parse(raw);
      this.S = d.state;
      this.mode = 'play';
      this.combat = null;
      UI.$('combat').hidden = true;
      UI.clearMessages();
      this.monsters = [];
      this.corpses = [];
      this.npcRT = {};
      this.bgId = '';
      this.prev = null;
      this.sneaking = false;
      AUDIO.music(this.roomMusic());
      this.updateHUD();
      return true;
    } catch { return false; }
  }

  // ---- death & victory ------------------------------------------------------------------------

  die(text: string, title = 'You have died') {
    if (this.mode === 'end') return;
    this.mode = 'end';
    this.combat = null;
    UI.$('combat').hidden = true;
    UI.clearMessages();
    AUDIO.music('death');
    this.onEnd?.('death', title, text);
  }

  win(title: string, text: string) {
    this.mode = 'end';
    UI.clearMessages();
    AUDIO.music('victory');
    this.onEnd?.('win', title, text);
  }

  onEnd: ((kind: 'death' | 'win', title: string, text: string) => void) | null = null;

  // ---- parser dispatch --------------------------------------------------------------------------

  command(input: string) {
    if (this.mode !== 'play') return;
    const p = parse(input);
    if (!p.verb) return;
    if (this.meta(p)) return;
    if (this.room.handle?.(p)) return;
    if (this.people(p)) return;
    this.generic(p);
  }

  onMeta: ((what: string) => void) | null = null;

  meta(p: Parsed) {
    switch (p.verb) {
      case 'help': this.onMeta?.('help'); return true;
      case 'inventory': this.onMeta?.('inventory'); return true;
      case 'stats': this.onMeta?.('stats'); return true;
      case 'save': this.onMeta?.('save'); return true;
      case 'load': this.onMeta?.('load'); return true;
      case 'restart': this.onMeta?.('restart'); return true;
      case 'sound': this.say(AUDIO.toggle() ? 'Sound on.' : 'Sound off.'); return true;
      case 'score': this.say(`Your score is ${this.score} of a possible ${MAX_SCORE}.`); return true;
      case 'time': this.say(`It is ${this.timeString()}. ${this.isNight ? 'Night has fallen over the valley.' : this.isDusk ? 'The light is fading.' : 'It is daytime.'}`); return true;
    }
    return false;
  }

  people(p: Parsed): boolean {
    const npcs = this.visibleNpcs();
    if (p.verb === 'talk' || p.verb === 'ask') {
      const n = (p.verb === 'ask' ? this.findNpc(p, p.obj) : this.findNpc(p)) ?? (npcs.length === 1 ? npcs[0] : null);
      if (!n) { this.say(npcs.length ? 'Who do you want to talk to?' : "There's nobody here to talk to."); return true; }
      if (p.verb === 'talk' || !p.about) {
        if (n.talk) n.talk();
        else this.topic(n, 'hello');
        return true;
      }
      this.topic(n, p.about);
      return true;
    }
    if (p.verb === 'give') {
      const n = this.findNpc(p, p.target || p.obj) ?? (npcs.length === 1 ? npcs[0] : null);
      const item = this.itemIn(p);
      if (!item) { this.say(p.has('money', 'silver', 'coin', 'gold') ? "Money should be spent properly: try BUY or PAY." : "You don't have that."); return true; }
      if (!n) { this.say("There's no one here to give that to."); return true; }
      if (n.give?.(item)) return true;
      this.say(`${n.name} doesn't want your ${ITEMS[item].name}.`);
      return true;
    }
    if (p.verb === 'look') {
      const n = this.findNpc(p);
      if (n) { this.say(typeof n.desc === 'function' ? n.desc() : n.desc); return true; }
    }
    if (p.verb === 'attack') {
      const n = this.findNpc(p);
      if (n) { this.say(`Attacking ${n.name} would be a poor start to a heroic career.`); return true; }
    }
    return false;
  }

  topic(n: NPC, about: string) {
    const words = new Set(about.toLowerCase().split(/\s+/).filter(Boolean).map((w) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w)));
    const topics = n.topics ?? {};
    for (const key of Object.keys(topics)) {
      if (key === '*') continue;
      const hit = key.split(',').some((kw) => kw.trim().split(' ').every((w) => words.has(w)));
      if (hit) {
        const t = topics[key];
        if (typeof t === 'function') t();
        else this.say(t, n.name);
        return;
      }
    }
    const d = topics['*'];
    if (typeof d === 'function') d();
    else this.say(d ?? `"I don't know anything about that."`, n.name);
  }

  generic(p: Parsed) {
    const r = this.room;
    const thing = (r.things ?? []).find((t) => (!t.visible || t.visible()) && t.names.some((nm) => p.has(nm)));
    const corpse = this.corpses.find((c) => this.near(c.x, c.y, 60));
    const monster = this.monsters.find((m) => p.has(m.def.name.split(' ').pop()!, 'monster', 'creature', 'it'));
    switch (p.verb) {
      case 'look': {
        if (!p.obj && !p.target) { this.describe(); return; }
        if (thing) { this.say(typeof thing.look === 'function' ? thing.look() : thing.look); return; }
        if (monster) { this.say(monster.def.desc); return; }
        if (corpse && p.has('body', 'corpse', corpse.def.name.split(' ').pop()!)) { this.say(`The ${corpse.def.name} lies dead.${corpse.looted ? '' : ' Perhaps you should search it.'}`); return; }
        if (p.has('me', 'self', 'myself', 'hero')) { this.say(this.selfDesc()); return; }
        if (p.has('sky', 'up')) { this.say(r.outdoor ? (this.isNight ? 'Stars glitter over the valley.' : 'The sky over Thornwick is wide and blue.') : 'You see the ceiling. It is not interesting.'); return; }
        if (p.has('ground', 'floor', 'down')) { this.say(r.outdoor ? 'You see nothing on the ground but dirt and grass.' : "The floor is as you'd expect."); return; }
        const it = this.itemIn(p);
        if (it) { this.say(ITEMS[it].desc); return; }
        this.say("You don't see anything like that here.");
        return;
      }
      case 'read': {
        if (thing) { this.say(typeof thing.look === 'function' ? thing.look() : thing.look); return; }
        this.say("There's nothing here to read.");
        return;
      }
      case 'get': case 'pick': case 'steal':
        if (thing) this.say(p.verb === 'steal' ? "Stealing that would be pointless, even for you." : "You can't take that.");
        else if (p.has('body', 'corpse') && corpse) this.say('Carrying corpses around is not heroic. Try SEARCHing it instead.');
        else this.say("You don't see that here.");
        return;
      case 'search':
        if (corpse) { this.searchCorpse(corpse); return; }
        this.say('You search around carefully, but find nothing useful.');
        return;
      case 'attack':
        if (this.monsters.length) { const m = this.monsters[0]; this.startCombat(m.def.id, m.opts ?? {}, m); return; }
        this.say('There is nothing here to fight. Practice on monsters in the woods.');
        return;
      case 'eat': this.eat(p); return;
      case 'drink': this.drink(p); return;
      case 'sleep': this.sleep(); return;
      case 'rest': this.rest(); return;
      case 'sneak':
        this.sneaking = true;
        this.say(this.skill('stealth') > 0 ? 'You begin to move stealthily.' : 'You try to sneak, but you have no training in Stealth. You tiptoe loudly.');
        this.updateHUD();
        return;
      case 'walk': case 'run':
        this.sneaking = false;
        this.say('You walk normally.');
        this.updateHUD();
        return;
      case 'cast': this.castGeneric(p); return;
      case 'climb': this.say(thing ? "You can't climb that." : "There's nothing here worth climbing."); return;
      case 'throw': {
        const it = this.itemIn(p, ['rocks', 'dagger']);
        this.say(it ? `You'd better hang on to your ${ITEMS[it].name}; there's nothing here worth throwing it at.` : "You don't have anything like that to throw.");
        return;
      }
      case 'open': case 'unlock': case 'picklock': case 'force':
        this.say(thing ? "That doesn't open." : "There's nothing here to open.");
        return;
      case 'close': this.say('There is nothing here to close.'); return;
      case 'use': {
        const it = this.itemIn(p);
        if (it === 'healing' || it === 'vigor' || it === 'mana') { this.drink(p); return; }
        if (it === 'rations') { this.eat(p); return; }
        this.say(it ? `Be more specific about how to use your ${ITEMS[it].name}.` : "You don't have that.");
        return;
      }
      case 'drop': {
        const it = this.itemIn(p);
        this.say(it ? `You'd better hold on to your ${ITEMS[it].name}.` : "You don't have that.");
        return;
      }
      case 'wear': this.say(this.has('leather') ? "You're already wearing your armor." : "You have nothing to wear."); return;
      case 'dance': this.say('You dance a little jig. Nobody applauds.'); return;
      case 'jump': this.say('You jump up and down. You feel slightly sillier.'); return;
      case 'swim': this.say("There's no water here worth swimming in."); return;
      case 'pray': this.say('You offer a quick prayer to whoever is listening. You feel a little braver.'); return;
      case 'dig': this.say("You have nothing to dig with, and nothing here seems worth digging for."); return;
      case 'sit': this.say('You sit for a moment, then get up again. Heroism waits for no one.'); return;
      case 'knock': this.say('You knock. Nothing happens.'); return;
      case 'thiefsign':
        if (this.hero.cls === 'thief' || this.flag('knowsSign')) this.say('You discreetly make the thieves\' sign. Nobody here responds.');
        else this.say("You don't know any such sign.");
        return;
      case 'smell': this.say(r.outdoor ? 'You smell pine, grass and a faint whiff of adventure.' : 'It smells like people live here.'); return;
      case 'listen': this.say(r.outdoor ? (this.isNight ? 'Crickets. An owl. Something rustling in the dark.' : 'Birdsong and the wind in the trees.') : 'You hear nothing unusual.'); return;
      case 'touch': this.say('You touch it. Nothing happens.'); return;
      case 'kiss': this.say('Save it for the end of the story.'); return;
      case 'swear': this.say('Such language! You feel less heroic already.'); return;
      case 'wake': this.say("You're already awake. Probably."); return;
      case 'buy': case 'sell': this.say("There's no one here to trade with."); return;
      case 'pay': this.say("There's nobody here to pay."); return;
      case 'answer': this.say('Nobody seems to be waiting for an answer.'); return;
      case 'cut': this.say("There's nothing here that needs cutting."); return;
      case 'enter': this.say('Walk into a doorway to go through it.'); return;
      case 'leave': this.say('Walk off the edge of the screen, or out through a door.'); return;
      case 'yes': case 'no': this.say('Nobody asked you anything.'); return;
      case 'give': case 'talk': case 'ask': return;
    }
    this.say(`I don't understand "${p.raw}". (Type HELP for a list of commands.)`);
  }

  selfDesc() {
    const h = this.hero;
    const hp = h.hp / maxHP(h);
    const state = hp > 0.8 ? 'in fine shape' : hp > 0.5 ? 'a bit battered' : hp > 0.25 ? 'badly hurt' : 'close to death';
    return `You are ${h.name}, a would-be hero and ${h.cls === 'fighter' ? 'fighter' : h.cls === 'mage' ? 'magic user' : 'thief'} by training. You are ${state}. You carry ${h.silver} silver.`;
  }

  searchCorpse(c: Corpse) {
    if (!this.near(c.x, c.y, 40)) { this.walkTo(c.x - 12, c.y); this.say("You'll need to get closer to search it."); return; }
    if (c.looted) { this.say("You've already searched it."); return; }
    c.looted = true;
    this.award('search_body');
    const [lo, hi] = c.def.silver;
    const n = lo + Math.floor(Math.random() * (hi - lo + 1));
    if (c.def.id === 'wolf' || c.def.id === 'saurus') { this.say(`You search the ${c.def.name}. Animals don't carry money. You find only fleas.`); return; }
    if (n > 0) { this.earn(n); this.say(`You search the ${c.def.name} and find ${n} silver.`); }
    else this.say(`You search the ${c.def.name} but find nothing.`);
  }

  eat(p: Parsed) {
    if (p.has('mushroom', 'toadstool')) { this.say('There are no mushrooms here to eat.'); return; }
    if (!this.has('rations')) { this.say("You have nothing to eat. Buy rations at the shop, or a meal at the inn."); return; }
    if (this.S.lastMealDay >= this.day) { this.say("You're not hungry yet. You've already eaten today."); return; }
    this.take('rations');
    this.S.lastMealDay = this.day;
    this.heal(5, 10, 0);
    this.say('You eat a ration: dry bread, hard cheese and leathery meat. Nourishing, if not delicious.');
  }

  drink(p: Parsed) {
    const it = this.itemIn(p, ['healing', 'vigor', 'mana']);
    if (it === 'healing') { this.take('healing'); this.heal(45); this.say('You drink the healing potion. Warmth spreads through you, and your wounds close.'); return; }
    if (it === 'vigor') { this.take('vigor'); this.heal(0, 999); this.say('You drink the vigor potion. Fizzy! You feel ready for anything.'); return; }
    if (it === 'mana') { this.take('mana'); this.heal(0, 0, 35); this.say('You drink the mana potion. Your fingertips tingle with power.'); return; }
    if (it === 'dispel') { this.say("You're not the one under an enchantment. Save the dispel potion for someone who is."); return; }
    if (p.has('water')) { this.say(this.room.outdoor ? 'You find a clean stream and drink. Refreshing.' : 'There is no water here.'); return; }
    if (p.has('ale', 'beer')) { this.say('Try the tavern.'); return; }
    this.say("You don't have anything like that to drink.");
  }

  sleep() {
    const r = this.room;
    if (r.area === 'town' || r.area === 'inside' || r.area === 'castle') { this.say('This is no place to sleep. The Hanged Goose inn has beds.'); return; }
    if (!this.isNight && this.hour < 20) { this.say("It's too early to sleep. You can REST for an hour to recover stamina."); return; }
    this.say('You find a sheltered spot, wrap your cloak around you, and sleep.', undefined, () => {
      this.skipTo(7);
      this.heal(maxHP(this.hero) * 0.6, 999, 999);
      if (r.encounters && Math.random() < 0.35) {
        const list = r.encounters.night.length ? r.encounters.night : r.encounters.day;
        if (list.length) {
          this.spawn(list[Math.floor(Math.random() * list.length)], this.S.x + (this.S.x < 160 ? 60 : -60), this.S.y, undefined, true);
          this.say('You wake with a start. Something is creeping up on you!');
          return;
        }
      }
      this.say('You wake at dawn, stiff but rested.');
    });
  }

  rest() {
    if (this.monsters.some((m) => m.noticed)) { this.say("You can't rest with a monster coming at you!"); return; }
    this.advance(60);
    this.heal(5, maxSP(this.hero) * 0.4, maxMP(this.hero) * 0.25);
    this.say('You rest for an hour.');
    if (this.room.encounters && Math.random() < 0.2) this.rollEncounter(0.5);
  }

  castGeneric(p: Parsed) {
    const spell = Object.keys(SPELLS).find((s) => p.has(s) || p.has(SPELLS[s].name.toLowerCase())) ?? (p.has('dart', 'fire') ? 'flame' : null);
    if (!spell) { this.say('Cast which spell?'); return; }
    if (!this.knows(spell)) { this.say(`You don't know the ${SPELLS[spell].name} spell.`); return; }
    if (spell === 'calm' || spell === 'flame' || spell === 'zap') {
      if (this.monsters.length && spell === 'calm') {
        if (!this.cast('calm')) return;
        const m = this.monsters[0];
        this.monsters = this.monsters.filter((x) => x !== m);
        this.say(`The ${m.def.name} stops, blinks, and wanders off peacefully.`);
        return;
      }
      if (!this.cast(spell)) return;
      this.say(spell === 'zap' ? 'Your weapon crackles with energy for a moment, then fizzles out. Zap is best cast in combat.' : spell === 'flame' ? 'A dart of flame streaks off and fizzles harmlessly. Save it for a fight.' : 'A wave of calm washes over the area. Nothing here needed calming.');
      return;
    }
    if (!this.cast(spell)) return;
    this.say(spell === 'open' ? "Nothing here is locked. The magic dissipates." : "There's nothing here to fetch. The magic dissipates.");
  }
}

export const G = new Game();
