import { describe, it, expect } from 'vitest';
import type { ShapeGeometry } from '@/types';
import { shapePath, squirclePath, superellipsePoint, SQUIRCLE_K } from '@/utils/squircle';

const SHAPES: ShapeGeometry[] = ['square', 'rounded', 'squircle', 'circle', 'hexagon'];

function numbers(d: string): number[] {
  return (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
}

describe('shapePath', () => {
  for (const shape of SHAPES) {
    for (const inset of [0, 6]) {
      it(`${shape} (inset ${inset}) starts with M, ends with Z and stays in the box`, () => {
        const size = 288;
        const d = shapePath(shape, size, 22, inset);
        expect(d.startsWith('M')).toBe(true);
        expect(d.trim().endsWith('Z')).toBe(true);
        const nums = numbers(d);
        expect(nums.length).toBeGreaterThan(0);
        // All coordinates are x/y pairs (no arc flags), so every number is in [inset, size-inset] ± epsilon.
        for (const n of nums) {
          expect(n).toBeGreaterThanOrEqual(inset - 0.01);
          expect(n).toBeLessThanOrEqual(size - inset + 0.01);
        }
      });
    }
  }

  it('square has no curves; rounded/circle do', () => {
    expect(shapePath('square', 100, 30)).not.toContain('C');
    expect(shapePath('rounded', 100, 30)).toContain('C');
    expect(shapePath('circle', 100, 30)).toContain('C');
  });

  it('clamps radius percentage', () => {
    expect(shapePath('rounded', 100, 500)).toBe(shapePath('circle', 100, 0));
    expect(shapePath('rounded', 100, -5)).toBe(shapePath('square', 100, 0));
  });

  it('hexagon has 6 vertices', () => {
    const d = shapePath('hexagon', 100, 0);
    expect(d.match(/L/g)).toHaveLength(5);
  });

  it('squirclePath touches the extreme points', () => {
    const d = squirclePath(100);
    expect(d.startsWith('M 100 50')).toBe(true);
    expect(d).toContain('50 100');
    expect(d).toContain('0 50');
    expect(d).toContain('50 0');
  });
});

describe('superellipsePoint', () => {
  it('satisfies |x|^4 + |y|^4 = r^4', () => {
    const r = 50;
    for (let a = 0; a < Math.PI * 2; a += 0.17) {
      const { x, y } = superellipsePoint(a, r);
      expect(Math.abs(x) ** 4 + Math.abs(y) ** 4).toBeCloseTo(r ** 4, 0);
    }
  });
  it('hits axis extremes and stays within the radius box', () => {
    const p = superellipsePoint(0, 40);
    expect(p.x).toBeCloseTo(40);
    expect(p.y).toBeCloseTo(0);
    for (let a = 0; a < Math.PI * 2; a += 0.1) {
      const q = superellipsePoint(a, 40);
      expect(Math.abs(q.x)).toBeLessThanOrEqual(40 + 1e-9);
      expect(Math.abs(q.y)).toBeLessThanOrEqual(40 + 1e-9);
    }
  });
  it('is rounder than a circle at 45deg (corner pushed outward)', () => {
    const p = superellipsePoint(Math.PI / 4, 100);
    expect(Math.hypot(p.x, p.y)).toBeGreaterThan(100);
  });
  it('bezier approximation midpoint is close to the true superellipse', () => {
    // Cubic from (r,0) to (0,r) with handles (r,kr),(kr,r): midpoint at t=.5
    const r = 100, k = SQUIRCLE_K * r;
    const mid = (r + 3 * r + 3 * k + 0) / 8; // x(t=.5) = (P0 + 3P1 + 3P2 + P3)/8
    const truth = superellipsePoint(Math.PI / 4, r).x;
    expect(Math.abs(mid - truth)).toBeLessThan(2);
  });
});
