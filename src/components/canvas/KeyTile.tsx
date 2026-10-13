import { useEffect, useRef } from 'react';
import { Copy, Lock, LockOpen, Plus, Target, Trash2 } from 'lucide-react';
import type { IconItem } from '@/types';

interface Props {
  icon: IconItem | null;
  index: number;
  bitmap: ImageBitmap | undefined;
  selected: boolean;
  tabbable: boolean;
  onSelect: (additive: boolean) => void;
  onKeyNav: (e: React.KeyboardEvent) => void;
  onToggleLock: () => void;
  onTogglePair: () => void;
  onDelete: () => void;
  onIsolate: () => void;
  onAddHere: () => void;
  onDragStartIndex: (i: number) => void;
  onDropIndex: (i: number) => void;
}

const BTN = 'rounded bg-slate-950/80 p-1 text-slate-200 hover:bg-sky-500 hover:text-slate-950';

export function KeyTile(p: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx || !ref.current) return;
    ctx.clearRect(0, 0, ref.current.width, ref.current.height);
    if (p.bitmap) ctx.drawImage(p.bitmap, 0, 0, ref.current.width, ref.current.height);
  }, [p.bitmap]);

  const common = {
    'data-index': p.index,
    onDragOver: (e: React.DragEvent) => e.preventDefault(),
    onDrop: (e: React.DragEvent) => {
      if (e.dataTransfer.types.includes('application/x-deckcraft-key')) {
        e.preventDefault();
        e.stopPropagation();
        p.onDropIndex(p.index);
      }
    },
  };

  if (!p.icon) {
    return (
      <button type="button" {...common} aria-label={`Empty slot ${p.index + 1}, add icon`} onClick={p.onAddHere} className="flex aspect-square items-center justify-center rounded-[22%] border border-dashed border-slate-700 text-slate-600 hover:border-sky-400 hover:text-sky-300">
        <Plus size={20} />
      </button>
    );
  }
  const icon = p.icon;
  return (
    <div
      {...common}
      data-icon-id={icon.id}
      role="option"
      aria-selected={p.selected}
      aria-label={`${icon.name}${icon.isLocked ? ' (style locked)' : ''}`}
      tabIndex={p.tabbable ? 0 : -1}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/x-deckcraft-key', String(p.index));
        e.dataTransfer.effectAllowed = 'move';
        p.onDragStartIndex(p.index);
      }}
      onClick={(e) => p.onSelect(e.shiftKey || e.ctrlKey || e.metaKey)}
      onKeyDown={p.onKeyNav}
      className={`group relative aspect-square cursor-grab rounded-[22%] outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${p.selected ? 'ring-2 ring-sky-400' : ''}`}
    >
      <canvas ref={ref} width={192} height={192} className="size-full rounded-[22%]" aria-hidden />
      <span className={`absolute left-1 top-1 size-4 rounded border ${p.selected ? 'border-sky-300 bg-sky-400' : 'border-slate-500 bg-slate-950/60'}`} aria-hidden />
      {icon.isLocked && <Lock size={12} className="absolute right-1.5 top-1.5 text-amber-300" aria-hidden />}
      <div className="absolute inset-x-0 bottom-1 hidden justify-center gap-1 group-hover:flex group-focus-within:flex group-focus:flex">
        <button type="button" aria-label="Duplicate as toggle pair" title="Duplicate as toggle pair" className={BTN} onClick={(e) => (e.stopPropagation(), p.onTogglePair())}><Copy size={12} /></button>
        <button type="button" aria-label={icon.isLocked ? 'Unlock style' : 'Lock style'} title="Lock style" className={BTN} onClick={(e) => (e.stopPropagation(), p.onToggleLock())}>{icon.isLocked ? <LockOpen size={12} /> : <Lock size={12} />}</button>
        <button type="button" aria-label="Isolate edit" title="Isolate edit" className={BTN} onClick={(e) => (e.stopPropagation(), p.onIsolate())}><Target size={12} /></button>
        <button type="button" aria-label="Delete icon" title="Delete" className={BTN} onClick={(e) => (e.stopPropagation(), p.onDelete())}><Trash2 size={12} /></button>
      </div>
    </div>
  );
}
