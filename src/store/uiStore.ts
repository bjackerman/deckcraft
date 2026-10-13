import { create } from 'zustand';

export interface Toast {
  id: number;
  kind: 'info' | 'error' | 'success';
  message: string;
}

interface UiState {
  selectedIconIds: string[];
  zoom: number;
  bezelMode: boolean;
  panel: 'background' | 'glyph' | 'badge';
  dialog: null | 'export' | 'browser' | 'projects';
  toasts: Toast[];
  select(ids: string[]): void;
  toggleSelect(id: string, additive: boolean): void;
  setZoom(z: number): void;
  setBezel(on: boolean): void;
  setPanel(p: UiState['panel']): void;
  openDialog(d: UiState['dialog']): void;
  toast(kind: Toast['kind'], message: string): void;
  dismissToast(id: number): void;
}

let toastSeq = 0;

export const useUIStore = create<UiState>((set) => ({
  selectedIconIds: [],
  zoom: 1,
  bezelMode: true,
  panel: 'background',
  dialog: null,
  toasts: [],
  select: (ids) => set({ selectedIconIds: ids }),
  toggleSelect: (id, additive) =>
    set((s) => {
      if (!additive) return { selectedIconIds: s.selectedIconIds.length === 1 && s.selectedIconIds[0] === id ? [] : [id] };
      return {
        selectedIconIds: s.selectedIconIds.includes(id) ? s.selectedIconIds.filter((x) => x !== id) : [...s.selectedIconIds, id],
      };
    }),
  setZoom: (zoom) => set({ zoom }),
  setBezel: (bezelMode) => set({ bezelMode }),
  setPanel: (panel) => set({ panel }),
  openDialog: (dialog) => set({ dialog }),
  toast: (kind, message) => {
    const id = ++toastSeq;
    set((s) => ({ toasts: [...s.toasts, { id, kind, message }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 5000);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
