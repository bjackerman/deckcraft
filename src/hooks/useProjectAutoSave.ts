import { useEffect } from 'react';
import { rememberCurrent, saveProject } from '@/db';
import { useProjectStore } from '@/store/projectStore';
import { useUIStore } from '@/store/uiStore';

const DEBOUNCE_MS = 500;

/** Persists every project change to IndexedDB after a 500ms quiet period (and on tab hide). */
export function useProjectAutoSave(): void {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const flush = () => {
      clearTimeout(timer);
      timer = undefined;
      const p = useProjectStore.getState().currentProject;
      rememberCurrent(p.id);
      saveProject(p).catch(() => useUIStore.getState().toast('error', 'Auto-save failed'));
    };
    const unsub = useProjectStore.subscribe((s, prev) => {
      if (s.currentProject === prev.currentProject) return;
      clearTimeout(timer);
      timer = setTimeout(flush, DEBOUNCE_MS);
    });
    const onHide = () => timer && flush();
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      unsub();
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onHide);
      if (timer) flush();
    };
  }, []);
}
