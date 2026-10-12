# Glory of Thornwick

An original adventure/RPG hybrid in the spirit of Sierra's *Quest for Glory* series, played in the browser.

The valley of Thornwick needs a hero. Brigands hold the roads, monsters prowl the woods, and the Baron has not smiled since his daughter vanished five years ago. You play a single would-be hero, type commands into a text parser, fight monsters in real time, and find your own way to save the valley.

Everything here was made for this game: the VGA-style pixel art is drawn by code, the chiptune music is sequenced with WebAudio, and the story, characters and writing are original. No Sierra assets are used. You can also swap in AI-painted backgrounds for any scene; see [ART.md](ART.md).

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

- **One hero, many ways through.** The hero starts with a sword, a shield, a lockpick and one spell, so nearly every obstacle can be fought, sneaked, picked or magicked. You can force the stockade gate, pick its lock, cast Open on it, or find the key. You can pay, fight, calm, or sneak past the bridge troll. (The original Fighter/Magic User/Thief classes are parked in `src/state.ts`.)
- **Skills that grow with use.** Weapon Use, Parry, Dodge, Stealth, Pick Locks, Throwing, Climbing and Magic all improve as you practise them.
- **Five visual styles, from chunky to smooth.** Each area of the valley uses a different one so you can compare them as you play: **A** 160x100 in 16 C64 colours (the town gate, castle, crossroads, north wood, faerie glen), **B** 320x200 EGA with checkerboard blends (main street, shop, inn, guild, alley), **C** 320x200 full-colour VGA pixel art (thieves' den, merchant, healer, meadow), **D** 640x400 with smooth shading (troll bridge, wizard, deep wood, kobold cave) and **E** 960x600 with a soft cinematic finish (kobold lair, stockade, castle hall). The **Style** button forces one style everywhere.
- **Five spells**: Zap, Open, Flame Dart, Fetch and Calm, each learned or bought from characters in the valley.
- **24 hand-composed scenes**: the town and its inn, shop, Adventurers' Guild, a Thieves' Guild behind a secret door, a healer's cottage, a wizard's tower, a faerie glen, a kobold's lair, the troll bridge, the brigand stockade and Castle Thornwick.
- **Hand-lit pixel art**: a 320x200 full-colour renderer with colour ramps, dithering and lighting. Characters are posed skeletons with shaded limbs, faces and an 8-frame walk; combat draws them at high resolution with hit sparks and damage numbers; everyone who speaks gets a portrait.
- **A day/night cycle** with colour grading, glowing windows and fires, fireflies, faeries, stars and a moon, and characters and monsters that behave differently after dark.
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
src/gfx.ts            framebuffer with lit shapes (spheres, limbs, cylinders), dithering, glow and shadow
src/styles.ts         the five visual styles and which room uses which
src/palette.ts        colour ramps, dithering and the time-of-day colour grades
src/art.ts            painterly scenery helpers: skies, mountains, trees, roofs, walls, interiors
src/sprites.ts        skeleton-based characters and beasts, portraits, and the cast's looks
src/backgrounds.ts    loads optional painted backgrounds from src/art/bg
src/rooms/scenes-*.ts the scenery for every room (backgrounds, animation, lights)
src/audio.ts          WebAudio chiptune sequencer and sound effects
src/monsters.ts       monster stats
src/rooms/town.ts     Thornwick town and castle
src/rooms/wilds.ts    the wilderness, the lairs and the main quest
scripts/art-*.ts      the painted-background pipeline (see ART.md)
```

`npm run build` makes a normal static build in `dist/`. `npm run build:single` makes a self-contained single HTML file in `dist-single/`.

In the browser console, `__thornwick.G` exposes the running game for debugging, e.g. `__thornwick.G.go('meadow', 160, 170)`.
