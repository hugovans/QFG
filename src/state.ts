export type ClassId = 'fighter' | 'mage' | 'thief';
export type Stat = 'str' | 'int' | 'agi' | 'vit' | 'luck';
export type Skill = 'weapon' | 'parry' | 'dodge' | 'stealth' | 'lockpick' | 'throwing' | 'climbing' | 'magic';

export const STAT_NAMES: Record<Stat, string> = {
  str: 'Strength', int: 'Intelligence', agi: 'Agility', vit: 'Vitality', luck: 'Luck',
};
export const SKILL_NAMES: Record<Skill, string> = {
  weapon: 'Weapon Use', parry: 'Parry', dodge: 'Dodge', stealth: 'Stealth',
  lockpick: 'Pick Locks', throwing: 'Throwing', climbing: 'Climbing', magic: 'Magic',
};

export interface Hero {
  name: string;
  cls: ClassId;
  stats: Record<Stat, number>;
  skills: Record<Skill, number>;
  hp: number;
  sp: number;
  mp: number;
  spells: string[];
  inv: Record<string, number>;
  silver: number;
}

export interface ClassDef {
  id: ClassId;
  name: string;
  blurb: string;
  stats: Record<Stat, number>;
  skills: Record<Skill, number>;
  inv: Record<string, number>;
  spells: string[];
}

export const CLASSES: ClassDef[] = [
  {
    id: 'fighter', name: 'Fighter',
    blurb: 'Sword, shield and a strong right arm. Fighters hit hard, parry well and can force their way through doors that would stop anyone else.',
    stats: { str: 45, int: 20, agi: 30, vit: 45, luck: 15 },
    skills: { weapon: 40, parry: 40, dodge: 20, stealth: 0, lockpick: 0, throwing: 10, climbing: 0, magic: 0 },
    inv: { sword: 1, shield: 1, leather: 1, rations: 2 }, spells: [],
  },
  {
    id: 'mage', name: 'Magic User',
    blurb: 'Clever and fragile. Magic Users begin with the Zap spell and can learn Open, Flame Dart, Fetch and Calm from those who know them.',
    stats: { str: 20, int: 45, agi: 30, vit: 25, luck: 20 },
    skills: { weapon: 15, parry: 0, dodge: 30, stealth: 0, lockpick: 0, throwing: 15, climbing: 0, magic: 40 },
    inv: { dagger: 1, rations: 2, mana: 1 }, spells: ['zap'],
  },
  {
    id: 'thief', name: 'Thief',
    blurb: 'Quick, quiet and lucky. Thieves sneak past trouble, pick locks, climb walls and know the secret sign that opens certain doors after dark.',
    stats: { str: 25, int: 25, agi: 45, vit: 25, luck: 30 },
    skills: { weapon: 25, parry: 0, dodge: 40, stealth: 40, lockpick: 40, throwing: 35, climbing: 30, magic: 0 },
    inv: { dagger: 1, rations: 2, lockpick: 1 }, spells: [],
  },
];

export const BONUS_POINTS = 50;

export function newHero(cls: ClassDef, name: string, stats: Record<Stat, number>, skills: Record<Skill, number>): Hero {
  const h: Hero = {
    name, cls: cls.id,
    stats: { ...stats }, skills: { ...skills },
    hp: 0, sp: 0, mp: 0,
    spells: [...cls.spells], inv: { ...cls.inv }, silver: 60,
  };
  h.hp = maxHP(h); h.sp = maxSP(h); h.mp = maxMP(h);
  return h;
}

export const maxHP = (h: Hero) => Math.round((h.stats.vit * 2 + h.stats.str) / 3) + 10;
export const maxSP = (h: Hero) => h.stats.agi + h.stats.vit;
export const maxMP = (h: Hero) => (h.skills.magic > 0 ? Math.round(h.stats.int / 2 + h.skills.magic / 2) : 0);

export interface ItemDef { name: string; desc: string; }

export const ITEMS: Record<string, ItemDef> = {
  sword: { name: 'longsword', desc: 'A plain, well-balanced longsword. It has seen some use but holds an edge.' },
  dagger: { name: 'dagger', desc: 'A slim dagger, good for close work and for throwing in a pinch.' },
  shield: { name: 'shield', desc: 'A round wooden shield rimmed with iron. It makes parrying far safer.' },
  leather: { name: 'leather armor', desc: 'Boiled leather armor. It turns aside a little of every blow.' },
  rations: { name: 'rations', desc: 'Hard bread, cheese and dried meat. A hero must eat once a day.' },
  healing: { name: 'healing potion', desc: 'A red potion from Mother Hilde. Restores a good deal of health.' },
  vigor: { name: 'vigor potion', desc: 'A green, fizzing potion. Restores stamina.' },
  mana: { name: 'mana potion', desc: 'A shimmering blue potion. Restores magic points.' },
  rocks: { name: 'rocks', desc: 'Smooth throwing stones.' },
  flamelily: { name: 'flame-lily', desc: 'A bright orange flame-lily from the meadow. Its petals are warm to the touch.' },
  faeriedust: { name: 'faerie dust', desc: 'A pinch of glittering faerie dust wrapped in a leaf. It tickles.' },
  beard: { name: "troll's beard", desc: 'A matted hank of troll beard. It smells as bad as you would expect.' },
  dispel: { name: 'dispel potion', desc: "Mother Hilde's dispel potion. Thrown or given, it breaks enchantments." },
  ring: { name: 'silver ring', desc: 'A silver ring engraved with a sprig of healing herb. It must belong to someone.' },
  chestkey: { name: 'iron key', desc: 'A crude iron key taken from the kobold.' },
  brasskey: { name: 'brass key', desc: 'A heavy brass key stamped with a crossed-daggers mark: the brigands\' sign.' },
  lockpick: { name: 'lockpick', desc: 'A set of fine steel picks. Invaluable for opening locks.' },
  toolkit: { name: "thief's toolkit", desc: 'A professional toolkit: picks, tension bars, oil and a tiny mirror. Makes locks much easier.' },
  locket: { name: 'golden locket', desc: 'A golden locket bearing the crest of the Barons of Thornwick.' },
  purse: { name: 'fat purse', desc: 'A merchant\'s purse, heavy with coin.' },
};

export const SPELLS: Record<string, { name: string; cost: number; desc: string }> = {
  zap: { name: 'Zap', cost: 3, desc: 'Charges your weapon; your next hit in combat does extra damage.' },
  open: { name: 'Open', cost: 3, desc: 'Opens locked doors and chests at a distance.' },
  flame: { name: 'Flame Dart', cost: 5, desc: 'Hurls a dart of fire at a foe.' },
  fetch: { name: 'Fetch', cost: 3, desc: 'Brings a small, distant object to your hand.' },
  calm: { name: 'Calm', cost: 5, desc: 'Soothes hostile creatures so they will not attack.' },
};

/** Every scoring event in the game and what it is worth. */
export const POINTS: Record<string, number> = {
  arrive: 1, signbook: 3, board: 2, sheriff: 1, meal: 1, ale: 1,
  kill_goblin: 5, kill_wolf: 5, kill_saurus: 5, kill_brigand: 5,
  search_body: 2,
  lily: 5, dust: 10, beard: 10, troll_passed: 5, troll_beaten: 10,
  give_lily: 5, give_dust: 5, give_beard: 5, dispel: 15,
  nest: 10, ring_return: 10,
  riddles: 15, learn_open: 3, learn_flame: 3, learn_fetch: 3, learn_calm: 3,
  kobold: 10, chest: 15,
  thief_sign: 3, thieves: 5, burgle: 10,
  fortress_door: 15, courtyard: 15,
  locket: 5, cure: 50, baron: 50,
  climb_practice: 1, sneak_practice: 1,
};
export const MAX_SCORE = Object.values(POINTS).reduce((a, b) => a + b, 0);

export interface Save {
  v: number;
  hero: Hero;
  room: string;
  x: number;
  y: number;
  dir: number;
  minutes: number;
  flags: Record<string, any>;
  points: Record<string, boolean>;
  lastMealDay: number;
}

export const DAY = 1440;
export const START_MINUTES = 8 * 60;
