import { ColorField, Field, Segmented, Slider } from './fields';
import { useStyleEditor } from './useStyleEditor';
import type { BadgeStyle } from '@/types';

export function BadgeControls() {
  const { style, update } = useStyleEditor();
  const b = style.badge;
  const set = (patch: Partial<BadgeStyle>, key: string) => update({ badge: patch }, `badge-${key}`);
  return (
    <div className="flex flex-col gap-4">
      <Field label="Sub-label (e.g. CMD+C, F13)">
        <input
          value={b.text ?? ''}
          maxLength={12}
          onChange={(e) => set({ text: e.target.value, enabled: e.target.value.length > 0 || !!b.pipColor }, 'text')}
          className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
        />
      </Field>
      <Segmented
        label="Position"
        value={b.position}
        options={[
          { value: 'top-left', label: 'Top L' },
          { value: 'top-right', label: 'Top R' },
          { value: 'center-bottom', label: 'Bottom' },
          { value: 'bottom-left', label: 'Bot L' },
          { value: 'bottom-right', label: 'Bot R' },
        ]}
        onChange={(position) => set({ position }, 'pos')}
      />
      <Slider label="Font size" value={b.fontSize} min={14} max={60} suffix="px" onChange={(fontSize) => set({ fontSize }, 'fs')} />
      <ColorField label="Text color" value={b.textColor} onChange={(textColor) => set({ textColor }, 'tc')} />
      <ColorField label="Badge background" value={b.backgroundColor} onChange={(backgroundColor) => set({ backgroundColor }, 'bg')} />
      <Segmented
        label="Status pip"
        value={b.pipColor ?? 'none'}
        options={[
          { value: 'none', label: 'None' },
          { value: '#22c55e', label: 'Green' },
          { value: '#ef4444', label: 'Red' },
          { value: '#f59e0b', label: 'Amber' },
        ]}
        onChange={(v) => set({ pipColor: v === 'none' ? undefined : v, enabled: v !== 'none' || !!b.text }, 'pip')}
      />
    </div>
  );
}
