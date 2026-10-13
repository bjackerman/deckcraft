import type { WorkerRequest, WorkerResponse } from '@/types';
import { drawIcon } from './core/draw';

type RenderReq = Extract<WorkerRequest, { kind: 'render' }>;

function render(req: RenderReq): WorkerResponse {
  const assets: { id: string; bitmap: ImageBitmap }[] = [];
  for (const item of req.items) {
    const canvas = new OffscreenCanvas(req.size, req.size);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas unavailable');
    drawIcon(ctx, req.size, item.style, item.glyph);
    item.glyph?.close();
    assets.push({ id: item.id, bitmap: canvas.transferToImageBitmap() });
  }
  return { kind: 'render', requestId: req.requestId, assets };
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const req = e.data;
  if (req.kind !== 'render') return;
  try {
    const res = render(req);
    const transfer = res.kind === 'render' ? res.assets.map((a) => a.bitmap) : [];
    (self as unknown as Worker).postMessage(res, transfer);
  } catch (err) {
    const res: WorkerResponse = { kind: 'error', requestId: req.requestId, message: String(err) };
    (self as unknown as Worker).postMessage(res);
  }
};
