import { describe, it, expect } from 'vitest';
import { unzlibSync } from 'fflate';
import type { GlyphStyle, IconStyle } from '@/types';
import { DEFAULT_STYLE, LOGITECH_SAFE_BYTES } from '@/utils/constants';
import { badgeAnchor, glyphBox, pipGeometry, slashLine, pxScale } from '@/utils/layout';
import { buildIconSvg } from '@/utils/svgExport';
import { planExport } from '@/workers/core/exportPlan';
import { crc32, encodeIndexedPng, quantizeRgba } from '@/workers/core/quantize';
import { fitPngUnderLimit, type PngSource } from '@/workers/core/compliance';

const style = (patch: (s: IconStyle) => void = () => {}): IconStyle => {
  const s = structuredClone(DEFAULT_STYLE);
  patch(s);
  return s;
};

describe('layout', () => {
  const g: GlyphStyle = { ...DEFAULT_STYLE.glyph, scale: 0.5, offsetX: 10, offsetY: -20, rotation: 15 };
  it('glyphBox scales offsets from the 288 reference', () => {
    expect(pxScale(144)).toBe(0.5);
    expect(glyphBox(288, g)).toEqual({ cx: 154, cy: 124, box: 144, rotation: 15 });
    expect(glyphBox(144, g)).toEqual({ cx: 77, cy: 62, box: 72, rotation: 15 });
  });
  it('badgeAnchor covers all positions', () => {
    const m = 100 * 0.06;
    expect(badgeAnchor('top-left', 100)).toEqual({ x: m, y: m, align: 'left' });
    expect(badgeAnchor('top-right', 100)).toEqual({ x: 100 - m, y: m, align: 'right' });
    expect(badgeAnchor('bottom-left', 100)).toEqual({ x: m, y: 100 - m, align: 'left' });
    expect(badgeAnchor('bottom-right', 100)).toEqual({ x: 100 - m, y: 100 - m, align: 'right' });
    expect(badgeAnchor('center-bottom', 100)).toEqual({ x: 50, y: 100 - m, align: 'center' });
  });
  it('pip and slash geometry are proportional to size', () => {
    expect(pipGeometry(200)).toEqual({ x: 160, y: 40, r: 15 });
    const s = slashLine(100);
    expect(s.x0).toBeLessThan(s.x1);
    expect(s.y0).toBeLessThan(s.y1);
    expect(s.width).toBeCloseTo(5);
  });
});

describe('buildIconSvg', () => {
  const glyphSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" color="#fff"><path d="M0 0h100v100z" fill="currentColor"/></svg>';
  const parse = (s: string) => new DOMParser().parseFromString(s, 'image/svg+xml');

  it('is well-formed SVG with the requested size', () => {
    const svg = buildIconSvg(style(), { svg: glyphSvg }, 144);
    const doc = parse(svg);
    expect(doc.querySelector('parsererror')).toBeNull();
    const root = doc.documentElement;
    expect(root.nodeName).toBe('svg');
    expect(root.getAttribute('width')).toBe('144');
    expect(root.getAttribute('height')).toBe('144');
    expect(root.getAttribute('viewBox')).toBe('0 0 144 144');
  });
  it('defaults to 288 and places the glyph in a nested svg', () => {
    const svg = buildIconSvg(style(), { svg: `<?xml version="1.0"?>${glyphSvg}` });
    expect(svg).toContain('viewBox="0 0 288 288"');
    expect(svg).not.toContain('<?xml');
    const nested = parse(svg).querySelectorAll('svg svg');
    expect(nested).toHaveLength(1);
    expect(nested[0].getAttribute('width')).toBe(String(288 * 0.58));
  });
  it('uses a linear gradient with both stop colors', () => {
    const svg = buildIconSvg(style(), {});
    expect(svg).toContain('<linearGradient id="dc-bg"');
    expect(svg).toContain('stop-color="#1e293b"');
    expect(svg).toContain('stop-color="#0f172a"');
    expect(svg).toContain('url(#dc-bg)');
  });
  it('uses solid fill, radial gradient, glass and transparent variants', () => {
    const solid = buildIconSvg(style((s) => (s.background.type = 'solid')), {});
    expect(solid).not.toContain('dc-bg"');
    expect(solid).toContain('fill="#1e293b"');
    expect(buildIconSvg(style((s) => (s.background.type = 'radial-gradient')), {})).toContain('<radialGradient');
    expect(buildIconSvg(style((s) => (s.background.type = 'glass')), {})).toContain('dc-gloss');
    const t = buildIconSvg(style((s) => (s.background.type = 'transparent')), { svg: glyphSvg });
    expect(t).not.toContain('clip-path="url(#dc-clip)"');
    expect(t).not.toContain('fill="#1e293b"');
  });
  it('adds a slash only when enabled', () => {
    expect(buildIconSvg(style(), { svg: glyphSvg })).not.toContain('<line ');
    const svg = buildIconSvg(style((s) => (s.glyph.slash = true)), { svg: glyphSvg });
    expect(svg.match(/<line /g)).toHaveLength(2);
    expect(svg).toContain(`stroke="${DEFAULT_STYLE.glyph.tintColor}"`);
  });
  it('renders badge text (escaped) and pip', () => {
    const svg = buildIconSvg(
      style((s) => {
        s.badge.enabled = true;
        s.badge.text = 'A<B&"';
        s.badge.pipColor = '#ef4444';
      }),
      {},
    );
    expect(parse(svg).querySelector('parsererror')).toBeNull();
    expect(svg).toContain('A&lt;B&amp;&quot;');
    expect(svg).toContain('<circle');
    expect(svg).toContain('#ef4444');
    expect(svg).toContain('<text');
    expect(buildIconSvg(style(), {})).not.toContain('<text');
  });
  it('does not render a badge when disabled even with text', () => {
    const svg = buildIconSvg(style((s) => (s.badge.text = 'X')), {});
    expect(svg).not.toContain('<text');
  });
  it('embeds raster glyphs as image', () => {
    const uri = 'data:image/png;base64,AAAA';
    const svg = buildIconSvg(style(), { pngDataUri: uri });
    expect(svg).toContain('<image');
    expect(svg).toContain(uri);
  });
  it('applies rotation and shadow filters', () => {
    const svg = buildIconSvg(style((s) => ((s.glyph.rotation = 45), (s.background.shadowBlur = 8))), { svg: glyphSvg });
    expect(svg).toContain('rotate(45');
    expect(svg).toContain('dc-bgshadow');
    expect(svg).toContain('dc-gshadow');
  });
  it('contains no numbers with more than 2 decimals (optimized)', () => {
    expect(buildIconSvg(style(), { svg: glyphSvg })).not.toMatch(/\d\.\d{3,}/);
  });
});

describe('planExport', () => {
  it('logitech: 288 png + svg, both limited', () => {
    const p = planExport('logitech', 0);
    expect(p.map((e) => [e.ext, e.size, e.limited])).toEqual([['png', 288, true], ['svg', 288, true]]);
  });
  it('elgato: 144 and 288@2x', () => {
    expect(planExport('elgato', 0).map((e) => e.size)).toEqual([144, 288]);
    expect(planExport('elgato', 0).every((e) => !e.limited && e.ext === 'png')).toBe(true);
  });
  it('loupedeck: 90, 120 and svg', () => {
    expect(planExport('loupedeck', 0).map((e) => `${e.ext}${e.size}`)).toEqual(['png90', 'png120', 'svg120']);
  });
  it('universal clamps custom size to 64..1024 and rounds', () => {
    expect(planExport('universal', 10)[0].size).toBe(64);
    expect(planExport('universal', 5000)[0].size).toBe(1024);
    const e = planExport('universal', 255.6)[0];
    expect(e.size).toBe(256);
    expect(e.dir).toBe('universal/256x256');
  });
});

function readChunks(png: Uint8Array) {
  const dv = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const chunks: { type: string; data: Uint8Array; crc: number; crcOk: boolean }[] = [];
  let o = 8;
  while (o < png.length) {
    const len = dv.getUint32(o);
    const type = String.fromCharCode(...png.subarray(o + 4, o + 8));
    const data = png.subarray(o + 8, o + 8 + len);
    const crc = dv.getUint32(o + 8 + len);
    chunks.push({ type, data, crc, crcOk: crc32(png.subarray(o + 4, o + 8 + len)) === crc });
    o += 12 + len;
  }
  return chunks;
}

function gradientPixels(w: number, h: number, alpha = 255) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      data[o] = (x * 255) / (w - 1);
      data[o + 1] = (y * 255) / (h - 1);
      data[o + 2] = ((x + y) * 255) / (w + h - 2);
      data[o + 3] = alpha;
    }
  return { data, width: w, height: h };
}

// Few unique colors (fast to quantize) but noisy, so PNG size scales with area.
function noisePixels(w: number, h: number) {
  const data = new Uint8ClampedArray(w * h * 4);
  let seed = 12345;
  for (let i = 0; i < w * h; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    data[i * 4] = ((seed >>> 8) & 15) * 17;
    data[i * 4 + 1] = ((seed >>> 12) & 15) * 17;
    data[i * 4 + 2] = ((seed >>> 16) & 15) * 17;
    data[i * 4 + 3] = 255;
  }
  return { data, width: w, height: h };
}

describe('crc32', () => {
  it('matches known vectors', () => {
    expect(crc32(new TextEncoder().encode('IEND'))).toBe(0xae426082);
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array(0))).toBe(0);
  });
});

describe('quantizeRgba', () => {
  it('keeps exact colors when under the palette limit', () => {
    const data = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255, 255, 0, 0, 255, 0, 0, 255, 128]);
    const q = quantizeRgba(data, 4, 1);
    expect(q.palette.length / 3).toBe(3);
    const px = [...q.indices].map((i) => [q.palette[i * 3], q.palette[i * 3 + 1], q.palette[i * 3 + 2], q.alpha[i]]);
    expect(px).toEqual([[255, 0, 0, 255], [0, 255, 0, 255], [255, 0, 0, 255], [0, 0, 255, 128]]);
  });
  it('reduces a gradient to at most 256 colors with valid indices', () => {
    const { data, width, height } = gradientPixels(64, 64);
    const q = quantizeRgba(data, width, height);
    const n = q.palette.length / 3;
    expect(n).toBeLessThanOrEqual(256);
    expect(n).toBeGreaterThan(50);
    expect(q.indices).toHaveLength(64 * 64);
    expect(Math.max(...q.indices)).toBeLessThan(n);
  });
  it('respects maxColors and collapses transparent pixels', () => {
    const { data, width, height } = gradientPixels(32, 32);
    expect(quantizeRgba(data, width, height, 8).palette.length / 3).toBeLessThanOrEqual(8);
    const t = new Uint8Array([10, 20, 30, 0, 200, 100, 50, 0]);
    const q = quantizeRgba(t, 2, 1);
    expect(q.palette.length / 3).toBe(1);
    expect(q.alpha[0]).toBe(0);
  });
});

describe('encodeIndexedPng', () => {
  const { data, width, height } = gradientPixels(40, 30, 200);
  const png = encodeIndexedPng(quantizeRgba(data, width, height));
  const chunks = readChunks(png);

  it('has the PNG signature and chunk order', () => {
    expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(chunks.map((c) => c.type)).toEqual(['IHDR', 'PLTE', 'tRNS', 'IDAT', 'IEND']);
  });
  it('has a correct IHDR', () => {
    const dv = new DataView(chunks[0].data.buffer, chunks[0].data.byteOffset);
    expect(dv.getUint32(0)).toBe(40);
    expect(dv.getUint32(4)).toBe(30);
    expect([...chunks[0].data.subarray(8)]).toEqual([8, 3, 0, 0, 0]);
  });
  it('has a palette multiple of 3, matching tRNS, and valid CRCs', () => {
    const plte = chunks[1].data;
    expect(plte.length % 3).toBe(0);
    expect(chunks[2].data.length).toBe(plte.length / 3);
    expect(chunks.every((c) => c.crcOk)).toBe(true);
    expect(chunks[4].crc).toBe(0xae426082);
    expect(chunks[4].data.length).toBe(0);
  });
  it('IDAT inflates to (width+1)*height bytes with filter 0', () => {
    const raw = unzlibSync(chunks[3].data);
    expect(raw.length).toBe((40 + 1) * 30);
    for (let y = 0; y < 30; y++) expect(raw[y * 41]).toBe(0);
  });
  it('omits tRNS for fully opaque images', () => {
    const opaque = gradientPixels(8, 8, 255);
    const c = readChunks(encodeIndexedPng(quantizeRgba(opaque.data, 8, 8)));
    expect(c.map((x) => x.type)).toEqual(['IHDR', 'PLTE', 'IDAT', 'IEND']);
  });
});

describe('fitPngUnderLimit', () => {
  const make = (fullBytes: (size: number) => number) => {
    const calls = { encode: [] as number[], pixels: [] as number[] };
    const src: PngSource = {
      async encode(size) {
        calls.encode.push(size);
        return new Uint8Array(fullBytes(size));
      },
      async pixels(size) {
        calls.pixels.push(size);
        return noisePixels(size, size);
      },
    };
    return { src, calls };
  };

  it('returns full-color when under the limit', async () => {
    const { src, calls } = make(() => 1000);
    const r = await fitPngUnderLimit(src, 288, 5000);
    expect(r).toMatchObject({ quantized: false, size: 288 });
    expect(r.bytes.length).toBe(1000);
    expect(calls.pixels).toEqual([]);
  });
  it('treats exactly the limit as fitting', async () => {
    const { src } = make(() => 5000);
    expect((await fitPngUnderLimit(src, 288, 5000)).quantized).toBe(false);
  });
  it('quantizes at full size when over the limit', async () => {
    const { src, calls } = make(() => 10_000_000);
    const r = await fitPngUnderLimit(src, 144, LOGITECH_SAFE_BYTES);
    expect(r.quantized).toBe(true);
    expect(r.size).toBe(144);
    expect(r.bytes.length).toBeLessThanOrEqual(LOGITECH_SAFE_BYTES);
    expect([...r.bytes.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
    expect(calls.pixels).toEqual([144]);
  });
  it('shrinks when quantization at full size is still too large', async () => {
    const { src, calls } = make(() => 10_000_000);
    const full = encodeIndexedPng(quantizeRgba(noisePixels(288, 288).data, 288, 288)).length;
    const half = encodeIndexedPng(quantizeRgba(noisePixels(216, 216).data, 216, 216)).length;
    expect(half).toBeLessThan(full);
    const limit = Math.floor((full + half) / 2);
    const r = await fitPngUnderLimit(src, 288, limit);
    expect(r.quantized).toBe(true);
    expect(r.size).toBeLessThan(288);
    expect(r.bytes.length).toBeLessThanOrEqual(limit);
    expect(calls.pixels[0]).toBe(288);
    expect(calls.pixels.length).toBeGreaterThan(1);
  });
  it('never goes below 144px and returns the smallest candidate if nothing fits', async () => {
    const { src, calls } = make(() => 10_000_000);
    const r = await fitPngUnderLimit(src, 288, 10);
    expect(r.quantized).toBe(true);
    expect(calls.pixels).toEqual([288, 216, 144]);
    expect(r.size).toBe(144);
    const small = await fitPngUnderLimit(make(() => 10_000_000).src, 160, 10);
    expect(small.size).toBe(160);
  });
});
