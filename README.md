# Glory of Thornwick

An original adventure/RPG hybrid in the spirit of Sierra's *Quest for Glory* series, played in the browser.

The valley of Thornwick needs a hero. Brigands hold the roads, monsters prowl the woods, and the Baron has not smiled since his daughter vanished five years ago. You create a Fighter, Magic User or Thief, type commands into a text parser, fight monsters in real time, and find your own way to save the valley.

Everything here was made for this game: the EGA pixel art is drawn procedurally from code, the chiptune music is sequenced with WebAudio, and the story, characters and writing are original. No Sierra assets are used.

## Playing

```bash
npm install
npm run dev        # http://localhost:3000
```

- **Walk** with the arrow keys, or click where you want to go. Walk off the edge of the screen to travel, or into a doorway to enter. Right-click something to look at it.
- **Type commands** and press Enter: `look`, `look at board`, `talk to greta`, `ask oswin about troll`, `buy rations`, `climb tree`, `throw rock at nest`, `pick lock`, `cast open on chest`, `sneak`, `rest`, `sleep`, `eat`, `inventory`, `stats`, `save`, `help`.
- **Combat** is real time. Attack (`→`/`A`), Parry (`↑`/`S`), Dodge (`↓`/`D`). When a foe flashes it is about to strike: parry or dodge, then hit back. `Z` Zap, `F` Flame Dart, `C` Calm, `H` healing potion, `R` run.
- **Survive**: eat once a day, sleep at the inn, rest after fights. Night is darker and more dangerous, and the town gate closes at ten.

## What's in it

- **Three classes, three ways through.** Nearly every obstacle has a fighter's, thief's and magic user's solution. You can force the stockade gate, pick its lock, cast Open on it, or find the key. You can pay, fight, calm, or sneak past the bridge troll.
- **Skills that grow with use.** Weapon Use, Parry, Dodge, Stealth, Pick Locks, Throwing, Climbing and Magic all improve as you practise them. Classes can learn skills outside their specialty.
- **Five spells**: Zap, Open, Flame Dart, Fetch and Calm, each learned or bought from characters in the valley.
- **24 hand-composed scenes**: the town and its inn, shop, Adventurers' Guild, a Thieves' Guild behind a secret door, a healer's cottage, a wizard's tower, a faerie glen, a kobold's lair, the troll bridge, the brigand stockade and Castle Thornwick.
- **A day/night cycle** with EGA palette shifts, lit windows, stars and a moon, and characters and monsters that behave differently after dark.
- **Sierra touches**: a white status line, message boxes, a 328-point score, several ridiculous deaths, and a "Try again" button for when you meet them.
- **Save/restore**: three slots plus an autosave, kept in the browser's local storage.

## Project layout

```
index.html            page shell and styles (status line, parser, HUD, overlays)
src/main.ts           boot, input, title/creation/sheet/save screens, main loop
src/game.ts           engine: rooms, movement, time, NPCs, encounters, parser dispatch
src/combat.ts         real-time combat
src/parser.ts         verb/noun text parser
src/state.ts          classes, stats, items, spells and the scoring table
src/gfx.ts            indexed-colour framebuffer with EGA dithering and sprite blitting
src/palette.ts        the 16 EGA colours plus dusk/night/flash palette maps
src/art.ts            procedural scenery: skies, trees, houses, castles, caves, interiors
src/sprites.ts        procedural character and monster sprites, with the cast's looks
src/audio.ts          WebAudio chiptune sequencer and sound effects
src/monsters.ts       monster stats
src/rooms/town.ts     Thornwick town and castle
src/rooms/wilds.ts    the wilderness, the lairs and the main quest
```

`npm run build` makes a normal static build in `dist/`. `npm run build:single` makes a self-contained single HTML file in `dist-single/`.

In the browser console, `__thornwick.G` exposes the running game for debugging, e.g. `__thornwick.G.go('meadow', 160, 170)`.
