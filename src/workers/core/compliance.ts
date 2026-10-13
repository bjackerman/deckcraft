import { LOGITECH_SAFE_BYTES } from '@/utils/constants';
import { encodeIndexedPng, quantizeRgba } from './quantize';

export interface Pixels {
  data: ArrayLike<number>;
  width: number;
  height: number;
}

export interface PngFitResult {
  bytes: Uint8Array;
  quantized: boolean;
  size: number;
}

export interface PngSource {
  /** Full-color PNG at the given pixel size. */
  encode(size: number): Promise<Uint8Array>;
  /** Raw RGBA pixels at the given pixel size. */
  pixels(size: number): Promise<Pixels>;
}

/**
 * Keeps a PNG under the byte budget: full-color → 8-bit palette → progressively smaller
 * palette renders (never below 144px), returning the smallest candidate if nothing fits.
 */
export async function fitPngUnderLimit(
  src: PngSource,
  size: number,
  limit = LOGITECH_SAFE_BYTES,
): Promise<PngFitResult> {
  const first = await src.encode(size);
  if (first.length <= limit) return { bytes: first, quantized: false, size };

  let best: PngFitResult | null = null;
  const sizes = [size, ...[0.75, 0.5].map((f) => Math.round(size * f)).filter((s) => s >= 144)];
  for (const s of sizes) {
    const px = await src.pixels(s);
    const bytes = encodeIndexedPng(quantizeRgba(px.data, px.width, px.height));
    const candidate = { bytes, quantized: true, size: s };
    if (!best || bytes.length < best.bytes.length) best = candidate;
    if (bytes.length <= limit) return candidate;
  }
  return best as PngFitResult;
}
