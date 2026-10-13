import { useEffect } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useUIStore } from '@/store/uiStore';
import { handlePaste } from '@/utils/ingestion';

function isTyping(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const mod = e.ctrlKey || e.metaKey;
      const ps = useProjectStore.getState();
      const ui = useUIStore.getState();
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) ps.redo();
        else ps.undo();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        ps.redo();
      } else if (mod && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        ui.select(ps.currentProject.icons.map((i) => i.id));
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && ui.selectedIconIds.length) {
        ps.removeIcons(ui.selectedIconIds);
        ui.select([]);
      } else if (e.key === 'Escape') {
        ui.select([]);
      }
    };
    const onPaste = async (e: ClipboardEvent) => {
      if (isTyping(e.target)) return;
      const res = await handlePaste(e.clipboardData);
      const ui = useUIStore.getState();
      if (res.icons.length) {
        useProjectStore.getState().addIcons(res.icons);
        ui.toast('success', `Pasted ${res.icons.length} icon(s)`);
      }
      res.errors.forEach((er) => ui.toast('error', `${er.file}: ${er.message}`));
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('paste', onPaste);
    };
  }, []);
}
