import { describe, it, expect } from 'vitest';
import { parseHex, toHex, hexToHsl, hslToHex, shiftHue, gradientEndpoints } from '@/utils/color';

describe('parseHex', () => {
  it('parses 3, 4, 6 and 8 digit forms', () => {
    expect(parseHex('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseHex('#1a2b3c')).toEqual({ r: 26, g: 43, b: 60, a: 1 });
    expect(parseHex('#f008')).toMatchObject({ r: 255, g: 0, b: 0 });
    expect(parseHex('#f008')!.a).toBeCloseTo(0x88 / 255);
    expect(parseHex('#00000000')!.a).toBe(0);
  });
  it('trims whitespace and is case-insensitive', () => {
    expect(parseHex('  #ABCDEF ')).toEqual({ r: 171, g: 205, b: 239, a: 1 });
  });
  it('returns null for invalid input', () => {
    for (const bad of ['', 'fff', '#ff', '#fffff', '#ggg', '#1234567', 'red']) expect(parseHex(bad)).toBeNull();
  });
});

describe('toHex', () => {
  it('rounds, clamps and pads', () => {
    expect(toHex({ r: 0, g: 5, b: 255, a: 1 })).toBe('#0005ff');
    expect(toHex({ r: -10, g: 300, b: 127.6, a: 1 })).toBe('#00ff80');
  });
  it('roundtrips with parseHex', () => {
    expect(toHex(parseHex('#12ab9f')!)).toBe('#12ab9f');
  });
});

describe('hsl conversion', () => {
  it('converts primaries', () => {
    expect(hexToHsl('#ff0000')).toMatchObject({ h: 0, s: 1, l: 0.5 });
    expect(hexToHsl('#00ff00').h).toBeCloseTo(120);
    expect(hexToHsl('#0000ff').h).toBeCloseTo(240);
  });
  it('greys have zero saturation', () => {
    expect(hexToHsl('#808080')).toMatchObject({ h: 0, s: 0 });
  });
  it('invalid hex falls back to black', () => {
    expect(hexToHsl('nope')).toEqual({ h: 0, s: 0, l: 0 });
  });
  it('roundtrips hex -> hsl -> hex', () => {
    for (const hex of ['#336699', '#ff8800', '#0f172a', '#f8fafc', '#7f1d1d']) {
      const { h, s, l } = hexToHsl(hex);
      expect(hslToHex(h, s, l)).toBe(hex);
    }
  });
  it('hslToHex produces known colors', () => {
    expect(hslToHex(0, 1, 0.5)).toBe('#ff0000');
    expect(hslToHex(240, 1, 0.5)).toBe('#0000ff');
    expect(hslToHex(0, 0, 1)).toBe('#ffffff');
  });
});

describe('shiftHue', () => {
  it('shifts red by 120 to green', () => {
    expect(shiftHue('#ff0000', 120)).toBe('#00ff00');
  });
  it('wraps around and handles negatives', () => {
    expect(shiftHue('#ff0000', 360)).toBe('#ff0000');
    expect(shiftHue('#ff0000', -120)).toBe('#0000ff');
  });
});

describe('gradientEndpoints', () => {
  it('0deg points to top (bottom -> top)', () => {
    const e = gradientEndpoints(100, 0);
    expect(e.x0).toBeCloseTo(50);
    expect(e.x1).toBeCloseTo(50);
    expect(e.y0).toBeCloseTo(100);
    expect(e.y1).toBeCloseTo(0);
  });
  it('90deg points right', () => {
    const e = gradientEndpoints(100, 90);
    expect(e.x0).toBeCloseTo(0);
    expect(e.x1).toBeCloseTo(100);
    expect(e.y0).toBeCloseTo(50);
  });
  it('135deg spans the full diagonal, centered', () => {
    const e = gradientEndpoints(100, 135);
    expect((e.x0 + e.x1) / 2).toBeCloseTo(50);
    expect((e.y0 + e.y1) / 2).toBeCloseTo(50);
    expect(e.x0).toBeCloseTo(0);
    expect(e.y0).toBeCloseTo(0);
    expect(e.x1).toBeCloseTo(100);
    expect(e.y1).toBeCloseTo(100);
  });
});
