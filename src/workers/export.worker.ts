import { zipSync, strToU8 } from 'fflate';
import type { AuditEntry, RenderItem, WorkerRequest, WorkerResponse } from '@/types';
import { LOGITECH_SAFE_BYTES } from '@/utils/constants';
import { applyNamePattern, uniqueExportNames } from '@/utils/style';
import { buildIconSvg } from '@/utils/svgExport';
import { optimizeSvg } from '@/utils/svgo';
import { fitPngUnderLimit } from './core/compliance';
import { drawIcon } from './core/draw';
import { planExport } from './core/exportPlan';

type ExportReq = Extract<WorkerRequest, { kind: 'export' }>;

function canvasFor(item: RenderItem, size: number) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  drawIcon(ctx, size, item.style, item.glyph);
  return { canvas, ctx };
}

async function blobToBytes(b: Blob): Promise<Uint8Array> {
  return new Uint8Array(await b.arrayBuffer());
}

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

async function glyphPngUri(bitmap: ImageBitmap, px: number): Promise<string> {
  const c = new OffscreenCanvas(px, px);
  c.getContext('2d')?.drawImage(bitmap, 0, 0, px, px);
  return 'data:image/png;base64,' + toBase64(await blobToBytes(await c.convertToBlob({ type: 'image/png' })));
}

async function svgFor(item: RenderItem, size: number, limited: boolean): Promise<string> {
  const build = (pngDataUri: string | null) => buildIconSvg(item.style, { svg: item.glyphSvg, pngDataUri }, size);
  if (item.glyphSvg || !item.glyph) {
    const svg = build(null);
    return limited && svg.length > LOGITECH_SAFE_BYTES ? optimizeSvg(svg, 1) : svg;
  }
  let svg = '';
  for (const px of [256, 128, 64]) {
    svg = build(await glyphPngUri(item.glyph, px));
    if (!limited || new TextEncoder().encode(svg).length <= LOGITECH_SAFE_BYTES) break;
  }
  return svg;
}

async function exportZip(req: ExportReq): Promise<WorkerResponse> {
  const files: Record<string, Uint8Array> = {};
  const audit: AuditEntry[] = [];
  const plan = planExport(req.target, req.customSize);
  const names = uniqueExportNames(req.items.map((item, index) => applyNamePattern(req.pattern, {
    index,
    keyName: item.name,
    state: item.toggleState ?? 'default',
  })));

  for (let i = 0; i < req.items.length; i++) {
    const item = req.items[i];
    const base = names[i];
    for (const entry of plan) {
      const path = `${entry.dir}/${base}.${entry.ext}`;
      if (entry.ext === 'png') {
        const encode = async (s: number) =>
          blobToBytes(await canvasFor(item, s).canvas.convertToBlob({ type: 'image/png' }));
        let bytes: Uint8Array;
        let quantized = false;
        if (entry.limited) {
          const fit = await fitPngUnderLimit(
            {
              encode,
              pixels: async (s) => {
                const { ctx } = canvasFor(item, s);
                return ctx.getImageData(0, 0, s, s);
              },
            },
            entry.size,
          );
          bytes = fit.bytes;
          quantized = fit.quantized;
        } else {
          bytes = await encode(entry.size);
        }
        files[path] = bytes;
        audit.push({ file: path, bytes: bytes.length, ok: !entry.limited || bytes.length <= 150 * 1024, quantized });
      } else {
        const bytes = strToU8(await svgFor(item, entry.size, entry.limited));
        files[path] = bytes;
        audit.push({ file: path, bytes: bytes.length, ok: !entry.limited || bytes.length <= 150 * 1024, quantized: false });
      }
    }
  }
  files['project.deckcraft'] = strToU8(req.bundle);
  for (const it of req.items) it.glyph?.close();
  // fflate zipSync runs inside this worker, so the UI thread is never blocked.
  return { kind: 'export', requestId: req.requestId, zip: zipSync(files, { level: 6 }), audit };
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const req = e.data;
  if (req.kind !== 'export') return;
  try {
    const res = await exportZip(req);
    (self as unknown as Worker).postMessage(res, res.kind === 'export' ? [res.zip.buffer] : []);
  } catch (err) {
    const res: WorkerResponse = { kind: 'error', requestId: req.requestId, message: String(err) };
    (self as unknown as Worker).postMessage(res);
  }
};
