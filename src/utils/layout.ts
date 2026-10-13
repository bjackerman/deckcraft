import type { BadgeStyle, GlyphStyle } from '@/types';
import { RENDER_REFERENCE_SIZE } from './constants';

export function pxScale(size: number): number {
  return size / RENDER_REFERENCE_SIZE;
}

/** Glyph placement for a canvas of `size` px; offsets are authored at the 288px reference size. */
export function glyphBox(size: number, g: GlyphStyle): { cx: number; cy: number; box: number; rotation: number } {
  const k = pxScale(size);
  return {
    cx: size / 2 + g.offsetX * k,
    cy: size / 2 + g.offsetY * k,
    box: size * g.scale,
    rotation: g.rotation,
  };
}

export interface BadgeAnchor {
  x: number;
  y: number;
  align: 'left' | 'right' | 'center';
}

export function badgeAnchor(position: BadgeStyle['position'], size: number): BadgeAnchor {
  const m = size * 0.06;
  switch (position) {
    case 'top-left':
      return { x: m, y: m, align: 'left' };
    case 'top-right':
      return { x: size - m, y: m, align: 'right' };
    case 'bottom-left':
      return { x: m, y: size - m, align: 'left' };
    case 'bottom-right':
      return { x: size - m, y: size - m, align: 'right' };
    case 'center-bottom':
      return { x: size / 2, y: size - m, align: 'center' };
  }
}

/** Pip circle center/radius at the top-right corner. */
export function pipGeometry(size: number): { x: number; y: number; r: number } {
  return { x: size * 0.8, y: size * 0.2, r: size * 0.075 };
}

/** Diagonal slash endpoints for muted/off toggle states. */
export function slashLine(size: number): { x0: number; y0: number; x1: number; y1: number; width: number } {
  return { x0: size * 0.22, y0: size * 0.2, x1: size * 0.78, y1: size * 0.8, width: size * 0.05 };
}
