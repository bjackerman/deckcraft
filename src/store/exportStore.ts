import { create } from 'zustand';
import type { ExportTarget } from '@/types';

interface ExportState {
  target: ExportTarget;
  customSize: number;
  pattern: string;
  setTarget(t: ExportTarget): void;
  setCustomSize(n: number): void;
  setPattern(p: string): void;
}

export const useExportStore = create<ExportState>((set) => ({
  target: 'logitech',
  customSize: 512,
  pattern: '{index}_{keyName}_{state}',
  setTarget: (target) => set({ target }),
  setCustomSize: (customSize) => set({ customSize }),
  setPattern: (pattern) => set({ pattern }),
}));
