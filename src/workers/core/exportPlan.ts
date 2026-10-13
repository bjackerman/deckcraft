import type { ExportTarget } from '@/types';

export interface PlanEntry {
  dir: string;
  ext: 'png' | 'svg';
  size: number;
  /** Subject to the Logitech 150 KB budget. */
  limited: boolean;
}

export function planExport(target: ExportTarget, customSize: number): PlanEntry[] {
  switch (target) {
    case 'logitech':
      return [
        { dir: 'logitech-mx/png-288x288', ext: 'png', size: 288, limited: true },
        { dir: 'logitech-mx/svg', ext: 'svg', size: 288, limited: true },
      ];
    case 'elgato':
      return [
        { dir: 'stream-deck/144x144', ext: 'png', size: 144, limited: false },
        { dir: 'stream-deck/288x288@2x', ext: 'png', size: 288, limited: false },
      ];
    case 'loupedeck':
      return [
        { dir: 'loupedeck/90x90', ext: 'png', size: 90, limited: false },
        { dir: 'loupedeck/120x120', ext: 'png', size: 120, limited: false },
        { dir: 'loupedeck/svg', ext: 'svg', size: 120, limited: false },
      ];
    case 'universal': {
      const s = Math.min(1024, Math.max(64, Math.round(customSize)));
      return [{ dir: `universal/${s}x${s}`, ext: 'png', size: s, limited: false }];
    }
  }
}
