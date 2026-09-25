import { FB, mirror, rotate90, noise } from './gfx';
import { Col, RAMP, Ramp, T, darker, hex } from './palette';

export type HairStyle = 'short' | 'long' | 'bald' | 'hood' | 'helm' | 'hat' | 'wizard' | 'bun' | 'cap' | 'mask' | 'crown';
export type Weapon = 'sword' | 'dagger' | 'staff' | 'club' | null;
export type Action = 'stand' | 'walk' | 'ready' | 'attack' | 'windup' | 'parry' | 'cast' | 'dead';

export interface Look {
  id: string;
  kind?: 'human' | 'wolf' | 'saurus';
  skin: Ramp;
  hair: Ramp;
  hairStyle: HairStyle;
  hat?: Ramp;
  top: Ramp;
  trim?: Ramp;
  legs: Ramp;
  boots: Ramp;
  belt?: Ramp;
  robe?: Ramp;
  apron?: Ramp;
  cape?: Ramp;
  beard?: Ramp;
  bigBeard?: boolean;
  ears?: boolean;
  eye?: Col;
  weapon?: Weapon;
  shield?: Ramp;
  skirt?: boolean;
  build?: { h?: number; w?: number; belly?: number; hunch?: number };
  scale?: number;
}

export const DIR = { DOWN: 0, UP: 1, LEFT: 2, RIGHT: 3 } as const;
export const WALK_FRAMES = 8;

const DARK_EYE = hex('#1b120e');
const WHITE = hex('#f4f1ea');

// ---------------------------------------------------------------------------------------
// Humanoids
// ---------------------------------------------------------------------------------------

function humanoid(L: Look, dir: number, frame: number, act: Action, s: number): FB {
  const S = s * (L.scale ?? 1);
  const W = Math.ceil(46 * S), Hh = Math.ceil(58 * S);
  const fb = new FB(W, Hh, T);
  const ox = W / 2, oy = Hh - 1.2 * S;
  const X = (u: number) => ox + u * S, Y = (u: number) => oy + u * S;
  const limb = (ax: number, ay: number, bx: number, by: number, r0: number, r1: number, ramp: Ramp, o: any = {}) =>
    fb.limb(X(ax), Y(ay), X(bx), Y(by), r0 * S, r1 * S, ramp, o);
  const blob = (cx: number, cy: number, rx: number, ry: number, ramp: Ramp, o: any = {}) => fb.sphere(X(cx), Y(cy), rx * S, ry * S, ramp, o);
  const cyl = (pts: number[][], cx: number, hw: number, ramp: Ramp, o: any = {}) =>
    fb.cylPoly(pts.map(([a, b]) => [X(a), Y(b)]), X(cx), hw * S, ramp, o);
  const dot = (u: number, v: number, c: Col) => fb.pset(X(u), Y(v), c);
  const big = S >= 1.7;

  const bh = L.build?.h ?? 1, bw = L.build?.w ?? 1, belly = L.build?.belly ?? 0, hunch = L.build?.hunch ?? 0;
  const walking = act === 'walk';
  const ph = (frame / WALK_FRAMES) * Math.PI * 2;
  const combat = act === 'ready' || act === 'attack' || act === 'windup' || act === 'parry' || act === 'cast';
  const sleeve = L.robe ?? L.top;
  const beltR = L.belt ?? RAMP.leather;
  const clothTex = (seed: number) => (x: number, y: number) => (noise(x * 0.9, y * 0.35, seed) - 0.5) * 0.18;

  if (dir === 0 || dir === 1) {
    const back = dir === 1;
    const liftL = walking ? Math.max(0, Math.sin(ph)) * 2.2 : 0;
    const liftR = walking ? Math.max(0, -Math.sin(ph)) * 2.2 : 0;
    const bob = walking ? -Math.abs(Math.sin(ph)) * 0.6 : 0;
    const hip = -15 * bh + bob, sh = -27 * bh + bob, head = -32.8 * bh + bob + hunch * 0.6;
    const sw = 5.1 * bw, ww = 3.6 * bw;
    const swing = walking ? Math.sin(ph) * 1.5 : 0;

    // behind the body
    if (L.cape && !back) {
      cyl([[-sw - 0.4, sh + 0.5], [sw + 0.4, sh + 0.5], [sw + 1.8, hip + 9], [-sw - 1.8, hip + 9]], 0, sw + 2, darker(L.cape, 1));
    }
    if (L.hairStyle === 'long' || L.hairStyle === 'mask') blob(0, head + 3, 4.7, 7, L.hair, { tex: (x: number) => (noise(x * 1.3, 0, 3) - 0.5) * 0.25 });

    // legs & feet
    if (!L.robe) {
      for (const [lx, lift] of [[-1.95 * bw, liftL], [1.95 * bw, liftR]] as const) {
        limb(lx, hip, lx * 1.02, -3 - lift, 2.05 * bw, 1.55 * bw, L.legs, { tex: clothTex(4) });
        blob(lx, -2 - lift, 1.9 * bw, 1.9, L.boots);
        blob(lx, -1.2 - lift, 1.7 * bw, 1.2, L.boots);
      }
    } else {
      for (const [lx, lift] of [[-1.8, liftL], [1.8, liftR]] as const) if (lift < 1) blob(lx, -1.1, 1.8, 1.2, L.boots);
    }

    // torso / robe
    if (L.robe) {
      const hem = walking ? Math.sin(ph) * 0.6 : 0;
      cyl([[-sw + 0.3, sh], [sw - 0.3, sh], [ww + 3.4 + hem, -0.6], [-ww - 3.4 + hem, -0.6]], 0, ww + 3.4, L.robe, { tex: (x: number, y: number) => (noise(x * 0.8, y * 0.1, 7) - 0.5) * 0.35 });
      if (L.trim) limb(-ww - 3.3 + hem, -1, ww + 3.3 + hem, -1, 0.55, 0.55, L.trim);
      if (L.trim && !back) limb(0, sh + 1, 0, hip - 1, 0.5, 0.5, L.trim);
    } else {
      if (L.skirt !== false) cyl([[-ww - 0.2, hip - 1.2], [ww + 0.2, hip - 1.2], [ww + 1.4, hip + 3.4], [-ww - 1.4, hip + 3.4]], 0, ww + 1.4, L.top, { tex: clothTex(9) });
      cyl([[-sw, sh], [sw, sh], [sw - 0.4, sh + 4], [ww + belly * 0.4, hip - 1.2], [-ww - belly * 0.4, hip - 1.2], [-sw + 0.4, sh + 4]], 0, sw, L.top, { tex: clothTex(2) });
      if (belly > 0) blob(0, hip - 4.4, ww + belly * 0.7, 4 + belly * 0.4, L.top, { tex: clothTex(2) });
    }
    if (L.apron && !back) cyl([[-ww + 0.4, sh + 5], [ww - 0.4, sh + 5], [ww + 1.4, hip + 7], [-ww - 1.4, hip + 7]], 0, ww + 1.4, L.apron);
    if (!L.robe || L.belt) {
      cyl([[-ww - 0.5 - belly * 0.4, hip - 2.3], [ww + 0.5 + belly * 0.4, hip - 2.3], [ww + 0.6 + belly * 0.4, hip - 0.8], [-ww - 0.6 - belly * 0.4, hip - 0.8]], 0, ww + 0.6, beltR);
      if (!back) blob(0, hip - 1.55, 0.85, 0.75, RAMP.gold);
    }
    if (!back && !L.robe) {
      fb.poly([[X(-1.3), Y(sh)], [X(1.3), Y(sh)], [X(0), Y(sh + 2.6)]], L.skin[3]);
      if (L.trim) { limb(-1.3, sh, 0, sh + 2.6, 0.32, 0.32, L.trim); limb(1.3, sh, 0, sh + 2.6, 0.32, 0.32, L.trim); }
    }

    // arms
    const armR = L.robe ? [1.55, 2.2] : [1.5, 1.25];
    for (const side of [-1, 1]) {
      const sgn = side * (back ? -1 : 1);
      const sw2 = side === -1 ? swing : -swing;
      const shX = side * (sw - 0.5), elX = side * (sw + 0.5), haX = side * (sw + 0.6);
      limb(shX, sh + 1, elX, sh + 6.3 - sw2 * 0.4, armR[0], (armR[0] + armR[1]) / 2, sleeve);
      limb(elX, sh + 6.3 - sw2 * 0.4, haX, sh + 11.4 - sw2, (armR[0] + armR[1]) / 2, armR[1], sleeve);
      blob(haX, sh + 12.2 - sw2, 1.25, 1.3, L.skin);
      void sgn;
    }
    if (L.shield) {
      const sx = back ? sw + 1.6 : -(sw + 1.6);
      blob(sx, sh + 7.5, 3.3, 3.9, RAMP.metal);
      blob(sx, sh + 7.5, 2.8, 3.4, L.shield);
      blob(sx, sh + 7.5, 0.9, 1, RAMP.metal);
    }
    if (L.weapon === 'staff') {
      const x = back ? -(sw + 0.6) : sw + 0.6;
      limb(x, -0.5, x, sh - 10, 0.6, 0.55, RAMP.wood);
      blob(x, sh - 11, 1.4, 1.4, RAMP.magic, { amb: 0.6 });
    } else if (L.weapon === 'club') {
      const x = back ? -(sw + 0.6) : sw + 0.6;
      limb(x, sh + 12, x + 1.5, sh + 22, 0.9, 2, RAMP.wood);
    } else if ((L.weapon === 'sword' || L.weapon === 'dagger') && !back) {
      const len = L.weapon === 'sword' ? 9 : 4.5;
      limb(-ww - 0.8, hip - 1, -ww - 1.8, hip - 1 + len, 0.75, 0.6, RAMP.leather);
      limb(-ww - 0.7, hip - 1.2, -ww - 0.4, hip - 3.6, 0.45, 0.4, RAMP.leather);
      limb(-ww - 1.9, hip - 1.3, -ww + 0.4, hip - 1.1, 0.4, 0.4, RAMP.gold);
    }

    // neck & head
    limb(0, sh + 0.6, 0, head + 3, 1.45, 1.35, L.skin);
    if (L.hairStyle === 'hood') blob(0, head + 0.3, 5.3, 5.8, L.hat ?? RAMP.clothGrey, { tex: clothTex(5) });
    if (L.ears) {
      for (const side of [-1, 1]) fb.cylPoly([[X(side * 3.4), Y(head - 0.4)], [X(side * 7.4), Y(head - 3.4)], [X(side * 3.6), Y(head + 1.5)]], X(side * 4.5), 2.5 * S, L.skin);
    } else if (L.hairStyle !== 'hood') {
      for (const side of [-1, 1]) blob(side * 3.85, head + 0.4, 0.9, 1.3, L.skin);
    }
    blob(0, head, 3.9, 4.35, L.skin, { amb: 0.32 });

    if (!back) face(0, head);
    hairFront(back);
    if (L.beard && !back) {
      if (L.bigBeard) blob(0, head + 4.6, 3.8, 5.6, L.beard, { clip: (_x: number, y: number) => y > Y(head + 1.2), tex: (x: number) => (noise(x * 1.6, 0, 11) - 0.5) * 0.3 });
      else blob(0, head + 2.9, 3.2, 2.6, L.beard, { clip: (_x: number, y: number) => y > Y(head + 1.3) });
      limb(-1.7, head + 1.9, 1.7, head + 1.9, 0.55, 0.55, L.beard);
      dot(0, head + 2.7, L.skin[1]);
    }

    function face(cx: number, cy: number) {
      if (big) {
        for (const side of [-1, 1]) {
          blob(cx + side * 1.45, cy + 0.2, 0.9, 0.62, [WHITE, WHITE], { amb: 1 });
          blob(cx + side * 1.35, cy + 0.25, 0.46, 0.5, [L.eye ?? hex('#3a5a8a'), L.eye ?? hex('#3a5a8a')], { amb: 1 });
          dot(cx + side * 1.55, cy - 0.05, WHITE);
          limb(cx + side * 0.6, cy - 1.15, cx + side * 2.35, cy - 1.35, 0.3, 0.25, darker(L.hair, 2));
        }
        limb(cx + 0.2, cy + 0.6, cx + 0.45, cy + 1.7, 0.4, 0.45, darker(L.skin, 1));
        limb(cx - 0.9, cy + 2.85, cx + 0.9, cy + 2.85, 0.27, 0.27, [L.skin[1], L.skin[1]]);
      } else {
        dot(cx - 1.45, cy + 0.2, L.eye ?? DARK_EYE);
        dot(cx + 1.45, cy + 0.2, L.eye ?? DARK_EYE);
        dot(cx + 0.3, cy + 1.8, L.skin[2]);
        if (!L.beard) dot(cx, cy + 2.9, L.skin[1]);
      }
    }

    function hairFront(isBack: boolean) {
      const hr = L.hair;
      const tex = (x: number, y: number) => (noise(x * 1.1, y * 0.35, 13) - 0.5) * 0.3;
      switch (L.hairStyle) {
        case 'short': case 'long': case 'bun': case 'mask': case 'crown':
          if (isBack) blob(0, head - 0.2, 4.2, 4.6, hr, { tex });
          else {
            blob(0, head - 1.6, 4.3, 3.4, hr, { tex, clip: (x: number, y: number) => y < Y(head - 0.7) || (Math.abs(x + 0.5 - X(0)) > 3.1 * S && y < Y(head + 1.2)) });
            for (let i = -2; i <= 2; i++) blob(i * 1.1, head - 1.1 + Math.abs(i) * 0.12, 0.75, 0.9, hr, { tex });
          }
          if (L.hairStyle === 'long' && !isBack) { blob(-3.8, head + 2.5, 1.3, 4, hr, { tex }); blob(3.8, head + 2.5, 1.3, 4, hr, { tex }); }
          if (L.hairStyle === 'bun') blob(0, head - 4.6, 2, 1.8, hr, { tex });
          if (L.hairStyle === 'crown') {
            limb(-3.8, head - 2.6, 3.8, head - 2.6, 0.7, 0.7, RAMP.gold);
            for (const px of [-2.6, 0, 2.6]) fb.poly([[X(px - 0.8), Y(head - 2.8)], [X(px), Y(head - 5)], [X(px + 0.8), Y(head - 2.8)]], RAMP.gold[4]);
          }
          if (L.hairStyle === 'mask' && !isBack) {
            limb(-4, head + 0.1, 4, head + 0.1, 1.2, 1.2, RAMP.clothBlack);
            dot(-1.45, head + 0.2, hex('#e84a3a')); dot(1.45, head + 0.2, hex('#e84a3a'));
          }
          break;
        case 'bald':
          if (!isBack) dot(-1.2, head - 2.6, L.skin[6]);
          break;
        case 'hood': {
          const hat = L.hat ?? RAMP.clothGrey;
          if (isBack) blob(0, head, 5.2, 5.7, hat, { tex: clothTex(5) });
          else blob(0, head - 0.2, 5.1, 5.6, hat, {
            tex: clothTex(5),
            clip: (x: number, y: number) => ((x + 0.5 - X(0)) / (3.4 * S)) ** 2 + ((y + 0.5 - Y(head + 0.7)) / (4.0 * S)) ** 2 > 1,
          });
          cyl([[-4.6, head + 3.5], [4.6, head + 3.5], [sw + 0.8, sh + 3.4], [-sw - 0.8, sh + 3.4]], 0, sw + 1, hat, { tex: clothTex(5) });
          break;
        }
        case 'helm':
          blob(0, head - 1.2, 4.5, 4.2, RAMP.metal, { clip: (_x: number, y: number) => y < Y(head + 0.3), rim: 0.2 });
          limb(-4.5, head + 0.1, 4.5, head + 0.1, 0.6, 0.6, RAMP.metal);
          if (!isBack) limb(0, head - 0.4, 0, head + 2.2, 0.45, 0.35, RAMP.metal);
          blob(0, head - 5.4, 0.9, 1.2, L.trim ?? RAMP.clothRed);
          break;
        case 'hat': {
          const hat = L.hat ?? RAMP.leather;
          blob(0, head - 2.4, 7.2, 1.7, hat);
          blob(0, head - 4.1, 3.8, 3, hat, { clip: (_x: number, y: number) => y < Y(head - 2.3) });
          limb(-3.7, head - 2.8, 3.7, head - 2.8, 0.45, 0.45, L.trim ?? RAMP.clothBlack);
          break;
        }
        case 'wizard': {
          const hat = L.hat ?? RAMP.clothBlue;
          blob(0, head - 2.6, 7.4, 1.8, hat);
          cyl([[-4.4, head - 2.9], [4.4, head - 2.9], [1.8, head - 12], [3.6, head - 17], [0.2, head - 12.3]], 0, 4.4, hat, { tex: clothTex(8) });
          for (const [sx, sy] of [[-1.5, head - 6], [1.2, head - 9], [0.2, head - 4.5], [2, head - 5.5]]) fb.pset(X(sx), Y(sy), RAMP.gold[6]);
          break;
        }
        case 'cap': {
          const hat = L.hat ?? RAMP.clothGreen;
          if (!isBack) blob(0, head - 1.5, 4.2, 3.3, L.hair, { clip: (_x: number, y: number) => y < Y(head - 0.4) });
          blob(0, head - 2.6, 4.3, 2.7, hat, { clip: (_x: number, y: number) => y < Y(head - 1) });
          if (!isBack) blob(0, head - 1.2, 3.9, 0.9, darker(hat, 1));
          break;
        }
      }
    }
    fb.outline();
    return fb;
  }

  // ---- side view, facing right ---------------------------------------------------------
  const legLen = [7.6 * bh, 7.2 * bh];
  const legs: { knee: number[]; ankle: number[] }[] = [];
  const legAngles = (i: number): [number, number] => {
    if (walking) {
      const p = ph + i * Math.PI;
      const thigh = 0.46 * Math.sin(p);
      const bend = 0.12 + 0.75 * Math.max(0, Math.cos(p));
      return [thigh, thigh - bend];
    }
    if (combat) return i === 0 ? [0.32, 0.12] : [-0.42, -0.62];
    return i === 0 ? [0.06, 0.02] : [-0.06, -0.08];
  };
  for (let i = 0; i < 2; i++) {
    const [a1, a2] = legAngles(i);
    const knee = [Math.sin(a1) * legLen[0], Math.cos(a1) * legLen[0]];
    const ankle = [knee[0] + Math.sin(a2) * legLen[1], knee[1] + Math.cos(a2) * legLen[1]];
    legs.push({ knee, ankle });
  }
  const lowest = Math.max(legs[0].ankle[1], legs[1].ankle[1]) + 1.7;
  const hipY = -lowest - (combat ? 0.4 : 0);
  const shY = hipY - 12 * bh, head = shY - 5.8 * bh + hunch * 0.6, hx = 0.5 + hunch;
  const tex2 = (seed: number) => (x: number, y: number) => (noise(x * 0.9, y * 0.3, seed) - 0.5) * 0.18;

  // arm pose: [upper angle, elbow bend] (radians from straight down, + is forward)
  const armPose = (front: boolean): [number, number] => {
    switch (act) {
      case 'walk': return [(front ? -0.5 : 0.5) * Math.sin(ph), 0.35];
      case 'ready': return front ? [0.75, 0.95] : [0.9, 1.0];
      case 'attack': return front ? [1.5, 0.05] : [0.5, 0.6];
      case 'windup': return front ? [2.75, 0.5] : [0.4, 0.8];
      case 'parry': return front ? [1.05, 1.35] : [1.2, 0.8];
      case 'cast': return front ? [1.35, -0.1] : [1.1, 0.2];
      default: return front ? [0.05, 0.22] : [-0.05, 0.25];
    }
  };
  const arm = (front: boolean) => {
    const [a, e] = armPose(front);
    const sx = hx - 0.2 + (front ? 0.4 : -0.6), sy = shY + 1.2;
    const el = [sx + Math.sin(a) * 5.8, sy + Math.cos(a) * 5.8];
    const ha = [el[0] + Math.sin(a + e) * 5.4, el[1] + Math.cos(a + e) * 5.4];
    return { sh: [sx, sy], el, ha, dir: a + e };
  };
  const drawArm = (front: boolean) => {
    const A = arm(front);
    const ramp = front ? sleeve : darker(sleeve, 1);
    const r = L.robe ? [1.5, 2.1] : [1.45, 1.2];
    limb(A.sh[0], A.sh[1], A.el[0], A.el[1], r[0], (r[0] + r[1]) / 2, ramp);
    limb(A.el[0], A.el[1], A.ha[0], A.ha[1], (r[0] + r[1]) / 2, r[1], ramp);
    blob(A.ha[0], A.ha[1] + 0.3, 1.2, 1.25, front ? L.skin : darker(L.skin, 1));
    if (act === 'cast') fb.glow(X(A.ha[0] + 1), Y(A.ha[1]), 4 * S, hex('#8fb8ff'), 0.9);
    return A;
  };
  const drawLeg = (i: number) => {
    const g = legs[i], dark = i === 1;
    const legR = dark ? darker(L.legs, 1) : L.legs, bootR = dark ? darker(L.boots, 1) : L.boots;
    const kx = g.knee[0], ky = hipY + g.knee[1], ax = g.ankle[0], ay = hipY + g.ankle[1];
    if (!L.robe) {
      limb(0, hipY, kx, ky, 2.05 * bw, 1.75 * bw, legR, { tex: tex2(4) });
      limb(kx, ky, ax, ay, 1.75 * bw, 1.45 * bw, legR, { tex: tex2(4) });
    }
    blob(ax + 0.4, ay + 0.2, 1.7, 1.8, bootR);
    blob(ax + 1.5, ay + 0.9, 1.9, 0.95, bootR);
  };
  const weapon = (A: { ha: number[]; dir: number }) => {
    if (!L.weapon) return;
    const hand = A.ha;
    let ang: number;
    if (!combat) ang = L.weapon === 'staff' ? Math.PI : L.weapon === 'club' ? 0.35 : A.dir;
    else ang = act === 'attack' ? Math.PI / 2 : act === 'windup' ? Math.PI - 0.6 + 0.5 : act === 'parry' ? Math.PI - 0.05 : act === 'ready' ? Math.PI - 0.45 : A.dir;
    const dx = Math.sin(ang), dy = Math.cos(ang);
    if (L.weapon === 'staff') {
      limb(hand[0] - dx * 8, hand[1] - dy * 8, hand[0] + dx * 12, hand[1] + dy * 12, 0.6, 0.55, RAMP.wood);
      blob(hand[0] + dx * 13, hand[1] + dy * 13, 1.4, 1.4, RAMP.magic, { amb: 0.6 });
      return;
    }
    if (L.weapon === 'club') {
      limb(hand[0] - dx * 1.5, hand[1] - dy * 1.5, hand[0] + dx * 9.5, hand[1] + dy * 9.5, 0.9, 2.1, RAMP.wood, { tex: (x: number, y: number) => (noise(x * 0.7, y * 0.7, 21) - 0.5) * 0.4 });
      return;
    }
    const len = L.weapon === 'sword' ? 11 : 5.2;
    const px = -dy, py = dx;
    limb(hand[0] - dx * 1.8, hand[1] - dy * 1.8, hand[0] + dx * 0.4, hand[1] + dy * 0.4, 0.5, 0.5, RAMP.leather);
    blob(hand[0] - dx * 2.2, hand[1] - dy * 2.2, 0.65, 0.65, RAMP.gold);
    limb(hand[0] + dx * 0.9 - px * 1.5, hand[1] + dy * 0.9 - py * 1.5, hand[0] + dx * 0.9 + px * 1.5, hand[1] + dy * 0.9 + py * 1.5, 0.45, 0.45, RAMP.gold);
    limb(hand[0] + dx * 1.2, hand[1] + dy * 1.2, hand[0] + dx * (1.2 + len), hand[1] + dy * (1.2 + len), 0.62, 0.3, RAMP.metal, { amb: 0.45, rim: 0.3 });
  };
  const shieldSide = () => {
    if (!L.shield) return;
    const A = arm(false);
    const cx = combat ? A.ha[0] + 1.2 : hx - 2.6, cy = combat ? A.ha[1] - 0.5 : shY + 6.5;
    blob(cx, cy, 2.2, 4.8, RAMP.metal);
    blob(cx + 0.2, cy, 1.8, 4.3, L.shield);
    blob(cx + 0.7, cy, 0.6, 0.9, RAMP.metal);
  };

  // far side first
  if (L.shield && !combat) shieldSide();
  drawArm(false);
  if (L.cape) {
    const flap = walking ? Math.sin(ph) * 1.2 : combat ? 1.4 : 0;
    cyl([[hx - 2.5, shY + 0.4], [hx - 0.4, shY + 0.4], [hx - 1.2, hipY + 10], [hx - 6.2 - flap, hipY + 9.2]], hx - 2.5, 3.5, darker(L.cape, 0), { tex: tex2(6) });
  }
  if (L.hairStyle === 'long' || L.hairStyle === 'mask') blob(hx - 1.6, head + 3.2, 3, 6.2, darker(L.hair, 1));
  drawLeg(1);
  if (L.robe) {
    const sway = walking ? Math.sin(ph) * 0.8 : 0;
    cyl([[hx - 2.7, shY], [hx + 2.4, shY], [hx + 4.4 + sway, -0.6], [hx - 4.4 + sway, -0.6]], hx, 4.4, L.robe, { tex: (x: number, y: number) => (noise(x * 0.8, y * 0.1, 7) - 0.5) * 0.35 });
    if (L.trim) limb(hx - 4.3 + sway, -1, hx + 4.3 + sway, -1, 0.55, 0.55, L.trim);
  }
  drawLeg(0);
  if (!L.robe) {
    if (L.skirt !== false) cyl([[-2.5, hipY - 1.4], [2.6 + belly * 0.3, hipY - 1.4], [3.3 + belly * 0.3, hipY + 3.2], [-3.2, hipY + 3.2]], 0.2, 3.2, L.top, { tex: tex2(9) });
    cyl([[hx - 2.6, shY], [hx + 2.4, shY + 0.4], [hx + 2.9 + belly * 0.4, shY + 4], [2.4 + belly, hipY - 1.3], [-2.4, hipY - 1.2], [hx - 2.9, shY + 3]], hx, 3, L.top, { tex: tex2(2) });
    if (belly > 0) blob(1 + belly * 0.4, hipY - 4.5, 3 + belly * 0.5, 3.8 + belly * 0.3, L.top, { tex: tex2(2) });
  }
  if (L.apron) cyl([[hx + 1.2, shY + 4.5], [hx + 2.6, shY + 4.5], [3.6, hipY + 6.5], [1.2, hipY + 6.5]], hx + 2, 1.5, L.apron);
  if (!L.robe || L.belt) cyl([[-2.6, hipY - 2.3], [2.7 + belly, hipY - 2.3], [2.8 + belly, hipY - 0.8], [-2.6, hipY - 0.8]], 0, 2.8, beltR);
  if ((L.weapon === 'sword' || L.weapon === 'dagger') && !combat) {
    const len = L.weapon === 'sword' ? 9 : 4.5;
    limb(-1.2, hipY - 1, -3.6, hipY - 1 + len * 0.95, 0.75, 0.6, RAMP.leather);
    limb(-0.9, hipY - 1.4, 0.6, hipY - 3.4, 0.45, 0.4, RAMP.leather);
    limb(-1.8, hipY - 0.6, -0.1, hipY - 2.1, 0.4, 0.4, RAMP.gold);
  }
  if (L.shield && combat) shieldSide();

  // head
  limb(hx - 0.1, shY + 0.5, hx + 0.3, head + 3, 1.45, 1.35, L.skin);
  if (L.hairStyle === 'hood') blob(hx - 0.3, head + 0.2, 5, 5.6, L.hat ?? RAMP.clothGrey, { tex: tex2(5) });
  blob(hx, head, 3.7, 4.3, L.skin, { amb: 0.32 });
  blob(hx + 3.5, head + 0.8, 0.95, 1.05, L.skin);
  if (L.ears) fb.cylPoly([[X(hx - 0.8), Y(head - 0.6)], [X(hx - 5.4), Y(head - 3.4)], [X(hx - 0.6), Y(head + 1.5)]], X(hx - 2), 2 * S, darker(L.skin, 1));
  else blob(hx - 0.6, head + 0.5, 0.9, 1.25, darker(L.skin, 1));
  if (big) {
    blob(hx + 2.2, head + 0.1, 0.75, 0.6, [WHITE, WHITE], { amb: 1 });
    blob(hx + 2.5, head + 0.15, 0.4, 0.48, [L.eye ?? hex('#3a5a8a'), L.eye ?? hex('#3a5a8a')], { amb: 1 });
    limb(hx + 1.3, head - 1.2, hx + 3.2, head - 1.3, 0.3, 0.25, darker(L.hair, 2));
    limb(hx + 2.2, head + 2.9, hx + 3.3, head + 2.8, 0.26, 0.26, [L.skin[1], L.skin[1]]);
  } else {
    fb.pset(X(hx + 2.3), Y(head + 0.1), L.eye ?? DARK_EYE);
    if (!L.beard) fb.pset(X(hx + 2.7), Y(head + 2.8), L.skin[1]);
  }
  const hr = L.hair;
  const htex = (x: number, y: number) => (noise(x * 1.1, y * 0.35, 13) - 0.5) * 0.3;
  switch (L.hairStyle) {
    case 'short': case 'long': case 'bun': case 'mask': case 'crown':
      blob(hx - 0.5, head - 1.2, 4.1, 3.7, hr, { tex: htex, clip: (x: number, y: number) => (y < Y(head - 0.8) || x < X(hx + 0.2)) && y < Y(head + 2.6) });
      if (L.hairStyle === 'bun') blob(hx - 2.8, head - 3, 1.9, 1.8, hr, { tex: htex });
      if (L.hairStyle === 'crown') {
        limb(hx - 3.6, head - 2.6, hx + 3.4, head - 2.6, 0.7, 0.7, RAMP.gold);
        for (const px of [-2, 0.4, 2.6]) fb.poly([[X(hx + px - 0.8), Y(head - 2.8)], [X(hx + px), Y(head - 5)], [X(hx + px + 0.8), Y(head - 2.8)]], RAMP.gold[4]);
      }
      if (L.hairStyle === 'mask') { limb(hx + 0.4, head + 0.1, hx + 3.9, head + 0.1, 1.15, 1.15, RAMP.clothBlack); fb.pset(X(hx + 2.4), Y(head + 0.1), hex('#e84a3a')); }
      break;
    case 'bald':
      fb.pset(X(hx), Y(head - 3), L.skin[6]);
      break;
    case 'hood':
      blob(hx - 0.3, head - 0.2, 5, 5.6, L.hat ?? RAMP.clothGrey, { tex: tex2(5), clip: (x: number, y: number) => ((x + 0.5 - X(hx + 1.3)) / (3.1 * S)) ** 2 + ((y + 0.5 - Y(head + 0.7)) / (3.9 * S)) ** 2 > 1 });
      cyl([[hx - 4.4, head + 3.4], [hx + 2.4, head + 3.6], [hx + 2.8, shY + 3.2], [hx - 3.4, shY + 3.4]], hx - 1, 3.4, L.hat ?? RAMP.clothGrey, { tex: tex2(5) });
      break;
    case 'helm':
      blob(hx, head - 1.2, 4.3, 4.2, RAMP.metal, { clip: (_x: number, y: number) => y < Y(head + 0.3), rim: 0.2 });
      limb(hx - 4.2, head + 0.1, hx + 4.2, head + 0.1, 0.6, 0.6, RAMP.metal);
      limb(hx + 3.4, head - 0.3, hx + 3.9, head + 2, 0.45, 0.35, RAMP.metal);
      blob(hx - 0.5, head - 5.4, 1, 1.2, L.trim ?? RAMP.clothRed);
      break;
    case 'hat': {
      const hat = L.hat ?? RAMP.leather;
      blob(hx, head - 2.4, 7, 1.5, hat);
      blob(hx - 0.3, head - 4, 3.6, 2.9, hat, { clip: (_x: number, y: number) => y < Y(head - 2.3) });
      limb(hx - 3.5, head - 2.8, hx + 3.3, head - 2.8, 0.45, 0.45, L.trim ?? RAMP.clothBlack);
      break;
    }
    case 'wizard': {
      const hat = L.hat ?? RAMP.clothBlue;
      blob(hx, head - 2.6, 7.2, 1.7, hat);
      cyl([[hx - 4.3, head - 2.9], [hx + 4.3, head - 2.9], [hx + 0.5, head - 12], [hx - 3.5, head - 16.5], [hx - 1.8, head - 11.5]], hx, 4.3, hat, { tex: tex2(8) });
      fb.pset(X(hx), Y(head - 6), RAMP.gold[6]); fb.pset(X(hx + 1.8), Y(head - 4.4), RAMP.gold[6]);
      break;
    }
    case 'cap': {
      const hat = L.hat ?? RAMP.clothGreen;
      blob(hx - 0.5, head - 1.3, 4, 3.4, hr, { clip: (x: number, y: number) => (y < Y(head - 0.6) || x < X(hx)) && y < Y(head + 2) });
      blob(hx - 0.4, head - 2.6, 4.1, 2.7, hat, { clip: (_x: number, y: number) => y < Y(head - 1) });
      blob(hx + 3.4, head - 1.3, 2.4, 0.8, darker(hat, 1));
      break;
    }
  }
  if (L.beard) {
    if (L.bigBeard) blob(hx + 1.6, head + 4.4, 2.8, 5.4, L.beard, { clip: (x: number, y: number) => y > Y(head + 1.2) && x > X(hx - 0.8), tex: (x: number) => (noise(x * 1.6, 0, 11) - 0.5) * 0.3 });
    else blob(hx + 2, head + 2.9, 2.3, 2.3, L.beard, { clip: (x: number, y: number) => y > Y(head + 1.3) && x > X(hx - 0.3) });
  }
  const A = drawArm(true);
  weapon(A);
  fb.outline();
  return fb;
}

// ---------------------------------------------------------------------------------------
// Beasts (side view, facing right)
// ---------------------------------------------------------------------------------------

function beast(L: Look, frame: number, act: Action, s: number): FB {
  const S = s * (L.scale ?? 1);
  const W = Math.ceil(50 * S), Hh = Math.ceil(30 * S);
  const fb = new FB(W, Hh, T);
  const ox = W / 2 - 1 * S, oy = Hh - 1.2 * S;
  const X = (u: number) => ox + u * S, Y = (u: number) => oy + u * S;
  const limb = (ax: number, ay: number, bx: number, by: number, r0: number, r1: number, ramp: Ramp, o: any = {}) =>
    fb.limb(X(ax), Y(ay), X(bx), Y(by), r0 * S, r1 * S, ramp, o);
  const blob = (cx: number, cy: number, rx: number, ry: number, ramp: Ramp, o: any = {}) => fb.sphere(X(cx), Y(cy), rx * S, ry * S, ramp, o);
  const wolf = L.kind === 'wolf';
  const body = L.top, bellyR = L.trim ?? RAMP.furLight;
  const ph = (frame / WALK_FRAMES) * Math.PI * 2;
  const walking = act === 'walk';
  const dx = act === 'attack' ? 3 : 0, crouch = act === 'windup' ? 1.6 : 0;
  const tex = (x: number, y: number) => (noise(x * (wolf ? 1.4 : 0.9), y * (wolf ? 0.5 : 0.9), wolf ? 31 : 37) - 0.5) * (wolf ? 0.35 : 0.3);
  const by = (wolf ? -11.5 : -9.5) + crouch;

  const leg = (x: number, phase: number, near: boolean) => {
    const a = walking ? 0.5 * Math.sin(ph + phase) : act === 'attack' ? (x > 0 ? 0.5 : -0.4) : 0;
    const bend = walking ? 0.5 * Math.max(0, Math.cos(ph + phase)) : 0.15;
    const upper = wolf ? 5 : 4.2, lower = wolf ? 5 : 3.8, r = wolf ? 1.35 : 1.7;
    const top = [x + dx, by + (wolf ? 2.5 : 3)];
    const knee = [top[0] + Math.sin(a) * upper, top[1] + Math.cos(a) * upper];
    const foot = [knee[0] + Math.sin(a - bend * (x > 0 ? -1 : 1)) * lower, Math.min(-0.8, knee[1] + Math.cos(a - bend) * lower)];
    const ramp = near ? body : darker(body, 1);
    limb(top[0], top[1], knee[0], knee[1], r * 1.4, r, ramp, { tex });
    limb(knee[0], knee[1], foot[0], foot[1], r, r * 0.8, ramp, { tex });
    blob(foot[0] + 0.6, foot[1] + 0.2, r * 1.1, r * 0.7, near ? L.legs : darker(L.legs, 1));
  };
  const legX = wolf ? [-6.5, 6.5] : [-6, 6];
  leg(legX[0] + 1.2, Math.PI, false);
  leg(legX[1] + 1.2, 0, false);
  // tail
  if (wolf) {
    limb(-9 + dx, by - 1.5, -12.5 + dx, by - 3.8 + crouch, 1.6, 1.4, body, { tex });
    limb(-12.5 + dx, by - 3.8 + crouch, -15.5 + dx, by - 2 + crouch * 1.5, 1.4, 0.7, body, { tex });
  } else {
    limb(-8 + dx, by, -14 + dx, by + 3, 2.6, 1.8, body, { tex });
    limb(-14 + dx, by + 3, -20 + dx, by + 6.5, 1.8, 0.5, body, { tex });
  }
  // body
  blob(dx, by, wolf ? 9.2 : 9.5, wolf ? 4.6 : 4.8, body, { tex });
  blob(6.2 + dx, by - 0.4, wolf ? 4.6 : 4.4, wolf ? 5.2 : 4.6, body, { tex });
  blob(-6 + dx, by, 4.4, wolf ? 4.8 : 4.4, body, { tex });
  blob(dx + 0.5, by + 2.9, 6.8, 1.7, bellyR, { amb: 0.5 });
  if (!wolf) for (let i = -3; i <= 3; i++) {
    const sx = i * 2.4 + dx, sy = by - 4.6 + Math.abs(i) * 0.25;
    fb.cylPoly([[X(sx - 1.1), Y(sy + 0.8)], [X(sx + 0.1), Y(sy - 2.8 + Math.abs(i) * 0.3)], [X(sx + 1.1), Y(sy + 0.8)]], X(sx), 1.1 * S, RAMP.clothRed);
  }
  leg(legX[0], Math.PI + Math.PI, true);
  leg(legX[1], Math.PI, true);
  // neck & head
  const hy = (wolf ? by - 5 : by - 3) + crouch * 1.2, hx = (wolf ? 11.4 : 12) + dx;
  limb(7 + dx, by - 1.5, hx - 1, hy + 1, wolf ? 3 : 3.2, wolf ? 2.4 : 2.6, body, { tex });
  blob(hx, hy, wolf ? 3.4 : 3.6, wolf ? 3.1 : 2.8, body, { tex });
  const open = act === 'attack';
  if (wolf) {
    limb(hx + 1, hy + 0.7, hx + 5.4, hy + 1.3, 1.75, 1.05, body, { tex });
    if (open) { limb(hx + 1, hy + 1.8, hx + 5, hy + 3.4, 1.1, 0.7, body); for (const t of [2.5, 4]) fb.pset(X(hx + t), Y(hy + 2.1), 0xffffff); }
    blob(hx + 5.5, hy + 0.9, 0.75, 0.65, RAMP.clothBlack, { amb: 0.6 });
    fb.cylPoly([[X(hx - 1.6), Y(hy - 1.8)], [X(hx - 0.3), Y(hy - 6)], [X(hx + 0.9), Y(hy - 2)]], X(hx - 0.4), 1.3 * S, body);
  } else {
    limb(hx + 1, hy + 0.2, hx + 7, hy + 0.9, 2, 1.2, body, { tex });
    limb(hx + 1, hy + 1.7, hx + 6.4, hy + (open ? 4.2 : 2.3), 1.3, 0.8, darker(body, 1));
    for (let t = 2; t < 6.5; t += 1.3) fb.pset(X(hx + t), Y(hy + 1.6 + (open ? 0.5 : 0)), 0xfff6e0);
  }
  const eye = L.eye ?? hex('#f2d44a');
  fb.pset(X(hx + 1.2), Y(hy - 0.8), eye);
  if (S >= 1.7) fb.pset(X(hx + 1.2) + 1, Y(hy - 0.8), eye);
  fb.outline();
  return fb;
}

// ---------------------------------------------------------------------------------------

const cache = new Map<string, FB>();

/** Render (and cache) a sprite. `s` is the pixel scale: 1 on the map, larger in combat. */
export function sprite(L: Look, dir: number, frame: number, act: Action, s = 1): FB {
  const f = act === 'walk' ? frame % WALK_FRAMES : 0;
  const key = `${L.id}|${dir}|${f}|${act}|${s}`;
  let out = cache.get(key);
  if (out) return out;
  const beastKind = !!L.kind && L.kind !== 'human';
  if (act === 'dead') {
    const base = sprite(L, 3, 0, 'stand', s);
    if (beastKind) {
      out = new FB(base.w, base.h, T);
      for (let y = 0; y < base.h; y++) for (let x = 0; x < base.w; x++) out.px[y * base.w + x] = base.px[(base.h - 1 - y) * base.w + x];
    } else out = trimBottom(rotate90(base));
  } else if (beastKind) {
    out = beast(L, f, act, s);
    if (dir === 2) out = mirror(out);
  } else if (dir === 2) out = mirror(humanoid(L, 3, f, act, s));
  else out = humanoid(L, dir, f, act, s);
  cache.set(key, out);
  return out;
}

function trimBottom(s: FB): FB {
  let last = s.h - 1;
  while (last > 0 && s.px.subarray(last * s.w, (last + 1) * s.w).every((c) => c === T)) last--;
  const o = new FB(s.w, last + 1, T);
  o.px.set(s.px.subarray(0, (last + 1) * s.w));
  return o;
}

/** Head-and-shoulders portrait for dialogue boxes. */
export function portrait(L: Look): FB {
  const key = `portrait|${L.id}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const s = 3.2 / (L.scale ?? 1);
  const full = humanoid(L, 0, 0, 'stand', s);
  const S = s * (L.scale ?? 1);
  const bh = L.build?.h ?? 1;
  const cx = full.w / 2, top = full.h - 1.2 * S + (-33 * bh - 7.5) * S;
  const size = Math.round(17 * S);
  const out = new FB(size, size, T);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const sx = Math.round(cx - size / 2 + x), sy = Math.round(top + y);
      if (sx >= 0 && sy >= 0 && sx < full.w && sy < full.h) out.px[y * size + x] = full.px[sy * full.w + sx];
    }
  cache.set(key, out);
  return out;
}

export function dropSprites(id: string) {
  for (const k of [...cache.keys()]) if (k.startsWith(id + '|')) cache.delete(k);
}

// ---- The cast ------------------------------------------------------------------------

const P = RAMP;
const L = (o: Look) => o;

export const LOOKS = {
  heroFighter: L({ id: 'heroF', skin: P.skin, hair: P.hairBlond, hairStyle: 'short', top: P.clothBlue, trim: P.gold, legs: P.clothBrown, boots: P.leather, belt: P.leather, shield: P.woodPale, weapon: 'sword', eye: hex('#2d4f7c') }),
  heroMage: L({ id: 'heroM', skin: P.skin, hair: P.hairBlond, hairStyle: 'short', top: P.clothPurple, robe: P.clothPurple, trim: P.gold, legs: P.clothPurple, boots: P.leather, belt: P.leather, weapon: 'dagger', eye: hex('#2d4f7c') }),
  heroThief: L({ id: 'heroT', skin: P.skin, hair: P.hairBlond, hairStyle: 'short', top: P.leather, trim: P.clothBlack, legs: P.clothBlack, boots: P.leather, belt: P.clothBlack, weapon: 'dagger', skirt: false, eye: hex('#2d4f7c') }),

  sheriff: L({ id: 'sheriff', skin: P.skin, hair: P.hairGrey, hairStyle: 'hat', hat: P.leather, top: P.clothBrown, trim: P.gold, legs: P.clothGrey, boots: P.leather, beard: P.hairGrey }),
  shopkeep: L({ id: 'greta', skin: P.skin, hair: P.hairRed, hairStyle: 'bun', top: P.clothGreen, robe: P.clothGreen, apron: P.clothWhite, legs: P.clothGreen, boots: P.leather, build: { w: 1.12, belly: 0.8 } }),
  innkeep: L({ id: 'oswin', skin: P.skin, hair: P.hairGrey, hairStyle: 'bald', top: P.clothWhite, apron: P.clothBrown, legs: P.clothBrown, boots: P.leather, beard: P.hairGrey, build: { w: 1.15, belly: 1.6 } }),
  guildmaster: L({ id: 'harrow', skin: P.skinTan, hair: P.hairGrey, hairStyle: 'short', top: P.clothRed, trim: P.gold, legs: P.clothGrey, boots: P.leather, beard: P.hairGrey, cape: P.clothBlue }),
  healer: L({ id: 'hilde', skin: P.skin, hair: P.hairGrey, hairStyle: 'hood', hat: P.clothTeal, top: P.clothTeal, robe: P.clothTeal, trim: P.clothWhite, legs: P.clothTeal, boots: P.leather, build: { h: 0.92, hunch: 0.6 } }),
  wizard: L({ id: 'zephram', skin: P.skin, hair: P.hairGrey, hairStyle: 'wizard', hat: P.clothBlue, top: P.clothBlue, robe: P.clothBlue, trim: P.gold, legs: P.clothBlue, boots: P.leather, beard: P.clothWhite, bigBeard: true, weapon: 'staff', build: { h: 0.88 } }),
  thiefBoss: L({ id: 'nell', skin: P.skin, hair: P.hairRed, hairStyle: 'long', top: P.clothBlack, trim: P.clothPurple, legs: P.clothBlack, boots: P.leather, cape: P.clothPurple, skirt: false, eye: hex('#3f6b3a') }),
  castleGuard: L({ id: 'pike', skin: P.skin, hair: P.hairBrown, hairStyle: 'helm', top: P.metal, trim: P.clothPurple, legs: P.clothPurple, boots: P.leather, weapon: 'sword', shield: P.clothPurple, build: { w: 1.15 } }),
  baron: L({ id: 'baron', skin: P.skin, hair: P.hairGrey, hairStyle: 'crown', top: P.clothPurple, trim: P.gold, legs: P.clothPurple, boots: P.leather, beard: P.hairGrey, cape: P.clothRed }),
  wren: L({ id: 'wren', skin: P.skin, hair: P.hairBlond, hairStyle: 'long', top: P.clothPink, robe: P.clothPink, trim: P.gold, legs: P.clothPink, boots: P.leather, eye: hex('#5b7fa8') }),
  villager: L({ id: 'tom', skin: P.skinTan, hair: P.hairBrown, hairStyle: 'cap', hat: P.clothGreen, top: P.clothBrown, legs: P.clothBlue, boots: P.leather }),
  barmaid: L({ id: 'molly', skin: P.skin, hair: P.hairBrown, hairStyle: 'bun', top: P.clothRed, robe: P.clothRed, apron: P.clothWhite, legs: P.clothRed, boots: P.leather }),

  goblin: L({ id: 'goblin', skin: P.goblin, hair: P.hairBlack, hairStyle: 'bald', ears: true, eye: hex('#f0c030'), top: P.clothBrown, legs: P.clothBrown, boots: P.leather, weapon: 'dagger', scale: 0.86, build: { hunch: 0.8 } }),
  brigand: L({ id: 'brigand', skin: P.skin, hair: P.hairBlack, hairStyle: 'hood', hat: P.clothGrey, top: P.leather, trim: P.clothBlack, legs: P.clothGrey, boots: P.leather, weapon: 'sword' }),
  troll: L({ id: 'troll', skin: P.troll, hair: P.hairBlack, hairStyle: 'bald', eye: hex('#e05030'), top: P.troll, legs: P.troll, boots: P.troll, belt: P.leather, beard: P.hairGrey, bigBeard: true, weapon: 'club', scale: 1.42, build: { w: 1.35, belly: 1.6, hunch: 1.2 } }),
  trollShorn: L({ id: 'trollShorn', skin: P.troll, hair: P.hairBlack, hairStyle: 'bald', eye: hex('#e05030'), top: P.troll, legs: P.troll, boots: P.troll, belt: P.leather, weapon: 'club', scale: 1.42, build: { w: 1.35, belly: 1.6, hunch: 1.2 } }),
  kobold: L({ id: 'kobold', skin: P.kobold, hair: P.kobold, hairStyle: 'bald', ears: true, eye: hex('#ffd23a'), top: P.clothPurple, robe: P.clothPurple, trim: P.gold, legs: P.clothPurple, boots: P.kobold, weapon: 'staff', scale: 0.84, build: { hunch: 0.6 } }),
  leader: L({ id: 'leader', skin: P.skin, hair: P.hairBlond, hairStyle: 'mask', top: P.clothBlack, trim: P.clothRed, legs: P.clothBlack, boots: P.leather, cape: P.clothRed, weapon: 'sword', skirt: false }),
  wolf: L({ id: 'wolf', kind: 'wolf', skin: P.fur, hair: P.fur, hairStyle: 'bald', top: P.fur, trim: P.furLight, legs: P.clothBlack, boots: P.fur, eye: hex('#f2d44a') }),
  saurus: L({ id: 'saurus', kind: 'saurus', skin: P.scale, hair: P.scale, hairStyle: 'bald', top: P.scale, trim: P.belly, legs: P.clothBlack, boots: P.scale, eye: hex('#ff5a3a'), scale: 1.05 }),
};
