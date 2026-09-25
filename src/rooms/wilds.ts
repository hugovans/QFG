import { defRoom } from '../registry';
import { G } from '../game';
import * as A from '../art';
import { FB, rng } from '../gfx';
import { DIR, LOOKS } from '../sprites';
import { buy, leave, within } from './common';

const forestBackdrop = (fb: FB, seed: number, dark = false) => {
  fb.rect(0, 0, 320, 120, dark ? 0 : 2);
  fb.dither(0, 0, 320, 120, dark ? 0 : 2, dark ? 2 : 0, dark ? 1 : 2);
  const r = rng(seed);
  for (let i = 0; i < 16; i++) fb.circle(r() * 320, r() * 70, 16 + r() * 22, 2, dark ? 0 : 10, dark ? 1 : 2);
  for (let i = 0; i < 12; i++) {
    const x = r() * 320;
    fb.rect(x, 20 + r() * 40, 5 + r() * 4, 100, dark ? 0 : 6);
    fb.vline(x, 20, 119, 0);
  }
  fb.dither(0, 0, 320, 14, 9, dark ? 0 : 2, 1);
};

// ---------------------------------------------------------------------------------------
// Crossroads and the woods
// ---------------------------------------------------------------------------------------

defRoom({
  id: 'crossroads', name: 'Crossroads', outdoor: true, area: 'wild', arena: 'forest',
  minY: 112,
  blocks: [{ x: 150, y: 136, w: 10, h: 5 }],
  exits: { left: 'towngate', right: 'deepwood', up: 'northwood', down: 'meadow' },
  encounters: { chance: 0.15, day: [], night: ['goblin', 'wolf'] },
  bg(fb) {
    A.sky(fb, 100, 41, 3);
    A.mountains(fb, 90, 50, 3);
    A.hills(fb, 112, 18, 7);
    A.grass(fb, 112, 8);
    A.dirt(fb, [[0, 150], [120, 140], [130, 112], [175, 112], [180, 140], [320, 146], [320, 172], [190, 168], [200, 200], [120, 200], [125, 170], [0, 178]], 9);
    A.tree(fb, 30, 118, 22, 3); A.tree(fb, 280, 116, 20, 4); A.tree(fb, 60, 112, 12, 8, 'pine'); A.tree(fb, 250, 112, 10, 9, 'pine');
    A.bush(fb, 300, 190, 20, 3); A.bush(fb, 20, 196, 18, 6);
    A.rock(fb, 90, 190, 7, 3);
  },
  props: [{ y: 140, draw(fb) { A.signpost(fb, 155, 141); } }],
  things: [{ names: ['sign', 'signpost', 'post'], look: 'The signpost reads:\n\n  WEST .... Thornwick\n  NORTH ... Castle road, Faerie Glen\n  EAST .... Deepwood, Kobold Caves\n  SOUTH ... Meadow, Troll Bridge, Wizard\'s Tower\n\nSomeone has carved "BRIGANDS NE" into the post, with an arrow.' }],
  desc: 'Four roads meet at a weathered signpost. Thornwick lies to the west; the woods close in to the north and east, and a meadow opens to the south.',
});

defRoom({
  id: 'northwood', name: 'North Woods', outdoor: true, area: 'wild', arena: 'forest',
  minY: 124,
  blocks: [{ x: 70, y: 138, w: 18, h: 6 }],
  exits: { left: 'castlegate', right: 'faerie', down: 'crossroads' },
  encounters: { chance: 0.35, day: ['goblin', 'wolf'], night: ['wolf', 'goblin', 'saurus'] },
  bg(fb) {
    forestBackdrop(fb, 11);
    A.grass(fb, 120, 13);
    A.dirt(fb, [[120, 200], [140, 150], [0, 140], [0, 160], [150, 165], [320, 150], [320, 136], [180, 140], [180, 200]], 2);
    A.tree(fb, 260, 180, 22, 5); A.bush(fb, 20, 190, 22, 5); A.bush(fb, 300, 128, 18, 4);
    A.rock(fb, 220, 188, 8, 3);
  },
  props: [{ y: 142, draw(fb) { A.tree(fb, 79, 142, 34, 21); } }],
  things: [
    { names: ['tree', 'oak'], look: 'An ancient oak with low, thick branches. Perfect for climbing.' },
    { names: ['forest', 'woods', 'trees'], look: 'The North Woods are thick and green, and not entirely friendly.' },
  ],
  desc: 'The North Woods. A path winds between the trees, west toward the castle, east toward the Faerie Glen, and south back to the crossroads. A great old oak stands beside the path.',
  handle(p) {
    if (p.verb === 'climb' && (p.has('tree', 'oak') || !p.obj)) {
      if (!G.near(79, 146, 45)) { G.walkTo(84, 150); G.say('You walk over to the old oak.'); return true; }
      if (G.skill('climbing') <= 0) {
        if (Math.random() < 0.3) { G.hero.skills.climbing = 1; G.say('You hug the trunk, find a foothold, and actually get a few feet off the ground before sliding back down. You\'re learning how to climb!'); }
        else G.say('You hug the trunk and scrabble, but you have no idea how to climb. Maybe keep trying?');
        return true;
      }
      G.train('climbing', 2);
      if (G.roll(G.skill('climbing'), 15)) {
        G.award('climb_practice');
        G.say('You climb high into the old oak. From the top you can see the whole valley: the town, the castle, and far to the northeast a wooden stockade with smoke rising from it. The brigands\' fortress! You climb back down.');
      } else { G.say('You slip and tumble down through the branches.'); G.hurt(2, 'You fell out of a tree. The woodpeckers will talk about it for years.'); }
      return true;
    }
    return false;
  },
});

defRoom({
  id: 'deepwood', name: 'Deepwood', outdoor: true, area: 'wild', arena: 'forest',
  minY: 126,
  blocks: [{ x: 200, y: 158, w: 50, h: 6 }],
  exits: { left: 'crossroads', right: 'koboldcave', up: 'faerie', down: 'trollbridge' },
  encounters: { chance: 0.45, day: ['goblin', 'saurus', 'wolf'], night: ['wolf', 'saurus', 'goblin'] },
  bg(fb) {
    forestBackdrop(fb, 23, true);
    A.grass(fb, 122, 17);
    fb.dither(0, 122, 320, 78, 2, 0, 2);
    A.dirt(fb, [[0, 150], [140, 145], [150, 122], [178, 122], [185, 150], [320, 148], [320, 170], [180, 172], [170, 200], [140, 200], [140, 172], [0, 174]], 8);
    A.tree(fb, 30, 196, 26, 3, 'dead'); A.tree(fb, 292, 138, 22, 7, 'dead');
    for (let i = 0; i < 5; i++) { fb.circle(40 + i * 55, 135, 1, 14); fb.pset(40 + i * 55 + 3, 135, 14); }
  },
  props: [{ y: 162, draw(fb) {
    fb.rect(200, 152, 50, 10, 6); fb.ellipse(250, 157, 4, 5, 8); fb.ellipse(250, 157, 2, 3, 6);
    fb.hline(200, 249, 152, 8); fb.speckle(200, 152, 50, 10, 2, 0.2, 5);
  } }],
  things: [
    { names: ['log', 'fallen log'], look: 'A mossy fallen log. Something has been gnawing on it.' },
    { names: ['eyes', 'yellow'], look: 'Pairs of yellow eyes watch you from the undergrowth. They blink out when you look straight at them.' },
    { names: ['tree', 'trees', 'forest'], look: 'The trees of the Deepwood are old and twisted, and very close together.' },
  ],
  desc: 'The Deepwood. Even by day it is gloomy here. Paths lead in every direction: west to the crossroads, north to the Faerie Glen, east to the caves, and south toward the river.',
  handle(p) {
    if ((p.verb === 'search' || p.verb === 'look') && p.has('log')) {
      if (G.flag('logSearched')) { G.say('Just a log.'); return true; }
      G.set('logSearched');
      G.earn(4);
      G.say('Tucked inside the hollow end of the log is a small, rotten pouch. Inside are 4 silver coins. Some previous adventurer\'s stash, you suppose. They won\'t be needing it.');
      return true;
    }
    return false;
  },
});

// ---------------------------------------------------------------------------------------
// Faerie Glen
// ---------------------------------------------------------------------------------------

const RING = { x: 160, y: 158, rx: 62, ry: 20 };

defRoom({
  id: 'faerie', name: 'Faerie Glen', outdoor: true, area: 'wild', arena: 'forest',
  minY: 124,
  exits: { left: 'northwood', right: 'fortressgate', down: 'deepwood' },
  encounters: { chance: 0.2, day: ['saurus'], night: [] },
  bg(fb) {
    A.sky(fb, 60, 51, 2);
    forestBackdrop(fb, 51);
    fb.ellipse(160, 0, 74, 44, 2, 9, 0);
    fb.ellipse(160, 0, 64, 36, 9);
    fb.ellipse(160, 8, 50, 20, 11, 9, 1);
    A.grass(fb, 118, 19);
    fb.ellipse(RING.x, RING.y, RING.rx + 6, RING.ry + 4, 10, 2, 0);
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2, x = RING.x + Math.cos(a) * RING.rx, y = RING.y + Math.sin(a) * RING.ry;
      fb.rect(x, y - 3, 2, 3, 15); fb.ellipse(x + 1, y - 4, 3, 2, 4); fb.pset(x, y - 5, 15);
    }
    A.tree(fb, 18, 170, 26, 12); A.tree(fb, 300, 172, 26, 13);
    A.flowers(fb, 0, 124, 320, 76, [13, 15, 11], 5, 40);
  },
  anim(fb, t) {
    if (!G.isNight) return;
    fb.map = null;
    for (let i = 0; i < 9; i++) {
      const a = t * (0.6 + (i % 3) * 0.2) + (i / 9) * Math.PI * 2;
      const x = RING.x + Math.cos(a) * (RING.rx - 16 + (i % 2) * 10), y = RING.y - 14 + Math.sin(a) * (RING.ry - 4) + Math.sin(t * 5 + i) * 4;
      fb.circle(x, y, 2, i % 2 ? 13 : 11);
      fb.pset(x, y, 15);
      fb.pset(x - 3, y - 1 + (Math.floor(t * 10 + i) % 2), 15); fb.pset(x + 3, y - 1 + (Math.floor(t * 10 + i) % 2), 15);
      fb.pset(x - Math.cos(a) * 6, y - Math.sin(a) * 3, 14);
    }
  },
  things: [
    { names: ['mushroom', 'mushrooms', 'toadstool', 'toadstools', 'ring'], look: 'A perfect ring of red-capped toadstools: a faerie ring. It would be very rude to disturb it.' },
    { names: ['faerie', 'faeries', 'fairy', 'fairies', 'light', 'lights'], look: () => G.isNight ? 'Tiny winged people, no taller than your hand, whirl in a glittering dance above the toadstools. They giggle as they fly.' : 'There are no faeries here now. They only come out at night.' },
  ],
  desc: () => `A sunny glen in the heart of the woods. A perfect ring of red toadstools grows in the middle of the clearing.${G.isNight ? ' Tiny glowing faeries whirl above the ring in a merry dance!' : ''}`,
  handle(p) {
    const night = G.isNight;
    if (p.verb === 'dance') {
      if (!night) { G.say('You dance around the faerie ring. A squirrel watches, unimpressed. Perhaps you need a partner or two. Or two dozen.'); return true; }
      if (G.has('faeriedust') || G.flag('gotDust')) { G.say('You dance with the faeries again, just for the joy of it. They shower you with giggles.'); G.heal(0, -5); return true; }
      if (!G.near(RING.x, RING.y + 10, 90)) { G.walkTo(RING.x, RING.y + 26); G.say('You step closer to the faerie ring.'); return true; }
      if (!G.tire(8)) return true;
      const good = Math.random() < 0.25 + (G.stat('agi') + G.stat('luck') / 2) / 100;
      if (good) {
        G.set('gotDust');
        G.give('faeriedust');
        G.award('dust');
        G.say('You leap into the ring and dance! You spin, you twirl, you kick your heels. The faeries shriek with delight and join in, whirling around your head.\n\nWhen at last you collapse, laughing and breathless, the faerie queen herself flutters down and sprinkles a pinch of glittering faerie dust into your hand.\n\n"For the dancer!" she sings.');
        G.trainStat('agi');
      } else G.say('You stumble into the ring and trip over your own feet. The faeries laugh so hard two of them fall out of the air. They are waiting, though. Perhaps try again?');
      return true;
    }
    if (p.verb === 'talk' && p.has('faerie', 'faeries', 'fairy', 'fairies', 'queen')) {
      G.say(night ? '"Dance with us! Dance with us!" squeak a hundred tiny voices. "Dance well and you shall have a gift!"' : 'There are no faeries here during the day.');
      return true;
    }
    if (p.verb === 'ask' && night) { G.say('The faeries only giggle. "Dance with us!" they cry.'); return true; }
    if (p.verb === 'get' && p.has('dust', 'faerie', 'fairy', 'faeries')) { G.say(night ? '"Ah ah ah!" The faeries zip out of reach. "Dance for it!"' : 'There are no faeries here, and so no dust.'); return true; }
    if (p.verb === 'eat' && p.has('mushroom', 'toadstool', 'mushrooms', 'toadstools')) {
      G.die('You pluck a toadstool from the faerie ring and eat it. The world turns purple, then green, then quietly stops. The faeries hold a small, pretty funeral.', 'Mushroom Madness');
      return true;
    }
    if ((p.verb === 'get' || p.verb === 'pick') && p.has('mushroom', 'toadstool', 'mushrooms', 'toadstools')) { G.say('Taking toadstools from a faerie ring is the sort of thing that gets you turned into a newt. You leave them alone.'); return true; }
    if (p.verb === 'attack' && night) { G.say('You swipe at the faeries. They scatter, then pelt you with acorns until you promise to behave.'); return true; }
    if (p.verb === 'sleep' && night) { G.say('The faeries won\'t let you sleep; they keep tickling your nose. They want you to DANCE.'); return true; }
    return false;
  },
});

// ---------------------------------------------------------------------------------------
// Meadow & the healer
// ---------------------------------------------------------------------------------------

defRoom({
  id: 'meadow', name: 'Flower Meadow', outdoor: true, area: 'wild', arena: 'forest',
  minY: 116,
  blocks: [{ x: 58, y: 162, w: 44, h: 8 }],
  exits: { left: 'healer', up: 'crossroads', right: 'trollbridge' },
  encounters: { chance: 0.25, day: ['saurus'], night: ['goblin', 'wolf'] },
  bg(fb) {
    A.sky(fb, 100, 61, 4);
    A.mountains(fb, 96, 44, 14);
    A.hills(fb, 116, 16, 3);
    A.grass(fb, 116, 23);
    A.flowers(fb, 0, 120, 320, 80, [14, 15, 13], 17, 60);
    A.flowers(fb, 200, 150, 110, 44, [12, 14, 12, 4], 29, 60);
    A.dirt(fb, [[150, 116], [168, 116], [175, 150], [320, 160], [320, 172], [170, 166], [100, 150], [0, 152], [0, 142], [100, 140]], 11);
    A.tree(fb, 290, 122, 16, 6);
  },
  props: [{ y: 168, draw(fb) { A.rock(fb, 80, 160, 22, 10); A.rock(fb, 104, 168, 6, 3); A.rock(fb, 56, 168, 5, 2); } }],
  things: [
    { names: ['flame-lily', 'flamelily', 'lily', 'lilies', 'flower', 'flowers'], look: () => G.isNight ? 'The flame-lilies have closed for the night, but they glow faintly, like embers.' : 'Bright orange flame-lilies bloom in a patch near the eastern path. Their petals flicker like tiny flames in the breeze.' },
    { names: ['rock', 'rocks', 'boulder', 'stone', 'stones'], look: 'A big mossy boulder, surrounded by smooth stones just the right size for throwing.' },
  ],
  desc: 'A wide meadow bright with flowers. Near the eastern path grows a patch of orange flame-lilies. A mossy boulder sits among smaller stones.',
  handle(p) {
    if ((p.verb === 'get' || p.verb === 'pick') && p.has('flame-lily', 'flamelily', 'lily', 'lilies', 'flower', 'flowers')) {
      if (!G.near(255, 172, 70)) { G.walkTo(250, 178); G.say('You walk over to the flame-lilies.'); return true; }
      if (G.isNight) { G.say('The flame-lilies have closed up tight for the night. When you touch one it is hot enough to sting. Better to wait for daylight.'); return true; }
      if (G.has('flamelily')) { G.say('You already have a flame-lily. No need to be greedy.'); return true; }
      G.give('flamelily');
      G.award('lily');
      G.say('You pick a flame-lily. It is warm in your hand, like a coal that doesn\'t burn.');
      return true;
    }
    if (p.verb === 'get' && p.has('rock', 'rocks', 'stone', 'stones', 'pebble')) {
      if (!G.near(80, 172, 60)) { G.walkTo(84, 178); G.say('You walk over to the boulder.'); return true; }
      if (G.count('rocks') >= 10) { G.say('Your pockets are full of rocks already.'); return true; }
      G.give('rocks', 10 - G.count('rocks'));
      G.say('You gather a handful of smooth throwing stones.');
      return true;
    }
    if (p.verb === 'throw' && p.has('rock', 'stone')) {
      if (!G.has('rocks')) { G.say('You have no rocks.'); return true; }
      G.train('throwing');
      G.say('You throw a rock at the boulder. Clack! Good practice. You go and pick it up again.');
      return true;
    }
    if (p.verb === 'smell' && p.has('flower', 'flowers', 'lily', 'lilies')) { G.say('They smell of cinnamon and woodsmoke.'); return true; }
    return false;
  },
});

const nestDown = () => !!G.flag('nestDown');

defRoom({
  id: 'healer', name: "Healer's Cottage", outdoor: true, area: 'wild', arena: 'forest',
  minY: 128,
  blocks: [{ x: 250, y: 150, w: 26, h: 6 }, { x: 150, y: 128, w: 46, h: 22 }],
  exits: { up: 'towngate', right: 'meadow' },
  doors: [{
    rect: { x: 60, y: 128, w: 18, h: 4 }, to: 'healerin', at: [150, 188], dir: DIR.UP, names: ['door', 'cottage', 'hut'],
    check: () => { if (within(7, 20)) return true; G.say('The door is locked. A hand-lettered sign reads: "CLOSED. Open 7 in the morning to 8 at night. If you are bleeding, bleed quietly."'); return false; },
  }],
  bg(fb) {
    A.sky(fb, 90, 71, 3);
    A.hills(fb, 110, 20, 13);
    A.grass(fb, 124, 29);
    // cottage with thatched roof
    fb.rect(20, 84, 110, 44, 15); fb.speckle(20, 84, 110, 44, 7, 0.08, 3);
    fb.rect(20, 84, 3, 44, 6); fb.rect(127, 84, 3, 44, 6);
    fb.poly([[10, 86], [140, 86], [118, 52], [32, 52]], 14, 6, 0);
    for (let y = 56; y < 86; y += 4) fb.hline(22 - (y - 56) * 0.4, 128 + (y - 56) * 0.4, y, 6);
    fb.rect(100, 40, 10, 16, 8); fb.rect(98, 38, 14, 3, 7);
    A.door(fb, 60, 128, 18, 28, 2);
    fb.rect(32, 94, 16, 12, 3); fb.frame(31, 93, 18, 14, 6); fb.vline(40, 94, 105, 6);
    fb.rect(96, 94, 16, 12, 3); fb.frame(95, 93, 18, 14, 6); fb.vline(104, 94, 105, 6);
    for (let i = 0; i < 5; i++) fb.line(84 + i * 3, 86, 84 + i * 3, 96, [4, 2, 14, 5, 12][i]);
    // herb garden fence
    for (let x = 150; x < 200; x += 6) fb.rect(x, 128, 2, 16, 6);
    fb.hline(150, 198, 132, 6); fb.hline(150, 198, 140, 6);
    A.flowers(fb, 152, 142, 44, 12, [5, 13, 14, 2], 41, 30);
    A.dirt(fb, [[60, 128], [80, 128], [120, 200], [70, 200]], 3);
    A.dirt(fb, [[100, 150], [320, 156], [320, 168], [100, 170]], 4);
    A.rock(fb, 30, 180, 8, 3);
  },
  get lights() { return [{ x: 32, y: 94, w: 16, h: 12 }, { x: 96, y: 94, w: 16, h: 12 }]; },
  props: [{
    y: 154, draw(fb, t) {
      A.tree(fb, 262, 154, 40, 88);
      if (!nestDown()) {
        fb.ellipse(282, 50, 9, 4, 6); fb.ellipse(282, 48, 7, 2, 8);
        fb.line(274, 52, 290, 47, 0);
        if (Math.floor(t * 2) % 5 === 0) fb.pset(284, 45, 15);
      } else if (!G.flag('gotRing')) {
        fb.ellipse(236, 168, 7, 3, 6); fb.ellipse(236, 167, 5, 1, 8);
      }
    },
  }],
  things: [
    { names: ['nest'], look: () => nestDown() ? (G.flag('gotRing') ? 'The empty nest lies on the grass.' : 'The nest lies in the grass where it fell. Something glints inside it.') : 'High in the branches of the big oak is a large, untidy bird\'s nest. Something in it glints in the light.' },
    { names: ['tree', 'oak', 'branches'], look: () => `A great oak shades the cottage.${nestDown() ? '' : ' There is a bird\'s nest high in its branches, far out of reach.'}` },
    { names: ['cottage', 'hut', 'house'], look: "Mother Hilde's cottage: whitewashed, thatched, with bundles of herbs hanging under the eaves. A sign over the door shows a green leaf." },
    { names: ['garden', 'herbs', 'fence'], look: 'A neat herb garden, fenced against rabbits and adventurers.' },
    { names: ['sign'], look: 'A green leaf: the healer\'s sign. Beneath it: "Open 7 to 8."' },
  ],
  desc: () => `A tidy thatched cottage with an herb garden: the home of Mother Hilde, the healer. A great oak shades the yard${nestDown() ? '.' : ', and high in its branches is a bird\'s nest.'} The town gate lies north; the meadow lies east.`,
  handle(p) {
    const aboutNest = p.has('nest', 'tree', 'oak', 'branch', 'branches') || !p.obj;
    if (p.verb === 'climb' && aboutNest) {
      if (nestDown()) { G.say('No need; the nest is already on the ground.'); return true; }
      if (!G.near(262, 160, 45)) { G.walkTo(250, 162); G.say('You walk over to the oak.'); return true; }
      if (G.skill('climbing') <= 0) {
        if (Math.random() < 0.3) { G.hero.skills.climbing = 1; G.say('You wrap yourself around the trunk and inch upward before sliding back down with bark burns. You\'re starting to learn how to climb, though!'); }
        else G.say('You wrap yourself around the trunk and try to shinny up it, but you have no idea how to climb. You slide back down.');
        return true;
      }
      G.train('climbing', 2);
      if (G.roll(G.skill('climbing'), 30)) {
        G.set('nestDown'); G.set('gotRing');
        G.give('ring');
        G.award('nest');
        G.say('You climb up into the oak, branch by branch, until you can reach the nest. Nestled among twigs and bits of string is a silver ring! You pocket it and climb carefully down.');
      } else {
        G.say('You climb halfway up, reach for the next branch, and miss. You crash down through the leaves.');
        G.hurt(3, 'You fell out of the healer\'s oak and landed on your head. Mother Hilde does her best, but there are limits.');
      }
      return true;
    }
    if (p.verb === 'throw' && (p.has('nest') || (p.has('rock', 'stone') && !p.target))) {
      if (nestDown()) { G.say('The nest is already down.'); return true; }
      if (!G.has('rocks')) { G.say(G.has('dagger') ? "Throwing your dagger into a tree seems like a good way to lose it. Rocks would be better." : "You have nothing to throw. There are good throwing stones in the meadow."); return true; }
      if (!G.tire(1)) return true;
      G.take('rocks');
      G.train('throwing', 1.5);
      if (G.roll(G.skill('throwing') + G.stat('agi') / 4, 40)) {
        G.set('nestDown');
        G.award('nest');
        G.say('You wind up and hurl a rock. THWACK! It hits the nest dead center, and the whole thing tumbles out of the tree and lands in the grass. Something glints inside it.');
      } else G.say('You throw a rock at the nest and miss by a mile. It rattles off through the branches.' + (G.count('rocks') ? '' : ' You\'re out of rocks.'));
      return true;
    }
    if (p.verb === 'cast' && p.has('fetch')) {
      if (nestDown()) { G.say('The nest is already down.'); return true; }
      if (!G.cast('fetch')) return true;
      G.set('nestDown');
      G.award('nest');
      G.say('You point at the nest and speak the word of Fetch. The nest lifts gently out of the branches and floats down to land at your feet. Something glints inside.');
      return true;
    }
    if ((p.verb === 'search' || p.verb === 'look' || p.verb === 'get') && p.has('nest', 'ring')) {
      if (!nestDown()) { G.say(p.verb === 'look' ? 'The nest is high in the oak. Something glints in it.' : 'The nest is far out of reach, high in the tree.'); return true; }
      if (G.flag('gotRing')) { G.say('The nest is empty now.'); return true; }
      G.set('gotRing');
      G.give('ring');
      G.say('You search the fallen nest. Tangled among the twigs is a silver ring engraved with a sprig of herb.');
      return true;
    }
    if (p.verb === 'get' && p.has('herb', 'herbs')) { G.say('Stealing from a healer\'s garden? That\'s very bad luck.'); return true; }
    if (p.verb === 'knock') {
      G.say(within(7, 20) ? 'A voice calls: "It\'s open, dearie! Come in!"' : 'A sleepy voice calls through the door: "Closed! Come back in the morning!"');
      return true;
    }
    return false;
  },
});

defRoom({
  id: 'healerin', name: "Mother Hilde's Cottage", outdoor: false, area: 'inside',
  minY: 136,
  blocks: [{ x: 200, y: 136, w: 40, h: 12 }],
  exits: { down: leave('healer', 69, 136, DIR.DOWN) },
  bg(fb) {
    A.room(fb, { wall: 15, wall2: 7, floor: 6, floor2: 8, wallH: 112 });
    for (let x = 0; x < 320; x += 50) fb.rect(x, 0, 4, 112, 6);
    fb.rect(0, 6, 320, 4, 6);
    A.shelves(fb, 14, 26, 120, 4, 17);
    for (let i = 0; i < 9; i++) { const x = 160 + i * 16; fb.line(x, 10, x, 22, 6); fb.ellipse(x, 26, 4, 6, [2, 10, 14, 5, 2, 12, 10, 13, 2][i]); }
    fb.rect(270, 40, 34, 28, 3); fb.frame(270, 40, 34, 28, 6); fb.vline(287, 40, 67, 6);
  },
  anim(fb, t) { A.cauldron(fb, 220, 140, t); A.fire(fb, 220, 141, t, 0.6); },
  npcs: [{
    id: 'hilde', name: 'Mother Hilde', names: ['hilde', 'mother', 'healer', 'woman', 'old woman', 'lady'], look: LOOKS.healer,
    x: 140, y: 146, dir: DIR.DOWN,
    desc: 'Mother Hilde, the healer: small, wrinkled, bright-eyed, and smelling of mint.',
    talk: () => {
      if (G.flag('dispelReady') && !G.flag('gotDispel')) { hildeDispel(); return; }
      G.say(`"Come in, come in! Are you hurt, dearie? I sell HEALING potions for 20 silver, VIGOR potions for 15, and MANA potions for 25. And I'm always in need of rare ingredients."` + (G.flag('ringReturned') ? '' : '\n\nShe sighs and twists her bare finger. "If only I could find my ring..."'), 'Mother Hilde');
    },
    topics: {
      'ring': () => G.say(G.flag('ringReturned') ? '"My ring is back where it belongs, thanks to you."' : '"My silver ring! A thieving magpie snatched it off my windowsill. I\'m sure it\'s in that nest up in the big oak outside, but my climbing days are long gone."', 'Mother Hilde'),
      'dispel,curse,enchantment,enchanted,cure,break': '"A dispel potion? Now that\'s a rare brew. It will break almost any enchantment. I\'d need three things: a FLAME-LILY from the meadow, a pinch of FAERIE DUST, and a TROLL\'S BEARD. Bring them to me and I\'ll brew it."',
      'flame-lily,flamelily,lily,lilies,flower': '"Flame-lilies grow in the meadow east of here. Pick them by day; at night they close up tight and sting."',
      'faerie,faeries,fairy,dust': '"The faeries dance in the glen north of the Deepwood on clear nights. They don\'t give their dust away, mind. You\'ll have to earn it. Faeries love a good dancer."',
      'troll,beard': '"Grobb the troll lives under the bridge south-east of the meadow. How you get his beard is your business. Pay him, fight him, sneak up on him while he sleeps..."',
      'potion,potions,healing,vigor,mana': '"Healing potions, 20 silver. Vigor to restore your stamina, 15. Mana for the magically inclined, 25. Just say BUY and the name."',
      'wren,lady,daughter': '"Poor child. Such a bright little thing. You know, the brigands turned up the very summer she vanished, and old Grizelda the witch disappeared at the same time. I\'ve always wondered..."',
      'grizelda,witch,crone': '"Grizelda. A wicked old witch who lived up in the hills. She hated the Baron for driving her out of Thornwick. Her favorite trick was the curse of forgetting: you don\'t remember who you are."',
      'brigand,brigands,leader': '"Their leader came to me once, years ago, in the dead of night, with an arrow wound. Masked. Young. Polite, even. And she called me Mother Hilde, as if she\'d known me all her life."',
      'baron': '"The Baron is a good man, drowning in grief."',
      'name,hilde': '"Everyone calls me Mother Hilde. I\'ve patched up half the valley at one time or another."',
      '*': '"I\'m just an old healer, dearie. Ask me about herbs and potions."',
    },
    give: (item) => {
      if (item === 'ring') {
        G.take('ring'); G.set('ringReturned'); G.earn(25); G.award('ring_return');
        G.say('"My ring! Oh, my ring!" She slips it onto her finger and beams. "Bless you, dearie! Here, take this for your trouble." She presses 25 silver into your hand. "And for you, my potions are always the finest I can make."', 'Mother Hilde');
        return true;
      }
      if (item === 'flamelily' || item === 'faeriedust' || item === 'beard') {
        const key = { flamelily: 'give_lily', faeriedust: 'give_dust', beard: 'give_beard' }[item]!;
        G.take(item); G.set('has_' + item); G.award(key);
        const have = ['flamelily', 'faeriedust', 'beard'].filter((k) => G.flag('has_' + k)).length;
        const name = { flamelily: 'flame-lily', faeriedust: 'faerie dust', beard: "troll's beard" }[item];
        if (have < 3) G.say(`"A ${name}! Wonderful. That's ${have} of the three things I need for a dispel potion."`, 'Mother Hilde');
        else {
          G.set('dispelDay', G.day + 1);
          G.say(`"And the ${name}! That's all three!" She bustles to the cauldron and starts to chop and stir. "A dispel potion takes a night to brew properly. Come back tomorrow, dearie."`, 'Mother Hilde');
        }
        return true;
      }
      if (item === 'purse') { G.say('"That\'s Fenwick\'s purse! I\'ll not ask how you got it."', 'Mother Hilde'); return true; }
      if (item === 'locket') { G.say('"Why, that\'s the Baron\'s crest! That locket belonged to Lady Wren\'s mother."', 'Mother Hilde'); return true; }
      return false;
    },
  }],
  things: [
    { names: ['cauldron', 'pot'], look: 'A black cauldron bubbles over the fire. It smells of mint and something you can\'t name.' },
    { names: ['shelf', 'shelves', 'jar', 'jars', 'bottles'], look: 'Shelves of jars and bottles: roots, powders, pickled things.' },
    { names: ['herbs', 'bundles'], look: 'Bundles of herbs hang drying from the rafters.' },
  ],
  desc: "Mother Hilde's cottage is warm and smells of herbs. A cauldron bubbles over the fire, and shelves of jars line the walls.",
  enter(first) {
    if (G.flag('dispelDay') && G.day >= G.flag('dispelDay') && !G.flag('gotDispel')) { G.set('dispelReady'); hildeDispel(); return; }
    if (first) G.describe();
  },
  handle(p) {
    if (buy(p, [
      { id: 'healing', words: ['healing', 'heal', 'health', 'red'], price: 20 },
      { id: 'vigor', words: ['vigor', 'stamina', 'green'], price: 15 },
      { id: 'mana', words: ['mana', 'magic', 'blue'], price: 25 },
    ], 'Mother Hilde', '"Healing potions are 20 silver, vigor 15, mana 25."')) return true;
    if (p.verb === 'ask' && p.has('heal', 'healing') && !p.has('potion')) {
      if (!G.pay(5)) { G.say('"I\'d heal you for 5 silver, dearie, but you haven\'t got it."', 'Mother Hilde'); return true; }
      G.heal(999);
      G.say('Mother Hilde dabs your wounds with a stinging green salve and mutters over them. You feel much better. (5 silver)', 'Mother Hilde');
      return true;
    }
    return false;
  },
});

function hildeDispel() {
  G.set('gotDispel');
  G.give('dispel');
  G.award('dispel');
  G.say('Mother Hilde holds up a small crystal vial. The liquid inside swirls orange, silver and grey.\n\n"Your dispel potion, dearie, brewed overnight. Give it to the one who is enchanted, or throw it over them. It will break almost any spell."', 'Mother Hilde');
}

// ---------------------------------------------------------------------------------------
// Troll bridge
// ---------------------------------------------------------------------------------------

const trollHere = () => !G.flag('trollGone');
const trollAsleep = () => trollHere() && G.isNight && !G.flag('trollAwake');
const trollCalm = () => G.flag('trollCalmDay') === G.day;
const trollPaid = () => G.flag('trollPaidDay') === G.day;

function trollFight() {
  G.set('trollAwake', true);
  G.startCombat('troll', {
    arena: 'bridge', noCorpse: true,
    onWin: () => {
      G.set('trollGone');
      G.award('troll_beaten');
      const gotBeard = !G.flag('gotBeard');
      if (gotBeard) { G.set('gotBeard'); G.give('beard'); G.award('beard'); }
      G.say(`With a bellow of rage, Grobb staggers back and topples off the bridge. SPLASH! He surfaces downstream, shakes his fist, and swims away sulking.${gotBeard ? '\n\nIn your hand you find a great hank of grey troll beard, torn out in the struggle.' : ''}\n\nThe bridge is clear.`);
    },
  });
}

defRoom({
  id: 'trollbridge', name: 'Troll Bridge', outdoor: true, area: 'wild', arena: 'bridge',
  minY: 118,
  blocks: [{ x: 174, y: 118, w: 146, h: 22 }, { x: 174, y: 160, w: 146, h: 40 }],
  exits: {
    left: 'meadow', up: 'deepwood',
    right: () => {
      if (!trollHere() || trollPaid() || trollCalm()) return 'wizard';
      if (trollAsleep()) {
        if (G.sneaking && G.roll(G.skill('stealth'), 35)) { G.award('troll_passed'); G.say('You tiptoe past the snoring troll and across the bridge.'); return 'wizard'; }
        G.set('trollAwake', true);
        G.say('The planks creak under your boots. Grobb\'s eyes snap open. "WHO\'S THAT TRIP-TRAPPING OVER MY BRIDGE?"');
        return null;
      }
      G.say('Grobb the troll plants himself in the middle of the bridge. "TOLL! TEN SILVER TO CROSS, OR I BREAK YOU IN HALF!"', 'Grobb');
      return null;
    },
  },
  bg(fb) {
    A.sky(fb, 90, 81, 3);
    A.mountains(fb, 90, 50, 21);
    A.grass(fb, 112, 31);
    // ravine on the right with a river far below
    fb.poly([[170, 112], [320, 112], [320, 200], [176, 200]], 8);
    fb.poly([[176, 118], [320, 118], [320, 200], [184, 200]], 0);
    fb.dither(176, 118, 144, 30, 8, 0, 1);
    A.water(fb, 190, 176, 130, 24, 7);
    fb.line(170, 112, 184, 200, 7);
    // bridge
    fb.rect(170, 140, 150, 20, 6);
    for (let x = 172; x < 320; x += 7) fb.vline(x, 140, 159, 0);
    fb.rect(170, 132, 150, 2, 6); fb.hline(170, 319, 134, 0);
    for (let x = 174; x < 320; x += 30) { fb.rect(x, 128, 3, 14, 6); fb.line(x + 1, 160, x + 12, 176, 6); }
    A.dirt(fb, [[0, 150], [60, 140], [170, 140], [170, 160], [60, 162], [0, 172]], 5);
    A.dirt(fb, [[120, 112], [140, 112], [120, 150], [96, 150]], 6);
    A.tree(fb, 30, 124, 18, 31);
    A.rock(fb, 90, 186, 9, 4); A.rock(fb, 140, 178, 5, 2);
  },
  anim(fb, t) { A.sparkle(fb, 190, 176, 130, 24, t, 7); },
  npcs: [{
    id: 'grobb', name: 'Grobb', names: ['troll', 'grobb', 'monster'], look: () => (G.flag('gotBeard') ? LOOKS.trollShorn : LOOKS.troll),
    x: 188, y: 152, dir: DIR.LEFT, visible: trollHere,
    desc: () => trollAsleep() ? 'Grobb the troll is sitting against the bridge post, snoring like a sawmill. His magnificent grey beard rises and falls with every snore.' : trollCalm() ? 'Grobb sits on the bridge, smiling dreamily at a butterfly.' : `Grobb the troll: eight feet of green, warty muscle with a club like a tree trunk${G.flag('gotBeard') ? ' and a freshly shorn chin. He looks sulky.' : ' and a magnificent grey beard.'}`,
    talk: () => {
      if (trollAsleep()) { G.say('Grobb snores. "Hnnnrk... mmm... toll..."'); return; }
      G.say(trollPaid() ? '"You PAID. You CROSS. Grobb is FAIR."' : '"TOLL! TEN SILVER TO CROSS GROBB\'S BRIDGE! PAY or GO AWAY or GET SQUASHED!"', 'Grobb');
    },
    topics: {
      'toll,pay,silver,money': '"TEN SILVER. EVERY DAY. GROBB HAS EXPENSES."',
      'beard': '"GROBB\'S BEARD IS BEAUTIFUL. NOBODY TOUCHES GROBB\'S BEARD."',
      'wizard,zephram': '"LITTLE MAN WITH BIG HAT. HE PAYS WITH RIDDLES. GROBB HATES RIDDLES."',
      '*': '"GROBB DOESN\'T KNOW. GROBB DOESN\'T CARE. PAY TOLL."',
    },
    give: (item) => {
      if (item === 'rations') { G.take('rations'); G.say('Grobb swallows the rations whole, wrapper and all. "MORE." He does not let you cross.', 'Grobb'); return true; }
      return false;
    },
  }],
  things: [
    { names: ['bridge', 'planks'], look: 'A rickety wooden bridge spans the ravine. Far below, a river roars over the rocks.' },
    { names: ['river', 'ravine', 'water', 'chasm'], look: 'The river roars through the ravine a long, long way down.' },
    { names: ['rock', 'rocks', 'stone', 'stones'], look: 'Loose stones by the path.' },
  ],
  desc: () => `A rickety bridge crosses a deep ravine to the east, toward the wizard's tower.${trollHere() ? (trollAsleep() ? ' A huge troll sits slumped against the bridge post, snoring.' : ' A huge troll stands guard at the near end.') : ' The bridge is unguarded now.'}`,
  enter(first) {
    if (!G.isNight) G.set('trollAwake', false);
    if (first) G.describe();
  },
  handle(p) {
    const aboutTroll = p.has('troll', 'grobb');
    if (p.verb === 'pay' || (p.verb === 'give' && p.has('silver', 'money', 'coin', 'toll'))) {
      if (!trollHere()) { G.say('There is no one to pay.'); return true; }
      if (trollAsleep()) { G.say('The troll is asleep. Paying him seems unnecessary.'); return true; }
      if (trollPaid()) { G.say('"YOU ALREADY PAID TODAY. GROBB IS HONEST TROLL."', 'Grobb'); return true; }
      if (!G.pay(10)) { G.say('"NOT ENOUGH! GO AWAY, POOR PERSON."', 'Grobb'); return true; }
      G.set('trollPaidDay', G.day);
      G.award('troll_passed');
      G.say('You hand over ten silver. Grobb bites each coin, then steps aside. "CROSS. TODAY ONLY."', 'Grobb');
      return true;
    }
    if (p.verb === 'attack' && (aboutTroll || !p.obj)) {
      if (!trollHere()) { G.say('The troll is gone.'); return true; }
      if (trollAsleep()) G.say('You wake the troll with a good hard poke. That was bold. Possibly stupid.', undefined, trollFight);
      else G.say('"FIGHT? GROBB LIKES FIGHT!"', 'Grobb', trollFight);
      return true;
    }
    if (p.verb === 'cast' && p.has('calm')) {
      if (!trollHere()) { G.say('There is nothing here to calm.'); return true; }
      if (!G.cast('calm')) return true;
      if (G.roll(G.skill('magic'), 30)) {
        G.set('trollCalmDay', G.day);
        G.award('troll_passed');
        G.say('A soft blue glow settles over Grobb. His scowl melts into a sleepy smile. He sits down on the bridge and watches a butterfly with great interest. You could probably walk right past him. Or even trim his beard.');
      } else G.say('Grobb shakes his head like a bull with a fly in its ear. "TICKLES." Your spell has no effect.');
      return true;
    }
    if ((p.verb === 'cut' || p.verb === 'get' || p.verb === 'steal') && p.has('beard', 'hair')) {
      if (!trollHere()) { G.say('The troll is gone.'); return true; }
      if (G.flag('gotBeard')) { G.say('You already have a piece of troll beard. Grobb\'s chin is bare enough.'); return true; }
      if (!G.has('dagger') && !G.has('sword')) { G.say('You need a blade to cut a troll\'s beard.'); return true; }
      if (!G.near(188, 152, 40)) { G.walkTo(170, 152); G.say('You approach the troll.'); return true; }
      if (trollCalm()) {
        G.set('gotBeard'); G.give('beard'); G.award('beard');
        G.say('Humming softly, you snip off a generous hank of the dreaming troll\'s beard. Grobb doesn\'t even notice. "Pretty butterfly," he murmurs.');
        return true;
      }
      if (trollAsleep()) {
        if (G.sneaking && G.roll(G.skill('stealth') + (G.hero.cls === 'thief' ? 10 : 0), 35)) {
          G.set('gotBeard'); G.give('beard'); G.award('beard'); G.train('stealth', 2);
          G.say('Holding your breath, you creep up to the snoring troll and saw off a hank of his beard. He snorts, scratches his chin, and goes on snoring. You back away very, very quietly.');
        } else {
          G.set('trollAwake', true);
          G.say(G.sneaking ? 'You creep closer, but a plank creaks. Grobb\'s eyes snap open.' : 'You stomp up to the troll bold as brass. You might have tried SNEAKing. Grobb\'s eyes snap open.', undefined, () => G.say('"BEARD THIEF!" roars Grobb.', 'Grobb', trollFight));
        }
        return true;
      }
      G.say('You reach for Grobb\'s beard. Grobb reaches for your head.', undefined, trollFight);
      return true;
    }
    if (p.verb === 'wake' && aboutTroll) { G.set('trollAwake', true); G.say('"WHAT?! WHO WAKES GROBB?!"', 'Grobb'); return true; }
    if ((p.verb === 'jump' || p.verb === 'swim') && p.has('river', 'bridge', 'ravine', 'water', 'off') || (p.verb === 'jump' && !p.obj && G.S.x > 150)) {
      G.die('You leap off the edge into the ravine. It is a very long way down, and the river is very rocky at the bottom.', 'Geronimo!');
      return true;
    }
    if (p.verb === 'get' && p.has('rock', 'rocks', 'stone', 'stones')) {
      if (G.count('rocks') >= 10) { G.say('Your pockets are full of rocks.'); return true; }
      G.give('rocks', 10 - G.count('rocks'));
      G.say('You pick up some good throwing stones.');
      return true;
    }
    if (p.verb === 'throw' && aboutTroll) { G.say('You throw a rock at Grobb. It bounces off his head. He does not seem to notice.'); if (G.has('rocks')) G.take('rocks'); return true; }
    return false;
  },
});

// ---------------------------------------------------------------------------------------
// The wizard's tower
// ---------------------------------------------------------------------------------------

defRoom({
  id: 'wizard', name: "Wizard's Tower", outdoor: true, area: 'wild', arena: 'forest',
  minY: 132,
  blocks: [{ x: 116, y: 132, w: 30, h: 8 }, { x: 174, y: 132, w: 30, h: 8 }],
  exits: { left: leave('trollbridge', 300, 150, DIR.LEFT) },
  doors: [{ rect: { x: 148, y: 132, w: 24, h: 4 }, to: 'wizardin', at: [160, 188], dir: DIR.UP, names: ['door', 'tower'] }],
  bg(fb) {
    A.sky(fb, 110, 91, 2);
    A.mountains(fb, 108, 60, 17);
    A.grass(fb, 128, 33);
    A.stoneWall(fb, 118, 12, 84, 122, 7, 8);
    for (let y = 12; y < 134; y++) { fb.pset(118, y, 8); fb.pset(119, y, 8); fb.pset(200, y, 15); fb.pset(201, y, 15); }
    fb.poly([[110, 14], [210, 14], [160, -40]], 1);
    fb.line(110, 14, 160, -40, 9); fb.line(210, 14, 160, -40, 0);
    for (let i = 0; i < 6; i++) fb.pset(140 + i * 8, 2 - (i % 2) * 4, 14);
    A.archDoor(fb, 148, 134, 24, 34, 5);
    fb.vline(160, 108, 133, 13);
    fb.circle(160, 60, 6, 11); fb.circle(160, 60, 3, 1); fb.circle(142, 90, 4, 11); fb.circle(178, 90, 4, 11);
    A.dirt(fb, [[148, 134], [172, 134], [180, 150], [0, 158], [0, 146], [140, 146]], 7);
    A.flowers(fb, 200, 150, 110, 40, [9, 13, 11], 81, 40);
  },
  anim(fb, t) {
    fb.map = null;
    for (let i = 0; i < 3; i++) {
      const y = 70 + Math.sin(t * 1.5 + i * 2) * 5, x = 60 + i * 90 + (i === 1 ? 150 : 0);
      A.rock(fb, x % 320, y + 40, 6, 3);
      fb.pset(x % 320, y + 48, 11);
    }
  },
  things: [
    { names: ['tower'], look: 'A tall tower of pale stone, crowned with a blue roof shaped like a wizard\'s hat. Rocks float lazily around it.' },
    { names: ['rock', 'rocks', 'floating'], look: 'Rocks drift through the air around the tower as if they were clouds. Nobody seems to find this odd but you.' },
    { names: ['door'], look: 'A purple door with a brass knocker shaped like a grinning moon.' },
  ],
  desc: "Across the bridge stands a tall tower with a blue pointed roof. Rocks float gently in the air around it. A purple door waits at its base.",
  enter(first) { if (first) G.describe(); },
  handle(p) {
    if (p.verb === 'knock') { G.say('The moon-shaped knocker giggles. "Come in, come in, it\'s open!" calls a voice from inside.'); return true; }
    if (p.verb === 'get' && p.has('rock', 'rocks')) { G.say('The floating rocks drift politely out of reach.'); return true; }
    return false;
  },
});

const RIDDLES: { q: string; a: string[] }[] = [
  { q: 'I have cities, but no houses. I have forests, but no trees. I have rivers, but no fish. What am I?', a: ['map', 'a map'] },
  { q: 'The more of them you take, the more of them you leave behind. What are they?', a: ['footsteps', 'footstep', 'steps', 'step', 'footprints', 'footprint', 'tracks'] },
  { q: 'I can run, but never walk. I have a mouth, but never talk. I have a bed, but never sleep. What am I?', a: ['river', 'a river', 'stream', 'creek'] },
];

function riddleAsk() {
  const n = G.flag('riddle') ?? 0;
  G.say(`"Riddle the ${['first', 'second', 'third'][n]}!" Zephram steeples his fingers.\n\n"${RIDDLES[n].q}"\n\n(Type ANSWER followed by your guess.)`, 'Zephram');
}

defRoom({
  id: 'wizardin', name: "Zephram's Study", outdoor: false, area: 'inside',
  minY: 134,
  blocks: [{ x: 214, y: 134, w: 60, h: 10 }],
  exits: { down: leave('wizard', 160, 144, DIR.DOWN) },
  bg(fb) {
    A.room(fb, { wall: 1, wall2: 0, floor: 5, floor2: 1, wallH: 112, stone: true });
    A.books(fb, 10, 12, 70, 6, 5);
    A.books(fb, 250, 12, 64, 6, 9);
    fb.rect(120, 20, 60, 50, 0); fb.frame(120, 20, 60, 50, 14);
    const r = rng(3);
    for (let i = 0; i < 25; i++) fb.pset(122 + r() * 56, 22 + r() * 46, r() < 0.3 ? 14 : 15);
    fb.circle(160, 45, 6, 7); fb.circle(158, 43, 5, 0);
    fb.line(96, 100, 110, 60, 6, 2); fb.line(110, 60, 118, 56, 7, 3);
    fb.line(96, 100, 86, 112, 6); fb.line(96, 100, 104, 112, 6);
  },
  anim(fb, t) {
    fb.map = null;
    const y = 90 + Math.sin(t * 2) * 4;
    fb.circle(200, y, 7, 3); fb.circle(200, y, 5, 11); fb.pset(198, y - 2, 15);
    for (let i = 0; i < 4; i++) { const a = t * 2 + i * 1.57; fb.pset(200 + Math.cos(a) * 11, y + Math.sin(a) * 4, 13); }
  },
  props: [{ y: 144, draw(fb) {
    A.table(fb, 214, 126, 60);
    fb.rect(222, 118, 6, 8, 11); fb.rect(236, 116, 4, 10, 10); fb.rect(250, 120, 14, 6, 15); fb.line(250, 120, 264, 118, 8);
  } }],
  npcs: [{
    id: 'zephram', name: 'Zephram', names: ['zephram', 'wizard', 'man', 'old man', 'mage'], look: LOOKS.wizard,
    x: 150, y: 150, dir: DIR.DOWN, act: 'stand',
    desc: 'Zephram the wizard: tiny, ancient, with a beard to his knees and a hat twice his height. His eyes twinkle madly.',
    talk: () => {
      if (G.flag('riddlesDone')) { G.say('"Ah, my favorite riddler! What can I do for you? I sell the CALM spell to the gifted, 25 silver."', 'Zephram'); return; }
      if (G.flag('riddleFailDay') === G.day) { G.say('"No, no, no. One wrong answer a day is my limit. Come back tomorrow!"', 'Zephram'); return; }
      G.say(`"Visitors! How delightful! Nobody visits since that troll moved in. I am Zephram. I know a great many things, and I'll teach some of them to anyone who can answer my THREE RIDDLES. Shall we?"\n\n(Type YES to begin.)`, 'Zephram');
      G.set('riddleOffer', true);
    },
    topics: {
      'riddle,riddles,game': () => { if (G.flag('riddlesDone')) G.say('"You\'ve answered them all! I shall have to think up new ones."', 'Zephram'); else { G.set('riddleOffer', true); G.say('"Three riddles! Answer all three and I\'ll reward you. Ready? Say YES."', 'Zephram'); } },
      'magic,spell,spells,teach,learn': '"I teach FLAME DART and FETCH to those with the gift who have answered my riddles. And I sell the CALM spell: 25 silver."',
      'calm': '"Calm soothes angry beasts, trolls, even brigands, if you\'re good at it. 25 silver, if you have the gift."',
      'dispel,curse,enchantment,forget,forgetting': '"Hmm? An enchantment of forgetting? Yes, I\'ve felt one in this valley for years. Grizelda\'s work, I\'d wager: nasty old witch, long dead now, but her curses outlive her. A dispel potion would break it. Mother Hilde knows the brewing."',
      'grizelda,witch,crone': '"Grizelda! Dreadful woman. Cursed the Baron\'s daughter out of spite, I shouldn\'t wonder, then got herself eaten by a saurus. Serves her right."',
      'wren,lady,daughter': '"The Baron\'s daughter? If she\'s under Grizelda\'s curse she won\'t remember who she is. She could be anywhere. Doing anything. Leading brigands, even!" He laughs. Then he stops laughing. "Hm."',
      'brigand,brigands,leader': '"The brigand leader has the smell of enchantment about her. Ask the healer about a dispel potion. Or don\'t. I\'m not your mother."',
      'troll,grobb': '"Grobb! Terrible conversationalist. Sleeps at night, you know. Snores like a landslide."',
      'kobold': '"The kobold stole a book of mine once. Cheap little spells, but it\'s picked up a fireball or two. Dodge, don\'t parry."',
      'rock,rocks,floating': '"Oh, those. A small experiment. They wandered off from the kitchen."',
      'name,zephram': '"Zephram the Wise. Or Zephram the Odd, depending on whom you ask. Don\'t ask the troll."',
      '*': '"Fascinating question. I haven\'t the faintest idea."',
    },
  }],
  things: [
    { names: ['book', 'books', 'shelf', 'shelves'], look: 'Thousands of books. The titles include "Advanced Levitation", "Riddles for the Discerning Wizard", and "What To Do When Your Rocks Wander Off".' },
    { names: ['window', 'stars'], look: 'The window shows a starry night sky, even though it is daytime outside. Wizards.' },
    { names: ['orb', 'crystal', 'ball'], look: 'A crystal orb floats above the floor, humming to itself.' },
    { names: ['telescope'], look: 'A brass telescope pointed at the ceiling.' },
  ],
  desc: "Zephram's study is a jumble of books, bottles, and floating things. A crystal orb hovers in mid-air. The little wizard himself is peering at you over his spectacles.",
  enter(first) { if (first) G.describe(); },
  handle(p) {
    if (buy(p, [
      { id: 'calm', words: ['calm', 'spell'], price: 25,
        can: () => (G.skill('magic') <= 0 ? '"Without the gift, dear fellow, you couldn\'t calm a sleeping kitten."' : G.knows('calm') ? '"You know it already!"' : null),
        give: () => { G.learn('calm'); G.say('Zephram taps your forehead with his staff. A cool blue feeling settles behind your eyes. You have learned the CALM spell!', 'Zephram'); } },
    ], 'Zephram', '"I sell only the CALM spell. 25 silver."')) return true;
    if (p.verb === 'yes' && G.flag('riddleOffer') && !G.flag('riddlesDone')) {
      if (G.flag('riddleFailDay') === G.day) { G.say('"Tomorrow! Tomorrow!"', 'Zephram'); return true; }
      G.set('riddleOffer', false);
      G.set('riddle', G.flag('riddle') ?? 0);
      G.set('riddling', true);
      riddleAsk();
      return true;
    }
    if (p.verb === 'no' && G.flag('riddleOffer')) { G.set('riddleOffer', false); G.say('"Pity. Another time."', 'Zephram'); return true; }
    if (p.verb === 'answer' || (G.flag('riddling') && p.verb.startsWith('?'))) {
      if (!G.flag('riddling')) { G.say('"I haven\'t asked you anything yet!"', 'Zephram'); return true; }
      const guess = (p.verb === 'answer' ? p.obj : p.raw).replace(/^(it is|its|it's|a|an|the)\s+/, '').trim();
      const n = G.flag('riddle') ?? 0;
      if (RIDDLES[n].a.some((a) => guess === a || guess.split(' ').includes(a))) {
        G.set('riddle', n + 1);
        if (n + 1 >= RIDDLES.length) {
          G.set('riddling', false);
          G.set('riddlesDone');
          G.award('riddles');
          if (G.skill('magic') > 0) {
            G.learn('flame'); G.learn('fetch');
            G.say('"Correct! All three!" Zephram claps his tiny hands. "A mind like yours deserves magic." He touches his staff to your forehead, and two new spells unfold in your memory like flowers: FLAME DART and FETCH!', 'Zephram');
          } else {
            G.give('healing', 2);
            G.say('"Correct! All three!" Zephram claps. "You haven\'t the gift for magic, alas, but a clever head is worth more than a spell. Take these." He hands you two healing potions.', 'Zephram');
          }
        } else { G.say('"Correct!" Zephram cackles.', 'Zephram'); riddleAsk(); }
      } else {
        G.set('riddling', false);
        G.set('riddleFailDay', G.day);
        G.say('"Wrong! Wrong, wrong, wrong!" Zephram looks delighted. "Think it over and come back tomorrow."', 'Zephram');
      }
      return true;
    }
    return false;
  },
});

// ---------------------------------------------------------------------------------------
// Kobold caves
// ---------------------------------------------------------------------------------------

defRoom({
  id: 'koboldcave', name: 'Cave Mouth', outdoor: true, area: 'wild', arena: 'forest',
  minY: 124,
  blocks: [{ x: 0, y: 124, w: 150, h: 6 }, { x: 214, y: 124, w: 106, h: 6 }, { x: 250, y: 176, w: 30, h: 8 }],
  exits: {
    left: 'deepwood', up: 'fortressgate',
    down: () => { G.say('A sheer ravine blocks the way south. You can hear the river roaring far below.'); return null; },
  },
  doors: [{ rect: { x: 158, y: 124, w: 50, h: 4 }, to: 'kobold', at: [160, 188], dir: DIR.UP, names: ['cave'] }],
  encounters: { chance: 0.3, day: ['goblin'], night: ['goblin', 'wolf'] },
  bg(fb) {
    A.sky(fb, 60, 101, 1);
    fb.rect(0, 20, 320, 106, 8);
    const r = rng(9);
    for (let i = 0; i < 40; i++) A.rock(fb, r() * 320, 20 + r() * 100, 10 + r() * 20, 5 + r() * 8);
    fb.poly([[0, 30], [60, 18], [120, 26], [200, 14], [260, 24], [320, 16], [320, 0], [0, 0]], 11, 9, 0);
    fb.ellipse(184, 110, 36, 42, 0);
    fb.rect(148, 110, 72, 16, 0);
    fb.dither(150, 70, 70, 20, 0, 8, 2);
    A.grass(fb, 124, 37);
    fb.dither(0, 124, 320, 76, 2, 8, 2);
    A.dirt(fb, [[160, 124], [210, 124], [220, 150], [320, 160], [320, 172], [200, 170], [0, 160], [0, 148], [150, 145]], 12);
    for (let i = 0; i < 5; i++) { const x = 120 + i * 30; fb.line(x, 150 + (i % 2) * 20, x + 6, 152 + (i % 2) * 20, 15); fb.circle(x, 150 + (i % 2) * 20, 1, 15); }
    fb.circle(90, 176, 4, 15); fb.pset(89, 176, 0); fb.pset(91, 176, 0);
  },
  props: [{ y: 184, draw(fb) { A.rock(fb, 265, 178, 18, 8); } }],
  things: [
    { names: ['cave', 'mouth', 'entrance'], look: 'A dark cave mouth yawns in the cliff face. A faint smell of sulfur drifts out.' },
    { names: ['bone', 'bones', 'skull'], look: 'Old bones, picked clean. Some of them belonged to people. Most of them, you hope, did not.' },
    { names: ['cliff', 'cliffs', 'rock', 'rocks'], look: 'Grey cliffs, scarred and cracked.' },
  ],
  desc: 'A dark cave mouth opens in a grey cliff face. Bones lie scattered on the ground. Paths lead west into the Deepwood and north toward the brigands\' territory.',
});

const koboldDead = () => !!G.flag('koboldDead');
const koboldAsleep = () => !koboldDead() && G.isDay && !G.flag('koboldAwake');
let koboldAlarm = -1;

function koboldFight() {
  G.set('koboldAwake', true);
  koboldAlarm = -1;
  G.startCombat('kobold', {
    arena: 'cave', noCorpse: true,
    onWin: () => {
      G.set('koboldDead');
      G.award('kobold');
      G.say('The kobold mage shrieks, crumples, and is still. An iron key hangs from a thong around its neck. (You might SEARCH the BODY.)');
    },
  });
}

defRoom({
  id: 'kobold', name: "Kobold's Lair", outdoor: false, area: 'cave', arena: 'cave',
  minY: 124,
  blocks: [{ x: 230, y: 144, w: 30, h: 8 }],
  exits: { down: leave('koboldcave', 184, 132, DIR.DOWN) },
  bg(fb) {
    A.caveWalls(fb, 41);
    for (let i = 0; i < 5; i++) { const x = 40 + i * 12; fb.circle(x, 160 + (i % 2) * 4, 4, 14); fb.pset(x, 159 + (i % 2) * 4, 15); }
    fb.rect(20, 150, 50, 22, 8); fb.speckle(20, 150, 50, 22, 14, 0.2, 3);
  },
  anim(fb, t) {
    if (koboldAsleep()) {
      fb.map = null;
      const k = (t * 0.7) % 1;
      fb.pset(170 + k * 8, 130 - k * 16, 15); fb.pset(171 + k * 8, 130 - k * 16, 15);
      fb.pset(166 + ((k + 0.5) % 1) * 8, 134 - ((k + 0.5) % 1) * 16, 7);
    }
  },
  props: [{ y: 150, draw(fb) { A.chest(fb, 245, 150, !!G.flag('chestOpen')); } }],
  npcs: [{
    id: 'skarn', name: 'the kobold', names: ['kobold', 'skarn', 'mage', 'monster', 'creature'], look: LOOKS.kobold,
    x: 160, y: 150, dir: DIR.DOWN, visible: () => !koboldDead(),
    act: () => (koboldAsleep() ? 'dead' : 'stand'),
    desc: () => koboldAsleep() ? 'The kobold mage is curled up on a pile of stolen blankets, snoring. An iron key hangs on a thong around its neck.' : 'Skarn the kobold mage: red-scaled, yellow-eyed, crackling with stolen magic. An iron key hangs around its neck.',
    talk: () => { if (koboldAsleep()) G.say('The kobold mumbles in its sleep. "...mine... all mine..."'); else G.say('"Hssss! Thief! Mine! MINE!"', 'Skarn', koboldFight); },
    topics: { '*': () => { if (koboldAsleep()) G.say('The kobold is asleep.'); else G.say('"Hsss! No questions! Only FIRE!"', 'Skarn', koboldFight); } },
  }],
  things: [
    { names: ['chest', 'box', 'treasure'], look: () => G.flag('chestOpen') ? 'The chest stands open and empty.' : 'A heavy iron-bound chest with a big lock.' },
    { names: ['gold', 'coins', 'hoard', 'pile'], look: 'A glittering pile of... brass buttons and painted pebbles. The kobold has been swindled.' },
    { names: ['blanket', 'blankets', 'bed'], look: 'A nest of stolen blankets.' },
  ],
  desc: () => `A dank cave stinking of sulfur. ${koboldDead() ? 'The kobold lies dead on the floor.' : koboldAsleep() ? 'The kobold mage lies curled up asleep on a nest of blankets, snoring softly.' : 'The kobold mage is awake, and glaring at you!'} An iron-bound chest sits against the wall.`,
  enter(first) {
    G.set('koboldAwake', false);
    koboldAlarm = -1;
    if (!koboldDead() && !koboldAsleep()) { koboldAlarm = 2.5; G.say('The kobold mage is awake! Its eyes glow as it raises its staff. "INTRUDER!"'); return; }
    if (koboldAsleep() && !G.sneaking && Math.random() < 0.5) { koboldAlarm = 2.5; G.set('koboldAwake', true); G.say('Your footsteps echo loudly in the cave. The kobold stirs, opens one yellow eye... and leaps up! (You might have tried SNEAKing.)'); return; }
    if (first || koboldAsleep()) G.describe();
  },
  tick(dt) {
    if (koboldAlarm > 0) { koboldAlarm -= dt; if (koboldAlarm <= 0) koboldFight(); }
  },
  handle(p) {
    const chestish = p.has('chest', 'box', 'lock', 'treasure') || (!p.obj && p.verb === 'picklock');
    if (p.verb === 'attack' && (p.has('kobold', 'mage', 'skarn', 'monster') || !p.obj)) {
      if (koboldDead()) { G.say('It\'s already dead.'); return true; }
      if (koboldAsleep()) G.say('You attack the sleeping kobold, but it wakes the instant you move!', undefined, koboldFight);
      else koboldFight();
      return true;
    }
    if (p.verb === 'cast' && p.has('calm') && !koboldDead()) { if (G.cast('calm')) G.say('The kobold\'s own magic shields it. Your Calm spell fizzles!'); return true; }
    if ((p.verb === 'get' || p.verb === 'steal' || p.verb === 'search' || p.verb === 'cut') && p.has('key', 'kobold', 'body', 'corpse', 'neck')) {
      if (G.has('chestkey') || G.flag('chestOpen')) { G.say(p.has('body', 'corpse') ? 'You find nothing else of value.' : 'You already have the key.'); return true; }
      if (koboldDead()) { G.give('chestkey'); G.say('You search the kobold\'s body and take the iron key from around its neck.'); return true; }
      if (!koboldAsleep()) { G.say('Not while it\'s awake and throwing fireballs!'); return true; }
      if (!G.near(160, 150, 30)) { G.walkTo(146, 154); G.say('You creep toward the sleeping kobold.'); return true; }
      if (G.sneaking && G.roll(G.skill('stealth'), 40)) { G.give('chestkey'); G.train('stealth', 2); G.say('Silent as a shadow, you slip the thong over the sleeping kobold\'s head. It snorts, mumbles "mine," and sleeps on. You have the iron key!'); }
      else { G.set('koboldAwake', true); G.say('Your fingers brush the kobold\'s scales. Its eyes fly open!', undefined, koboldFight); }
      return true;
    }
    if ((p.verb === 'open' || p.verb === 'unlock' || p.verb === 'use') && chestish || (p.verb === 'use' && p.has('key'))) {
      if (G.flag('chestOpen')) { G.say('The chest is already open.'); return true; }
      if (!G.near(245, 156, 40)) { G.walkTo(232, 160); G.say('You walk to the chest.'); return true; }
      if (!koboldDead() && !koboldAsleep()) { G.say('The kobold is right there!'); return true; }
      if (G.has('chestkey')) { G.take('chestkey'); openChest('The iron key turns with a satisfying clunk.'); return true; }
      G.say('The chest is locked. You need the key, or some other way to open it.');
      return true;
    }
    if (p.verb === 'picklock' || (p.verb === 'use' && p.has('lockpick', 'toolkit'))) {
      if (G.flag('chestOpen')) { G.say('The chest is already open.'); return true; }
      if (!G.has('lockpick')) { G.say('You have nothing to pick the lock with.'); return true; }
      if (!G.near(245, 156, 40)) { G.walkTo(232, 160); G.say('You walk to the chest.'); return true; }
      G.train('lockpick', 1.5);
      if (G.skill('lockpick') > 0 && G.roll(G.skill('lockpick') + (G.has('toolkit') ? 25 : 0), 30)) openChest('You tease the lock open with your picks.');
      else {
        G.say('The lock resists your picks.' + (koboldAsleep() ? ' The kobold stirs in its sleep. Careful...' : ''));
        if (koboldAsleep() && !G.sneaking && Math.random() < 0.3) { G.set('koboldAwake', true); G.say('The kobold wakes up!', undefined, koboldFight); }
      }
      return true;
    }
    if (p.verb === 'cast' && p.has('open')) {
      if (G.flag('chestOpen')) { G.say('The chest is already open.'); return true; }
      if (!G.cast('open')) return true;
      if (G.roll(G.skill('magic'), 20)) openChest('Your spell slides into the lock. Clunk! The chest springs open.');
      else G.say('The lock resists your spell.');
      return true;
    }
    return false;
  },
});

function openChest(how: string) {
  G.set('chestOpen');
  G.award('chest');
  G.give('brasskey');
  G.give('mana');
  G.earn(60);
  G.say(`${how}\n\nInside you find 60 silver, a mana potion, and a heavy brass key stamped with crossed daggers: the brigands' mark!`);
}

// ---------------------------------------------------------------------------------------
// The brigand fortress
// ---------------------------------------------------------------------------------------

const gateOpen = () => !!G.flag('gateOpen');

defRoom({
  id: 'fortressgate', name: 'Brigand Stockade', outdoor: true, area: 'wild', arena: 'forest',
  minY: 132,
  blocks: [{ x: 0, y: 132, w: 136, h: 4 }, { x: 184, y: 132, w: 136, h: 4 }],
  exits: { left: 'faerie', down: 'koboldcave' },
  doors: [{
    rect: { x: 138, y: 132, w: 44, h: 4 }, to: 'courtyard', at: [160, 186], dir: DIR.UP, names: ['gate'],
    check: () => { if (gateOpen()) return true; G.say('The stockade gate is shut and locked. A heavy lock hangs on a chain.'); return false; },
  }],
  encounters: { chance: 0.35, day: ['brigand'], night: ['brigand'] },
  bg(fb) {
    A.sky(fb, 90, 111, 2);
    forestBackdrop(fb, 111);
    fb.rect(0, 0, 320, 14, 9);
    A.grass(fb, 132, 43);
    A.palisade(fb, 0, 134, 320, 72);
    fb.rect(30, 20, 40, 40, 6); fb.poly([[26, 22], [74, 22], [50, 6]], 8); fb.rect(36, 30, 28, 12, 0);
    for (let x = 30; x < 70; x += 6) fb.vline(x, 60, 134, 6);
    fb.rect(136, 70, 48, 64, 6);
    for (let x = 138; x < 184; x += 6) fb.vline(x, 70, 133, 0);
    fb.hline(136, 183, 90, 8); fb.hline(136, 183, 116, 8);
    fb.poly([[140, 30], [180, 30], [184, 70], [136, 70]], 0);
    fb.poly([[152, 40], [168, 40], [160, 30]], 4);
    fb.line(156, 50, 164, 58, 14); fb.line(164, 50, 156, 58, 14);
    A.dirt(fb, [[136, 134], [184, 134], [210, 200], [110, 200]], 13);
  },
  props: [{ y: 134, draw(fb) {
    if (gateOpen()) { fb.rect(136, 70, 48, 64, 0); fb.rect(128, 70, 8, 64, 6); fb.rect(184, 70, 8, 64, 6); }
    else { fb.rect(156, 100, 8, 10, 7); fb.frame(156, 100, 8, 10, 8); fb.pset(160, 106, 0); fb.line(150, 98, 170, 98, 8); }
  } }],
  things: [
    { names: ['gate', 'door'], look: () => gateOpen() ? 'The stockade gate stands open.' : 'A heavy gate of lashed logs, locked with a big iron padlock. Above it, crossed daggers are painted in yellow.' },
    { names: ['lock', 'padlock'], look: 'A big padlock, well oiled. Somebody takes care of it.' },
    { names: ['wall', 'stockade', 'palisade', 'fort', 'fortress'], look: 'A palisade of sharpened logs, twice your height. Smoke rises from inside.' },
    { names: ['tower', 'watchtower'], look: 'A rickety watchtower. Nobody seems to be on watch. Sloppy.' },
  ],
  desc: () => `The brigands' stockade: a wall of sharpened logs with a locked gate${gateOpen() ? ', which now stands open' : ''}. A crossed-daggers sign hangs above it. Smoke rises from inside.`,
  handle(p) {
    const done = (how: string) => { G.set('gateOpen'); G.award('fortress_door'); G.say(how); };
    const nearGate = () => G.near(160, 136, 60);
    if (gateOpen() && (p.verb === 'open' || p.verb === 'unlock' || p.verb === 'picklock' || p.verb === 'force')) { G.say('The gate is already open.'); return true; }
    if ((p.verb === 'unlock' || p.verb === 'open' || p.verb === 'use') && (G.has('brasskey') && (p.has('key', 'gate', 'door', 'lock')))) {
      if (!nearGate()) { G.walkTo(160, 140); G.say('You walk up to the gate.'); return true; }
      done('The brass key fits perfectly. The padlock falls open with a clank, and the gate swings inward.');
      return true;
    }
    if (p.verb === 'unlock' || (p.verb === 'open' && p.has('gate', 'door', 'lock'))) { G.say('The gate is locked, and you don\'t have the key.'); return true; }
    if (p.verb === 'picklock' || (p.verb === 'use' && p.has('lockpick', 'toolkit'))) {
      if (!G.has('lockpick')) { G.say('You have nothing to pick the lock with.'); return true; }
      if (!nearGate()) { G.walkTo(160, 140); G.say('You walk up to the gate.'); return true; }
      G.train('lockpick', 1.5);
      if (G.skill('lockpick') > 0 && G.roll(G.skill('lockpick') + (G.has('toolkit') ? 25 : 0), 50)) done('It\'s a tough lock, but not tough enough. With a soft click the padlock opens, and the gate swings inward.');
      else G.say(`The padlock is a quality piece. Your picks slip.${G.has('toolkit') ? '' : ' A proper toolkit would help.'}`);
      return true;
    }
    if (p.verb === 'cast' && p.has('open')) {
      if (!G.cast('open')) return true;
      if (G.roll(G.skill('magic'), 35)) done('You speak the word of opening. The padlock shivers, springs apart, and the gate swings inward.');
      else G.say('The padlock resists your spell. It is strongly made. Try again, perhaps with more practice.');
      return true;
    }
    if (p.verb === 'force' || (p.verb === 'open' && !p.obj)) {
      if (!nearGate()) { G.walkTo(160, 140); G.say('You walk up to the gate.'); return true; }
      if (!G.tire(10)) return true;
      if (G.roll(G.stat('str'), 55)) done('You throw your shoulder against the gate, again and again. With a crack, the hasp tears out of the wood and the gate bursts open!');
      else { G.trainStat('str'); G.say('You slam into the gate. It shudders, but holds. Your shoulder does not feel so good.'); G.hurt(2, 'You bashed yourself to death against a gate.'); }
      return true;
    }
    if (p.verb === 'climb' && (p.has('wall', 'stockade', 'palisade', 'fence') || !p.obj)) {
      if (G.skill('climbing') <= 0) { G.say('The palisade is twice your height and sharpened at the top. You have no idea how to climb it.'); return true; }
      G.train('climbing', 1.5);
      if (G.roll(G.skill('climbing'), 50)) { G.award('fortress_door'); G.say('You wedge your fingers between the logs and climb, then drop silently over the other side.', undefined, () => G.go('courtyard', 60, 180, DIR.RIGHT)); }
      else { G.say('You climb halfway and slide down, collecting splinters.'); G.hurt(2, 'Death by splinters. How embarrassing.'); }
      return true;
    }
    if (p.verb === 'knock') {
      G.say('"WHO\'S THERE?" bellows a voice. A brigand hops over the wall to see.', undefined, () => G.spawn('brigand', 160, 140, undefined, true));
      return true;
    }
    return false;
  },
});

let alarm = -1;

function brigandPair() {
  alarm = -1;
  G.say('"INTRUDER!" Two brigands leap up from the campfire, swords drawn!', undefined, () => {
    G.startCombat('brigand', {
      arena: 'fortress', noCorpse: true,
      onWin: () => G.say('The first brigand goes down! The second charges!', undefined, () => G.startCombat('brigand', {
        arena: 'fortress', noCorpse: true,
        onWin: () => { G.set('courtyardClear'); G.award('courtyard'); G.award('kill_brigand'); G.earn(25); G.say('The second brigand falls. The courtyard is clear! You find 25 silver in their pockets.'); },
        onFlee: () => G.go('fortressgate', 160, 150, DIR.DOWN),
      })),
      onFlee: () => G.go('fortressgate', 160, 150, DIR.DOWN),
    });
  });
}

defRoom({
  id: 'courtyard', name: 'Stockade Courtyard', outdoor: true, area: 'fortress', arena: 'fortress',
  minY: 128,
  blocks: [{ x: 140, y: 150, w: 40, h: 8 }],
  exits: { down: leave('fortressgate', 160, 146, DIR.DOWN) },
  doors: [{ rect: { x: 146, y: 128, w: 28, h: 4 }, to: 'hall', at: [160, 188], dir: DIR.UP, names: ['hall', 'door'],
    check: () => { if (G.flag('courtyardClear') || G.flag('snuck')) return true; G.say('The brigands are between you and the hall!'); return false; } }],
  bg(fb) {
    A.sky(fb, 60, 121, 1);
    A.palisade(fb, 0, 72, 320, 60);
    fb.rect(90, 40, 140, 90, 6);
    for (let x = 90; x < 230; x += 7) fb.vline(x, 40, 129, 0);
    fb.poly([[80, 42], [240, 42], [210, 12], [110, 12]], 8);
    for (let y = 16; y < 42; y += 5) fb.hline(100 - (y - 16) * 0.8, 220 + (y - 16) * 0.8, y, 0);
    fb.rect(146, 94, 28, 36, 0);
    fb.poly([[20, 132], [60, 132], [40, 96]], 7); fb.line(40, 96, 40, 132, 8); fb.poly([[34, 132], [46, 132], [40, 116]], 0);
    fb.poly([[260, 132], [300, 132], [280, 96]], 7); fb.line(280, 96, 280, 132, 8);
    fb.rect(0, 128, 320, 72, 6); fb.dither(0, 128, 320, 72, 6, 8, 0);
    fb.speckle(0, 128, 320, 72, 0, 0.03, 3);
    fb.rect(100, 70, 12, 12, 4); fb.rect(208, 70, 12, 12, 4);
  },
  anim(fb, t) { fb.map = null; A.fire(fb, 160, 156, t, 0.9); for (let i = 0; i < 5; i++) fb.rect(144 + i * 8, 155, 6, 3, 6); },
  npcs: [
    { id: 'b1', name: 'a brigand', names: ['brigand', 'brigands', 'guard', 'guards', 'man', 'men'], look: LOOKS.brigand, x: 120, y: 160, dir: DIR.RIGHT,
      visible: () => !G.flag('courtyardClear'), act: 'stand',
      desc: () => G.flag('calmedYard') ? 'The brigand is fast asleep by the fire.' : 'A hooded brigand, warming himself by the fire.' },
    { id: 'b2', name: 'a brigand', names: ['brigand', 'brigands', 'guard', 'guards', 'man', 'men'], look: LOOKS.brigand, x: 200, y: 162, dir: DIR.LEFT,
      visible: () => !G.flag('courtyardClear'), act: 'stand',
      desc: 'Another hooded brigand, sharpening a sword.' },
  ],
  things: [
    { names: ['hall', 'lodge', 'building'], look: 'A long log hall with a smoke-hole in the roof. The leader\'s hall, no doubt.' },
    { names: ['fire', 'campfire'], look: 'A campfire, with something unidentifiable roasting over it.' },
    { names: ['tent', 'tents'], look: 'Grubby canvas tents.' },
  ],
  desc: () => `Inside the stockade. A campfire burns in front of a long log hall.${G.flag('courtyardClear') ? ' The courtyard is quiet now.' : ' Two brigands sit by the fire.'}`,
  enter() {
    G.set('snuck', false);
    alarm = -1;
    if (G.flag('courtyardClear')) { G.describe(); return; }
    if (G.sneaking && G.isNight && G.roll(G.skill('stealth'), 40)) {
      G.set('snuck', true);
      G.award('courtyard');
      G.train('stealth', 2);
      G.say('The two brigands by the fire are dozing, heads nodding. Silent as a shadow, you slip along the wall toward the hall door. They never stir.');
      return;
    }
    G.say('Two hooded brigands sit by the campfire. One of them looks up...');
    alarm = 3;
  },
  tick(dt) { if (alarm > 0) { alarm -= dt; if (alarm <= 0) brigandPair(); } },
  handle(p) {
    if (p.verb === 'cast' && p.has('calm') && !G.flag('courtyardClear')) {
      if (!G.cast('calm')) return true;
      if (G.roll(G.skill('magic'), 30)) {
        alarm = -1;
        G.set('courtyardClear'); G.set('calmedYard'); G.award('courtyard');
        G.say('A soft blue haze drifts over the campfire. The brigands yawn, stretch, and settle down for a nice long nap. Snoring fills the courtyard.');
      } else { G.say('The brigands shake off your spell. "A wizard! GET HIM!"'); brigandPair(); }
      return true;
    }
    if (p.verb === 'attack' && !G.flag('courtyardClear')) { brigandPair(); return true; }
    if (p.verb === 'talk' && !G.flag('courtyardClear')) { G.say('"Talk? Talk to my sword!"', 'Brigand', brigandPair); return true; }
    return false;
  },
});

let leaderAlarm = -1;

function throwDispel() {
  G.take('dispel');
  leaderAlarm = -1;
  {
    G.award('cure');
    G.award('locket');
    G.give('locket');
    G.set('leaderCured');
    G.say('The vial shatters. Orange and silver smoke swirls around the masked leader, who staggers, drops her sword, and pulls off her mask.\n\nBeneath it is a young woman with golden hair and the Baron\'s grey eyes. She looks at her hands as if seeing them for the first time.');
    G.say('"I... I remember. The witch. Grizelda. She caught me in the woods and said I would forget my name, my father, everything. And I did. For five years." Her voice breaks. "What have I done?"', 'Lady Wren');
    G.say(`"You broke the curse. Thank you, whoever you are." She unclasps the golden locket and presses it into your hand. "My mother's. Hold it for me, until I'm worthy of it again. Now... will you take me home?"`, 'Lady Wren', () => {
      G.set('finale');
      G.go('castlegate', 160, 170, DIR.UP);
    });
  }
}

defRoom({
  id: 'hall', name: "Brigand Leader's Hall", outdoor: false, area: 'fortress', arena: 'fortress',
  minY: 128,
  exits: { down: leave('courtyard', 160, 140, DIR.DOWN) },
  bg(fb) {
    A.room(fb, { wall: 6, wall2: 0, floor: 8, floor2: 0, wallH: 112 });
    for (let x = 30; x < 320; x += 70) { fb.rect(x, 10, 22, 50, 4); fb.poly([[x, 60], [x + 22, 60], [x + 11, 70]], 4); fb.line(x + 6, 24, x + 16, 40, 14); fb.line(x + 16, 24, x + 6, 40, 14); }
    fb.rect(140, 70, 40, 44, 6); fb.rect(144, 60, 32, 14, 6); fb.frame(144, 60, 32, 14, 14);
    fb.ellipse(160, 160, 70, 20, 4, 12, 1);
    A.barrel(fb, 30, 150); A.barrel(fb, 290, 150);
    fb.rect(20, 40, 3, 16, 6); fb.rect(297, 40, 3, 16, 6);
  },
  anim(fb, t) { A.fire(fb, 21, 42, t, 0.4); A.fire(fb, 298, 42, t, 0.4); },
  npcs: [{
    id: 'leader', name: 'the Masked Leader', names: ['leader', 'brigand', 'woman', 'masked', 'mask', 'boss', 'wren'], look: LOOKS.leader,
    x: 160, y: 136, dir: DIR.DOWN, visible: () => !G.flag('leaderCured'),
    desc: 'The brigand leader: slim, quick and masked in black, with a crimson cape. Wisps of golden hair escape the hood, and at the throat hangs a golden locket bearing the crest of the Barons of Thornwick.',
    talk: () => G.say('"Words? I don\'t know you, and I don\'t care to. Draw your blade, hero."', 'Masked Leader'),
    topics: {
      'wren,name,lady,daughter,baron,father': '"Wren?" The leader hesitates. "That name... No. I have no name. I have no father. I have this valley, and my sword." She raises it.',
      'locket': '"This?" She touches the locket. "I\'ve always had it. I don\'t know where it came from." For a moment she sounds lost.',
      'curse,grizelda,witch,enchantment': '"Grizelda..." Her hand goes to her head, as if it aches. "Stop talking!"',
      '*': '"Enough talk!"',
    },
    give: (item) => { if (item === 'dispel') { throwDispel(); return true; } return false; },
  }],
  things: [
    { names: ['banner', 'banners'], look: 'Red banners with the crossed daggers of the brigands.' },
    { names: ['chair', 'throne'], look: 'A rough throne of logs and furs.' },
  ],
  desc: 'A long smoky hall hung with red banners. At the far end, before a throne of logs, stands the brigand leader, masked in black, sword in hand.',
  enter() {
    if (G.flag('leaderCured')) return;
    leaderAlarm = 5;
    G.say(G.flag('metLeader')
      ? '"Back again, hero? Then let\'s finish this."'
      : `The masked figure turns. "So. The Guild finally sent someone. Or are you just lost, ${G.hero.cls === 'thief' ? 'little mouse' : 'little hero'}?" The leader raises a slim sword. "Either way, you won't be leaving."`, 'Masked Leader');
    G.set('metLeader');
  },
  tick(dt) {
    if (leaderAlarm > 0) {
      leaderAlarm -= dt;
      if (leaderAlarm <= 0) leaderFight();
    }
  },
  handle(p) {
    if ((p.verb === 'throw' || p.verb === 'use' || p.verb === 'give' || p.verb === 'open') && p.has('potion', 'dispel', 'vial')) {
      if (!G.has('dispel')) { G.say('You don\'t have anything like that.'); return true; }
      throwDispel();
      return true;
    }
    if (p.verb === 'attack') { leaderFight(); return true; }
    if (p.verb === 'look' && p.has('locket')) { G.say('A golden locket on a fine chain, bearing the crest of the Barons of Thornwick. What is a brigand doing with that?'); return true; }
    return false;
  },
});

function leaderFight() {
  leaderAlarm = -1;
  G.startCombat('leader', {
    arena: 'fortress', noCorpse: true,
    special: G.has('dispel') ? { label: 'Throw dispel potion', run: () => { G.endCombat('calm'); } } : undefined,
    onCalm: () => throwDispel(),
    onWin: () => G.die('The masked leader falls, and does not rise. As you kneel to pull off the mask, a golden locket slips from her throat. It bears the crest of the Barons of Thornwick.\n\nBeneath the mask is a young woman with golden hair. The Baron\'s daughter, Lady Wren, cursed to forget herself, and now lost forever.\n\nThe brigands scatter, and the valley is safe. But when you bring the locket to the castle, the Baron weeps, and never smiles again.\n\n(There was another way. Perhaps Mother Hilde could have helped.)', 'A Hollow Victory'),
    onFlee: () => G.go('courtyard', 160, 140, DIR.DOWN),
  });
}

