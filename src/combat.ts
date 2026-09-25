import { FB, drawNumber, fbm, noise } from './gfx';
import { Col, RAMP, T, fxFlash, fxGlow, fxGrey, fxHurt, gradeNight, mix, rampAt } from './palette';
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
    this.tickFx(dt);
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
    this.burst(200, 120, 0xfff0a0, 12);
    this.popNumber(214, 70, String(n), 0xffe060);
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
          this.burst(140, 112, 0xe8f0ff, 14);
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
    this.shake = 0.22;
    AUDIO.sfx('hurt');
    this.burst(122, 120, 0xff5040, 10);
    this.popNumber(108, 76, '-' + dmg, 0xff7060);
    this.log(ranged ? `The fireball burns you! (${dmg})` : `The ${this.def.name} hits you! (${dmg})`);
    G.updateHUD();
    if (h.hp <= 0) {
      h.hp = 0;
      G.die(`The ${this.def.name} has killed you.\n\nTip: in combat, watch for your foe to flash as it winds up, then Parry or Dodge. Heal up and REST before picking fights.`);
    }
  }

  // ---- effects -------------------------------------------------------------------------

  sparks: { x: number; y: number; vx: number; vy: number; life: number; c: Col }[] = [];
  numbers: { x: number; y: number; text: string; life: number; c: Col }[] = [];
  shake = 0;

  burst(x: number, y: number, c: Col, n = 10) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = 30 + Math.random() * 70;
      this.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life: 0.3 + Math.random() * 0.3, c });
    }
  }

  popNumber(x: number, y: number, text: string, c: Col) { this.numbers.push({ x, y, text, life: 0.9, c }); }

  tickFx(dt: number) {
    for (const p of this.sparks) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt; p.life -= dt; }
    this.sparks = this.sparks.filter((p) => p.life > 0);
    for (const n of this.numbers) { n.y -= 22 * dt; n.life -= dt; }
    this.numbers = this.numbers.filter((n) => n.life > 0);
    if (this.shake > 0) this.shake -= dt;
  }

  // ---- drawing ---------------------------------------------------------------------------

  night = false;

  drawArena(kind: string) {
    const fb = this.bg;
    fb.clear(0);
    this.night = kind !== 'cave' && kind !== 'fortress' && G.isNight;
    if (kind === 'cave') {
      art.caveWalls(fb, 5);
      art.vignette(fb, 0.9);
      return;
    }
    if (kind === 'fortress') {
      art.room(fb, { wall: 'wood', floor: 'stone', wallH: 116, seed: 13 });
      for (let x = 20; x < 320; x += 76) {
        fb.fill(x, 12, 26, 56, (px, py) => rampAt(RAMP.clothRed, 0.45 + (noise(px * 0.4, py * 0.05, x) - 0.5) * 0.4, px, py));
        fb.limb(x + 6, 24, x + 20, 48, 1, 0.5, RAMP.clothYellow); fb.limb(x + 20, 24, x + 6, 48, 1, 0.5, RAMP.clothYellow);
      }
      art.vignette(fb, 0.7);
      return;
    }
    art.sky(fb, 92, 3, 3);
    art.mountains(fb, 84, 44, 9, 0);
    if (kind === 'bridge') {
      art.mountains(fb, 100, 24, 19, 1);
      art.water(fb, 0, 100, 320, 30, 2);
      fb.fill(0, 118, 320, 82, (x, y) => {
        const d = (y - 118) / 82, plank = Math.floor((x - 160) / (8 + d * 18) + 100);
        return rampAt(RAMP.woodPale, 0.35 + d * 0.3 + (Math.abs(((x - 160) / (8 + d * 18)) % 1) < 0.08 ? -0.45 : 0) + ((plank * 7) % 5) / 25 + (noise(x * 0.2, y * 0.5, 3) - 0.5) * 0.2, x, y);
      });
      for (let x = 10; x < 320; x += 44) fb.limb(x, 124, x, 100, 2, 1.8, RAMP.wood);
      fb.limb(0, 104, 320, 104, 1, 1, RAMP.clothBrown);
      return;
    }
    art.hills(fb, 104, 18, 4, RAMP.grass, 0.55);
    art.treeline(fb, 108, 22, 7, RAMP.leafDark, 0.3);
    art.grass(fb, 108, 12);
    fb.fill(0, 140, 320, 60, (x, y) => (fbm(x * 0.03, y * 0.08, 8) > 0.58 ? rampAt(RAMP.dirt, 0.5 + (noise(x, y, 2) - 0.5) * 0.3, x, y) : T));
    art.tree(fb, 8, 170, 34, 5);
    art.tree(fb, 312, 160, 30, 6);
    art.bush(fb, 60, 118, 18, 3); art.bush(fb, 270, 120, 16, 4);
  }

  render(fb: FB, t: number) {
    fb.copyFrom(this.bg);
    const h = G.hero;
    const S = 2.3;
    const ground = 186;
    const heroAct = ({ ready: 'ready', attack: 'attack', parry: 'parry', dodge: 'ready', cast: 'cast', hurt: 'ready' } as const)[this.hs];
    let hx = 106;
    if (this.hs === 'dodge') hx -= 20;
    if (this.hs === 'attack') hx += this.ht > this.hitAt ? 6 : 18;

    const L = this.def.look;
    const beast = !!L.kind && L.kind !== 'human';
    const mAct = this.ms === 'windup' ? 'windup' : this.ms === 'strike' ? 'attack' : this.ms === 'dead' ? 'dead' : beast ? 'stand' : 'ready';
    let mx = 220;
    if (this.ms === 'strike' && !this.def.ranged) mx -= beast ? 28 : 18;
    const tell = this.ms === 'windup' && this.mt < this.def.windup * 0.55 && Math.floor(t * 16) % 2 === 0;
    const mfx = this.mflash > 0 ? fxFlash : this.ms === 'calm' ? fxGrey : tell ? fxGlow : null;

    fb.shadow(hx + 4, ground, 22, 5, 0.5);
    fb.shadow(mx, ground, beast ? 34 : 24 * (L.scale ?? 1), 5, 0.5);
    fb.blit(sprite(G.heroLook, 3, 0, heroAct, S), hx, ground, { fx: this.hflash > 0 ? fxHurt : null });
    fb.blit(sprite(L, 2, 0, mAct, S), mx, ground, { fx: mfx });

    if (this.night) fb.grade(gradeNight);
    if (this.def.look.eye && this.ms !== 'dead') fb.glow(mx + (beast ? -26 : -6), ground - (beast ? 44 : 70 * (L.scale ?? 1)), 10, this.def.look.eye, this.night ? 0.5 : 0.15);
    if (this.zap) { fb.glow(hx + 30, ground - 50, 22, 0x80b0ff, 0.5 + Math.sin(t * 30) * 0.2); for (let i = 0; i < 6; i++) fb.pset(hx + 24 + Math.random() * 30, ground - 70 + Math.random() * 40, 0xd0e8ff); }

    if (this.bolt) {
      const k = this.bolt.t / this.bolt.dur;
      const flame = this.bolt.kind === 'flame';
      const x = flame ? hx + 34 + (mx - hx - 60) * k : mx - 44 - (mx - hx - 60) * k;
      const y = ground - 64 - Math.sin(k * Math.PI) * 12;
      fb.glow(x, y, 26, 0xff8020, 0.7);
      for (let i = 1; i < 6; i++) fb.sphere(x + (flame ? -i * 5 : i * 5), y + Math.sin(i + t * 20), 4 - i * 0.6, 3.4 - i * 0.5, RAMP.fire, { amb: 0.8 });
      fb.sphere(x, y, 5, 4.4, RAMP.fire, { amb: 1 });
    }

    for (const p of this.sparks) { fb.pset(p.x, p.y, p.c); if (p.life > 0.25) fb.pset(p.x - p.vx * 0.01, p.y - p.vy * 0.01, mix(p.c, 0x000000, 0.4)); }
    for (const n of this.numbers) drawNumber(fb, n.text, n.x, n.y, n.life > 0.3 ? n.c : mix(n.c, 0x000000, 0.5));

    bar(fb, 8, 6, 118, h.hp / maxHP(h), 0xe04a3a, 0x3a1210);
    bar(fb, 8, 13, 118, h.sp / maxSP(h), 0x5ac04a, 0x14301a);
    if (maxMP(h) > 0) bar(fb, 8, 20, 118, h.mp / maxMP(h), 0x5a9cf0, 0x101c3a);
    bar(fb, 194, 6, 118, this.mhp / this.mmax, 0xe04a3a, 0x3a1210);

    if (this.shake > 0) {
      const dx = Math.round((Math.random() - 0.5) * 6), dy = Math.round((Math.random() - 0.5) * 4), src = fb.px.slice();
      for (let y = 0; y < 200; y++) for (let x = 0; x < 320; x++) {
        const sx = Math.min(319, Math.max(0, x + dx)), sy = Math.min(199, Math.max(0, y + dy));
        fb.px[y * 320 + x] = src[sy * 320 + sx];
      }
    }
  }
}

function bar(fb: FB, x: number, y: number, w: number, f: number, c: Col, c2: Col) {
  fb.rect(x - 1, y - 1, w + 2, 6, 0x0a0a0e);
  fb.rect(x, y, w, 4, c2);
  const fw = Math.round(w * clamp(f, 0, 1));
  fb.rect(x, y, fw, 4, c);
  fb.hline(x, x + fw - 1, y, mix(c, 0xffffff, 0.45));
  fb.hline(x, x + fw - 1, y + 3, mix(c, 0x000000, 0.35));
}

function an(name: string) {
  if (/^[A-Z]/.test(name)) return 'The ' + name;
  return (/^[aeiou]/i.test(name) ? 'An ' : 'A ') + name;
}
