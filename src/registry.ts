import type { FB } from './gfx';
import type { Action, Look } from './sprites';
import type { Parsed } from './parser';
import type { Window } from './art';

export interface Rect { x: number; y: number; w: number; h: number }

export interface Thing {
  names: string[];
  rect?: Rect;
  look: string | (() => string);
  visible?: () => boolean;
}

export interface NPC {
  id: string;
  name: string;
  names: string[];
  look: Look | (() => Look);
  x: number;
  y: number;
  dir: number;
  desc: string | (() => string);
  talk?: () => void;
  /** Keys are comma-separated keywords; '*' answers anything unknown. */
  topics?: Record<string, string | (() => void)>;
  give?: (item: string) => boolean;
  visible?: () => boolean;
  wander?: [number, number];
  act?: Action | (() => Action);
}

export interface Door {
  rect: Rect;
  to: string;
  at: [number, number];
  dir?: number;
  names?: string[];
  /** Return false to refuse entry (and say why). */
  check?: () => boolean;
}

/**
 * Scenery the hero can walk behind. It is drawn once into a transparent layer (cached by
 * `key`) and composited by depth. With a painted background, the layer is only used as a
 * mask and the pixels come from the painting.
 */
export interface Prop {
  y: number;
  draw: (fb: FB) => void;
  visible?: () => boolean;
  /** Changes when the prop's appearance changes (e.g. a door opening). */
  key?: () => string;
}

export type Side = 'left' | 'right' | 'up' | 'down';

export interface Room {
  id: string;
  name: string;
  outdoor: boolean;
  area: 'town' | 'wild' | 'cave' | 'fortress' | 'inside' | 'castle';
  arena?: 'forest' | 'cave' | 'fortress' | 'bridge' | 'town';
  music?: () => string;
  minY: number;
  maxY?: number;
  blocks?: Rect[];
  exits?: Partial<Record<Side, string | (() => string | null)>>;
  doors?: Door[];
  things?: Thing[];
  npcs?: NPC[];
  props?: Prop[];
  lights?: Window[];
  bg: (fb: FB) => void;
  /** Animated scenery drawn over the background each frame (before time-of-day grading). */
  anim?: (fb: FB, t: number) => void;
  /** Light sources and emissive details drawn after grading, so they stay bright at night. */
  glow?: (fb: FB, t: number, dark: boolean) => void;
  desc: string | (() => string);
  enter?: (first: boolean) => void;
  tick?: (dt: number) => void;
  handle?: (p: Parsed) => boolean;
  encounters?: { chance: number; day: string[]; night: string[] };
}

export const ROOMS: Record<string, Room> = {};

export function defRoom(r: Room): Room {
  ROOMS[r.id] = r;
  return r;
}
