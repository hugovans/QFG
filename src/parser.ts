/** A small Sierra-style text parser: canonical verb + object (+ target / topic). */
export interface Parsed {
  raw: string;
  verb: string;
  obj: string;
  target: string;
  about: string;
  words: string[];
  /** True if any of the given words appears in the object/target text (plurals tolerated). */
  has: (...w: string[]) => boolean;
  /** True if any given word appears anywhere in the sentence. */
  any: (...w: string[]) => boolean;
}

const MULTI: [RegExp, string][] = [
  [/^(look|peer|gaze|stare) (at|in|into|inside|through|under|around) /, 'look '],
  [/^pick up /, 'get '],
  [/^(pick|jimmy) (the )?(lock|locks)\b/, 'picklock'],
  [/^use (the )?(lockpick|lock pick|picks|toolkit|tools) (on|in) /, 'picklock '],
  [/^(talk|speak|chat) (to|with) /, 'talk '],
  [/^(make|do|show|give|flash) (the |a )?(thief|thieves|thieves') sign\b/, 'thiefsign'],
  [/^(go|walk|step|head) (in|into|inside|through) /, 'enter '],
  [/^(go|walk) (in|inside)$/, 'enter'],
  [/^(get|climb|go) (up|down) /, 'climb '],
  [/^(lie|lay) down\b/, 'sleep'],
  [/^(sit|settle) down\b/, 'sit'],
  [/^knock (on|at) /, 'knock '],
  [/^(put|place) on /, 'wear '],
  [/^(cut|shave|snip|trim) off /, 'cut '],
  [/^(break|kick|bash|force|smash|ram) (down|in|open) /, 'force '],
  [/^throw (the )?potion/, 'throw potion'],
  [/^look$/, 'look'],
];

const VERBS: Record<string, string[]> = {
  look: ['look', 'l', 'examine', 'x', 'inspect', 'check', 'view', 'observe', 'study', 'describe'],
  read: ['read'],
  get: ['get', 'take', 'grab', 'pick', 'collect', 'gather', 'obtain', 'fetchitem'],
  talk: ['talk', 'speak', 'chat', 'greet', 'hello', 'hi', 'converse'],
  ask: ['ask', 'inquire', 'query', 'question'],
  give: ['give', 'offer', 'hand', 'show', 'return', 'deliver'],
  buy: ['buy', 'purchase', 'order'],
  sell: ['sell', 'fence', 'trade'],
  pay: ['pay', 'bribe', 'tip'],
  open: ['open', 'unbar'],
  close: ['close', 'shut'],
  unlock: ['unlock'],
  picklock: ['picklock', 'lockpick'],
  climb: ['climb', 'scale', 'ascend', 'shinny'],
  throw: ['throw', 'toss', 'hurl', 'chuck', 'pitch'],
  cast: ['cast', 'invoke', 'conjure'],
  eat: ['eat', 'consume', 'devour'],
  drink: ['drink', 'quaff', 'sip', 'imbibe'],
  sleep: ['sleep', 'nap', 'slumber', 'bed', 'retire'],
  rest: ['rest', 'wait', 'relax', 'meditate'],
  sit: ['sit'],
  dance: ['dance', 'jig', 'twirl', 'boogie'],
  search: ['search', 'loot', 'frisk', 'rummage'],
  use: ['use', 'apply'],
  enter: ['enter', 'go', 'visit'],
  leave: ['leave', 'exit', 'depart'],
  attack: ['attack', 'fight', 'kill', 'hit', 'strike', 'slay', 'stab', 'punch'],
  force: ['force', 'bash', 'break', 'kick', 'smash', 'ram', 'shove', 'push'],
  sneak: ['sneak', 'creep', 'tiptoe', 'skulk'],
  walk: ['walk', 'stroll'],
  run: ['run', 'sprint', 'dash'],
  answer: ['answer', 'say', 'reply', 'respond', 'guess', 'solve', 'shout', 'yell'],
  cut: ['cut', 'shave', 'snip', 'trim', 'slice'],
  knock: ['knock', 'rap', 'bang'],
  wake: ['wake', 'rouse', 'awaken'],
  jump: ['jump', 'leap', 'dive', 'hop'],
  swim: ['swim', 'wade', 'bathe'],
  pray: ['pray'],
  drop: ['drop', 'discard'],
  wear: ['wear', 'equip', 'don'],
  pick: ['pluck', 'harvest'],
  thiefsign: ['thiefsign'],
  steal: ['steal', 'pocket', 'swipe', 'pilfer', 'rob'],
  smell: ['smell', 'sniff'],
  listen: ['listen', 'hear'],
  touch: ['touch', 'feel', 'pet', 'rub'],
  kiss: ['kiss', 'hug'],
  help: ['help', 'hint', 'hints', '?'],
  inventory: ['inventory', 'inv', 'i', 'items', 'possessions'],
  stats: ['stats', 'status', 'char', 'character', 'skills', 'sheet'],
  score: ['score', 'points'],
  time: ['time', 'clock', 'hour', 'date'],
  save: ['save'],
  load: ['load', 'restore'],
  restart: ['restart'],
  sound: ['sound', 'music', 'mute', 'unmute'],
  dig: ['dig'],
  swear: ['damn', 'fuck', 'shit', 'crap', 'hell', 'bastard', 'bugger'],
  yes: ['yes', 'y', 'yeah', 'yep', 'ok', 'okay', 'sure', 'aye'],
  no: ['no', 'n', 'nope', 'nay'],
};

const VERB_OF = new Map<string, string>();
for (const [k, list] of Object.entries(VERBS)) for (const w of list) VERB_OF.set(w, k);

const NOISE = new Set(['the', 'a', 'an', 'some', 'my', 'your', 'this', 'that', 'please', 'quickly', 'carefully', 'slowly', 'of']);

function stem(w: string) {
  return w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w;
}

export function parse(input: string): Parsed {
  let s = input.toLowerCase().replace(/[^a-z0-9'\s-]/g, ' ').replace(/\s+/g, ' ').trim();
  for (const [re, rep] of MULTI) if (re.test(s)) { s = s.replace(re, rep).trim(); break; }
  const words = s.split(' ').filter((w) => w && !NOISE.has(w));
  const first = words[0] ?? '';
  const verb = VERB_OF.get(first) ?? (first ? '?' + first : '');
  const rest = VERB_OF.has(first) ? words.slice(1) : words;
  let obj = rest.join(' ');
  let target = '';
  let about = '';
  const aboutIdx = rest.indexOf('about');
  if (aboutIdx >= 0) {
    about = rest.slice(aboutIdx + 1).join(' ');
    obj = rest.slice(0, aboutIdx).join(' ');
  } else {
    for (const prep of ['at', 'to', 'on', 'onto', 'with', 'into', 'in', 'from', 'for', 'upon']) {
      const i = rest.indexOf(prep);
      if (i > 0) {
        obj = rest.slice(0, i).join(' ');
        target = rest.slice(i + 1).join(' ');
        break;
      }
    }
  }
  if (verb === 'ask' && !about) about = obj;
  const objWords = new Set([...obj.split(' '), ...target.split(' '), ...about.split(' ')].filter(Boolean).map(stem));
  const allWords = new Set(words.map(stem));
  return {
    raw: s, verb, obj, target, about, words,
    has: (...w) => w.some((x) => x.split(' ').every((p) => objWords.has(stem(p)))),
    any: (...w) => w.some((x) => x.split(' ').every((p) => allWords.has(stem(p)))),
  };
}
