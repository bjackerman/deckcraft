import type { DeckProject, ExportTarget, IconItem, IconStyle, RenderItem, WorkerResponse } from '@/types';
import { resolveStyle } from './style';
import { rasterizeGlyph } from './glyphRaster';
import { serializeBundle } from './bundle';

async function toRenderItem(icon: IconItem, style: IconStyle): Promise<RenderItem> {
  const g = await rasterizeGlyph(icon, style.glyph);
  // Clone so the cached bitmap survives the worker closing/transferring its copy.
  const glyph = g.bitmap ? await createImageBitmap(g.bitmap) : null;
  return { id: icon.id, name: icon.name, toggleState: icon.toggleState, style, glyph, glyphSvg: g.svg };
}

export async function buildRenderItems(project: DeckProject, onlyIds?: string[]): Promise<RenderItem[]> {
  const icons = onlyIds ? project.icons.filter((i) => onlyIds.includes(i.id)) : project.icons;
  return Promise.all(icons.map((i) => toRenderItem(i, resolveStyle(project.masterStyle, i))));
}

function spawn(kind: 'render' | 'export'): Worker {
  return kind === 'render'
    ? new Worker(new URL('../workers/render.worker.ts', import.meta.url), { type: 'module' })
    : new Worker(new URL('../workers/export.worker.ts', import.meta.url), { type: 'module' });
}

let renderWorker: Worker | null = null;
let seq = 0;
const pending = new Map<number, (r: WorkerResponse) => void>();

function getRenderWorker(): Worker {
  if (!renderWorker) {
    renderWorker = spawn('render');
    renderWorker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      pending.get(e.data.requestId)?.(e.data);
      pending.delete(e.data.requestId);
    };
  }
  return renderWorker;
}

/** Renders icons into ImageBitmaps in the worker. Caller owns (and must close) the returned bitmaps. */
export async function renderIcons(project: DeckProject, size: number): Promise<Map<string, ImageBitmap>> {
  const items = await buildRenderItems(project);
  if (!items.length) return new Map();
  const requestId = ++seq;
  const res = await new Promise<WorkerResponse>((resolve) => {
    pending.set(requestId, resolve);
    getRenderWorker().postMessage({ kind: 'render', requestId, size, items }, items.flatMap((i) => (i.glyph ? [i.glyph] : [])));
  });
  if (res.kind === 'error') throw new Error(res.message);
  if (res.kind !== 'render') return new Map();
  return new Map(res.assets.map((a) => [a.id, a.bitmap]));
}

export interface ExportOutput {
  zip: Uint8Array;
  audit: Extract<WorkerResponse, { kind: 'export' }>['audit'];
}

export async function runExport(
  project: DeckProject,
  target: ExportTarget,
  customSize: number,
  pattern: string,
): Promise<ExportOutput> {
  const items = await buildRenderItems(project);
  const worker = spawn('export');
  try {
    const res = await new Promise<WorkerResponse>((resolve, reject) => {
      worker.onmessage = (e: MessageEvent<WorkerResponse>) => resolve(e.data);
      worker.onerror = (e) => reject(new Error(e.message));
      worker.postMessage(
        { kind: 'export', requestId: 1, target, customSize, pattern, bundle: serializeBundle(project), items },
        items.flatMap((i) => (i.glyph ? [i.glyph] : [])),
      );
    });
    if (res.kind === 'error') throw new Error(res.message);
    if (res.kind !== 'export') throw new Error('Unexpected worker response');
    return { zip: res.zip, audit: res.audit };
  } finally {
    worker.terminate();
  }
}
