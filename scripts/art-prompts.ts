/**
 * Prompts for painted backgrounds. The layout image sent alongside each prompt fixes the
 * composition (where doors, paths and the walkable ground are); the words set the look.
 * Edit freely and re-run `npm run art:generate -- <room>` to repaint one scene.
 */

export const STYLE = `Repaint this reference image as a finished background for a classic early-1990s point-and-click fantasy adventure game.
Hand-painted VGA pixel art look: rich painterly colour, soft dithered gradients, crisp pixel detail, warm storybook lighting from the upper left.
Keep the composition EXACTLY as in the reference: the same horizon line, the same positions and sizes of buildings, doors, paths, trees, rocks and props, and the same open walkable ground in the lower part of the picture.
Daytime lighting. No people, no animals, no characters, no text, no letters, no UI, no border or frame. Fill the whole canvas edge to edge.`;

export const ROOM_PROMPTS: Record<string, string> = {
  towngate: 'The stone walls of a small medieval town: three crenellated towers, an arched gateway on the left third with a raised portcullis, red and slate rooftops peeking over the wall, a wooden notice board beside a dirt road that curves from the gate to the right edge, green meadow, snowy mountains far behind.',
  mainstreet: 'A cobbled medieval main street: a small half-timbered general store with a hanging bread sign on the left, a larger two-storey half-timbered inn with a red tile roof and a hanging goose sign in the middle, a stone guildhall with a slate roof and crossed-swords sign on the right, a dark alley opening at the far right edge, and a roofed stone well in the middle of the street.',
  shop: 'Interior of a cosy village general store: wooden plank walls, shelves crowded with jars, bottles, rope and candles, a small window, a long wooden counter across the right half with a brass scale, barrels and a sack of grain on the left, a blue rug on the plank floor.',
  inn: 'Interior of a warm medieval tavern: plastered walls with dark timber beams, a long bar counter on the left with mugs and bottles on shelves behind it, a big stone fireplace with a roaring fire on the right, a painting of a goose, wooden tables and stools, warm firelight.',
  guild: "Interior of an adventurers' guild hall: grey stone walls, a large notice board covered in paper notices in the centre, mounted monster trophies (a goblin head, a lizard head), crossed swords over a round shield, a stone fireplace on the right, a wooden lectern with an open logbook on the left, flagstone floor with a red rug.",
  alley: 'A narrow back alley at the rear of red-brick town houses: a black door with a small shuttered peephole on the left, a green back door on the right, washing hanging on a line, stacked wooden crates in the middle, a rain barrel, wet cobbles, a strip of sky above.',
  thieves: "A secret thieves' den in a stone cellar: a purple banner with crossed daggers, shelves of stolen goods, a wooden table with gold coins and candles in the centre, dark and moody candlelight.",
  merchant: "A wealthy merchant's parlour at night: blue walls, a gilded portrait of a smug merchant, a tall window, bookshelves, a heavy oak desk with a drawer on the right, a fine red rug on a wooden floor, dim moonlight.",
  castlegate: 'The main gate of a grey stone castle: a high curtain wall with crenellations, two round corner towers with slate conical roofs and pennants, a central keep behind, a large arched gatehouse with a lowered iron portcullis, purple heraldic banners, green lawn in front and a dirt road leading down to the lower right.',
  crossroads: 'A crossroads in open country: four dirt roads meeting at a wooden signpost with arrow boards, rolling green hills, a few oaks and pines, a line of distant forest, snow-capped mountains on the horizon, wildflowers.',
  northwood: 'A sunlit forest path: tall trunks and leafy canopy, light shafts through the trees, a huge old climbable oak with low branches on the left, a dirt path running left to right and down, ferns and bushes.',
  deepwood: 'A dark, gloomy old forest: twisted dead trees, thick dark canopy, mist on the ground, a mossy fallen hollow log on the right, red-capped mushrooms, muddy paths crossing in all directions.',
  faerie: 'A magical forest glade: a perfect ring of red-and-white toadstools in the middle of a bright grassy clearing, tall trees around the edge with an opening to the sky above, wildflowers in pink, white and blue.',
  meadow: 'A wide flower meadow: a dirt path, a big mossy boulder with small throwing stones on the left, a patch of bright orange flame-like lilies on the right, birch and oak trees at the edges, snowy mountains behind.',
  healer: "A healer's thatched cottage: whitewashed walls, a deep golden thatched roof, a green door, windows with green shutters, bundles of drying herbs under the eaves, a stone chimney, a fenced herb garden to the right, and a large oak on the right with a bird's nest in its branches.",
  healerin: "Interior of a village healer's cottage: whitewashed walls with timber beams, shelves of jars and potions, bundles of herbs hanging from the rafters, a black iron cauldron bubbling green over a small fire on the right, a shuttered window, a teal rug.",
  trollbridge: 'A deep rocky ravine with a river far below on the right, crossed by a rickety wooden plank bridge with rope railings leading off to the right, green grass and a dirt path on the left, an oak tree, snowy mountains beyond.',
  wizard: "A tall round stone wizard's tower with a blue conical roof dotted with golden stars, a purple arched door at its base, glowing blue windows, magical blue and purple flowers, green grass, a dirt path, mountains behind.",
  wizardin: "A wizard's study: tall bookshelves full of old books, a window showing a starry night sky with a crescent moon, a brass telescope, a wooden table with potions and scrolls, a round blue rug with a golden magic circle, stone walls and a purple floor.",
  koboldcave: 'A grey rocky cliff face with a large dark cave mouth in the centre, rock ledges and cracks, dry yellow grass and scattered old bones in front, a dead tree on the left, a muddy path.',
  kobold: "Inside a dank cave lair: dark layered rock walls, dripping stalactites, a glittering pile of gold coins on the left, a nest of stolen blankets in the middle, an iron-bound treasure chest on the right, muddy floor.",
  fortressgate: "A brigand stockade in the woods: a wall of sharpened logs across the scene, a heavy log gate in the centre with an iron padlock and a painted crossed-daggers sign above, a rickety wooden watchtower on the left, forest behind, a muddy trampled path.",
  courtyard: "Inside a brigand stockade: log palisade walls behind, a long log hall with a shingle roof and a dark open doorway in the centre, two white canvas tents, barrels, a stone fire pit in the middle of a muddy yard.",
  hall: "Inside a brigand leader's long log hall: plank walls with red banners bearing crossed daggers, a rough throne of logs covered in grey fur, a round red rug, barrels, torches on iron brackets, flagstone floor.",
};
