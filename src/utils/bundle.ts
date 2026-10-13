import { strFromU8, unzipSync } from 'fflate';
import type { DeckProject } from '@/types';

const FORMAT = 'deckcraft-project';

export function serializeBundle(project: DeckProject): string {
  const icons = project.icons.map((i) => ({ ...i, cachedRenderUri: undefined }));
  return JSON.stringify({ format: FORMAT, version: 1, project: { ...project, icons } });
}

export function parseBundle(text: string): DeckProject {
  const data = JSON.parse(text) as { format?: string; project?: DeckProject };
  const p = data.project;
  if (data.format !== FORMAT || !p || !Array.isArray(p.icons) || !p.masterStyle) {
    throw new Error('Not a valid .deckcraft project');
  }
  return { ...p, id: p.id || crypto.randomUUID() };
}

/** Reads a .deckcraft file or an exported ZIP containing project.deckcraft. */
export async function importProjectFile(file: File): Promise<DeckProject> {
  if (/\.zip$/i.test(file.name)) {
    const entries = unzipSync(new Uint8Array(await file.arrayBuffer()));
    const entry = entries['project.deckcraft'];
    if (!entry) throw new Error('ZIP does not contain project.deckcraft');
    return parseBundle(strFromU8(entry));
  }
  return parseBundle(await file.text());
}

export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
