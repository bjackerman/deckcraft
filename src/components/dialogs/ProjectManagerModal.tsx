import { useEffect, useRef, useState } from 'react';
import { Copy, FilePlus, FolderOpen, Download, Trash2 } from 'lucide-react';
import { Modal } from './Modal';
import { deleteProject, listProjects, saveProject } from '@/db';
import { useProjectStore } from '@/store/projectStore';
import { useUIStore } from '@/store/uiStore';
import type { DeckProject } from '@/types';
import { downloadBlob, importProjectFile, serializeBundle } from '@/utils/bundle';
import { createProject } from '@/utils/constants';
import { sanitizeFileName } from '@/utils/style';

export function ProjectManagerModal() {
  const [projects, setProjects] = useState<DeckProject[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const { openDialog, toast, select } = useUIStore();
  const { currentProject, setProject } = useProjectStore();

  const refresh = () => listProjects().then(setProjects);
  useEffect(() => void refresh(), []);

  const open = (p: DeckProject) => {
    setProject(p);
    select([]);
    openDialog(null);
  };
  const persistThenOpen = async (p: DeckProject) => {
    await saveProject(p);
    open(p);
  };

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const p = await importProjectFile(file);
      await persistThenOpen({ ...p, id: crypto.randomUUID(), title: p.title });
      toast('success', `Opened “${p.title}”`);
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Import failed');
    }
  };

  return (
    <Modal title="Projects" onClose={() => openDialog(null)}>
      <div className="flex flex-col gap-3 text-sm text-slate-200">
        <div className="flex gap-2">
          <button type="button" onClick={() => persistThenOpen(createProject(currentProject.hardwareProfile))} className="flex items-center gap-1.5 rounded-md border border-slate-700 px-3 py-1.5 hover:border-sky-400"><FilePlus size={14} /> New</button>
          <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 rounded-md border border-slate-700 px-3 py-1.5 hover:border-sky-400"><FolderOpen size={14} /> Open .deckcraft / ZIP</button>
          <input ref={fileRef} type="file" accept=".deckcraft,.zip,.json" hidden data-testid="project-file-input" onChange={(e) => onImport(e.target.files?.[0])} />
        </div>
        <ul className="flex flex-col gap-1.5">
          {projects.map((p) => (
            <li key={p.id} className={`flex items-center gap-2 rounded-md border px-3 py-2 ${p.id === currentProject.id ? 'border-sky-400/60' : 'border-slate-800'}`}>
              <button type="button" onClick={() => open(p)} className="flex-1 text-left">
                <span className="block font-medium">{p.title}</span>
                <span className="text-xs text-slate-400">{p.icons.length} icons · {new Date(p.updatedAt).toLocaleString()}</span>
              </button>
              <button type="button" aria-label={`Duplicate ${p.title}`} onClick={() => persistThenOpen({ ...structuredClone(p), id: crypto.randomUUID(), title: `${p.title} copy`, updatedAt: Date.now() })} className="text-slate-400 hover:text-sky-300"><Copy size={14} /></button>
              <button type="button" aria-label={`Download ${p.title}`} onClick={() => downloadBlob(new Blob([serializeBundle(p)], { type: 'application/json' }), `${sanitizeFileName(p.title)}.deckcraft`)} className="text-slate-400 hover:text-sky-300"><Download size={14} /></button>
              <button
                type="button"
                aria-label={`Delete ${p.title}`}
                disabled={p.id === currentProject.id}
                onClick={() => deleteProject(p.id).then(refresh)}
                className="text-slate-400 hover:text-red-400 disabled:opacity-30"
              ><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
