// Minimal PNG encode/decode (RGBA8, non-interlaced) for the art tools; no dependencies.
import { deflateSync, inflateSync } from 'node:zlib';

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf: Uint8Array) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

function chunk(type: string, data: Uint8Array) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  Buffer.from(data).copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

export function encodePNG(w: number, h: number, rgba: Uint8Array): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', new Uint8Array())]);
}

/** Decode 8-bit RGB/RGBA/grey PNGs (what image models return). */
export function decodePNG(buf: Buffer): { w: number; h: number; rgba: Uint8Array } {
  let p = 8, w = 0, h = 0, ct = 0, depth = 0;
  const idat: Buffer[] = [];
  let palette: Buffer | null = null;
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; ct = data[9]; if (data[12]) throw new Error('interlaced PNG not supported'); }
    else if (type === 'PLTE') palette = Buffer.from(data);
    else if (type === 'IDAT') idat.push(Buffer.from(data));
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  if (depth !== 8) throw new Error(`PNG bit depth ${depth} not supported`);
  const bpp = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ct as 0 | 2 | 3 | 4 | 6];
  if (!bpp) throw new Error(`PNG colour type ${ct} not supported`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * bpp, cur = Buffer.alloc(stride), prev = Buffer.alloc(stride);
  const rgba = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0, b = prev[x], c = x >= bpp ? prev[x - bpp] : 0;
      let v = raw[y * (stride + 1) + 1 + x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      cur[x] = v & 255;
    }
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4, i = x * bpp;
      if (ct === 6) { rgba[o] = cur[i]; rgba[o + 1] = cur[i + 1]; rgba[o + 2] = cur[i + 2]; rgba[o + 3] = cur[i + 3]; }
      else if (ct === 2) { rgba[o] = cur[i]; rgba[o + 1] = cur[i + 1]; rgba[o + 2] = cur[i + 2]; rgba[o + 3] = 255; }
      else if (ct === 3 && palette) { const k = cur[i] * 3; rgba[o] = palette[k]; rgba[o + 1] = palette[k + 1]; rgba[o + 2] = palette[k + 2]; rgba[o + 3] = 255; }
      else { rgba[o] = rgba[o + 1] = rgba[o + 2] = cur[i]; rgba[o + 3] = ct === 4 ? cur[i + 1] : 255; }
    }
    prev.set(cur);
  }
  return { w, h, rgba };
}

/** Convert a framebuffer of 0xRRGGBB (0x1000000 = transparent) to RGBA bytes. */
export function fbToRGBA(px: Uint32Array, bg = -1): Uint8Array {
  const out = new Uint8Array(px.length * 4);
  for (let i = 0; i < px.length; i++) {
    let c = px[i];
    const t = c === 0x1000000;
    if (t && bg >= 0) c = bg;
    out[i * 4] = (c >> 16) & 255; out[i * 4 + 1] = (c >> 8) & 255; out[i * 4 + 2] = c & 255; out[i * 4 + 3] = t && bg < 0 ? 0 : 255;
  }
  return out;
}
