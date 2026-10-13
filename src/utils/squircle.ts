import type { ShapeGeometry } from '@/types';

/** Cubic-bezier handle factor approximating the superellipse x^4 + y^4 = r^4 (matches the 45° midpoint). */
export const SQUIRCLE_K = 0.909;
/** Standard circular-arc cubic handle factor. */
export const ARC_K = 0.5522847498;

const f = (n: number) => Number(n.toFixed(3)).toString();

/** Quarter-turn superellipse path in a size×size box, inset by `inset` px. Returns an SVG path `d`. */
export function squirclePath(size: number, inset = 0): string {
  const c = size / 2;
  const r = c - inset;
  const k = SQUIRCLE_K * r;
  const pts = (x: number, y: number) => `${f(c + x)} ${f(c + y)}`;
  return [
    `M ${pts(r, 0)}`,
    `C ${pts(r, k)} ${pts(k, r)} ${pts(0, r)}`,
    `C ${pts(-k, r)} ${pts(-r, k)} ${pts(-r, 0)}`,
    `C ${pts(-r, -k)} ${pts(-k, -r)} ${pts(0, -r)}`,
    `C ${pts(k, -r)} ${pts(r, -k)} ${pts(r, 0)}`,
    'Z',
  ].join(' ');
}

export function roundedRectPath(size: number, radiusPct: number, inset = 0): string {
  const w = size - inset * 2;
  const r = Math.min(Math.max(radiusPct, 0), 50) / 100 * w;
  const x0 = inset, y0 = inset, x1 = size - inset, y1 = size - inset;
  if (r <= 0) return `M ${f(x0)} ${f(y0)} L ${f(x1)} ${f(y0)} L ${f(x1)} ${f(y1)} L ${f(x0)} ${f(y1)} Z`;
  const k = ARC_K * r;
  return [
    `M ${f(x0 + r)} ${f(y0)}`,
    `L ${f(x1 - r)} ${f(y0)}`,
    `C ${f(x1 - r + k)} ${f(y0)} ${f(x1)} ${f(y0 + r - k)} ${f(x1)} ${f(y0 + r)}`,
    `L ${f(x1)} ${f(y1 - r)}`,
    `C ${f(x1)} ${f(y1 - r + k)} ${f(x1 - r + k)} ${f(y1)} ${f(x1 - r)} ${f(y1)}`,
    `L ${f(x0 + r)} ${f(y1)}`,
    `C ${f(x0 + r - k)} ${f(y1)} ${f(x0)} ${f(y1 - r + k)} ${f(x0)} ${f(y1 - r)}`,
    `L ${f(x0)} ${f(y0 + r)}`,
    `C ${f(x0)} ${f(y0 + r - k)} ${f(x0 + r - k)} ${f(y0)} ${f(x0 + r)} ${f(y0)}`,
    'Z',
  ].join(' ');
}

export function hexagonPath(size: number, inset = 0): string {
  const c = size / 2;
  const r = c - inset;
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${f(c + r * Math.cos(a))} ${f(c + r * Math.sin(a))}`;
  });
  return `M ${pts.join(' L ')} Z`;
}

export function shapePath(shape: ShapeGeometry, size: number, radiusPct: number, inset = 0): string {
  switch (shape) {
    case 'square':
      return roundedRectPath(size, 0, inset);
    case 'rounded':
      return roundedRectPath(size, radiusPct, inset);
    case 'circle':
      return roundedRectPath(size, 50, inset);
    case 'hexagon':
      return hexagonPath(size, inset);
    case 'squircle':
      return squirclePath(size, inset);
  }
}

/** Superellipse radius for a given angle; useful for verifying bounds. */
export function superellipsePoint(angle: number, r: number, n = 4): { x: number; y: number } {
  const c = Math.cos(angle), s = Math.sin(angle);
  const d = Math.pow(Math.abs(c) ** n + Math.abs(s) ** n, 1 / n);
  return { x: (r * c) / d, y: (r * s) / d };
}
