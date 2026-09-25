import { Look, LOOKS } from './sprites';

export interface MonsterDef {
  id: string;
  name: string;
  look: Look;
  hp: number;
  atk: number;
  def: number;
  dmg: [number, number];
  windup: number;
  idle: [number, number];
  speed: number;
  silver: [number, number];
  calmable: boolean;
  ranged?: boolean;
  desc: string;
}

export const MONSTERS: Record<string, MonsterDef> = {
  goblin: {
    id: 'goblin', name: 'goblin', look: LOOKS.goblin, hp: 28, atk: 25, def: 20, dmg: [3, 7], windup: 0.75, idle: [1.2, 2.4],
    speed: 34, silver: [3, 8], calmable: true,
    desc: 'A scrawny green goblin with a rusty knife and a worse attitude.',
  },
  wolf: {
    id: 'wolf', name: 'grey wolf', look: LOOKS.wolf, hp: 24, atk: 35, def: 30, dmg: [3, 6], windup: 0.5, idle: [0.8, 1.6],
    speed: 55, silver: [0, 0], calmable: true,
    desc: 'A lean grey wolf, yellow-eyed and hungry.',
  },
  saurus: {
    id: 'saurus', name: 'saurus', look: LOOKS.saurus, hp: 38, atk: 30, def: 25, dmg: [4, 9], windup: 0.65, idle: [1.1, 2.2],
    speed: 40, silver: [0, 0], calmable: true,
    desc: 'A saurus: a lizard the size of a pony, with a red-spined back and a mouthful of teeth.',
  },
  brigand: {
    id: 'brigand', name: 'brigand', look: LOOKS.brigand, hp: 48, atk: 40, def: 38, dmg: [5, 10], windup: 0.6, idle: [1.0, 2.0],
    speed: 42, silver: [8, 18], calmable: true,
    desc: 'A hooded brigand with a notched sword and the cold eyes of a professional.',
  },
  troll: {
    id: 'troll', name: 'troll', look: LOOKS.troll, hp: 100, atk: 45, def: 32, dmg: [9, 15], windup: 0.95, idle: [1.4, 2.6],
    speed: 30, silver: [15, 25], calmable: true,
    desc: 'Grobb the bridge troll: eight feet of green muscle, a club like a tree trunk, and a magnificent grey beard.',
  },
  kobold: {
    id: 'kobold', name: 'kobold mage', look: LOOKS.kobold, hp: 42, atk: 42, def: 30, dmg: [6, 11], windup: 0.85, idle: [1.2, 2.2],
    speed: 30, silver: [0, 0], calmable: false, ranged: true,
    desc: 'Skarn the kobold mage: red-scaled, sly, and crackling with stolen magic.',
  },
  leader: {
    id: 'leader', name: 'Masked Leader', look: LOOKS.leader, hp: 125, atk: 55, def: 52, dmg: [8, 14], windup: 0.5, idle: [0.9, 1.7],
    speed: 45, silver: [0, 0], calmable: false,
    desc: 'The brigand leader: slim, quick and masked in black. A golden locket glints at the throat.',
  },
};
