import type { GlyphStyle, IconItem } from '@/types';
import { tintSvg } from './ingestion';

export interface GlyphRaster {
  bitmap: ImageBitmap | null;
  svg: string | null;
}

const RASTER_PX = 512;
const MAX_CACHE = 400;
const cache = new Map<string, Promise<GlyphRaster>>();

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode image'));
    img.src = url;
  });
}

function withSvgSize(svg: string, px: number): string {
  return svg.replace(/<svg\b/, `<svg width="${px}" height="${px}"`);
}

function colorize(ctx: OffscreenCanvasRenderingContext2D, px: number, g: GlyphStyle): void {
  if (g.mode === 'original') return;
  ctx.globalCompositeOperation = 'source-in';
  if (g.mode === 'dual-tone') {
    const grad = ctx.createLinearGradient(0, 0, px, px);
    grad.addColorStop(0, g.tintColor);
    grad.addColorStop(1, g.secondaryTintColor ?? g.tintColor);
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = g.tintColor;
  }
  ctx.fillRect(0, 0, px, px);
  ctx.globalCompositeOperation = 'source-over';
}

async function build(icon: IconItem, g: GlyphStyle): Promise<GlyphRaster> {
  const canvas = new OffscreenCanvas(RASTER_PX, RASTER_PX);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  let svg: string | null = null;

  if (icon.sourceType === 'svg') {
    svg = g.mode === 'original' ? icon.rawPayload : tintSvg(icon.rawPayload, g.tintColor);
    const url = URL.createObjectURL(new Blob([withSvgSize(svg, RASTER_PX)], { type: 'image/svg+xml' }));
    try {
      ctx.drawImage(await loadImage(url), 0, 0, RASTER_PX, RASTER_PX);
    } finally {
      URL.revokeObjectURL(url);
    }
  } else {
    const src = await createImageBitmap(await (await fetch(icon.rawPayload)).blob());
    const k = Math.min(RASTER_PX / src.width, RASTER_PX / src.height);
    const w = src.width * k, h = src.height * k;
    ctx.drawImage(src, (RASTER_PX - w) / 2, (RASTER_PX - h) / 2, w, h);
    src.close();
  }
  colorize(ctx, RASTER_PX, g);
  return { bitmap: canvas.transferToImageBitmap(), svg };
}

/** Rasterizes (and tints) a glyph on the main thread; results are memoized. */
export function rasterizeGlyph(icon: IconItem, g: GlyphStyle): Promise<GlyphRaster> {
  const key = [icon.id, icon.rawPayload.length, g.mode, g.tintColor, g.secondaryTintColor].join('|');
  let hit = cache.get(key);
  if (!hit) {
    if (cache.size >= MAX_CACHE) {
      const oldest = cache.keys().next().value as string;
      void cache.get(oldest)?.then((r) => r.bitmap?.close());
      cache.delete(oldest);
    }
    hit = build(icon, g);
    cache.set(key, hit);
    hit.catch(() => cache.delete(key));
  }
  return hit;
}
