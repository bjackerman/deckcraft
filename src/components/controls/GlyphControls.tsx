import { RotateCw } from 'lucide-react';
import { ColorField, Segmented, Slider } from './fields';
import { useStyleEditor } from './useStyleEditor';
import type { GlyphStyle } from '@/types';

export function GlyphControls() {
  const { style, update } = useStyleEditor();
  const g = style.glyph;
  const set = (patch: Partial<GlyphStyle>, key: string) => update({ glyph: patch }, `glyph-${key}`);
  return (
    <div className="flex flex-col gap-4">
      <Segmented
        label="Tint mode"
        value={g.mode}
        options={[
          { value: 'monochrome', label: 'Monochrome' },
          { value: 'dual-tone', label: 'Dual-tone' },
          { value: 'original', label: 'Original' },
        ]}
        onChange={(mode) => set({ mode }, 'mode')}
      />
      {g.mode !== 'original' && <ColorField label="Tint color" value={g.tintColor} onChange={(tintColor) => set({ tintColor }, 'tint')} />}
      {g.mode === 'dual-tone' && (
        <ColorField label="Second tone" value={g.secondaryTintColor ?? g.tintColor} onChange={(secondaryTintColor) => set({ secondaryTintColor }, 'tint2')} />
      )}
      <Slider label="Scale" value={Math.round(g.scale * 100)} min={20} max={120} suffix="%" onChange={(v) => set({ scale: v / 100 }, 'scale')} />
      <button
        type="button"
        className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:border-sky-400"
        onClick={() => set({ scale: 0.58, offsetX: 0, offsetY: 0 }, 'fit')}
      >
        Optical fit (centre &amp; reset scale)
      </button>
      <Slider label="Offset X" value={g.offsetX} min={-50} max={50} suffix="px" onChange={(offsetX) => set({ offsetX }, 'ox')} />
      <Slider label="Offset Y" value={g.offsetY} min={-50} max={50} suffix="px" onChange={(offsetY) => set({ offsetY }, 'oy')} />
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span>Rotation {g.rotation}°</span>
        <button type="button" aria-label="Rotate 90 degrees" className="rounded-md border border-slate-700 p-1.5 text-slate-200 hover:border-sky-400" onClick={() => set({ rotation: (g.rotation + 90) % 360 }, 'rot')}>
          <RotateCw size={14} />
        </button>
      </div>
      <Slider label="Drop shadow" value={g.dropShadowBlur} min={0} max={30} suffix="px" onChange={(dropShadowBlur) => set({ dropShadowBlur }, 'ds')} />
    </div>
  );
}
