/**
 * Colour for a hand-painted VGA look: colours are 0xRRGGBB numbers, grouped into ramps
 * (dark → light) that the shaders pick from with ordered dithering.
 */

export type Col = number;
export type Ramp = number[];

/** Transparent marker for sprite buffers (outside the 24-bit colour range). */
export const T = 0x1000000;

export const hex = (s: string) => parseInt(s.replace('#', ''), 16);
const R = (...s: string[]): Ramp => s.map(hex);

export const r8 = (c: Col) => (c >> 16) & 255;
export const g8 = (c: Col) => (c >> 8) & 255;
export const b8 = (c: Col) => c & 255;
export const rgb = (r: number, g: number, b: number): Col =>
  (Math.max(0, Math.min(255, r | 0)) << 16) | (Math.max(0, Math.min(255, g | 0)) << 8) | Math.max(0, Math.min(255, b | 0));

export const mix = (a: Col, b: Col, t: number): Col =>
  rgb(r8(a) + (r8(b) - r8(a)) * t, g8(a) + (g8(b) - g8(a)) * t, b8(a) + (b8(b) - b8(a)) * t);
export const mul = (c: Col, f: number): Col => rgb(r8(c) * f, g8(c) * f, b8(c) * f);
export const lum = (c: Col) => (r8(c) * 0.299 + g8(c) * 0.587 + b8(c) * 0.114) / 255;

/** 4x4 Bayer matrix, values 0..15. */
export const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const bayer = (x: number, y: number) => BAYER[((y & 3) << 2) | (x & 3)] / 16 - 0.47;

/** Pick a colour from a ramp at brightness t (0..1), dithering between steps. */
export function rampAt(ramp: Ramp, t: number, x: number, y: number, dither = 1): Col {
  const n = ramp.length - 1;
  let v = t * n + bayer(x, y) * dither;
  v = Math.round(v);
  return ramp[v < 0 ? 0 : v > n ? n : v];
}

/** A ramp shifted darker by `k` steps (used for far limbs and shadowed parts). */
export function darker(ramp: Ramp, k = 1): Ramp {
  const out = ramp.map((c, i) => (i - k >= 0 ? ramp[i - k] : mul(ramp[0], 0.8 - 0.1 * (k - i))));
  return out;
}

export const RAMP = {
  // skies
  skyDay: R('#2f5f9e', '#3e73b3', '#5089c4', '#66a0d3', '#82b6df', '#a3cbe8', '#c7e0ef'),
  skyDusk: R('#23264f', '#3b3769', '#62497a', '#8e5a7c', '#c06c6c', '#e48d5d', '#f6b76a'),
  cloud: R('#8d9bb3', '#a9b6c9', '#c6d0dd', '#dfe5ec', '#f2f5f8', '#ffffff'),
  // land
  grass: R('#1b3319', '#244421', '#2f5728', '#3d6c2f', '#4f8237', '#659a41', '#80b24e'),
  grassDry: R('#3a3a1c', '#524e24', '#6b652d', '#857d38', '#a09646', '#bcb158'),
  leaf: R('#10241a', '#173320', '#1f4426', '#2a582c', '#386d33', '#4b843b', '#629a45', '#7fb153'),
  leafDark: R('#0b1a14', '#11261a', '#193420', '#224427', '#2d562e'),
  pine: R('#0c1f1a', '#122b22', '#19392a', '#224a33', '#2d5c3c', '#3b6f46'),
  bark: R('#22160f', '#332116', '#462e1e', '#5a3d28', '#704f35', '#896545'),
  dirt: R('#33241a', '#473222', '#5d432e', '#74563b', '#8c6b4b', '#a5835f', '#bd9d77'),
  mud: R('#241c16', '#33281f', '#433529', '#554434', '#695440'),
  sand: R('#6f5c40', '#8a7453', '#a58e68', '#bea780', '#d5c09a'),
  stone: R('#23252c', '#33363f', '#454954', '#5a5e69', '#71757f', '#8a8e96', '#a6a9af', '#c5c7ca'),
  stoneWarm: R('#2e2a27', '#403a35', '#554d46', '#6b6259', '#82786d', '#9a9084', '#b4ab9e'),
  rock: R('#1e1d22', '#2c2b31', '#3c3b42', '#4f4e55', '#63626a', '#7a7980', '#94939a'),
  snow: R('#8795ad', '#a8b4c8', '#c9d2e0', '#e6ebf2', '#ffffff'),
  mountFar: R('#4f6a8d', '#5f7b9d', '#7190ae', '#86a4bf', '#9fb9cf'),
  mountMid: R('#34465e', '#3f5470', '#4c6381', '#5c7592', '#6f88a3'),
  water: R('#0c1d33', '#122a47', '#1a3a5e', '#244d77', '#31638f', '#4579a6', '#6195bc', '#8cb6d4'),
  // building
  plaster: R('#6e6152', '#877866', '#a0917c', '#b8aa93', '#cec2ab', '#e1d7c2', '#efe8d8'),
  timber: R('#1e140d', '#2d1e13', '#3f2a1a', '#523823', '#65472d'),
  wood: R('#2a1a0e', '#3c2615', '#51341d', '#674427', '#7e5632', '#96693f', '#ad7e4f'),
  woodPale: R('#5a4530', '#735a3f', '#8c7050', '#a58762', '#bd9f77'),
  roofRed: R('#3a1512', '#521d17', '#6b271e', '#853427', '#9e4533', '#b65b44', '#cb7457'),
  roofSlate: R('#1a1f29', '#252c3a', '#313a4b', '#3f4a5e', '#4f5b71', '#626f85'),
  roofBrown: R('#2e1c12', '#43291a', '#5a3822', '#71482c', '#8a5b39'),
  thatch: R('#4a3417', '#63461f', '#7d5a29', '#977035', '#b08843', '#c8a258', '#dcbb70'),
  brick: R('#3b1914', '#52221a', '#6a2d21', '#82392a', '#9a4834', '#b15a42'),
  glass: R('#1c2c3c', '#2a4256', '#3b5a72', '#51758f', '#6d93ab', '#93b5c8'),
  // materials
  metal: R('#1f2229', '#343843', '#4c525f', '#686f7d', '#8a919d', '#b0b6bf', '#d8dce1', '#ffffff'),
  gold: R('#4a300b', '#6e4a10', '#936516', '#b8841f', '#d8a42c', '#efc545', '#fbe38a'),
  leather: R('#241510', '#352018', '#4a2d20', '#5f3c2a', '#764e37', '#8d6246'),
  iron: R('#141519', '#202228', '#2d3038', '#3d414b', '#50555f'),
  // skin
  skin: R('#4a2a1e', '#6e3f2b', '#955a3f', '#b87656', '#d49373', '#e8b192', '#f5ccb1'),
  skinTan: R('#2e1a12', '#472a1d', '#643d2a', '#82523a', '#9f6a4c', '#bb8561', '#d2a07b'),
  goblin: R('#16270f', '#213a15', '#2e501c', '#3e6824', '#52812e', '#6c9b3b', '#8ab44d'),
  troll: R('#1e2619', '#2b3623', '#3a482e', '#4b5c3a', '#5f7148', '#758758', '#8e9e6c'),
  kobold: R('#2a0e0c', '#401512', '#5a1f18', '#76291f', '#933729', '#ae4a36', '#c86448'),
  // hair
  hairBlond: R('#5a3f16', '#7d5a1d', '#a17a28', '#c49b39', '#ddb953', '#efd57a', '#f9ecae'),
  hairBrown: R('#1c120c', '#2b1b11', '#3d2717', '#51341f', '#664428', '#7c5633'),
  hairRed: R('#3a120b', '#561c10', '#732916', '#90391d', '#ac4e27', '#c46735'),
  hairGrey: R('#3c3c40', '#56565b', '#727278', '#8f8f95', '#adadb2', '#cbcbcf', '#e8e8ea'),
  hairBlack: R('#0c0b0e', '#141318', '#1d1c23', '#27262e', '#33323b'),
  // cloth
  clothBlue: R('#121a38', '#1a2650', '#23346a', '#2e4586', '#3c58a0', '#5070b8', '#6b8bcb'),
  clothRed: R('#2e0c0e', '#461216', '#611a1e', '#7d2427', '#983133', '#b24541', '#c85e55'),
  clothGreen: R('#0f2014', '#16301c', '#1f4326', '#295731', '#356c3d', '#46824b'),
  clothPurple: R('#1f1030', '#2d1845', '#3e225d', '#512d76', '#653b8e', '#7b4ea5', '#9467bb'),
  clothBrown: R('#1e140e', '#2d1f16', '#3e2b1f', '#513929', '#654834', '#7a5940'),
  clothTeal: R('#0c2427', '#113437', '#17474a', '#1f5c5e', '#297172', '#378886'),
  clothBlack: R('#09090c', '#111117', '#1a1a22', '#24242e', '#30303b', '#3d3d4a'),
  clothWhite: R('#6d6a66', '#8b8883', '#a8a59f', '#c3c0ba', '#dad7d1', '#ecebe6', '#f8f7f3'),
  clothGrey: R('#25272c', '#34373e', '#454952', '#585c66', '#6d717b', '#838792'),
  clothYellow: R('#4a3a0f', '#6b5415', '#8c6f1c', '#ad8a25', '#c9a534', '#dec04d'),
  clothPink: R('#40182a', '#5c2239', '#7a2e4b', '#973d5d', '#b25272', '#c96c89'),
  fur: R('#1c1b1e', '#2b2a2e', '#3d3b40', '#504e53', '#666368', '#7e7b80', '#98959a'),
  furLight: R('#6b6660', '#86817a', '#a19b93', '#bab4ab', '#d1ccc3'),
  scale: R('#0f2014', '#173020', '#20432b', '#2c5936', '#3a7042', '#4c874f', '#63a05f'),
  belly: R('#6b5a2a', '#8a7735', '#a89243', '#c3ad55', '#d9c56d'),
  fire: R('#5a1206', '#8a2308', '#b83d0c', '#e0621a', '#f58f2c', '#fbbd4a', '#fde38a', '#fff8d6'),
  magic: R('#1a1040', '#2a1c70', '#3d30a3', '#5750cc', '#7d7fe3', '#a9b0f2', '#d6dcfb'),
};

export type RampName = keyof typeof RAMP;

/** Legacy 16-colour indices (0..15) still accepted by the framebuffer for simple UI marks. */
export const PAL16: Col[] = [
  '#000000', '#1c2a6b', '#2f6a2c', '#2b7b82', '#8e2a23', '#7a3480', '#8a5a2c', '#a8a8ac',
  '#4b4d55', '#5a78d0', '#70c060', '#70d6e0', '#e06050', '#d070d8', '#f2d860', '#ffffff',
].map(hex);

// ---- colour grading ------------------------------------------------------------------

export type Grade = (c: Col) => Col;

export const gradeNight: Grade = (c) => {
  const r = r8(c), g = g8(c), b = b8(c);
  const l = r * 0.3 + g * 0.55 + b * 0.15;
  return rgb(l * 0.2 + r * 0.12 + 6, l * 0.3 + g * 0.14 + 10, l * 0.46 + b * 0.22 + 26);
};

export const gradeDusk: Grade = (c) => {
  const r = r8(c), g = g8(c), b = b8(c);
  const l = r * 0.3 + g * 0.55 + b * 0.15;
  return rgb(r * 0.95 + l * 0.12 + 8, g * 0.74 + l * 0.05, b * 0.55 + l * 0.08 + 4);
};

export const gradeDawn: Grade = (c) => {
  const r = r8(c), g = g8(c), b = b8(c);
  return rgb(r * 0.82 + 22, g * 0.78 + 14, b * 0.86 + 20);
};

export const fxFlash: Grade = (c) => mix(c, 0xffffff, 0.8);
export const fxGrey: Grade = (c) => { const l = lum(c) * 200 + 30; return rgb(l * 0.9, l * 0.95, l * 1.1); };
export const fxGlow: Grade = (c) => mix(c, 0xfff0a0, 0.45);
export const fxHurt: Grade = (c) => mix(c, 0xff3020, 0.5);
