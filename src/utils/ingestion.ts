import type { IconItem } from '@/types';
import { sanitizeSvg } from './dompurify';

const SVG_NS = 'http://www.w3.org/2000/svg';
const COLOR_ATTRS = ['fill', 'stroke'] as const;
const NORMALIZED_SIZE = 100;

function parseSvg(svg: string): SVGSVGElement | null {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const root = doc.documentElement;
  if (!root || root.nodeName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) return null;
  return root as unknown as SVGSVGElement;
}

function readBox(root: Element): [number, number, number, number] {
  const vb = root.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number);
  if (vb && vb.length === 4 && vb.every(Number.isFinite) && vb[2] > 0 && vb[3] > 0) {
    return vb as [number, number, number, number];
  }
  const w = parseFloat(root.getAttribute('width') ?? '') || 24;
  const h = parseFloat(root.getAttribute('height') ?? '') || w;
  return [0, 0, w, h];
}

/**
 * Sanitizes, then normalizes to viewBox="0 0 100 100" (aspect preserved, centered),
 * strips pixel width/height and gives the root a currentColor fill if none is declared.
 */
export function normalizeSvg(input: string): string {
  const clean = sanitizeSvg(input);
  const root = parseSvg(clean);
  if (!root) throw new Error('Not a valid SVG document');
  const [vx, vy, vw, vh] = readBox(root);
  const s = NORMALIZED_SIZE / Math.max(vw, vh);
  const tx = (NORMALIZED_SIZE - vw * s) / 2 - vx * s;
  const ty = (NORMALIZED_SIZE - vh * s) / 2 - vy * s;

  const g = root.ownerDocument.createElementNS(SVG_NS, 'g');
  g.setAttribute('transform', `translate(${+tx.toFixed(4)} ${+ty.toFixed(4)}) scale(${+s.toFixed(6)})`);
  while (root.firstChild) g.appendChild(root.firstChild);
  root.appendChild(g);

  root.removeAttribute('width');
  root.removeAttribute('height');
  root.setAttribute('viewBox', `0 0 ${NORMALIZED_SIZE} ${NORMALIZED_SIZE}`);
  if (!root.getAttribute('xmlns')) root.setAttribute('xmlns', SVG_NS);
  if (!root.hasAttribute('fill') && !root.hasAttribute('stroke')) root.setAttribute('fill', 'currentColor');
  return new XMLSerializer().serializeToString(root);
}

/** Maps every concrete fill/stroke to currentColor and sets the root `color`, enabling palette swaps. */
export function tintSvg(svg: string, color: string): string {
  const root = parseSvg(svg);
  if (!root) return svg;
  const all = [root as Element, ...Array.from(root.querySelectorAll('*'))];
  for (const el of all) {
    for (const a of COLOR_ATTRS) {
      const v = el.getAttribute(a);
      if (v && v !== 'none' && !v.startsWith('url(')) el.setAttribute(a, 'currentColor');
    }
    const style = el.getAttribute('style');
    if (style) {
      el.setAttribute(
        'style',
        style.replace(/(fill|stroke)\s*:\s*(?!none|url)[^;]+/gi, '$1:currentColor'),
      );
    }
  }
  if (!root.hasAttribute('fill') && !root.hasAttribute('stroke')) root.setAttribute('fill', 'currentColor');
  root.setAttribute('color', color);
  return new XMLSerializer().serializeToString(root);
}

export interface IngestResult {
  icons: IconItem[];
  errors: { file: string; message: string }[];
}

export const MAX_BATCH = 100;
const RASTER_TYPES = new Set(['image/png', 'image/webp', 'image/jpeg', 'image/gif']);
const MAX_RASTER_DIM = 1024;

function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, '') || 'icon';
}

function readAsDataUri(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error('Read failed'));
    r.readAsDataURL(file);
  });
}

async function downscaleIfNeeded(file: Blob, dataUri: string): Promise<string> {
  if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas === 'undefined') return dataUri;
  const bmp = await createImageBitmap(file);
  try {
    const max = Math.max(bmp.width, bmp.height);
    if (max <= MAX_RASTER_DIM) return dataUri;
    const k = MAX_RASTER_DIM / max;
    const c = new OffscreenCanvas(Math.round(bmp.width * k), Math.round(bmp.height * k));
    c.getContext('2d')?.drawImage(bmp, 0, 0, c.width, c.height);
    return await readAsDataUri(await c.convertToBlob({ type: 'image/png' }));
  } finally {
    bmp.close();
  }
}

function newIcon(name: string, sourceType: IconItem['sourceType'], rawPayload: string): IconItem {
  return { id: crypto.randomUUID(), name, sourceType, rawPayload, isLocked: false };
}

export function svgTextToIcon(text: string, name: string): IconItem {
  return newIcon(name, 'svg', normalizeSvg(text));
}

export async function handleFileUpload(files: FileList | File[]): Promise<IngestResult> {
  const list = Array.from(files);
  const result: IngestResult = { icons: [], errors: [] };
  if (list.length > MAX_BATCH) {
    result.errors.push({ file: '*', message: `Only the first ${MAX_BATCH} files were imported` });
  }
  for (const file of list.slice(0, MAX_BATCH)) {
    try {
      const isSvg = file.type === 'image/svg+xml' || /\.svg$/i.test(file.name);
      if (isSvg) {
        result.icons.push(svgTextToIcon(await file.text(), baseName(file.name)));
      } else if (RASTER_TYPES.has(file.type)) {
        const uri = await downscaleIfNeeded(file, await readAsDataUri(file));
        result.icons.push(newIcon(baseName(file.name), 'raster', uri));
      } else {
        throw new Error('Unsupported file type');
      }
    } catch (e) {
      result.errors.push({ file: file.name, message: e instanceof Error ? e.message : 'Import failed' });
    }
  }
  return result;
}

/** Handles Ctrl/Cmd+V: image blobs or pasted SVG markup. */
export async function handlePaste(data: DataTransfer | null): Promise<IngestResult> {
  if (!data) return { icons: [], errors: [] };
  const files = Array.from(data.files).filter((f) => f.type.startsWith('image/'));
  if (files.length) {
    return handleFileUpload(files.map((f, i) => (f.name ? f : new File([f], `pasted-${i + 1}.png`, { type: f.type }))));
  }
  const text = data.getData('text/plain');
  if (/<svg[\s>]/i.test(text)) {
    try {
      return { icons: [svgTextToIcon(text, 'pasted-svg')], errors: [] };
    } catch (e) {
      return { icons: [], errors: [{ file: 'clipboard', message: e instanceof Error ? e.message : 'Invalid SVG' }] };
    }
  }
  return { icons: [], errors: [] };
}
