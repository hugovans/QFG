// The 16-colour EGA palette every pixel in the game is drawn from.
export const EGA_HEX = [
  '#000000', '#0000AA', '#00AA00', '#00AAAA', '#AA0000', '#AA00AA', '#AA5500', '#AAAAAA',
  '#555555', '#5555FF', '#55FF55', '#55FFFF', '#FF5555', '#FF55FF', '#FFFF55', '#FFFFFF',
];

export const C = {
  BLACK: 0, BLUE: 1, GREEN: 2, CYAN: 3, RED: 4, MAGENTA: 5, BROWN: 6, LGRAY: 7,
  DGRAY: 8, LBLUE: 9, LGREEN: 10, LCYAN: 11, LRED: 12, LMAGENTA: 13, YELLOW: 14, WHITE: 15,
} as const;

/** Transparent index for sprites. */
export const T = 255;

/** Palette as little-endian RGBA words, ready for a Uint32Array view on ImageData. */
export const RGBA = new Uint32Array(256);
EGA_HEX.forEach((hex, i) => {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  RGBA[i] = (255 << 24) | (b << 16) | (g << 8) | r;
});

export type PalMap = Uint8Array;

function map(arr: number[]): PalMap {
  const m = new Uint8Array(256);
  for (let i = 0; i < 256; i++) m[i] = i;
  arr.forEach((v, i) => (m[i] = v));
  return m;
}

export const IDENT = map([]);
/** Evening / dawn: bright colours drop to their dark twins. */
export const DUSK = map([0, 1, 2, 3, 4, 5, 6, 8, 8, 1, 2, 3, 4, 5, 6, 7]);
/** Night: everything sinks toward blue; lamplight (yellow) keeps glowing. */
export const NIGHT = map([0, 0, 1, 1, 8, 1, 8, 8, 1, 1, 2, 3, 4, 5, 14, 7]);
/** Hit flash: a solid white silhouette. */
export const FLASH = map([15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15]);
/** Petrified / dead-ish grey. */
export const GREY = map([0, 8, 8, 8, 8, 8, 8, 7, 8, 7, 7, 7, 7, 7, 7, 15]);
/** Spell glow. */
export const GLOW = map([1, 9, 11, 11, 13, 13, 14, 15, 9, 11, 15, 15, 15, 15, 15, 15]);
