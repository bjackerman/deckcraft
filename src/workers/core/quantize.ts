import { zlibSync } from 'fflate';

export interface IndexedImage {
  width: number;
  height: number;
  palette: Uint8Array; // r,g,b triplets
  alpha: Uint8Array; // one per palette entry
  indices: Uint8Array;
}

interface Entry {
  r: number;
  g: number;
  b: number;
  a: number;
  n: number;
}

function medianCut(entries: Entry[], maxColors: number): Entry[][] {
  const boxes: Entry[][] = [entries];
  const channels = ['r', 'g', 'b', 'a'] as const;
  while (boxes.length < maxColors) {
    let bi = -1, bestRange = 0, bestCh: (typeof channels)[number] = 'r';
    boxes.forEach((box, i) => {
      if (box.length < 2) return;
      for (const ch of channels) {
        let lo = 255, hi = 0;
        for (const e of box) {
          if (e[ch] < lo) lo = e[ch];
          if (e[ch] > hi) hi = e[ch];
        }
        if (hi - lo > bestRange) {
          bestRange = hi - lo;
          bi = i;
          bestCh = ch;
        }
      }
    });
    if (bi < 0) break;
    const box = boxes[bi].sort((x, y) => x[bestCh] - y[bestCh]);
    const total = box.reduce((s, e) => s + e.n, 0);
    let acc = 0, cut = 1;
    for (let i = 0; i < box.length - 1; i++) {
      acc += box[i].n;
      cut = i + 1;
      if (acc >= total / 2) break;
    }
    boxes.splice(bi, 1, box.slice(0, cut), box.slice(cut));
  }
  return boxes;
}

/** Reduces RGBA pixels to an ≤256-color palette using weighted median cut. */
export function quantizeRgba(data: ArrayLike<number>, width: number, height: number, maxColors = 256): IndexedImage {
  const counts = new Map<number, Entry>();
  const total = width * height;
  const keys = new Uint32Array(total);
  for (let i = 0; i < total; i++) {
    const o = i * 4;
    const a = data[o + 3];
    // Fully transparent pixels share one color regardless of RGB.
    const r = a === 0 ? 0 : data[o], g = a === 0 ? 0 : data[o + 1], b = a === 0 ? 0 : data[o + 2];
    const key = ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;
    keys[i] = key;
    const e = counts.get(key);
    if (e) e.n++;
    else counts.set(key, { r, g, b, a, n: 1 });
  }

  const boxes = medianCut([...counts.values()], maxColors);
  const palette = new Uint8Array(boxes.length * 3);
  const alpha = new Uint8Array(boxes.length);
  const lookup = new Map<number, number>();
  boxes.forEach((box, i) => {
    let n = 0, r = 0, g = 0, b = 0, a = 0;
    for (const e of box) {
      n += e.n;
      r += e.r * e.n;
      g += e.g * e.n;
      b += e.b * e.n;
      a += e.a * e.n;
      lookup.set(((e.r << 24) | (e.g << 16) | (e.b << 8) | e.a) >>> 0, i);
    }
    palette.set([Math.round(r / n), Math.round(g / n), Math.round(b / n)], i * 3);
    alpha[i] = Math.round(a / n);
  });

  const indices = new Uint8Array(total);
  for (let i = 0; i < total; i++) indices[i] = lookup.get(keys[i]) ?? 0;
  return { width, height, palette, alpha, indices };
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/** Encodes an 8-bit paletted PNG (color type 3) with a tRNS chunk when any entry is translucent. */
export function encodeIndexedPng(img: IndexedImage): Uint8Array {
  const { width, height, indices } = img;
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, width);
  dv.setUint32(4, height);
  ihdr.set([8, 3, 0, 0, 0], 8);

  const raw = new Uint8Array((width + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width + 1)] = 0;
    raw.set(indices.subarray(y * width, (y + 1) * width), y * (width + 1) + 1);
  }
  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('PLTE', img.palette),
  ];
  if (img.alpha.some((a) => a < 255)) parts.push(chunk('tRNS', img.alpha));
  parts.push(chunk('IDAT', zlibSync(raw, { level: 9 })), chunk('IEND', new Uint8Array(0)));

  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}
