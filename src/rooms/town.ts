import { defRoom } from '../registry';
import { G } from '../game';
import * as A from '../art';
import { DIR, LOOKS } from '../sprites';
import { buy, cobbles, leave, within } from './common';

// ---------------------------------------------------------------------------------------
// Outside the town walls
// ---------------------------------------------------------------------------------------

const gateClosed = () => within(22, 6);

defRoom({
  id: 'towngate', name: 'Thornwick Gate', outdoor: true, area: 'town', arena: 'forest',
  minY: 122,
  blocks: [{ x: 0, y: 122, w: 74, h: 5 }, { x: 116, y: 122, w: 104, h: 5 }, { x: 160, y: 141, w: 22, h: 5 }],
  exits: { right: 'crossroads', down: 'healer', up: 'castlegate' },
  doors: [{
    rect: { x: 78, y: 122, w: 34, h: 5 }, to: 'mainstreet', at: [20, 160], dir: DIR.RIGHT, names: ['gate'],
    check: () => {
      if (!gateClosed()) return true;
      G.say("The town gate is shut and barred for the night. A voice calls down from the wall: \"Gate opens at six! Go away!\"" +
        (G.hero.cls === 'thief' ? '\n\n(A skilled climber might find another way over the wall...)' : ''));
      return false;
    },
  }],
  bg(fb) {
    A.sky(fb, 100, 11, 3);
    A.mountains(fb, 84, 40, 5);
    A.hills(fb, 118, 22, 2);
    A.stoneWall(fb, 0, 50, 220, 72);
    A.crenels(fb, 0, 50, 220);
    A.stoneWall(fb, 48, 32, 28, 90); A.crenels(fb, 48, 32, 28); fb.rect(60, 50, 3, 10, 0);
    A.stoneWall(fb, 114, 32, 28, 90); A.crenels(fb, 114, 32, 28); fb.rect(126, 50, 3, 10, 0);
    A.stoneWall(fb, 196, 28, 30, 94); A.crenels(fb, 196, 28, 30); fb.rect(209, 48, 3, 10, 0);
    A.archDoor(fb, 76, 122, 38, 56, 0);
    fb.dither(78, 96, 34, 26, 6, 8);
    for (let x = 79; x < 112; x += 5) fb.vline(x, 66, 74, 8);
    fb.hline(78, 111, 66, 8);
    // banner
    fb.rect(58, 18, 1, 14, 6); fb.poly([[59, 18], [70, 20], [59, 24]], 4);
    A.grass(fb, 122, 4);
    A.dirt(fb, [[76, 122], [114, 122], [150, 145], [320, 158], [320, 186], [150, 176], [100, 190], [95, 200], [40, 200], [70, 150]], 4);
    A.dirt(fb, [[232, 122], [270, 122], [262, 150], [226, 150]], 5);
    A.bush(fb, 20, 160, 22, 3); A.bush(fb, 300, 140, 16, 9);
    A.rock(fb, 250, 185, 10, 4);
    A.flowers(fb, 170, 180, 60, 16, [14, 15], 3, 20);
  },
  props: [{
    y: 145, draw(fb) {
      fb.rect(162, 120, 2, 26, 6); fb.rect(179, 120, 2, 26, 6);
      fb.rect(159, 118, 25, 16, 6); fb.frame(159, 118, 25, 16, 0);
      fb.rect(162, 121, 8, 6, 15); fb.rect(172, 122, 8, 9, 15); fb.rect(163, 128, 7, 4, 7);
    },
  }],
  anim(fb) {
    if (gateClosed()) {
      fb.rect(78, 70, 34, 52, 6);
      for (let x = 82; x < 110; x += 6) fb.vline(x, 70, 121, 8);
      fb.hline(78, 111, 84, 0); fb.hline(78, 111, 108, 0);
    }
  },
  things: [
    { names: ['board', 'notice', 'poster', 'sign'], look: 'A notice nailed to the board reads:\n\n"HEROES WANTED. The valley of Thornwick needs brave souls. Brigands, monsters, and worse. Inquire at the Adventurers\' Guild on Main Street."\n\nSomeone has scrawled underneath: "good luck"' },
    { names: ['wall', 'walls', 'tower', 'towers'], look: 'The old stone walls of Thornwick have kept out worse than brigands. Mostly.' },
    { names: ['gate', 'portcullis', 'arch'], look: () => gateClosed() ? 'The gate is shut tight for the night.' : 'The town gate stands open. Beyond it lies Main Street.' },
    { names: ['road', 'path'], look: 'Roads lead east to the crossroads, north to Castle Thornwick, and south to the healer\'s cottage.' },
    { names: ['mountain', 'mountains'], look: 'Snow-capped peaks ring the valley on every side.' },
  ],
  desc: () => `You stand before the walls of Thornwick. ${gateClosed() ? 'The gate is shut for the night.' : 'The town gate stands open.'} A road leads east to the crossroads; paths wind north toward the castle and south toward a cottage. A notice board stands by the road.`,
  enter(first) {
    if (first) {
      G.award('arrive');
      G.say(`After weeks on the road, you arrive at last in the valley of Thornwick.\n\nThey say the valley needs a hero. Brigands haunt the roads, monsters prowl the woods, and the Baron has not smiled since his daughter vanished five years ago.\n\nYou are a hero. Or you intend to be one. The Adventurers' Guild inside the town seems like a good place to start.`);
      G.say('(Arrow keys or click to walk. Type commands like LOOK, LOOK AT BOARD, TALK TO MAN, or ASK ABOUT BRIGANDS. Type HELP any time.)');
    }
  },
  handle(p) {
    if ((p.verb === 'climb' && p.has('wall', 'walls')) || (p.verb === 'climb' && !p.obj && G.near(95, 125, 80))) {
      if (G.skill('climbing') <= 0) { G.say('You have no idea how to climb a sheer stone wall.'); return true; }
      if (!gateClosed()) { G.say('Why climb? The gate is open.'); return true; }
      if (G.roll(G.skill('climbing'), 35)) {
        G.train('climbing');
        G.say('You find handholds between the old stones and haul yourself over the wall, dropping silently into Main Street.', undefined, () => G.go('mainstreet', 30, 170, DIR.RIGHT));
      } else {
        G.train('climbing');
        G.say("You get halfway up before your fingers slip. You land hard on your backside.");
        G.hurt(3, 'You fell off the town wall and broke your neck. Thornwick will have to find another hero.');
      }
      return true;
    }
    if (p.verb === 'knock' && p.has('gate')) {
      G.say(gateClosed() ? '"GATE OPENS AT SIX!" bellows a guard from the wall.' : 'The gate is open. Just walk in.');
      return true;
    }
    return false;
  },
});

// ---------------------------------------------------------------------------------------
// Main Street
// ---------------------------------------------------------------------------------------

const shopOpen = () => within(8, 20);
let streetLights: A.Window[] = [];

defRoom({
  id: 'mainstreet', name: 'Main Street', outdoor: true, area: 'town', arena: 'forest',
  minY: 122,
  blocks: [{ x: 141, y: 164, w: 38, h: 11 }],
  exits: { left: leave('towngate', 95, 132, DIR.DOWN), right: 'alley' },
  doors: [
    { rect: { x: 42, y: 122, w: 18, h: 4 }, to: 'shop', at: [70, 188], dir: DIR.UP, names: ['shop', 'store'],
      check: () => { if (shopOpen()) return true; G.say('The shop is closed. A sign in the window reads: "Open 8 till 8. Go home."'); return false; } },
    { rect: { x: 151, y: 122, w: 18, h: 4 }, to: 'inn', at: [160, 188], dir: DIR.UP, names: ['inn', 'tavern'] },
    { rect: { x: 253, y: 122, w: 18, h: 4 }, to: 'guild', at: [160, 188], dir: DIR.UP, names: ['guild'] },
  ],
  bg(fb) {
    A.sky(fb, 70, 21, 2);
    A.mountains(fb, 60, 22, 8);
    const w1 = A.house(fb, 8, 122, 88, 56, { roof: 6, door: 34, windows: [8, 64], sign: 58 });
    const w2 = A.house(fb, 104, 122, 112, 70, { roof: 4, door: 47, windows: [10, 88], sign: 70 });
    const w3 = A.house(fb, 224, 122, 76, 62, { roof: 8, stone: true, door: 29, windows: [6, 56] });
    streetLights = [...w1, ...w2, ...w3];
    // signs: shop (a loaf), inn (a goose), guild (crossed swords)
    fb.ellipse(76, 71, 5, 3, 14);
    fb.circle(181, 58, 3, 15); fb.rect(179, 60, 8, 3, 15); fb.pset(184, 57, 14);
    fb.line(254, 64, 268, 76, 15); fb.line(268, 64, 254, 76, 15);
    fb.rect(301, 30, 19, 92, 0); fb.dither(301, 30, 19, 92, 0, 8, 2);
    cobbles(fb, 122);
  },
  get lights() { return streetLights; },
  props: [{
    y: 172, draw(fb) {
      fb.ellipse(160, 172, 19, 5, 8);
      fb.rect(141, 164, 38, 9, 7);
      A.stoneWall(fb, 141, 164, 38, 9);
      fb.ellipse(160, 164, 18, 4, 1);
      fb.rect(143, 140, 3, 25, 6); fb.rect(174, 140, 3, 25, 6);
      fb.poly([[138, 142], [182, 142], [170, 132], [150, 132]], 4);
      fb.hline(146, 174, 147, 6); fb.vline(160, 147, 156, 8); fb.rect(157, 156, 6, 5, 6);
    },
  }],
  npcs: [{
    id: 'sheriff', name: 'Sheriff Bram', names: ['sheriff', 'bram', 'man', 'lawman'], look: LOOKS.sheriff,
    x: 90, y: 150, dir: DIR.DOWN, wander: [50, 280], visible: () => within(8, 20),
    desc: 'Sheriff Bram: grey-bearded, broad-hatted, and suspicious of everyone, especially you.',
    talk: () => { G.award('sheriff'); G.say('"New in town, are you? Keep your nose clean and your sword sheathed. We\'ve trouble enough with the brigands."', 'Sheriff Bram'); },
    topics: {
      'brigand,brigands,bandit,bandits': '"Twenty of them, maybe more, holed up in a stockade in the northeast woods. My deputies won\'t go near it. Can\'t say I blame them."',
      'leader,masked': '"Nobody\'s seen the leader\'s face. Fights like a demon, they say."',
      'thief,thieves,guild': '"There are no thieves in Thornwick." He says it a little too firmly.',
      'curfew,night,gate': '"Gate closes at ten, opens at six. Anyone outside after that is on their own."',
      'baron,castle': '"Baron Aldric hasn\'t left the castle in five years. Not since the girl."',
      'wren,daughter,girl': '"Lady Wren. Lost in the woods five years back. We searched for months." He looks away.',
      'name,bram,sheriff,you': '"Bram. Sheriff of Thornwick these twenty years."',
      'hero,job,work,help': '"Heroes? Try the Guild. Captain Harrow will be glad of the company."',
      '*': '"Can\'t help you there. Try the Guild, or the inn."',
    },
  }],
  things: [
    { names: ['well'], look: 'The town well. The water is cold and clean.' },
    { names: ['shop', 'store', 'loaf'], look: () => `The general store. A wooden loaf hangs over the door.${shopOpen() ? '' : ' It is closed for the night.'}` },
    { names: ['inn', 'tavern', 'goose'], look: 'The Hanged Goose, Thornwick\'s inn and tavern. A painted goose dangles cheerfully by its neck from the sign.' },
    { names: ['guild', 'swords', 'hall'], look: 'The Adventurers\' Guild: a solid stone hall with crossed swords over the door.' },
    { names: ['alley', 'gap'], look: 'A dark alley runs off the east end of the street.' },
    { names: ['house', 'houses', 'building', 'buildings'], look: 'Tidy half-timbered houses line the street.' },
  ],
  desc: () => `Main Street, Thornwick. Along the north side stand the general store, the Hanged Goose inn, and the stone Adventurers' Guild. A well sits in the middle of the street, and a dark alley leads off to the east.${G.isNight ? ' The street is quiet; honest folk are in bed.' : ''}`,
  handle(p) {
    if (p.verb === 'drink' && p.has('water', 'well')) { G.heal(2, 5); G.say('You draw a bucket and drink. Cold and clean.'); return true; }
    if (p.verb === 'climb' && p.has('well')) { G.say('Climbing into the well would be a spectacularly bad idea.'); return true; }
    if ((p.verb === 'jump' || p.verb === 'enter') && p.has('well')) { G.die('You jump into the well. It is deep, cold, and a very poor place for a hero to end up. The townsfolk drink bottled water for a year.', 'Well, well, well'); return true; }
    return false;
  },
});

// ---------------------------------------------------------------------------------------
// Greta's General Store
// ---------------------------------------------------------------------------------------

defRoom({
  id: 'shop', name: "Greta's General Store", outdoor: false, area: 'inside',
  minY: 140,
  exits: { down: leave('mainstreet', 51, 130, DIR.DOWN) },
  bg(fb) {
    A.room(fb, { wall: 6, wall2: 8, floor: 6, floor2: 0, wallH: 112 });
    A.shelves(fb, 14, 20, 110, 5, 3);
    A.shelves(fb, 180, 10, 126, 4, 7);
    fb.rect(140, 20, 30, 40, 11); fb.frame(140, 20, 30, 40, 6); fb.vline(155, 20, 59, 6); fb.hline(140, 169, 40, 6);
    A.barrel(fb, 30, 150); A.barrel(fb, 48, 158);
    fb.ellipse(22, 176, 12, 8, 7); fb.ellipse(22, 170, 9, 3, 14);
    fb.rect(260, 70, 3, 40, 6); fb.hline(250, 272, 70, 6);
    for (let i = 0; i < 4; i++) fb.rect(252 + i * 5, 72, 3, 8 + i * 2, [4, 2, 14, 12][i]);
  },
  props: [{
    y: 136, draw(fb) {
      fb.rect(150, 108, 170, 28, 6);
      fb.rect(150, 106, 170, 4, 14);
      for (let x = 158; x < 320; x += 22) fb.vline(x, 110, 135, 8);
      fb.hline(150, 319, 135, 0);
      fb.rect(200, 98, 16, 8, 7); fb.ellipse(208, 98, 8, 2, 8);
      fb.rect(280, 100, 6, 6, 14);
    },
  }],
  npcs: [{
    id: 'greta', name: 'Greta', names: ['greta', 'woman', 'shopkeeper', 'keeper', 'lady', 'owner'], look: LOOKS.shopkeep,
    x: 240, y: 118, dir: DIR.DOWN,
    desc: 'Greta, the shopkeeper: round, red-cheeked and sharp as a tack. She is watching your hands.',
    talk: () => G.say('"Welcome, welcome! Rations, armor, a shield? And for the educated customer, a scroll of the Open spell. Just ask to BUY what you need."', 'Greta'),
    topics: {
      'ration,rations,food': '"Five silver a day\'s rations. Eat once a day or you\'ll be no use to anyone."',
      'armor,armour,leather': '"Boiled leather, forty silver. Turns a knife, mostly."',
      'shield': '"Thirty-five silver. Oak and iron."',
      'scroll,open,spell,magic': '"The Open spell, on a scroll. Thirty silver, and only useful if you have the gift. Opens locks from across a room."',
      'brigand,brigands': '"They took a whole wagon of my stock last spring. If you can do something about them, your next rations are on me."',
      'potion,potions,healing,heal': '"Potions? That\'s Mother Hilde\'s business. Her cottage is south of the town gate."',
      'thief,thieves': '"Thieves? I keep a very close eye on my shelves, thank you."',
      'name,greta': '"Greta. This has been my shop for thirty years, and my mother\'s before that."',
      '*': '"Couldn\'t say, dear. Are you buying?"',
    },
    give: (item) => { if (item === 'purse') { G.say('"Where did you get that? No, don\'t tell me. I don\'t want to know."', 'Greta'); return true; } return false; },
  }],
  things: [
    { names: ['shelf', 'shelves', 'wares', 'goods', 'stock', 'jar', 'jars'], look: 'Shelves of jars, bottles, rope, candles and oddments. Greta sells:\n\n  Rations ........ 5 silver\n  Leather armor .. 40 silver\n  Shield ......... 35 silver\n  Open scroll .... 30 silver' },
    { names: ['counter'], look: 'A long wooden counter, polished by years of elbows.' },
    { names: ['barrel', 'barrels'], look: 'Barrels of flour and pickled herring.' },
    { names: ['window'], look: 'Through the window you can see Main Street.' },
  ],
  desc: "Greta's General Store is crammed floor to ceiling with goods. Greta herself presides from behind a long counter.",
  enter(first) { if (first) G.describe(); },
  handle(p) {
    if (buy(p, [
      { id: 'rations', words: ['ration', 'food', 'rations'], price: 5, give: () => { G.give('rations'); G.say('"There you are: one day\'s rations. Don\'t forget to EAT them."', 'Greta'); } },
      { id: 'leather', words: ['armor', 'armour', 'leather'], price: 40, can: () => (G.has('leather') ? '"You\'re already wearing some, dear."' : null), give: () => { G.give('leather'); G.say('You buy the leather armor and strap it on. It creaks, but it fits.'); } },
      { id: 'shield', words: ['shield'], price: 35, can: () => (G.has('shield') ? '"One shield is plenty."' : null), give: () => { G.give('shield'); G.say('You buy the shield. It will make parrying much easier.'); } },
      { id: 'scroll', words: ['scroll', 'open', 'spell'], price: 30,
        can: () => (G.skill('magic') <= 0 ? '"Without the gift, the scroll would be so much scrap paper. I won\'t take your money for it."' : G.knows('open') ? '"You already know that one."' : null),
        give: () => { G.learn('open'); G.say('You read the scroll aloud. The words burn themselves into your memory, and the scroll crumbles to dust. You have learned the OPEN spell!'); } },
    ], 'Greta', '"I sell rations, leather armor, shields, and a scroll of the Open spell. What\'ll it be?"')) return true;
    if (p.verb === 'sell') { G.say(p.has('purse') ? '"I\'m a shopkeeper, not a fence!"' : '"I\'m not buying, dear, only selling."', 'Greta'); return true; }
    if (p.verb === 'steal') { G.say('Greta\'s eyes follow your every move. Not a chance.'); return true; }
    return false;
  },
});

// ---------------------------------------------------------------------------------------
// The Hanged Goose
// ---------------------------------------------------------------------------------------

defRoom({
  id: 'inn', name: 'The Hanged Goose', outdoor: false, area: 'inside',
  minY: 138,
  blocks: [{ x: 120, y: 150, w: 44, h: 8 }, { x: 196, y: 168, w: 44, h: 8 }, { x: 240, y: 138, w: 60, h: 6 }],
  exits: { down: leave('mainstreet', 160, 130, DIR.DOWN) },
  bg(fb) {
    A.room(fb, { wall: 6, wall2: 0, floor: 6, floor2: 8, wallH: 116 });
    for (let x = 0; x < 320; x += 40) fb.rect(x, 0, 5, 116, 8);
    fb.rect(0, 12, 320, 5, 8);
    A.fireplace(fb, 270, 116);
    A.shelves(fb, 14, 24, 88, 3, 11);
    fb.rect(150, 30, 40, 26, 6); fb.frame(150, 30, 40, 26, 14);
    fb.circle(166, 42, 5, 15); fb.rect(165, 46, 10, 4, 15); fb.pset(162, 41, 14);
    fb.rect(210, 40, 28, 18, 11); fb.frame(210, 40, 28, 18, 6); fb.vline(224, 40, 57, 6);
  },
  anim(fb, t) { A.fire(fb, 270, 114, t); },
  props: [
    {
      y: 136, draw(fb) {
        fb.rect(0, 104, 112, 32, 6); fb.rect(0, 102, 112, 4, 14);
        for (let x = 8; x < 112; x += 18) fb.vline(x, 106, 135, 8);
        fb.hline(0, 111, 135, 0);
        fb.rect(20, 94, 6, 8, 7); fb.rect(60, 96, 5, 6, 14); fb.rect(90, 95, 7, 7, 6);
        A.barrel(fb, 101, 102);
      },
    },
    { y: 152, draw(fb) { A.table(fb, 120, 138, 44); fb.rect(128, 134, 5, 4, 14); fb.rect(150, 135, 6, 3, 7); } },
    { y: 172, draw(fb) { A.table(fb, 196, 156, 44); fb.rect(212, 152, 6, 4, 6); } },
  ],
  npcs: [
    {
      id: 'oswin', name: 'Oswin', names: ['oswin', 'innkeeper', 'keeper', 'bartender', 'barkeep', 'man', 'landlord'], look: LOOKS.innkeep,
      x: 56, y: 110, dir: DIR.DOWN,
      desc: 'Oswin the innkeeper: bald as an egg, with an apron that has seen better decades.',
      talk: () => G.say('"Welcome to the Hanged Goose! A meal is 3 silver, an ale is 1, and a bed for the night is 10. Ask me anything; I hear it all eventually."', 'Oswin'),
      topics: {
        'brigand,brigands,bandit': '"They\'ve got a fort up in the northeast, past the Faerie Glen. I hear the kobold in the caves trades with them. Keys and such."',
        'leader,masked': '"The leader? A small one, they say, and quick. My cousin swears it\'s a woman."',
        'kobold,cave,caves': '"East of the Deepwood there\'s a cave with a kobold in it. Nasty little spellcaster. Sleeps all day, prowls all night."',
        'troll,bridge': '"Grobb the troll guards the bridge to the wizard\'s tower. Charges a toll. Ten silver, last I heard. Sleeps like the dead at night, mind."',
        'wizard,zephram,tower': '"Zephram\'s his name. Lives past the troll bridge. Mad as a hatful of frogs, but he loves a riddle."',
        'faerie,faeries,fairy,glen': '"Faeries dance in the glen north of the Deepwood on warm nights. If you\'re light on your feet, they\'re friendly enough."',
        'healer,hilde,potion': '"Mother Hilde, south of the gate. Best potions in the valley. She lost her ring a while back and she\'s been grumpy ever since."',
        'thief,thieves,guild': () => G.say(G.hero.cls === 'thief' ? 'Oswin leans in. "The alley off Main Street. After dark. You know the sign." He winks.' : '"Thieves? In Thornwick?" Oswin polishes a mug very carefully.', 'Oswin'),
        'baron,castle,aldric': '"The Baron shut himself in the castle when his girl disappeared. Proud man. Broken man."',
        'wren,daughter,girl': '"Lady Wren. Golden hair, laughed like a bell, rode like the wind. Five years gone now. Went into the woods and never came out."',
        'crone,witch': '"There was an old witch in the hills, years back. Nasty piece of work. Nobody\'s seen her since the year Lady Wren vanished." He frowns. "Funny, that."',
        'room,bed,sleep': '"Ten silver for a bed and breakfast. Say the word."',
        'meal,food,dinner,eat': '"Three silver for stew, bread and a wedge of cheese."',
        'ale,beer,drink': '"One silver. Finest ale in the valley. Only ale in the valley, come to that."',
        'rumor,rumors,rumour,news,gossip': '"Rumors? The brigands have been bolder lately. And they say the brigand leader wears a golden locket. Fancy, for a cutthroat."',
        'name,oswin': '"Oswin. My father ran the Goose, and his father before him."',
        '*': '"Can\'t say I\'ve heard of that. Ask Captain Harrow at the Guild."',
      },
    },
    {
      id: 'molly', name: 'Molly', names: ['molly', 'barmaid', 'waitress', 'girl', 'woman'], look: LOOKS.barmaid,
      x: 180, y: 185, dir: DIR.DOWN, wander: [120, 250],
      desc: 'Molly the barmaid, balancing three mugs and a plate of stew with the ease of long practice.',
      talk: () => G.say('"Sit anywhere, love. Oswin takes the orders."', 'Molly'),
      topics: {
        'wren,daughter': '"I used to see Lady Wren ride through town. She always waved. The brigand leader waves like that too, they say. Isn\'t that odd?"',
        '*': '"You\'d best ask Oswin, love."',
      },
    },
  ],
  things: [
    { names: ['fire', 'fireplace', 'hearth'], look: 'A roaring fire. It smells of pine and old stew.' },
    { names: ['bar', 'counter'], look: 'The bar is sticky with generations of spilled ale.' },
    { names: ['table', 'tables'], look: 'Scarred oak tables and wobbly stools.' },
    { names: ['painting', 'goose', 'picture'], look: 'A painting of a goose. It looks worried, as well it might.' },
  ],
  desc: 'The Hanged Goose is warm and smoky. A fire crackles in the hearth, and Oswin the innkeeper holds court behind the bar. You can BUY a MEAL, an ALE, or a ROOM for the night.',
  enter(first) { if (first) G.describe(); },
  handle(p) {
    if (buy(p, [
      { id: 'meal', words: ['meal', 'food', 'stew', 'dinner', 'breakfast', 'lunch'], price: 3, give: () => {
        G.S.lastMealDay = G.day; G.heal(10, 20); G.award('meal'); G.advance(20);
        G.say('Molly brings a bowl of thick stew, a heel of bread and a wedge of cheese. You eat every scrap.');
      } },
      { id: 'ale', words: ['ale', 'beer', 'drink', 'mead'], price: 1, give: () => {
        G.award('ale');
        G.say('You down a mug of the Goose\'s ale. It is brown, wet and surprisingly good. A man at the next table leans over: "They say the brigand leader has hair like spun gold under that hood. Like the Baron\'s girl." He hiccups.');
      } },
      { id: 'room', words: ['room', 'bed', 'night'], price: 10, give: () => innSleep() },
    ], 'Oswin', '"Meal, 3 silver. Ale, 1 silver. A room for the night, 10 silver."')) return true;
    if (p.verb === 'sleep' || (p.verb === 'rest' && p.has('room', 'bed'))) {
      if (!G.pay(10)) { G.say('"A bed\'s 10 silver, friend. No coin, no bed."', 'Oswin'); return true; }
      innSleep();
      return true;
    }
    if (p.verb === 'sit') { G.say('You sit by the fire for a while and warm your bones.'); G.advance(15); G.heal(2, 10); return true; }
    return false;
  },
});

function innSleep() {
  G.say('You climb the stairs to a small, clean room and fall asleep the moment your head touches the pillow.', undefined, () => {
    G.skipTo(7);
    G.heal(999, 999, 999);
    G.S.lastMealDay = Math.max(G.S.lastMealDay, G.day);
    G.go('inn', 160, 180, DIR.DOWN);
    G.say(`You wake refreshed as the sun comes up. Oswin serves you breakfast with the room. It is ${G.timeString()}.`);
  });
}

// ---------------------------------------------------------------------------------------
// Adventurers' Guild
// ---------------------------------------------------------------------------------------

defRoom({
  id: 'guild', name: "Adventurers' Guild", outdoor: false, area: 'inside',
  minY: 136,
  blocks: [{ x: 48, y: 136, w: 26, h: 10 }],
  exits: { down: leave('mainstreet', 262, 130, DIR.DOWN) },
  bg(fb) {
    A.room(fb, { wall: 7, wall2: 8, floor: 8, floor2: 0, wallH: 112, stone: true });
    // quest board
    fb.rect(120, 22, 70, 50, 6); fb.frame(120, 22, 70, 50, 0);
    [[126, 28, 18, 16], [148, 26, 14, 20], [166, 30, 18, 14], [128, 50, 20, 16], [154, 50, 26, 16]].forEach(([x, y, w, h]) => {
      fb.rect(x, y, w, h, 15); for (let yy = y + 3; yy < y + h - 2; yy += 3) fb.hline(x + 2, x + w - 3, yy, 8); fb.pset(x + w / 2, y + 1, 4);
    });
    // trophies
    fb.rect(28, 30, 22, 18, 6); fb.circle(39, 40, 7, 2); fb.poly([[33, 36], [30, 28], [36, 34]], 2); fb.poly([[45, 36], [48, 28], [42, 34]], 2); fb.pset(36, 39, 4); fb.pset(42, 39, 4);
    fb.rect(62, 26, 26, 22, 6); fb.ellipse(75, 38, 9, 7, 8); fb.rect(78, 38, 9, 4, 8); fb.pset(72, 35, 14); fb.poly([[68, 32], [70, 24], [73, 32]], 7);
    fb.line(220, 30, 250, 60, 7, 2); fb.line(250, 30, 220, 60, 7, 2); fb.circle(235, 45, 9, 4); fb.circle(235, 45, 6, 14); fb.circle(235, 45, 3, 4);
    A.fireplace(fb, 285, 112);
    fb.rect(100, 90, 110, 8, 4); fb.hline(100, 209, 90, 14);
  },
  anim(fb, t) { A.fire(fb, 285, 110, t); },
  props: [{ y: 146, draw(fb) {
    fb.rect(58, 120, 6, 26, 6); fb.poly([[48, 112], [74, 112], [70, 122], [52, 122]], 6);
    fb.rect(52, 108, 18, 6, 15); fb.vline(61, 108, 113, 8); for (let x = 54; x < 69; x += 3) fb.pset(x, 110, 8);
  } }],
  npcs: [{
    id: 'harrow', name: 'Captain Harrow', names: ['harrow', 'captain', 'guildmaster', 'master', 'man', 'old man'], look: LOOKS.guildmaster,
    x: 240, y: 152, dir: DIR.LEFT,
    desc: 'Captain Harrow, Guildmaster: a scarred old adventurer with a red coat, a grey beard, and a wooden leg he calls "Barnaby."',
    talk: () => G.say(`"Ah! A new face! Welcome to the Adventurers' Guild, ${G.hero.name}. Sign the logbook, read the notices on the board, and ask me anything. Brigands, monsters, magic. I've fought 'em all. Well, most."`, 'Captain Harrow'),
    topics: {
      'brigand,brigands,bandit,bandits': '"A nasty lot. They\'ve built a stockade in the northeast, past the Faerie Glen. The gate\'s locked tight. A strong arm might force it, a thief might pick it, a wizard might spell it open. Or you could find the key: they say the kobold trades with them."',
      'leader,masked,mask': '"The brigand leader fights like no one I\'ve ever seen. Masked. Slim. Wears a golden locket at the throat, the scouts say. Odd thing for a brigand to wear."',
      'locket,necklace': '"A golden locket. Now that I think of it... Lady Wren wore her mother\'s golden locket. Never took it off."',
      'baron,aldric,castle': '"Baron Aldric\'s a good man gone to ruin. His daughter Wren vanished five years ago, and the brigands showed up the same summer. He\'s offered a fortune to whoever deals with them."',
      'wren,daughter,lady': '"Golden hair, sharp tongue, fearless. She\'d have made a fine adventurer. Lost in the woods five years ago. Never found a trace."',
      'healer,hilde': '"Mother Hilde. Her cottage is south of the town gate. She makes potions: healing, vigor, even rarer things if you bring her the makings."',
      'dispel,curse,enchantment,spell': '"Enchantments are wizard business. Ask Zephram in his tower, or Mother Hilde. She knows a potion or two for undoing magic."',
      'wizard,zephram,tower': '"Zephram lives in a tower south-east, past the troll bridge. If you\'ve the magical gift he might teach you, but he\'ll make you answer his riddles first."',
      'troll,grobb,bridge': '"Grobb guards the bridge to the wizard\'s tower. Pay his toll or fight him, though he sleeps at night if you\'re sneaky. A troll\'s beard is a powerful magical ingredient, by the way."',
      'kobold,cave,caves': '"A kobold mage lives in the caves east of the Deepwood. Nocturnal. Sleeps by day, which is when you want to visit. Sits on a chest of loot."',
      'faerie,faeries,fairy,glen,dust': '"Faeries dance in the glen north of the Deepwood at night. Dance well and they may give you faerie dust. Dance badly and they\'ll laugh at you for a week."',
      'meadow,flower,flowers,lily,lilies': '"The meadow south of the crossroads is full of flame-lilies. Pretty, and useful to a healer."',
      'monster,monsters,goblin,goblins,wolf,wolves,saurus': '"Goblins, wolves, saurus. The woods are thick with them, worse at night. Search the bodies: goblins carry a bit of silver."',
      'skill,skills,train,training,practice': '"Practice! Every skill grows with use. Climb trees, throw rocks, sneak about, pick locks, fight monsters. That\'s how heroes are made."',
      'combat,fight,fighting,parry,dodge': '"In a fight, watch your enemy. When it winds up to strike, it telegraphs the blow; that\'s your moment to parry or dodge. Then hit back while it recovers."',
      'magic,spell,spells': '"If you\'ve the gift, Greta sells a scroll of Open, and Zephram teaches the rest, if you can answer his riddles."',
      'thief,thieves': '"No thieves in Thornwick." He winks. "Officially."',
      'board,notice,notices': '"Read it! Everything worth doing in the valley ends up on that board."',
      'logbook,log,book': '"Every adventurer who comes through signs the logbook. Go on, SIGN it."',
      'leg,barnaby': '"Lost it to a saurus in \'62. Barnaby here has been a faithful companion ever since." He raps the wooden leg fondly.',
      'name,harrow,you,yourself': '"Captain Harrow, late of the Border Rangers, now Guildmaster of Thornwick. Retired, officially."',
      '*': '"Hmm. Can\'t say I know much about that."',
    },
  }],
  things: [
    { names: ['board', 'notice', 'notices', 'paper', 'papers'], look: () => { G.award('board'); return 'NOTICES:\n\n* BRIGANDS plague the valley roads. Baron Aldric offers a hero\'s reward for an end to them.\n* LOST: silver ring. Reward. See Mother Hilde, healer.\n* BEWARE the troll at the bridge to the wizard\'s tower. Toll is 10 silver.\n* KOBOLD sighted in the eastern caves. Keep clear.\n* FAERIE FOLK dance in the northern glen by night. Mind your manners.\n* STILL MISSING: Lady Wren of Thornwick. Anyone with news, report to Castle Thornwick.'; } },
    { names: ['logbook', 'log', 'book', 'lectern'], look: 'The Guild logbook: the names of every adventurer who has passed through Thornwick. Many of the recent entries have "deceased" written beside them in a neat hand.' },
    { names: ['trophy', 'trophies', 'head', 'heads'], look: 'Mounted trophies: a goblin, a saurus head, and a shield with a target painted on it. The saurus looks startled.' },
    { names: ['fire', 'fireplace'], look: 'A cheerful fire.' },
    { names: ['banner'], look: 'The Guild banner: red and gold.' },
  ],
  desc: "The Adventurers' Guild is a stone hall hung with trophies. A notice board covers the back wall, a logbook rests on a lectern, and Captain Harrow, the Guildmaster, warms himself by the fire.",
  enter(first) { if (first) G.describe(); },
  handle(p) {
    if ((p.verb === '?sign' || (p.verb === 'use' && p.has('book'))) || (p.raw.startsWith('sign') && p.has('book', 'logbook', 'log', 'name'))) {
      if (G.flag('signed')) { G.say('You have already signed the logbook.'); return true; }
      G.set('signed');
      G.award('signbook');
      G.say(`You sign "${G.hero.name}" in the logbook with a flourish. Captain Harrow nods approvingly. "Welcome to the Guild, ${G.hero.name}. Try not to get the word 'deceased' written next to it."`);
      return true;
    }
    if (p.raw.startsWith('sign')) { G.say('Sign what? The logbook?'); return true; }
    return false;
  },
});

// ---------------------------------------------------------------------------------------
// Back alley, the Thieves' Guild and a merchant's parlour
// ---------------------------------------------------------------------------------------

defRoom({
  id: 'alley', name: 'Back Alley', outdoor: true, area: 'town', arena: 'forest',
  minY: 128,
  blocks: [{ x: 128, y: 146, w: 36, h: 10 }],
  exits: { left: leave('mainstreet', 305, 150, DIR.LEFT) },
  doors: [
    { rect: { x: 60, y: 128, w: 20, h: 4 }, to: 'thieves', at: [160, 188], dir: DIR.UP, names: ['door'],
      check: () => { if (G.flag('thiefDoor')) return true; G.say('The black door is locked. There is a small shuttered peephole at eye level.'); return false; } },
    { rect: { x: 222, y: 128, w: 20, h: 4 }, to: 'merchant', at: [160, 188], dir: DIR.UP, names: ['merchant door', 'back door'],
      check: () => { if (G.flag('merchantOpen') && within(21, 5)) return true; G.say(G.isNight ? 'The merchant\'s back door is locked.' : 'The back door of Fenwick the merchant\'s house. Locked, of course.'); return false; } },
  ],
  bg(fb) {
    fb.rect(0, 0, 320, 128, 0);
    fb.dither(110, 0, 100, 30, 1, 0, 1);
    A.stoneWall(fb, 0, 10, 120, 118, 4, 6);
    A.stoneWall(fb, 200, 16, 120, 112, 4, 6);
    A.stoneWall(fb, 120, 40, 80, 88, 8, 0);
    fb.rect(58, 96, 24, 32, 0); fb.rect(60, 98, 20, 30, 8); fb.rect(66, 106, 8, 4, 6); fb.pset(76, 114, 7);
    A.door(fb, 222, 128, 20, 30, 6);
    fb.rect(30, 40, 16, 14, 0); fb.rect(250, 44, 16, 14, 0);
    cobbles(fb, 128);
    fb.dither(0, 128, 320, 72, 8, 7, 2);
    fb.rect(10, 150, 26, 18, 8); fb.ellipse(23, 150, 13, 3, 7);
  },
  get lights() { return [{ x: 32, y: 42, w: 12, h: 10 }]; },
  props: [{ y: 156, draw(fb) {
    fb.rect(128, 132, 22, 22, 6); fb.frame(128, 132, 22, 22, 0); fb.line(128, 132, 149, 153, 8);
    fb.rect(146, 140, 18, 16, 6); fb.frame(146, 140, 18, 16, 0);
    fb.rect(132, 118, 16, 14, 6); fb.frame(132, 118, 16, 14, 0);
  } }],
  things: [
    { names: ['black door', 'door', 'peephole'], look: 'A black door with a shuttered peephole. No handle on the outside.' },
    { names: ['merchant door', 'back door', 'green door'], look: "The back door of Fenwick the merchant's house. It has a sturdy lock." },
    { names: ['crate', 'crates', 'box', 'boxes'], look: 'A pile of old crates. They look climbable.' },
    { names: ['wall', 'walls'], look: 'High brick walls hem in the alley.' },
    { names: ['trough', 'barrel'], look: 'A rain barrel, half full of something greenish.' },
  ],
  desc: () => `A narrow back alley behind Main Street. There's a black door with a peephole on one side and the back door of a merchant's house on the other. Old crates are piled against the wall.${G.isNight ? ' It is very dark.' : ''}`,
  enter() { G.set('thiefDoor', false); },
  handle(p) {
    if (p.verb === 'climb' && (p.has('crate', 'crates', 'box', 'boxes') || !p.obj)) {
      if (G.skill('climbing') <= 0) {
        if (Math.random() < 0.25) { G.hero.skills.climbing = 1; G.say('You scramble up the crates, wobble, and jump down again. You\'re starting to get the hang of this climbing business!'); }
        else G.say('You try to climb the crates but they wobble alarmingly. You get down fast.');
        return true;
      }
      G.train('climbing', 1.5);
      G.award('climb_practice');
      G.say('You clamber up the crates and back down again. Good practice.');
      return true;
    }
    if (p.verb === 'knock' && p.has('door')) {
      if (G.near(70, 132, 50) || p.has('black door')) {
        G.say(G.isNight ? 'The peephole slides open. A pair of eyes studies you. They wait, as if expecting something.' : 'The peephole slides open. "Go away. Come back when it\'s dark." It slams shut.');
        G.set('peeped', G.isNight);
      } else G.say('You knock on the merchant\'s door. Nobody answers, which is probably for the best.');
      return true;
    }
    if (p.verb === 'thiefsign') {
      if (G.hero.cls !== 'thief' && !G.flag('knowsSign')) { G.say("You don't know any secret signs."); return true; }
      if (!G.isNight) { G.say('You make the sign, but nobody is watching. The guild only opens after dark.'); return true; }
      if (!G.near(70, 132, 60)) { G.say('You should be closer to the black door.'); return true; }
      G.set('thiefDoor');
      G.award('thief_sign');
      G.say('You make the thieves\' sign at the peephole. It snaps shut. Bolts slide back, and the black door creaks open.');
      return true;
    }
    if (p.verb === 'picklock' || (p.verb === 'unlock' && p.has('door')) || (p.verb === 'open' && p.has('merchant', 'back door')) || (p.verb === 'cast' && p.has('open'))) {
      const nearMerchant = G.near(232, 132, 60);
      if (!nearMerchant) {
        if (G.near(70, 132, 60)) G.say('The black door has no keyhole on this side.');
        else G.say('You need to be standing by a door.');
        return true;
      }
      if (G.flag('merchantOpen')) { G.say('It\'s already unlocked.'); return true; }
      if (!G.isNight || !within(21, 5)) { G.say('In broad daylight? Somebody would see you. Wait until dark.'); return true; }
      if (p.verb === 'cast') {
        if (!G.cast('open')) return true;
        G.set('merchantOpen');
        G.say('Your spell whispers into the lock. Click. The door is open.');
        return true;
      }
      if (!G.has('lockpick')) { G.say("You have nothing to pick a lock with."); return true; }
      const v = G.skill('lockpick') + (G.has('toolkit') ? 25 : 0);
      G.train('lockpick', 1.5);
      if (G.skill('lockpick') > 0 && G.roll(v, 30)) { G.set('merchantOpen'); G.say('A few deft twists and the lock clicks open.'); }
      else G.say('The lock resists your efforts. Keep trying, or practice.');
      return true;
    }
    return false;
  },
});

defRoom({
  id: 'thieves', name: "Thieves' Guild", outdoor: false, area: 'inside',
  minY: 138,
  blocks: [{ x: 128, y: 138, w: 64, h: 8 }],
  exits: { down: leave('alley', 70, 140, DIR.DOWN) },
  bg(fb) {
    A.room(fb, { wall: 8, wall2: 0, floor: 8, floor2: 0, wallH: 114, stone: true });
    fb.rect(40, 30, 50, 34, 5); fb.frame(40, 30, 50, 34, 14); fb.line(46, 36, 84, 58, 14); fb.line(84, 36, 46, 58, 14);
    fb.rect(230, 20, 60, 70, 6); for (let y = 26; y < 90; y += 16) { fb.hline(230, 289, y, 0); for (let x = 234; x < 286; x += 9) fb.rect(x, y + 3, 5, 9, [14, 7, 6, 15][(x + y) % 4]); }
  },
  anim(fb, t) {
    for (const x of [132, 188]) { fb.rect(x - 1, 124, 3, 6, 15); fb.pset(x, 121 - (Math.floor(t * 8) % 2), 14); fb.pset(x, 122, 12); }
  },
  props: [{ y: 146, draw(fb) { A.table(fb, 128, 128, 64); fb.rect(150, 124, 20, 4, 14); for (let i = 0; i < 5; i++) fb.circle(145 + i * 6, 126, 1, 14); } }],
  npcs: [{
    id: 'nell', name: 'Nimble Nell', names: ['nell', 'woman', 'thief', 'chief', 'boss', 'leader'], look: LOOKS.thiefBoss,
    x: 160, y: 134, dir: DIR.DOWN,
    desc: 'Nimble Nell, chief of the Thornwick Thieves\' Guild. She is cleaning her fingernails with a stiletto, and she is very good at it.',
    talk: () => G.say(`"Well, well. A new face that knows the sign. I'm Nell. I sell LOCKPICKS and a proper TOOLKIT, and I'll buy anything... interesting. No questions asked."`, 'Nimble Nell'),
    topics: {
      'brigand,brigands': '"Bad for business. Nobody travels, nobody carries money. Their gate lock is a good one: you\'ll want my toolkit if you plan to pick it."',
      'leader,masked': '"I heard the leader speak once. A woman\'s voice. Young. And she talked like a noble, not a cutthroat."',
      'merchant,fenwick,house,job,work': '"Fenwick the merchant keeps a fat purse in his desk and sleeps like a log upstairs. His back door is in the alley. After dark, of course. Bring me the purse and I\'ll pay well."',
      'lockpick,pick,picks': '"Fifteen silver. Don\'t leave home without one."',
      'toolkit,tools,kit': '"The toolkit, fifty silver. Tension bars, oil, mirror, the works. Makes any lock easier."',
      'sign': '"If you\'re in here, you already know it. Don\'t teach it to anyone."',
      'sheriff,bram': '"Bram\'s all right. As long as we don\'t take the mickey, he doesn\'t look too hard."',
      'name,nell': '"Nimble Nell. The \'Nimble\' is earned."',
      '*': '"Not my line of business, sweetheart."',
    },
    give: (item) => {
      if (item === 'purse') {
        G.take('purse'); G.earn(75);
        G.say('Nell weighs the purse and grins. "Fenwick\'s, isn\'t it? Lovely work." She tosses you 75 silver.', 'Nimble Nell');
        return true;
      }
      return false;
    },
  }],
  things: [
    { names: ['table'], look: 'A table covered in coins, dice, and interesting keys.' },
    { names: ['shelf', 'shelves', 'loot'], look: 'Shelves of "acquired" goods.' },
  ],
  desc: "The Thornwick Thieves' Guild: a low cellar lit by candles. Nimble Nell holds court at a table covered in coins.",
  enter(first) { if (first) { G.award('thieves'); G.describe(); } },
  handle(p) {
    if (buy(p, [
      { id: 'lockpick', words: ['lockpick', 'pick', 'picks'], price: 15, can: () => (G.has('lockpick') ? '"You\'ve got one already."' : null) },
      { id: 'toolkit', words: ['toolkit', 'tools', 'kit'], price: 50, can: () => (G.has('toolkit') ? '"One\'s enough."' : null) },
    ], 'Nimble Nell', '"Lockpick, 15 silver. Thief\'s toolkit, 50 silver."')) return true;
    if (p.verb === 'sell') {
      if (G.has('purse') && p.has('purse')) { G.take('purse'); G.earn(75); G.say('Nell weighs the purse and grins. "Fenwick\'s? Lovely work." She tosses you 75 silver.'); return true; }
      if (p.has('ring') && G.has('ring')) { G.say('"A healer\'s ring? Take that back where it belongs. Even thieves have standards."', 'Nimble Nell'); return true; }
      G.say('"I\'m not interested in that."', 'Nimble Nell');
      return true;
    }
    if (p.verb === 'steal') { G.say('Steal from the Thieves\' Guild? Nell\'s stiletto stops cleaning her nails and points at you. You reconsider.'); return true; }
    return false;
  },
});

defRoom({
  id: 'merchant', name: "Fenwick's Parlor", outdoor: false, area: 'inside',
  minY: 136,
  blocks: [{ x: 196, y: 138, w: 70, h: 10 }],
  exits: { down: leave('alley', 232, 140, DIR.DOWN) },
  bg(fb) {
    A.room(fb, { wall: 1, wall2: 9, floor: 6, floor2: 8, wallH: 112 });
    fb.rect(40, 24, 40, 50, 6); fb.frame(40, 24, 40, 50, 14); fb.ellipse(60, 44, 10, 12, 12); fb.rect(52, 54, 16, 18, 4); fb.pset(57, 42, 0); fb.pset(63, 42, 0);
    fb.rect(120, 40, 34, 44, 3); fb.frame(120, 40, 34, 44, 6);
    fb.ellipse(130, 170, 70, 18, 4); fb.ellipse(130, 170, 60, 14, 12, 4, 0);
    A.books(fb, 270, 20, 44, 5, 3);
  },
  anim(fb) { fb.dither(0, 0, 320, 200, T0, 0, 1); },
  props: [{ y: 148, draw(fb) {
    fb.rect(196, 118, 70, 28, 6); fb.hline(196, 265, 118, 14); fb.frame(196, 118, 70, 28, 0);
    fb.rect(206, 126, 20, 8, 8); fb.pset(216, 130, 14);
    fb.rect(240, 110, 8, 8, 7); fb.pset(244, 107, 14);
  } }],
  things: [
    { names: ['desk', 'drawer'], look: () => G.flag('burgled') ? 'The desk drawer hangs open, empty.' : 'A heavy oak desk with a single drawer.' },
    { names: ['portrait', 'painting'], look: 'A portrait of Fenwick the merchant, looking pleased with himself.' },
    { names: ['rug', 'carpet'], look: 'A fine red rug. Expensive.' },
  ],
  desc: "Fenwick the merchant's parlor. It is dark and still; somewhere upstairs, someone snores. A heavy oak desk stands against the wall.",
  enter(first) { if (first) G.describe(); },
  handle(p) {
    if (((p.verb === 'open' || p.verb === 'search' || p.verb === 'look') && p.has('desk', 'drawer')) || (p.verb === 'get' && p.has('purse', 'money'))) {
      if (!G.near(230, 150, 70)) { G.walkTo(230, 152); G.say('You tiptoe over to the desk.'); return true; }
      if (G.flag('burgled')) { G.say('The drawer is empty. You already have what was worth having.'); return true; }
      G.set('burgled');
      G.give('purse');
      G.award('burgle');
      G.say('You ease open the drawer. Inside is a fat purse, heavy with coin. You pocket it.' + (G.sneaking ? '' : '\n\nA floorboard creaks under your foot! The snoring upstairs stops... then starts again. That was close.'));
      return true;
    }
    if (p.verb === 'steal' || (p.verb === 'get' && p.has('portrait', 'painting', 'rug'))) { G.say("Too big to carry quietly. Stick to the small stuff."); return true; }
    return false;
  },
});
const T0 = 255;

// ---------------------------------------------------------------------------------------
// Castle Thornwick
// ---------------------------------------------------------------------------------------

defRoom({
  id: 'castlegate', name: 'Castle Thornwick', outdoor: true, area: 'castle', arena: 'forest',
  minY: 130,
  blocks: [{ x: 0, y: 130, w: 320, h: 4 }],
  exits: { down: leave('towngate', 250, 128, DIR.DOWN), right: 'northwood' },
  bg(fb) {
    A.sky(fb, 110, 31, 2);
    A.mountains(fb, 70, 40, 12);
    A.stoneWall(fb, 20, 40, 280, 92);
    A.crenels(fb, 20, 40, 280);
    for (const x of [8, 272]) { A.stoneWall(fb, x, 14, 40, 118); A.crenels(fb, x, 14, 40); fb.rect(x + 18, 40, 3, 12, 0); fb.rect(x + 18, 80, 3, 12, 0); fb.poly([[x - 2, 14], [x + 42, 14], [x + 20, -8]], 4); }
    fb.rect(140, 10, 40, 30, 7); A.stoneWall(fb, 140, 10, 40, 30); fb.poly([[136, 10], [184, 10], [160, -14]], 4);
    A.archDoor(fb, 138, 132, 44, 60, 0);
    for (let x = 140; x < 182; x += 5) fb.vline(x, 76, 131, 8);
    for (let y = 80; y < 132; y += 8) fb.hline(139, 181, y, 8);
    fb.rect(90, 58, 2, 16, 6); fb.poly([[92, 58], [104, 61], [92, 66]], 5);
    fb.rect(228, 58, 2, 16, 6); fb.poly([[230, 58], [242, 61], [230, 66]], 5);
    A.grass(fb, 132, 21);
    A.dirt(fb, [[140, 132], [180, 132], [262, 200], [226, 200]], 3);
    A.bush(fb, 40, 180, 20, 2); A.bush(fb, 300, 170, 18, 4);
  },
  npcs: [
    {
      id: 'pike', name: 'Sergeant Pike', names: ['pike', 'guard', 'sergeant', 'soldier', 'man'], look: LOOKS.castleGuard,
      x: 124, y: 144, dir: DIR.DOWN, visible: () => !G.flag('finale'),
      desc: 'Sergeant Pike of the castle guard. He is roughly the size and shape of a door, and about as talkative.',
      talk: () => G.say('"Halt. The Baron sees no one." He considers you. "Unless you bring news of the Lady Wren. Or the brigands\' heads."', 'Sergeant Pike'),
      topics: {
        'baron,aldric': '"His Lordship grieves. He sees no one."',
        'wren,daughter,lady': '"The Lady Wren." For a moment, his face softens. "She taught me to play chess. Beat me every time."',
        'brigand,brigands': '"If I weren\'t on duty, I\'d have gone after them myself years ago."',
        'locket': '"The Lady Wren wore her mother\'s golden locket. Never took it off. Why do you ask?"',
        'reward': '"His Lordship has promised a reward to whoever ends the brigand plague."',
        'name,pike': '"Sergeant Pike."',
        '*': '"The Baron sees no one."',
      },
    },
    { id: 'baron', name: 'Baron Aldric', names: ['baron', 'aldric', 'lord'], look: LOOKS.baron, x: 150, y: 150, dir: DIR.DOWN, visible: () => !!G.flag('finale'),
      desc: 'Baron Aldric of Thornwick, looking ten years younger than he did this morning.' },
    { id: 'wren', name: 'Lady Wren', names: ['wren', 'lady', 'daughter', 'woman'], look: LOOKS.wren, x: 172, y: 152, dir: DIR.DOWN, visible: () => !!G.flag('finale'),
      desc: 'Lady Wren of Thornwick, restored at last.' },
  ],
  things: [
    { names: ['castle', 'wall', 'walls', 'tower', 'towers'], look: 'Castle Thornwick: grey stone, red-roofed towers, and purple banners hanging limp in the still air.' },
    { names: ['gate', 'portcullis'], look: 'The portcullis is down and looks as if it has been down for years.' },
    { names: ['banner', 'banners', 'flag'], look: 'The purple banners of the Barons of Thornwick.' },
  ],
  desc: 'Castle Thornwick looms over you, its portcullis shut. A guard stands before the gate, looking as though he has been carved there. The road leads back south to the town gate.',
  enter(first) {
    if (G.flag('finale')) {
      G.say('The portcullis rises with a shriek of rusty chains. Sergeant Pike takes one look at the woman at your side and drops his spear.\n\n"My lady!"', undefined);
      G.say('Baron Aldric himself comes running from the keep, his cloak flying. He stops a few paces from his daughter, as if afraid she might vanish again.\n\n"Wren?"\n\n"Father." She runs to him.', undefined);
      G.say(`At last the Baron turns to you, tears in his beard. "${G.hero.name}. You have given me back my daughter, and freed my valley. Whatever you ask of Thornwick, it is yours. From this day, you are the Hero of Thornwick."`, 'Baron Aldric', () => {
        G.award('baron');
        G.win('Hero of Thornwick', `The brigands scatter without their leader. The roads are safe again, the Baron smiles, and the Hanged Goose names a stew after you.\n\nLady Wren, restored, remembers everything: the old witch's curse, five lost years, and the stranger who broke the spell with a potion instead of a sword.\n\nYou have become a true hero.`);
      });
      return;
    }
    if (first) G.describe();
  },
  handle(p) {
    if (p.verb === 'attack' && p.has('guard', 'pike', 'sergeant')) {
      G.die('You draw on Sergeant Pike. He sighs, blocks your blow with his shield, and thumps you on the head with his spear. You wake up in the castle dungeon, where you will spend the next forty years.', 'Not very heroic');
      return true;
    }
    if (p.verb === 'give' && p.has('locket') && G.has('locket')) { G.say('"That\'s... the Lady Wren\'s locket!" Pike stares at it. "Where did you get this? No. Keep it. If she lives, bring her home."', 'Sergeant Pike'); return true; }
    if (p.verb === 'open' || p.verb === 'enter' || p.verb === 'knock') { G.say('"The Baron sees no one," says Pike, without moving.'); return true; }
    return false;
  },
});

