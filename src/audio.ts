/** Tiny WebAudio chiptune player: square/triangle voices, a lookahead scheduler, and sfx. */

type Ev = [number, number]; // [frequency (0 = rest), duration in units]
interface Track { wave: OscillatorType; vol: number; ev: Ev[] }
interface Song { unit: number; loop: boolean; tracks: Track[] }

const SEMI: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function freq(n: string): number {
  const m = /^([A-G])([#b]?)(\d)$/.exec(n);
  if (!m) return 0;
  const midi = 12 * (+m[3] + 1) + SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function seq(s: string): Ev[] {
  return s.replace(/\|/g, ' ').trim().split(/\s+/).map((tok) => {
    const [n, d] = tok.split(':');
    return [n === 'R' ? 0 : freq(n), +(d ?? 1)] as Ev;
  });
}

/** One chord root per 8-unit bar, broken into a repeating interval pattern. */
function bass(roots: string, pattern: number[], unit: number): Ev[] {
  const out: Ev[] = [];
  for (const r of roots.trim().split(/\s+/)) {
    const f = freq(r);
    for (let i = 0; i < 8 / unit; i++) out.push([f * Math.pow(2, pattern[i % pattern.length] / 12), unit]);
  }
  return out;
}

const SONGS: Record<string, Song> = {
  title: {
    unit: 0.15, loop: true, tracks: [
      { wave: 'square', vol: 0.05, ev: seq('E4:2 G4:2 C5:3 B4:1 | A4:2 G4:2 E4:2 G4:2 | A4:4 R:2 A4:2 | C5:2 F5:3 E5:1 D5:2 | C5:2 B4:2 D5:2 G5:2 | G5:4 R:2 G5:2 | E5:2 C5:2 A4:2 F5:2 | E5:2 D5:2 C5:2 B4:2 | G4:2 D5:4 B4:2 | C5:6 R:2') },
      { wave: 'triangle', vol: 0.12, ev: bass('C3 A2 F2 F2 G2 G2 C3 A2 G2 C3', [0, 7, 12, 7], 2) },
    ],
  },
  town: {
    unit: 0.13, loop: true, tracks: [
      { wave: 'square', vol: 0.045, ev: seq('G4:1 A4:1 B4:2 B4:2 A4:1 G4:1 | A4:2 D4:2 D4:2 R:2 | G4:1 A4:1 B4:2 D5:2 C5:1 B4:1 | A4:6 R:2 | B4:1 C5:1 D5:2 D5:2 E5:1 D5:1 | C5:2 A4:2 A4:2 R:2 | B4:1 A4:1 G4:2 A4:2 F#4:2 | G4:6 R:2') },
      { wave: 'triangle', vol: 0.11, ev: bass('G2 D3 G2 D3 G2 A2 D3 G2', [0, 12, 7, 12], 2) },
    ],
  },
  forest: {
    unit: 0.2, loop: true, tracks: [
      { wave: 'square', vol: 0.035, ev: seq('A4:4 C5:2 B4:2 | A4:4 E4:4 | F4:4 G4:2 A4:2 | E4:8 | A4:4 C5:2 D5:2 | E5:4 D5:2 C5:2 | B4:2 A4:2 G#4:2 B4:2 | A4:8') },
      { wave: 'triangle', vol: 0.11, ev: bass('A2 A2 F2 E2 A2 C3 E2 A2', [0, 7, 12, 7], 2) },
    ],
  },
  night: {
    unit: 0.26, loop: true, tracks: [
      { wave: 'triangle', vol: 0.09, ev: seq('E4:6 R:2 | G4:6 R:2 | A4:4 B4:4 | E4:8 | C5:6 R:2 | B4:6 R:2 | A4:4 G4:4 | E4:8') },
      { wave: 'triangle', vol: 0.08, ev: bass('E2 C3 A2 E2 A2 G2 D3 E2', [0, 7], 4) },
    ],
  },
  cave: {
    unit: 0.22, loop: true, tracks: [
      { wave: 'square', vol: 0.03, ev: seq('E4:2 R:2 F4:2 R:2 | E4:2 R:2 D4:4 | E4:2 R:2 G4:2 F4:2 | E4:8') },
      { wave: 'triangle', vol: 0.12, ev: bass('E2 D2 C2 E2', [0, 0, 1, 0], 2) },
    ],
  },
  combat: {
    unit: 0.1, loop: true, tracks: [
      { wave: 'square', vol: 0.045, ev: seq('D5:1 D5:1 R:1 D5:1 C5:1 D5:1 F5:2 | E5:1 E5:1 R:1 E5:1 D5:1 C5:1 A4:2 | D5:1 D5:1 R:1 D5:1 C5:1 D5:1 F5:1 G5:1 | A5:2 G5:1 F5:1 E5:2 C#5:2') },
      { wave: 'triangle', vol: 0.13, ev: bass('D2 C3 D2 A2', [0, 12], 1) },
    ],
  },
  victory: {
    unit: 0.12, loop: false, tracks: [
      { wave: 'square', vol: 0.05, ev: seq('C5:2 C5:1 C5:1 C5:2 G4:2 | A4:2 B4:2 C5:4 | R:2 E5:2 G5:4 | C6:8') },
      { wave: 'triangle', vol: 0.12, ev: bass('C3 F2 G2 C3', [0, 7, 12, 7], 2) },
    ],
  },
  death: {
    unit: 0.2, loop: false, tracks: [
      { wave: 'square', vol: 0.045, ev: seq('C5:4 B4:4 | Bb4:4 A4:4 | Ab4:4 G4:4 | C4:8') },
      { wave: 'triangle', vol: 0.1, ev: bass('C3 Bb2 Ab2 C2', [0], 8) },
    ],
  },
};

class Audio {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  enabled = true;
  current = '';
  private timer: number | null = null;
  private pos: { i: number; t: number }[] = [];
  private song: Song | null = null;
  private noiseBuf: AudioBuffer | null = null;

  /** Must be called from a user gesture before anything is audible. */
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? 1 : 0;
      this.master.connect(this.ctx.destination);
      const n = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.5, this.ctx.sampleRate);
      const d = n.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = n;
      if (this.current) { const c = this.current; this.current = ''; this.music(c); }
    } catch { this.ctx = null; }
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.master) this.master.gain.value = this.enabled ? 1 : 0;
    return this.enabled;
  }

  music(name: string) {
    if (name === this.current) return;
    this.current = name;
    this.stopMusic();
    const song = SONGS[name];
    if (!song || !this.ctx) return;
    this.song = song;
    const start = this.ctx.currentTime + 0.08;
    this.pos = song.tracks.map(() => ({ i: 0, t: start }));
    this.timer = window.setInterval(() => this.pump(), 40);
    this.pump();
  }

  stopMusic() {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    this.song = null;
  }

  private pump() {
    const ctx = this.ctx, song = this.song;
    if (!ctx || !song) return;
    const horizon = ctx.currentTime + 0.25;
    let finished = true;
    song.tracks.forEach((tr, k) => {
      const p = this.pos[k];
      while (p.t < horizon) {
        if (p.i >= tr.ev.length) {
          if (!song.loop) break;
          p.i = 0;
        }
        const [f, d] = tr.ev[p.i++];
        const dur = d * song.unit;
        if (f > 0) this.note(tr.wave, f, p.t, dur * 0.92, tr.vol);
        p.t += dur;
      }
      if (p.i < tr.ev.length || song.loop) finished = false;
    });
    if (finished) this.stopMusic();
  }

  private note(wave: OscillatorType, f: number, t: number, dur: number, vol: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = wave;
    o.frequency.value = f;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.setValueAtTime(vol, t + Math.max(0.01, dur - 0.03));
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private sweep(wave: OscillatorType, f0: number, f1: number, dur: number, vol: number, delay = 0) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol: number, hp = 800) {
    const ctx = this.ctx;
    if (!ctx || !this.noiseBuf) return;
    const s = ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = hp;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f).connect(g).connect(this.master!);
    s.start(t);
    s.stop(t + dur);
  }

  sfx(name: string) {
    if (!this.ctx) return;
    switch (name) {
      case 'hit': this.noise(0.1, 0.25, 400); this.sweep('square', 180, 60, 0.12, 0.08); break;
      case 'miss': this.sweep('triangle', 900, 200, 0.14, 0.1); break;
      case 'block': this.sweep('square', 1400, 1100, 0.06, 0.06); this.sweep('square', 2100, 1800, 0.08, 0.04, 0.03); break;
      case 'hurt': this.sweep('square', 240, 70, 0.25, 0.09); this.noise(0.08, 0.15, 200); break;
      case 'spell': this.sweep('sine', 300, 1600, 0.35, 0.12); this.sweep('square', 600, 2400, 0.3, 0.03, 0.05); break;
      case 'fire': this.noise(0.35, 0.2, 300); this.sweep('sawtooth', 400, 90, 0.35, 0.05); break;
      case 'coin': this.sweep('square', 988, 988, 0.07, 0.06); this.sweep('square', 1319, 1319, 0.18, 0.06, 0.07); break;
      case 'door': this.noise(0.18, 0.12, 120); this.sweep('triangle', 110, 70, 0.2, 0.12); break;
      case 'point':
        ['C5', 'E5', 'G5', 'C6'].forEach((n, i) => this.sweep('square', freq(n), freq(n), 0.09, 0.05, i * 0.07));
        break;
      case 'step': this.noise(0.03, 0.03, 1500); break;
      case 'fall': this.sweep('triangle', 800, 60, 0.5, 0.12); this.noise(0.15, 0.2, 100); break;
    }
  }
}

export const AUDIO = new Audio();
