import Dexie, { type EntityTable } from 'dexie';
import type { DeckProject, StylePreset } from '@/types';

export interface AssetRecord {
  id: string;
  projectId: string;
  name: string;
  blob: Blob;
}

export class DeckDb extends Dexie {
  projects!: EntityTable<DeckProject, 'id'>;
  assets!: EntityTable<AssetRecord, 'id'>;
  presets!: EntityTable<StylePreset, 'id'>;

  constructor(name = 'deckcraft') {
    super(name);
    this.version(1).stores({
      projects: 'id, updatedAt, title',
      assets: 'id, projectId',
      presets: 'id, name',
    });
  }
}

export const db = new DeckDb();

const CURRENT_KEY = 'deckcraft:current-project';

export const saveProject = (p: DeckProject) => db.projects.put(p);
export const listProjects = () => db.projects.orderBy('updatedAt').reverse().toArray();
export const deleteProject = (id: string) => db.projects.delete(id);
export const rememberCurrent = (id: string) => localStorage.setItem(CURRENT_KEY, id);

export async function loadCurrentProject(): Promise<DeckProject | undefined> {
  const id = localStorage.getItem(CURRENT_KEY);
  if (id) {
    const p = await db.projects.get(id);
    if (p) return p;
  }
  return (await listProjects())[0];
}

export const listCustomPresets = () => db.presets.toArray();
export const savePreset = (p: StylePreset) => db.presets.put(p);
export const deletePreset = (id: string) => db.presets.delete(id);
