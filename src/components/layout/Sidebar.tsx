import { BackgroundControls } from '@/components/controls/BackgroundControls';
import { BadgeControls } from '@/components/controls/BadgeControls';
import { GlyphControls } from '@/components/controls/GlyphControls';
import { PresetSelector } from '@/components/controls/PresetSelector';
import { useUIStore } from '@/store/uiStore';

const TABS = [
  { id: 'background', label: 'Background' },
  { id: 'glyph', label: 'Glyph' },
  { id: 'badge', label: 'Badge' },
] as const;

export function Sidebar() {
  const { panel, setPanel, selectedIconIds, select } = useUIStore();
  const n = selectedIconIds.length;
  return (
    <aside className="flex w-80 shrink-0 flex-col gap-4 overflow-y-auto border-l border-slate-800 bg-slate-950 p-4" aria-label="Style inspector">
      <div className="rounded-md bg-slate-900 px-3 py-2 text-xs text-slate-300" data-testid="style-scope">
        {n ? (
          <>Styling <b>{n}</b> selected icon{n > 1 ? 's' : ''} (overrides). <button type="button" className="text-sky-300 underline" onClick={() => select([])}>Back to master style</button></>
        ) : (
          <>Editing the <b>master style</b> – applies to every unlocked icon. Select keys to override.</>
        )}
      </div>
      <section aria-label="Presets">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Presets</h2>
        <PresetSelector />
      </section>
      <div role="tablist" className="flex gap-1 border-b border-slate-800">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={panel === t.id} type="button" onClick={() => setPanel(t.id)} className={`border-b-2 px-3 py-1.5 text-sm ${panel === t.id ? 'border-sky-400 text-sky-200' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {panel === 'background' && <BackgroundControls />}
        {panel === 'glyph' && <GlyphControls />}
        {panel === 'badge' && <BadgeControls />}
      </div>
    </aside>
  );
}
