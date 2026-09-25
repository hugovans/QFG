import { FB } from './gfx';
import { FLASH, GLOW, GREY } from './palette';
import { sprite } from './sprites';
import type { MonsterDef } from './monsters';
import { G } from './game';
import { AUDIO } from './audio';
import * as UI from './ui';
import * as art from './art';
import { maxHP, maxMP, maxSP, SPELLS } from './state';

export interface CombatOpts {
  arena?: string;
  onWin?: () => void;
  onFlee?: () => void;
  onCalm?: () => void;
  noFlee?: boolean;
  noCorpse?: boolean;
  /** An extra, situational action button (e.g. throwing a potion). */
  special?: { label: string; run: (c: Combat) => void };
}

type HState = 'ready' | 'attack' | 'parry' | 'dodge' | 'cast' | 'hurt';
type MState = 'idle' | 'windup' | 'strike' | 'recover' | 'dead' | 'calm';

const rand = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export class Combat {
  def: MonsterDef;
  opts: CombatOpts;
  mhp: number;
  mmax: number;
  ms: MState = 'idle';
  mt: number;
  mflash = 0;
  hs: HState = 'ready';
  ht = 0;
  hitAt = -1;
  hflash = 0;
  zap = false;
  bolt: { kind: 'flame' | 'fire'; t: number; dur: number } | null = null;
  outcome: 'win' | 'flee' | 'calm' | null = null;
  endT = 0;
  bg = new FB();

  constructor(def: MonsterDef, opts: CombatOpts) {
    this.def = def;
    this.opts = opts;
    this.mhp = this.mmax = def.hp;
    this.mt = 1.2 + Math.random();
    this.drawArena(opts.arena ?? 'forest');
    this.log(`${an(def.name)} attacks! Fight with the buttons below, or the arrow keys.`);
  }

  log(s: string) { UI.$('c-log').textContent = s; }

  syncUI() {
    UI.$('c-name').textContent = this.def.name.replace(/^\w/, (c) => c.toUpperCase());
    for (const s of ['zap', 'flame', 'calm']) UI.$('c-' + s).hidden = !G.knows(s);
    const pot = UI.$('c-potion');
    pot.hidden = !G.has('healing');
    pot.textContent = `Potion (${G.count('healing')})`;
    const sp = UI.$('c-special');
    sp.hidden = !this.opts.special;
    if (this.opts.special) sp.textContent = this.opts.special.label;
    UI.$('c-flee').hidden = !!this.opts.noFlee;
  }

  act(a: string) {
    if (this.outcome || G.mode !== 'combat' || this.hs !== 'ready') return;
    const h = G.hero;
    switch (a) {
      case 'attack':
        if (!this.stamina(2)) return;
        this.hs = 'attack'; this.ht = 0.38; this.hitAt = 0.2;
        break;
      case 'parry':
        if (!this.stamina(1)) return;
        this.hs = 'parry'; this.ht = 0.55;
        break;
      case 'dodge':
        if (!this.stamina(2)) return;
        this.hs = 'dodge'; this.ht = 0.5;
        break;
      case 'zap': case 'flame': case 'calm':
        this.castSpell(a);
        break;
      case 'potion':
        if (!G.has('healing')) { this.log("You don't have any healing potions."); return; }
        G.take('healing');
        h.hp = Math.min(maxHP(h), h.hp + 45);
        this.hs = 'cast'; this.ht = 0.7;
        this.log('You gulp down a healing potion. Your wounds close.');
        this.syncUI();
        break;
      case 'special':
        this.opts.special?.run(this);
        break;
      case 'flee':
        if (this.opts.noFlee) { this.log('There is no escape!'); return; }
        if (Math.random() < 0.35 && this.ms !== 'calm') {
          const d = Math.max(1, rand(this.def.dmg[0], this.def.dmg[1]) - (G.has('leather') ? 2 : 0));
          h.hp -= d;
          AUDIO.sfx('hurt');
          if (h.hp <= 0) { h.hp = 0; G.die(`You turned your back on the ${this.def.name}, and it made you pay for it.`); return; }
        }
        this.outcome = 'flee';
        this.endT = 0.05;
        break;
    }
    G.updateHUD();
  }

  stamina(n: number) {
    const h = G.hero;
    if (h.sp >= n) { h.sp -= n; return true; }
    h.hp -= 1;
    this.log("You're exhausted! Every move costs you health.");
    if (h.hp <= 0) { h.hp = 0; G.die('You fought until you dropped, and then you dropped. Watch your stamina, and REST between fights.'); return false; }
    return true;
  }

  castSpell(s: string) {
    const h = G.hero;
    if (!G.knows(s)) return;
    const cost = SPELLS[s].cost;
    if (h.mp < cost) { this.log('Not enough magic power!'); return; }
    h.mp -= cost;
    this.hs = 'cast'; this.ht = 0.5;
    AUDIO.sfx(s === 'flame' ? 'fire' : 'spell');
    G.train('magic', 1.2);
    if (s === 'zap') { this.zap = true; this.log('Your weapon crackles with magical energy!'); }
    if (s === 'flame') { this.bolt = { kind: 'flame', t: 0, dur: 0.3 }; this.log('You hurl a dart of flame!'); }
    if (s === 'calm') {
      if (this.def.calmable && G.roll(G.skill('magic'), 35)) {
        this.ms = 'calm';
        this.outcome = 'calm';
        this.endT = 1.4;
        this.log(`The ${this.def.name}'s fury drains away...`);
      } else this.log(`The ${this.def.name} shrugs off your Calm spell!`);
    }
  }

  update(dt: number) {
    if (this.mflash > 0) this.mflash -= dt;
    if (this.hflash > 0) this.hflash -= dt;
    if (this.outcome) {
      this.endT -= dt;
      if (this.endT <= 0) G.endCombat(this.outcome);
      return;
    }
    if (this.hs !== 'ready') {
      const before = this.ht;
      this.ht -= dt;
      if (this.hs === 'attack' && before > this.hitAt && this.ht <= this.hitAt) this.heroStrike();
      if (this.ht <= 0) this.hs = 'ready';
    }
    if (this.bolt) {
      this.bolt.t += dt;
      if (this.bolt.t >= this.bolt.dur) {
        const b = this.bolt;
        this.bolt = null;
        if (b.kind === 'flame') this.flameHit();
        else this.monsterStrike(true);
        if (G.mode !== 'combat') return;
      }
    }
    if (this.ms === 'dead' || this.ms === 'calm') return;
    this.mt -= dt;
    if (this.mt > 0) return;
    switch (this.ms) {
      case 'idle': this.ms = 'windup'; this.mt = this.def.windup; break;
      case 'windup':
        this.ms = 'strike'; this.mt = 0.3;
        if (this.def.ranged) { this.bolt = { kind: 'fire', t: 0, dur: 0.32 }; AUDIO.sfx('fire'); }
        else this.monsterStrike(false);
        break;
      case 'strike': this.ms = 'recover'; this.mt = 0.25; break;
      case 'recover': this.ms = 'idle'; this.mt = this.def.idle[0] + Math.random() * (this.def.idle[1] - this.def.idle[0]); break;
    }
  }

  weaponDamage(): [number, number] {
    if (G.has('sword')) return [6, 12];
    if (G.has('dagger')) return [4, 8];
    return [1, 3];
  }

  heroStrike() {
    const h = G.hero;
    let ch = 55 + (G.skill('weapon') - this.def.def) * 0.6 + h.stats.luck / 10 + (this.ms === 'windup' ? 10 : 0);
    ch = clamp(ch, 10, 95);
    if (Math.random() * 100 < ch) {
      const [lo, hi] = this.weaponDamage();
      const dmg = rand(lo, hi) + Math.floor(h.stats.str / 10) + (this.zap ? 9 : 0);
      this.log(this.zap ? `Crack! Lightning leaps from your blade into the ${this.def.name}!` : `You hit the ${this.def.name}!`);
      this.zap = false;
      this.damageMonster(dmg);
      G.train('weapon');
      if (this.ms === 'windup' && Math.random() < 0.35) { this.ms = 'recover'; this.mt = 0.4; this.log(`You hit the ${this.def.name} and break its attack!`); }
    } else {
      AUDIO.sfx('miss');
      this.log('You miss.');
      G.train('weapon', 0.4);
    }
  }

  flameHit() {
    if (Math.random() < 0.6 + G.skill('magic') / 300) {
      this.log(`The flame dart scorches the ${this.def.name}!`);
      this.damageMonster(rand(10, 16) + Math.floor(G.skill('magic') / 10));
    } else this.log(`The ${this.def.name} ducks your flame dart.`);
  }

  damageMonster(n: number) {
    if (this.ms === 'dead') return;
    this.mhp -= n;
    this.mflash = 0.15;
    AUDIO.sfx('hit');
    if (this.mhp <= 0) {
      this.mhp = 0;
      this.ms = 'dead';
      this.outcome = 'win';
      this.endT = 1.3;
      this.log(`The ${this.def.name} falls!`);
    }
  }

  monsterStrike(ranged: boolean) {
    const h = G.hero;
    if (this.hs === 'dodge') {
      if (G.roll(G.skill('dodge') + h.stats.agi / 5, 30)) {
        AUDIO.sfx('miss');
        this.log(ranged ? 'You dive aside as the fireball roars past!' : 'You dodge!');
        G.train('dodge');
        return;
      }
    }
    if (this.hs === 'parry') {
      if (ranged && !G.has('shield')) this.log("You can't parry a fireball with a blade!");
      else {
        let v = G.skill('parry') + (G.has('shield') ? 20 : 0);
        if (ranged) v -= 25;
        if (G.roll(v, 30)) {
          AUDIO.sfx('block');
          this.log(G.has('shield') ? 'Your shield takes the blow!' : 'You parry the blow!');
          G.train('parry');
          return;
        }
      }
    }
    const hit = clamp(35 + this.def.atk * 0.6 - G.skill('dodge') * 0.15 - h.stats.agi * 0.1, 15, 90);
    if (Math.random() * 100 >= hit) {
      AUDIO.sfx('miss');
      this.log(`The ${this.def.name} misses!`);
      return;
    }
    const dmg = Math.max(1, rand(this.def.dmg[0], this.def.dmg[1]) - (G.has('leather') ? 2 : 0));
    h.hp -= dmg;
    this.hflash = 0.2;
    AUDIO.sfx('hurt');
    this.log(ranged ? `The fireball burns you! (${dmg})` : `The ${this.def.name} hits you! (${dmg})`);
    G.updateHUD();
    if (h.hp <= 0) {
      h.hp = 0;
      G.die(`The ${this.def.name} has killed you.\n\nTip: in combat, watch for your foe to flash as it winds up, then Parry or Dodge. Heal up and REST before picking fights.`);
    }
  }

  // ---- drawing ---------------------------------------------------------------------

  drawArena(kind: string) {
    const fb = this.bg;
    fb.clear(0);
    if (kind === 'cave') { art.caveWalls(fb, 5); return; }
    if (kind === 'fortress') {
      art.stoneWall(fb, 0, 0, 320, 118, 8, 0);
      for (const x of [60, 260]) { fb.rect(x - 2, 40, 4, 16, 6); art.fire(fb, x, 42, 0.3, 0.5); }
      fb.rect(0, 118, 320, 82, 7);
      for (let y = 118; y < 200; y += 10) fb.hline(0, 319, y, 8);
      for (let y = 118, r = 0; y < 200; y += 10, r++) for (let x = r % 2 ? 0 : 20; x < 320; x += 40) fb.vline(x, y, y + 9, 8);
      return;
    }
    art.sky(fb, 100, 3, 2);
    art.mountains(fb, 88, 30, 9);
    if (kind === 'bridge') {
      art.water(fb, 0, 96, 320, 24, 2);
      fb.rect(0, 120, 320, 80, 6);
      for (let x = 0; x < 320; x += 9) fb.vline(x, 120, 199, 0);
      fb.rect(0, 112, 320, 3, 6); fb.hline(0, 319, 115, 0);
      for (let x = 10; x < 320; x += 40) fb.rect(x, 104, 4, 16, 6);
      return;
    }
    art.hills(fb, 108, 20, 4, 2, 0);
    for (let i = 0; i < 9; i++) art.tree(fb, 10 + i * 38, 108, 14, 40 + i, 'pine');
    art.grass(fb, 108, 12);
    art.tree(fb, 12, 150, 26, 5);
    art.tree(fb, 305, 145, 24, 6);
  }

  render(fb: FB, t: number) {
    fb.map = null;
    fb.copyFrom(this.bg);
    const h = G.hero;
    const heroAct = ({ ready: 'ready', attack: 'attack', parry: 'parry', dodge: 'ready', cast: 'cast', hurt: 'ready' } as const)[this.hs];
    let hx = 110;
    if (this.hs === 'dodge') hx -= 18;
    if (this.hs === 'attack') hx += this.ht > this.hitAt ? 6 : 16;
    fb.blit(sprite(G.heroLook, 3, 0, heroAct), hx, 182, { scale: 2, map: this.hflash > 0 ? FLASH : null });
    if (this.zap && Math.floor(t * 12) % 2 === 0) for (let i = 0; i < 5; i++) fb.pset(hx + 30 + Math.random() * 14, 120 + Math.random() * 20, 11);

    const L = this.def.look;
    const beast = !!L.kind && L.kind !== 'human';
    const mAct = this.ms === 'windup' ? 'windup' : this.ms === 'strike' ? 'attack' : this.ms === 'dead' ? 'dead' : beast ? 'stand' : 'ready';
    let mx = 214;
    if (this.ms === 'strike' && !this.def.ranged) mx -= beast ? 26 : 16;
    const tell = this.ms === 'windup' && this.mt < this.def.windup * 0.55 && Math.floor(t * 16) % 2 === 0;
    const m = this.mflash > 0 ? FLASH : this.ms === 'calm' ? GREY : tell ? GLOW : null;
    fb.blit(sprite(L, 2, 0, mAct), mx, 182, { scale: 2, map: m });

    if (this.bolt) {
      const k = this.bolt.t / this.bolt.dur;
      const flame = this.bolt.kind === 'flame';
      const x = flame ? hx + 30 + (mx - hx - 50) * k : mx - 40 - (mx - hx - 50) * k;
      const y = 128 - Math.sin(k * Math.PI) * 10;
      for (let i = 1; i < 5; i++) fb.circle(x + (flame ? -i * 4 : i * 4), y, 3 - i * 0.5, i < 2 ? 12 : 4);
      fb.circle(x, y, 4, 12);
      fb.circle(x, y, 2, 14);
    }

    bar(fb, 8, 6, 118, h.hp / maxHP(h), 12, 4);
    bar(fb, 8, 13, 118, h.sp / maxSP(h), 10, 2);
    if (maxMP(h) > 0) bar(fb, 8, 20, 118, h.mp / maxMP(h), 11, 1);
    bar(fb, 194, 6, 118, this.mhp / this.mmax, 12, 4);
  }
}

function bar(fb: FB, x: number, y: number, w: number, f: number, c: number, c2: number) {
  fb.rect(x - 1, y - 1, w + 2, 6, 0);
  fb.rect(x, y, w, 4, c2);
  fb.rect(x, y, Math.round(w * clamp(f, 0, 1)), 4, c);
  fb.hline(x, x + Math.round(w * clamp(f, 0, 1)) - 1, y, 15);
}

function an(name: string) {
  if (/^[A-Z]/.test(name)) return 'The ' + name;
  return (/^[aeiou]/i.test(name) ? 'An ' : 'A ') + name;
}
