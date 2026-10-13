import { useRef, useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useUIStore } from '@/store/uiStore';
import { HARDWARE_PROFILES } from '@/utils/constants';
import { useRenderedIcons } from '@/hooks/useRenderedIcons';
import { DeviceBezel } from './DeviceBezel';
import { KeyTile } from './KeyTile';

interface Rect { x0: number; y0: number; x1: number; y1: number }

export function KeyGrid() {
  const project = useProjectStore((s) => s.currentProject);
  const { reorderIcons, removeIcons, toggleLockIcon, createToggleStatePair } = useProjectStore.getState();
  const { selectedIconIds, select, toggleSelect, zoom, bezelMode, openDialog } = useUIStore();
  const bitmaps = useRenderedIcons(project, 192);
  const gridRef = useRef<HTMLDivElement>(null);
  const [marquee, setMarquee] = useState<Rect | null>(null);
  const [focus, setFocus] = useState(0);
  const dragFrom = useRef<number | null>(null);

  const prof = HARDWARE_PROFILES[project.hardwareProfile];
  const slots = Math.max(prof.rows * prof.cols, Math.ceil(project.icons.length / prof.cols) * prof.cols);
  const selected = new Set(selectedIconIds);

  const startMarquee = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-icon-id],button')) return;
    const host = gridRef.current;
    if (!host) return;
    const origin = { x: e.clientX, y: e.clientY };
    const base = e.shiftKey ? selectedIconIds : [];
    if (!e.shiftKey) select([]);
    const move = (ev: PointerEvent) => {
      const r = { x0: Math.min(origin.x, ev.clientX), y0: Math.min(origin.y, ev.clientY), x1: Math.max(origin.x, ev.clientX), y1: Math.max(origin.y, ev.clientY) };
      setMarquee(r);
      const hit = Array.from(host.querySelectorAll<HTMLElement>('[data-icon-id]'))
        .filter((el) => {
          const b = el.getBoundingClientRect();
          return b.left < r.x1 && b.right > r.x0 && b.top < r.y1 && b.bottom > r.y0;
        })
        .map((el) => el.dataset.iconId as string);
      select([...new Set([...base, ...hit])]);
    };
    const up = () => {
      setMarquee(null);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const navigate = (i: number) => (e: React.KeyboardEvent) => {
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: prof.cols, ArrowUp: -prof.cols }[e.key];
    if (step !== undefined) {
      e.preventDefault();
      const next = Math.min(project.icons.length - 1, Math.max(0, i + step));
      setFocus(next);
      host(next)?.focus();
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      toggleSelect(project.icons[i].id, true);
    }
  };
  const host = (i: number) => gridRef.current?.querySelector<HTMLElement>(`[data-index="${i}"]`);

  return (
    <div className="relative flex flex-1 items-center justify-center overflow-auto p-8" onPointerDown={startMarquee}>
      <div style={{ width: `${Math.min(900, prof.cols * 150) * zoom}px` }}>
        <DeviceBezel profile={project.hardwareProfile} enabled={bezelMode}>
          <div ref={gridRef} role="listbox" aria-multiselectable aria-label="Icon keys" className="grid gap-2" style={{ gridTemplateColumns: `repeat(${prof.cols}, minmax(0, 1fr))` }}>
            {Array.from({ length: slots }, (_, i) => {
              const icon = project.icons[i] ?? null;
              return (
                <KeyTile
                  key={icon?.id ?? `empty-${i}`}
                  icon={icon}
                  index={i}
                  bitmap={icon ? bitmaps.get(icon.id) : undefined}
                  selected={!!icon && selected.has(icon.id)}
                  tabbable={i === Math.min(focus, project.icons.length - 1)}
                  onSelect={(add) => icon && toggleSelect(icon.id, add)}
                  onKeyNav={navigate(i)}
                  onToggleLock={() => icon && toggleLockIcon(icon.id)}
                  onTogglePair={() => icon && createToggleStatePair(icon.id)}
                  onDelete={() => icon && (removeIcons([icon.id]), select(selectedIconIds.filter((x) => x !== icon.id)))}
                  onIsolate={() => icon && select([icon.id])}
                  onAddHere={() => openDialog('browser')}
                  onDragStartIndex={(from) => (dragFrom.current = from)}
                  onDropIndex={(to) => {
                    if (dragFrom.current !== null) reorderIcons(dragFrom.current, Math.min(to, project.icons.length - 1));
                    dragFrom.current = null;
                  }}
                />
              );
            })}
          </div>
        </DeviceBezel>
      </div>
      {marquee && (
        <div className="pointer-events-none fixed border border-sky-400 bg-sky-400/10" style={{ left: marquee.x0, top: marquee.y0, width: marquee.x1 - marquee.x0, height: marquee.y1 - marquee.y0 }} />
      )}
    </div>
  );
}
