import { useRef } from 'react';
import { Boxes, FolderOpen, Frame, Grid3x3, ImagePlus, Package, Redo2, Undo2 } from 'lucide-react';
import { HardwareProfileBar } from '@/components/controls/HardwareProfileBar';
import { useProjectStore } from '@/store/projectStore';
import { useUIStore } from '@/store/uiStore';
import { importFiles } from '@/utils/importFlow';

const BTN = 'flex items-center gap-1.5 rounded-md border border-slate-700 px-2.5 py-1.5 text-sm text-slate-200 hover:border-sky-400 disabled:opacity-40';

export function Header() {
  const title = useProjectStore((s) => s.currentProject.title);
  const { renameProject, undo, redo } = useProjectStore.getState();
  const canUndo = useProjectStore((s) => s.past.length > 0);
  const canRedo = useProjectStore((s) => s.future.length > 0);
  const { openDialog, bezelMode, setBezel } = useUIStore();
  const file = useRef<HTMLInputElement>(null);
  return (
    <header className="flex flex-wrap items-center gap-2 border-b border-slate-800 bg-slate-950 px-4 py-2">
      <Grid3x3 className="text-sky-400" size={20} aria-hidden />
      <h1 className="mr-2 text-base font-semibold text-slate-100">DeckCraft Studio</h1>
      <input aria-label="Project title" value={title} onChange={(e) => renameProject(e.target.value)} className="w-44 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-slate-200 hover:border-slate-700 focus:border-sky-400" />
      <HardwareProfileBar />
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <button type="button" className={BTN} onClick={undo} disabled={!canUndo} aria-label="Undo"><Undo2 size={14} /></button>
        <button type="button" className={BTN} onClick={redo} disabled={!canRedo} aria-label="Redo"><Redo2 size={14} /></button>
        <button type="button" className={BTN} aria-pressed={bezelMode} onClick={() => setBezel(!bezelMode)}><Frame size={14} /> Bezel</button>
        <button type="button" className={BTN} onClick={() => file.current?.click()}><ImagePlus size={14} /> Import</button>
        <input ref={file} type="file" multiple accept="image/svg+xml,image/png,image/webp,image/jpeg,image/gif,.svg" hidden data-testid="icon-file-input" onChange={(e) => (e.target.files && importFiles(e.target.files), (e.target.value = ''))} />
        <button type="button" className={BTN} onClick={() => openDialog('browser')}><Boxes size={14} /> Icon browser</button>
        <button type="button" className={BTN} onClick={() => openDialog('projects')}><FolderOpen size={14} /> Projects</button>
        <button type="button" className="flex items-center gap-1.5 rounded-md bg-sky-500 px-3 py-1.5 text-sm font-medium text-slate-950 hover:bg-sky-400" onClick={() => openDialog('export')}><Package size={14} /> Export Package</button>
      </div>
    </header>
  );
}
