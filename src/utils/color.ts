export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Parses #rgb, #rgba, #rrggbb, #rrggbbaa. Returns null when invalid. */
export function parseHex(input: string): Rgba | null {
  const m = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(input.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length <= 4) h = [...h].map((c) => c + c).join('');
  const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
  return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function toHex({ r, g, b }: Rgba): string {
  return '#' + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const c = parseHex(hex) ?? { r: 0, g: 0, b: 0, a: 1 };
  const r = c.r / 255, g = c.g / 255, b = c.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return { h, s, l };
}

export function hslToHex(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return toHex({ r: f(0) * 255, g: f(8) * 255, b: f(4) * 255, a: 1 });
}

export function shiftHue(hex: string, degrees: number): string {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex((h + degrees + 360) % 360, s, l);
}

/** Endpoints of a linear gradient line for a CSS-style angle (0deg = to top). */
export function gradientEndpoints(size: number, angleDeg: number): { x0: number; y0: number; x1: number; y1: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  const c = size / 2;
  const half = (size / 2) * (Math.abs(Math.cos(rad)) + Math.abs(Math.sin(rad)));
  return {
    x0: c - Math.cos(rad) * half,
    y0: c - Math.sin(rad) * half,
    x1: c + Math.cos(rad) * half,
    y1: c + Math.sin(rad) * half,
  };
}
