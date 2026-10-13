import { useEffect, useState } from 'react';
import { Save, Trash2 } from 'lucide-react';
import { deletePreset, listCustomPresets, savePreset } from '@/db';
import { useProjectStore } from '@/store/projectStore';
import { useUIStore } from '@/store/uiStore';
import type { StylePreset } from '@/types';
import { FACTORY_PRESETS } from '@/utils/presets';

export function PresetSelector() {
  const [custom, setCustom] = useState<StylePreset[]>([]);
  const replaceMaster = useProjectStore((s) => s.replaceMasterStyle);
  const toast = useUIStore((s) => s.toast);
  const refresh = () => listCustomPresets().then(setCustom).catch(() => setCustom([]));
  useEffect(() => void refresh(), []);

  const saveCurrent = async () => {
    const name = window.prompt('Preset name');
    if (!name?.trim()) return;
    const style = structuredClone(useProjectStore.getState().currentProject.masterStyle);
    await savePreset({ id: crypto.randomUUID(), name: name.trim(), style });
    toast('success', `Saved preset “${name.trim()}”`);
    void refresh();
  };

  const all = [...FACTORY_PRESETS, ...custom];
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-1.5">
        {all.map((p) => (
          <div key={p.id} className="group relative">
            <button
              type="button"
              onClick={() => replaceMaster(p.style)}
              className="flex w-full items-center gap-2 rounded-md border border-slate-700 px-2 py-1.5 text-left text-xs text-slate-200 hover:border-sky-400"
            >
              <span
                className="size-4 shrink-0 rounded"
                style={{ background: `linear-gradient(135deg, ${p.style.background.primaryColor}, ${p.style.background.secondaryColor ?? p.style.background.primaryColor})`, outline: `1px solid ${p.style.glyph.tintColor}` }}
              />
              <span className="truncate">{p.name}</span>
            </button>
            {!p.builtin && (
              <button
                type="button"
                aria-label={`Delete preset ${p.name}`}
                onClick={() => deletePreset(p.id).then(refresh)}
                className="absolute right-1 top-1/2 hidden -translate-y-1/2 text-slate-400 hover:text-red-400 group-hover:block"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
      <button type="button" onClick={saveCurrent} className="flex items-center justify-center gap-1.5 rounded-md border border-dashed border-slate-600 px-2 py-1.5 text-xs text-slate-300 hover:border-sky-400">
        <Save size={12} /> Save as custom preset
      </button>
    </div>
  );
}
