import './rooms/town';
import './rooms/wilds';
import { G } from './game';
import { AUDIO } from './audio';
import * as UI from './ui';
import { ROOMS } from './registry';
import { loadBackgrounds } from './backgrounds';
import { LOOKS, Look, portrait } from './sprites';
import { FB } from './gfx';
import { T } from './palette';
import {
  BONUS_POINTS, CLASSES, ClassDef, ITEMS, MAX_SCORE, SKILL_NAMES, SPELLS, STAT_NAMES, Skill, Stat, maxHP, maxMP, maxSP, newHero,
} from './state';

const canvas = UI.$<HTMLCanvasElement>('screen');
const cmd = UI.$<HTMLInputElement>('cmd');
G.init(canvas);

// ---- title & character creation ---------------------------------------------------------

function showTitle() {
  G.mode = 'title';
  UI.$('combat').hidden = true;
  const saves = G.listSaves();
  UI.showPanel(`
    <div class="title">
      <p class="eyebrow">An adventure in the old style</p>
      <h1>Glory of<br>Thornwick</h1>
      <p class="sub">Brigands on the roads. Monsters in the woods. A Baron who has not smiled in five years.<br>The valley needs a hero.</p>
      <div class="row">
        <button id="t-new" class="big" autofocus>New hero</button>
        ${saves.length ? '<button id="t-load" class="big">Restore a game</button>' : ''}
      </div>
      <p class="fine">Choose Fighter, Magic User or Thief. Type commands, fight in real time, and find your own way to be a hero.</p>
    </div>`, (root) => {
    root.querySelector('#t-new')!.addEventListener('click', () => { AUDIO.unlock(); AUDIO.music('title'); showCreate(); });
    root.querySelector('#t-load')?.addEventListener('click', () => { AUDIO.unlock(); showSaves('load', true); });
  });
}

function showCreate() {
  G.mode = 'create';
  let cls: ClassDef = CLASSES[0];
  let stats: Record<Stat, number>;
  let skills: Record<Skill, number>;
  let left = BONUS_POINTS;
  const reset = () => { stats = { ...cls.stats }; skills = { ...cls.skills }; left = BONUS_POINTS; };
  reset();
  let name = 'Hero';

  const render = () => {
    const statRows = (Object.keys(STAT_NAMES) as Stat[]).map((s) => row('stat', s, STAT_NAMES[s], stats[s], cls.stats[s])).join('');
    const skillRows = (Object.keys(SKILL_NAMES) as Skill[]).map((s) => row('skill', s, SKILL_NAMES[s], skills[s], cls.skills[s])).join('');
    UI.showPanel(`
      <h2>Create your hero</h2>
      <div class="classes">
        ${CLASSES.map((c) => `<button class="cls${c.id === cls.id ? ' on' : ''}" data-cls="${c.id}" aria-pressed="${c.id === cls.id}"><b>${c.name}</b><span>${c.blurb}</span></button>`).join('')}
      </div>
      <label class="name">Name <input id="c-hero-name" maxlength="16" value="${UI.esc(name)}" autocomplete="off"></label>
      <p class="pts">Bonus points to spend: <b>${left}</b> <small>Each + costs 5 points. Unlocking an untrained skill costs 15.</small></p>
      <div class="sheet">
        <div><h3>Attributes</h3>${statRows}</div>
        <div><h3>Skills</h3>${skillRows}</div>
      </div>
      <div class="row end"><button id="c-back">Back</button><button id="c-go" class="big">Begin the adventure</button></div>
    `, (root) => {
      root.querySelectorAll<HTMLButtonElement>('[data-cls]').forEach((b) => b.addEventListener('click', () => { cls = CLASSES.find((c) => c.id === b.dataset.cls)!; reset(); render(); }));
      const nameIn = root.querySelector<HTMLInputElement>('#c-hero-name')!;
      nameIn.addEventListener('input', () => { name = nameIn.value; });
      root.querySelectorAll<HTMLButtonElement>('[data-adj]').forEach((b) => b.addEventListener('click', () => {
        const [kind, key, dir] = b.dataset.adj!.split(':');
        const tbl: Record<string, number> = kind === 'stat' ? stats : skills;
        const base = kind === 'stat' ? cls.stats[key as Stat] : cls.skills[key as Skill];
        if (dir === '+') {
          const cost = kind === 'skill' && tbl[key] === 0 ? 15 : 5;
          if (left < cost || tbl[key] >= 100) return;
          left -= cost;
          tbl[key] += 5;
        } else {
          if (tbl[key] <= base) return;
          tbl[key] -= 5;
          left += kind === 'skill' && tbl[key] === 0 ? 15 : 5;
        }
        render();
      }));
      root.querySelector('#c-back')!.addEventListener('click', showTitle);
      root.querySelector('#c-go')!.addEventListener('click', () => {
        const n = (name || 'Hero').trim().slice(0, 16) || 'Hero';
        UI.hidePanel();
        G.start(newHero(cls, n, stats, skills));
        cmd.focus();
      });
    }, undefined, true);
  };

  function row(kind: string, key: string, label: string, v: number, base: number) {
    return `<div class="stat"><span>${label}</span><button data-adj="${kind}:${key}:-" ${v <= base ? 'disabled' : ''} aria-label="Lower ${label}">−</button><b>${v}</b><button data-adj="${kind}:${key}:+" aria-label="Raise ${label}">+</button><i style="--v:${v}%"></i></div>`;
  }
  render();
}

// ---- in-game panels -----------------------------------------------------------------------

function bars(v: number) { return `<i style="--v:${Math.min(100, v)}%"></i>`; }

function showStats() {
  const h = G.hero;
  UI.showPanel(`
    <h2>${UI.esc(h.name)} the ${h.cls === 'fighter' ? 'Fighter' : h.cls === 'mage' ? 'Magic User' : 'Thief'}</h2>
    <p class="pts">Health ${Math.ceil(h.hp)}/${maxHP(h)} &middot; Stamina ${Math.ceil(h.sp)}/${maxSP(h)}${maxMP(h) ? ` &middot; Magic ${Math.ceil(h.mp)}/${maxMP(h)}` : ''} &middot; Score ${G.score} of ${MAX_SCORE}</p>
    <div class="sheet">
      <div><h3>Attributes</h3>${(Object.keys(STAT_NAMES) as Stat[]).map((s) => `<div class="stat ro"><span>${STAT_NAMES[s]}</span><b>${h.stats[s]}</b>${bars(h.stats[s])}</div>`).join('')}</div>
      <div><h3>Skills</h3>${(Object.keys(SKILL_NAMES) as Skill[]).map((s) => `<div class="stat ro${h.skills[s] ? '' : ' dim'}"><span>${SKILL_NAMES[s]}</span><b>${h.skills[s] || '—'}</b>${bars(h.skills[s])}</div>`).join('')}</div>
    </div>
    <h3>Spells</h3>
    <p>${h.spells.length ? h.spells.map((s) => `<b>${SPELLS[s].name}</b> (${SPELLS[s].cost} MP): ${SPELLS[s].desc}`).join('<br>') : 'You know no spells.'}</p>
    <p class="fine">Skills improve with practice. Climb, throw, sneak, pick locks, fight and cast to get better.</p>
    <div class="row end"><button id="p-close" autofocus>Close</button></div>`, bindClose, () => cmd.focus(), true);
}

function showInventory() {
  const h = G.hero;
  const items = Object.keys(h.inv).filter((k) => h.inv[k] > 0);
  UI.showPanel(`
    <h2>Inventory</h2>
    <p class="pts">${h.silver} silver</p>
    <ul class="inv">${items.map((k) => `<li><b>${ITEMS[k].name}${h.inv[k] > 1 ? ` &times;${h.inv[k]}` : ''}</b><span>${ITEMS[k].desc}</span></li>`).join('') || '<li>You carry nothing but lint.</li>'}</ul>
    <div class="row end"><button id="p-close" autofocus>Close</button></div>`, bindClose, () => cmd.focus());
}

function showHelp() {
  UI.showPanel(`
    <h2>How to play</h2>
    <div class="help">
      <p><b>Walk</b> with the arrow keys, or click where you want to go. Walk off the edge of the screen to travel, or into a doorway to enter. <b>Right-click</b> something to look at it.</p>
      <p><b>Type commands</b> in plain English and press Enter:</p>
      <ul>
        <li>LOOK, LOOK AT TREE, READ SIGN, SEARCH BODY</li>
        <li>TALK TO GRETA, ASK ABOUT BRIGANDS, ASK OSWIN ABOUT TROLL</li>
        <li>GET ROCKS, BUY RATIONS, GIVE RING TO HILDE, PAY TROLL</li>
        <li>CLIMB TREE, THROW ROCK AT NEST, PICK LOCK, FORCE GATE</li>
        <li>SNEAK / WALK, REST, SLEEP, EAT, DRINK HEALING POTION</li>
        <li>CAST OPEN ON CHEST, CAST CALM, CAST FETCH</li>
        <li>INVENTORY, STATS, SCORE, TIME, SAVE, RESTORE</li>
      </ul>
      <p><b>Combat</b> is real time. Attack with <kbd>→</kbd> or <kbd>A</kbd>, parry with <kbd>↑</kbd> or <kbd>S</kbd>, dodge with <kbd>↓</kbd> or <kbd>D</kbd>. When your foe flashes, it is about to strike: parry or dodge, then hit back. <kbd>Z</kbd> Zap, <kbd>F</kbd> Flame Dart, <kbd>C</kbd> Calm, <kbd>H</kbd> potion, <kbd>R</kbd> run away.</p>
      <p><b>Survive.</b> Eat once a day. Sleep at the inn. Rest after fights. Night is darker and more dangerous. The town gate closes at ten.</p>
      <p><b>Every class can win.</b> Most problems have a fighter's answer, a thief's answer and a magic user's answer. Ask everyone about everything.</p>
    </div>
    <div class="row end"><button id="p-close" autofocus>Close</button></div>`, bindClose, () => cmd.focus(), true);
}

function showSaves(mode: 'save' | 'load', fromTitle = false) {
  const saves = G.listSaves();
  const slots = mode === 'save' ? ['1', '2', '3'] : ['auto', '1', '2', '3'];
  const info = (slot: string) => {
    const s = saves.find((x) => x.slot === slot);
    return s ? `${UI.esc(s.name)} &middot; ${UI.esc(s.room)} &middot; score ${s.score} &middot; ${new Date(s.at).toLocaleString()}` : 'Empty';
  };
  UI.showPanel(`
    <h2>${mode === 'save' ? 'Save game' : 'Restore game'}</h2>
    <div class="slots">${slots.map((s) => `<button data-slot="${s}" ${mode === 'load' && !saves.find((x) => x.slot === s) ? 'disabled' : ''}><b>${s === 'auto' ? 'Autosave' : 'Slot ' + s}</b><span>${info(s)}</span></button>`).join('')}</div>
    <p class="fine">Saves are kept in this browser only.</p>
    <div class="row end"><button id="p-close">${fromTitle ? 'Back' : 'Cancel'}</button></div>`, (root) => {
    root.querySelectorAll<HTMLButtonElement>('[data-slot]').forEach((b) => b.addEventListener('click', () => {
      const slot = b.dataset.slot!;
      if (mode === 'save') {
        UI.hidePanel();
        G.say(G.saveTo(slot) ? `Game saved to slot ${slot}.` : 'Saving failed: this browser is not allowing storage.');
      } else {
        if (G.loadFrom(slot)) { UI.hidePanel(); G.say(`Game restored. ${G.timeString()}.`); cmd.focus(); }
      }
    }));
    root.querySelector('#p-close')!.addEventListener('click', () => (fromTitle ? showTitle() : UI.hidePanel()));
  }, fromTitle ? undefined : () => cmd.focus());
}

function showEnd(kind: 'death' | 'win', title: string, text: string) {
  const hasAuto = G.listSaves().some((s) => s.slot === 'auto');
  UI.showPanel(`
    <div class="end ${kind}">
      <p class="eyebrow">${kind === 'win' ? 'The End' : 'Game over'}</p>
      <h2>${UI.esc(title)}</h2>
      <p class="story">${UI.esc(text).replace(/\n/g, '<br>')}</p>
      <p class="pts">Final score: <b>${G.score}</b> of ${MAX_SCORE}</p>
      <div class="row">
        ${kind === 'death' && hasAuto ? '<button id="e-retry" class="big" autofocus>Try again</button>' : ''}
        <button id="e-load">Restore</button>
        <button id="e-new">${kind === 'win' ? 'Play again' : 'New hero'}</button>
      </div>
      ${kind === 'death' ? '<p class="fine">"Try again" restores the autosave from when you last entered a new area.</p>' : ''}
    </div>`, (root) => {
    root.querySelector('#e-retry')?.addEventListener('click', () => { if (G.loadFrom('auto')) { UI.hidePanel(); cmd.focus(); } });
    root.querySelector('#e-load')!.addEventListener('click', () => showSaves('load', true));
    root.querySelector('#e-new')!.addEventListener('click', showTitle);
  });
}

function bindClose(root: HTMLElement) {
  root.querySelector('#p-close')?.addEventListener('click', () => UI.hidePanel());
}

G.onEnd = showEnd;
G.onMeta = (what) => {
  if (what === 'help') showHelp();
  if (what === 'inventory') showInventory();
  if (what === 'stats') showStats();
  if (what === 'save') showSaves('save');
  if (what === 'load') showSaves('load');
  if (what === 'restart') showTitle();
};

// ---- input -----------------------------------------------------------------------------------

const ARROWS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
const COMBAT_KEYS: Record<string, string> = {
  ArrowRight: 'attack', a: 'attack', ' ': 'attack', ArrowUp: 'parry', s: 'parry', ArrowDown: 'dodge', d: 'dodge', ArrowLeft: 'dodge',
  z: 'zap', f: 'flame', c: 'calm', h: 'potion', r: 'flee', t: 'special',
};

window.addEventListener('keydown', (e) => {
  AUDIO.unlock();
  if (UI.msgOpen()) {
    if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') { e.preventDefault(); UI.dismiss(); }
    else if (ARROWS.includes(e.key)) e.preventDefault();
    return;
  }
  if (UI.panelOpen()) {
    if (e.key === 'Escape' && (G.mode === 'play' || G.mode === 'combat')) { e.preventDefault(); UI.hidePanel(); }
    return;
  }
  if (G.mode === 'combat' && G.combat) {
    const act = COMBAT_KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
    if (act) { e.preventDefault(); if (!e.repeat) G.combat.act(act); }
    return;
  }
  if (G.mode !== 'play') return;
  if (ARROWS.includes(e.key)) {
    e.preventDefault();
    if (!G.keys.includes(e.key)) G.keys.push(e.key);
    return;
  }
  if (e.key === 'Escape') { cmd.value = ''; return; }
  if (document.activeElement !== cmd && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) cmd.focus();
});

window.addEventListener('keyup', (e) => {
  if (ARROWS.includes(e.key)) G.keys = G.keys.filter((k) => k !== e.key);
});
window.addEventListener('blur', () => { G.keys = []; });

UI.$('parser').addEventListener('submit', (e) => {
  e.preventDefault();
  const v = cmd.value.trim();
  cmd.value = '';
  if (!v || G.mode !== 'play' || UI.msgOpen()) return;
  G.command(v);
});

function toScene(e: MouseEvent) {
  const r = canvas.getBoundingClientRect();
  return [((e.clientX - r.left) / r.width) * 320, ((e.clientY - r.top) / r.height) * 200];
}

UI.$('stage').addEventListener('click', (e) => {
  AUDIO.unlock();
  if (UI.msgOpen()) { UI.dismiss(true); return; }
  if (e.target !== canvas || G.mode !== 'play' || UI.panelOpen()) return;
  const [x, y] = toScene(e);
  const r = G.room;
  G.walkTo(Math.max(0, Math.min(319, x)), Math.max(r.minY, Math.min(r.maxY ?? 199, y + 4)));
});

canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  if (G.mode !== 'play' || UI.msgOpen() || UI.panelOpen()) return;
  const [x, y] = toScene(e);
  for (const n of G.visibleNpcs()) {
    const p = G.npcPos(n);
    if (Math.abs(x - p.x) < 10 && y > p.y - 34 && y < p.y + 2) { G.say(typeof n.desc === 'function' ? n.desc() : n.desc); return; }
  }
  for (const m of G.monsters) if (Math.abs(x - m.x) < 14 && y > m.y - 30 && y < m.y + 2) { G.say(m.def.desc); return; }
  for (const t of G.room.things ?? []) if (t.rect && G.inRect(t.rect, x, y)) { G.say(typeof t.look === 'function' ? t.look() : t.look); return; }
  if (Math.abs(x - G.S.x) < 10 && y > G.S.y - 34 && y < G.S.y + 2) { G.say(G.selfDesc()); return; }
  G.describe();
});

document.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach((b) => b.addEventListener('click', () => {
  AUDIO.unlock();
  if (G.mode !== 'play' || UI.msgOpen()) return;
  switch (b.dataset.tool) {
    case 'look': G.describe(); break;
    case 'stats': showStats(); break;
    case 'inv': showInventory(); break;
    case 'sneak': G.command(G.sneaking ? 'walk' : 'sneak'); break;
    case 'rest': G.command('rest'); break;
    case 'save': showSaves('save'); break;
    case 'load': showSaves('load'); break;
    case 'sound': b.setAttribute('aria-pressed', String(!AUDIO.toggle())); break;
    case 'help': showHelp(); break;
  }
}));

document.querySelectorAll<HTMLButtonElement>('[data-act]').forEach((b) => b.addEventListener('click', () => {
  AUDIO.unlock();
  G.combat?.act(b.dataset.act!);
}));

// ---- loop -------------------------------------------------------------------------------------

let last = performance.now();
function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  G.update(dt);
  if (G.mode === 'title' || G.mode === 'create') { G.t += dt; }
  G.render();
  requestAnimationFrame(frame);
}

// ---- dialogue portraits ----------------------------------------------------------------

const EXTRA_SPEAKERS: Record<string, Look> = {
  'Masked Leader': LOOKS.leader, Brigand: LOOKS.brigand, Grobb: LOOKS.troll, Skarn: LOOKS.kobold,
};
const portraitCache = new Map<string, string | null>();

function fbToDataURL(fb: FB) {
  const c = document.createElement('canvas');
  c.width = fb.w; c.height = fb.h;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(fb.w, fb.h);
  for (let i = 0; i < fb.px.length; i++) {
    const v = fb.px[i];
    img.data[i * 4] = (v >> 16) & 255; img.data[i * 4 + 1] = (v >> 8) & 255; img.data[i * 4 + 2] = v & 255;
    img.data[i * 4 + 3] = v === T ? 0 : 255;
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL();
}

UI.setPortraitProvider((who) => {
  if (portraitCache.has(who)) return portraitCache.get(who)!;
  let look: Look | null = EXTRA_SPEAKERS[who] ?? null;
  if (!look)
    for (const r of Object.values(ROOMS))
      for (const n of r.npcs ?? []) if (n.name.replace(/^the /, '') === who.replace(/^the /, '')) look = typeof n.look === 'function' ? n.look() : n.look;
  const url = look && !look.kind ? fbToDataURL(portrait(look)) : null;
  portraitCache.set(who, url);
  return url;
});

if (!ROOMS[G.titleRoom]) throw new Error('title room missing');
loadBackgrounds().finally(() => {
  showTitle();
  requestAnimationFrame(frame);
});

// Debug handle for the browser console: __thornwick.G.go('meadow', 160, 160)
(window as any).__thornwick = { G, ROOMS, UI };
