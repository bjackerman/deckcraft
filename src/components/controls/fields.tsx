import type { ReactNode } from 'react';

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-400">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Slider(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  const { label, value, min, max, step = 1, suffix = '', onChange } = props;
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-400">
      <span className="flex justify-between">
        {label}
        <span className="tabular-nums text-slate-300">
          {Number.isInteger(step) ? value : value.toFixed(2)}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-sky-400"
      />
    </label>
  );
}

const SWATCHES = ['#0f172a', '#1e293b', '#e5e7eb', '#ffffff', '#38bdf8', '#a78bfa', '#f472b6', '#ef4444', '#f59e0b', '#22c55e'];

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const hex = /^#[0-9a-f]{6}/i.test(value) ? value.slice(0, 7) : '#000000';
  return (
    <div className="flex flex-col gap-1 text-xs text-slate-400">
      <span>{label}</span>
      <div className="flex items-center gap-2">
        <input type="color" aria-label={`${label} picker`} value={hex} onChange={(e) => onChange(e.target.value)} className="h-7 w-9 cursor-pointer rounded border border-slate-700 bg-transparent" />
        <input
          aria-label={`${label} hex`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-24 rounded border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-slate-200"
        />
      </div>
      <div className="flex gap-1">
        {SWATCHES.map((c) => (
          <button key={c} type="button" aria-label={`Use ${c}`} onClick={() => onChange(c)} className="size-4 rounded-full border border-slate-600" style={{ background: c }} />
        ))}
      </div>
    </div>
  );
}

export function Segmented<T extends string>(props: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1 text-xs text-slate-400" role="group" aria-label={props.label}>
      <span>{props.label}</span>
      <div className="flex flex-wrap gap-1">
        {props.options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={props.value === o.value}
            onClick={() => props.onChange(o.value)}
            className={`rounded-md border px-2 py-1 ${props.value === o.value ? 'border-sky-400 bg-sky-400/15 text-sky-200' : 'border-slate-700 text-slate-300 hover:border-slate-500'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
