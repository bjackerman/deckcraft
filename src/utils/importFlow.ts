import { useProjectStore } from '@/store/projectStore';
import { useUIStore } from '@/store/uiStore';
import { handleFileUpload } from './ingestion';

/** Ingests files into the current project and reports results via toasts. */
export async function importFiles(files: FileList | File[]): Promise<void> {
  const ui = useUIStore.getState();
  const res = await handleFileUpload(files);
  if (res.icons.length) {
    useProjectStore.getState().addIcons(res.icons);
    ui.toast('success', `Imported ${res.icons.length} icon${res.icons.length === 1 ? '' : 's'}`);
  }
  res.errors.forEach((e) => ui.toast('error', `${e.file}: ${e.message}`));
}
