/**
 * Every character's LPC outfit, one layer per entry, back to front.
 *
 *   'path/prefix'                   a layer from the LPC spritesheets folder
 *   'path/prefix#variant'           a pre-coloured file (walk/<variant>.png and friends)
 *   'path/prefix@cloth:forest'      recolour the layer's base ramp (cloth, hair, body, metal, wood)
 *   'path/prefix@hue:-110'          rotate every colour's hue (for parts with no matching ramp)
 *   'path/prefix!bg'                the behind-the-body half of a two-part item (capes, shields, weapons)
 *
 * The sprite ids match the Look ids in src/sprites.ts.
 */
export type Anim = 'walk' | 'slash' | 'thrust' | 'spellcast' | 'hurt';

export interface CastDef {
  layers: string[];
  anims: Anim[];
}

/** Extra colour ramps, six shades dark to light like LPC's own. */
export const EXTRA_RAMPS: Record<string, Record<string, string[]>> = {
  body: {
    troll: ['#0c1a0a', '#1f3a17', '#36561f', '#557a2c', '#7d9d45', '#a6bf6a'],
  },
};

const M = 'body/bodies/male', MH = 'head/heads/human/male';
const F = 'body/bodies/female', FH = 'head/heads/human/female';
const WALK: Anim[] = ['walk'];

export const CAST: Record<string, CastDef> = {
  // The hero: a hooded ranger with a longsword.
  hero: {
    anims: ['walk', 'slash', 'thrust', 'spellcast', 'hurt'],
    layers: [
      'weapon/sword/longsword#longsword!bg',
      `${M}@body:amber`, `${MH}@body:amber`,
      'feet/boots/rimmed/male@cloth:black', 'legs/pants/male@cloth:charcoal',
      'torso/clothes/longsleeve/longsleeve/male@cloth:forest', 'torso/waist/belt_leather@cloth:brown',
      'hat/cloth/hood/adult@cloth:forest', 'weapon/sword/longsword#longsword',
    ],
  },

  // Thornwick folk.
  sheriff: {
    anims: WALK,
    layers: [`${M}@body:light`, `${MH}@body:light`, 'feet/boots/basic/male@cloth:brown', 'legs/pants/male@cloth:gray',
      'torso/clothes/longsleeve/longsleeve/male@cloth:brown', 'torso/waist/belt_leather@cloth:black',
      'beards/beard/medium@hair:gray', 'hair/plain/adult@hair:gray', 'hat/cloth/leather_cap@cloth:leather'],
  },
  greta: {
    anims: WALK,
    layers: [`${F}@body:light`, `${FH}@body:light`, 'feet/shoes/basic/thin@cloth:brown', 'legs/skirts/plain/thin@cloth:forest',
      'torso/clothes/blouse_longsleeve/female#forest', 'torso/aprons/apron/female#white', 'hair/bangs_bun/adult@hair:red'],
  },
  oswin: {
    anims: WALK,
    layers: [`${M}@body:light`, 'head/heads/human/male_plump@body:light', 'feet/boots/basic/male@cloth:brown', 'legs/pants/male@cloth:brown',
      'torso/clothes/longsleeve/longsleeve/male@cloth:white', 'torso/aprons/apron/male#brown',
      'beards/beard/medium@hair:gray', 'hair/balding/adult@hair:gray'],
  },
  harrow: {
    anims: WALK,
    layers: ['cape/solid!bg@cloth:navy', `${M}@body:amber`, `${MH}@body:amber`, 'feet/boots/fold/male@cloth:brown', 'legs/pants/male@cloth:gray',
      'torso/clothes/longsleeve/longsleeve/male@cloth:maroon', 'torso/jacket/tabard/male#red', 'cape/solid@cloth:navy',
      'beards/beard/trimmed@hair:gray', 'hair/plain/adult@hair:gray'],
  },
  hilde: {
    anims: WALK,
    layers: [`${F}@body:olive`, 'head/heads/human/female_elderly@body:olive', 'feet/shoes/basic/thin@cloth:brown',
      'torso/clothes/robe/female#forest_green', 'torso/aprons/apron_half/female#white', 'hair/bangs_bun/adult@hair:gray'],
  },
  zephram: {
    anims: WALK,
    layers: [`${M}@body:light`, 'head/heads/human/male_elderly@body:light', 'feet/slippers/male@cloth:navy', 'legs/pants/male@cloth:navy',
      'torso/clothes/longsleeve/longsleeve/male@cloth:navy', 'torso/waist/belt_leather@cloth:brown',
      'beards/beard/winter@hair:white', 'hat/magic/wizard/base/adult#base_teal', 'weapon/magic/gnarled#gnarled'],
  },
  nell: {
    anims: WALK,
    layers: ['cape/solid!bg@cloth:purple', `${F}@body:light`, `${FH}@body:light`, 'feet/boots/basic/thin@cloth:black', 'legs/pants/thin@cloth:black',
      'torso/clothes/longsleeve/longsleeve/female@cloth:black', 'torso/waist/belt_leather@cloth:purple', 'cape/solid@cloth:purple',
      'hair/long/adult@hair:red'],
  },
  pike: {
    anims: WALK,
    layers: [`${M}@body:light`, `${MH}@body:light`, 'feet/boots/basic/male@cloth:black', 'legs/pants/male@cloth:purple',
      'torso/chainmail/male', 'torso/jacket/tabard/male#purple', 'beards/mustache/walrus@hair:dark_brown',
      'hat/helmet/kettle', 'weapon/polearm/spear/foreground#steel'],
  },
  baron: {
    anims: WALK,
    layers: ['cape/solid!bg@cloth:red', `${M}@body:light`, 'head/heads/human/male_elderly@body:light', 'feet/boots/fold/male@cloth:black',
      'legs/pants/male@cloth:navy', 'torso/jacket/frock/male#purple', 'cape/solid@cloth:red',
      'beards/beard/medium@hair:gray', 'hair/plain/adult@hair:gray', 'hat/formal/crown#crown_gold'],
  },
  wren: {
    anims: WALK,
    layers: [`${F}@body:light`, `${FH}@body:light`, 'feet/shoes/basic/thin@cloth:white', 'legs/skirts/plain/thin@cloth:pink',
      'torso/clothes/blouse_longsleeve/female#pink', 'hair/long_straight/adult@hair:blonde'],
  },
  tom: {
    anims: WALK,
    layers: [`${M}@body:amber`, `${MH}@body:amber`, 'feet/boots/basic/male@cloth:brown', 'legs/pants/male@cloth:blue',
      'torso/clothes/longsleeve/longsleeve/male@cloth:brown', 'torso/waist/belt_leather@cloth:black',
      'hair/plain/adult@hair:chestnut', 'hat/cloth/leather_cap@cloth:green'],
  },
  molly: {
    anims: WALK,
    layers: [`${F}@body:light`, `${FH}@body:light`, 'feet/shoes/basic/thin@cloth:brown', 'legs/skirts/plain/thin@cloth:red',
      'torso/clothes/blouse_longsleeve/female#red', 'torso/aprons/apron/female#white', 'hair/bangs_bun/adult@hair:chestnut'],
  },

  // Foes.
  goblin: {
    anims: ['walk', 'slash', 'hurt'],
    layers: [`${M}@body:dark_green`, 'head/heads/goblin/adult@body:dark_green', 'legs/pants/male@cloth:brown',
      'torso/waist/belt_leather@cloth:brown', 'weapon/sword/dagger#dagger'],
  },
  brigand: {
    anims: ['walk', 'slash', 'hurt'],
    layers: ['cape/tattered!bg@cloth:charcoal', `${M}@body:bronze`, `${MH}@body:bronze`, 'feet/boots/basic/male@cloth:black',
      'legs/pants/male@cloth:charcoal', 'torso/armour/leather/male@cloth:black', 'cape/tattered@cloth:charcoal',
      'facial/masks/plain/adult#dark', 'hat/cloth/hood/adult@cloth:charcoal', 'weapon/sword/arming#steel'],
  },
  troll: {
    anims: ['walk', 'slash', 'hurt'],
    layers: ['body/bodies/muscular@body:troll', 'head/heads/troll/adult@body:troll', 'legs/pants/muscular@cloth:leather',
      'beards/beard/winter@hair:gray', 'weapon/blunt/mace#mace'],
  },
  trollShorn: {
    anims: ['walk', 'slash', 'hurt'],
    layers: ['body/bodies/muscular@body:troll', 'head/heads/troll/adult@body:troll', 'legs/pants/muscular@cloth:leather', 'weapon/blunt/mace#mace'],
  },
  kobold: {
    anims: ['walk', 'spellcast', 'hurt'],
    layers: [`${M}@body:dark_green,hue:-115`, 'head/heads/lizard/male@hue:-115', 'legs/pants/male@cloth:purple',
      'torso/clothes/longsleeve/longsleeve/male@cloth:purple', 'torso/waist/belt_leather@cloth:yellow'],
  },
  saurus: {
    anims: ['walk', 'thrust', 'hurt'],
    layers: ['body/tail/lizard/adult!bg', `${M}@body:dark_green`, 'head/heads/lizard/male@body:dark_green',
      'legs/pants/male@cloth:leather', 'body/tail/lizard/adult', 'weapon/polearm/spear/foreground#iron'],
  },
  leader: {
    anims: ['walk', 'slash', 'hurt'],
    layers: ['cape/solid!bg@cloth:red', `${F}@body:light`, `${FH}@body:light`, 'feet/boots/basic/thin@cloth:black', 'legs/pants/thin@cloth:black',
      'torso/clothes/longsleeve/longsleeve/female@cloth:black', 'torso/waist/belt_leather@cloth:red', 'cape/solid@cloth:red',
      'hair/long_straight/adult@hair:blonde', 'facial/masks/plain/adult#dark', 'weapon/sword/saber#saber'],
  },
};
