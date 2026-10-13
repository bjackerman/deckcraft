import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { current } from 'immer';
import type { DeckProject, HardwareProfileId, IconItem, IconStyle, IconStyleOverride } from '@/types';
import { createProject } from '@/utils/constants';
import { mergeStyle, resolveStyle } from '@/utils/style';

export const HISTORY_LIMIT = 30;
const COALESCE_MS = 800;

interface ProjectState {
  currentProject: DeckProject;
  past: DeckProject[];
  future: DeckProject[];
  lastEdit: { key: string; at: number } | null;

  setProject(p: DeckProject): void;
  renameProject(title: string): void;
  setHardwareProfile(id: HardwareProfileId): void;
  addIcons(icons: IconItem[]): void;
  removeIcons(ids: string[]): void;
  reorderIcons(from: number, to: number): void;
  renameIcon(id: string, name: string): void;
  updateMasterStyle(patch: IconStyleOverride, coalesceKey?: string): void;
  replaceMasterStyle(style: IconStyle): void;
  updateIconOverride(ids: string[], patch: IconStyleOverride, coalesceKey?: string): void;
  toggleLockIcon(id: string): void;
  createToggleStatePair(iconId: string): void;
  undo(): void;
  redo(): void;
}

type Recipe = (p: DeckProject) => void;

export const useProjectStore = create<ProjectState>()(
  immer((set) => {
    /** Applies a recipe to the project, recording undo history (coalescing rapid edits sharing a key). */
    const mutate = (recipe: Recipe, key?: string) =>
      set((s) => {
        const now = Date.now();
        const coalesce = key && s.lastEdit?.key === key && now - s.lastEdit.at < COALESCE_MS;
        if (!coalesce) {
          s.past.push(current(s.currentProject));
          if (s.past.length > HISTORY_LIMIT) s.past.shift();
        }
        s.future = [];
        s.lastEdit = key ? { key, at: now } : null;
        recipe(s.currentProject);
        s.currentProject.updatedAt = now;
      });

    return {
      currentProject: createProject(),
      past: [],
      future: [],
      lastEdit: null,

      setProject: (p) =>
        set((s) => {
          s.currentProject = p;
          s.past = [];
          s.future = [];
          s.lastEdit = null;
        }),

      renameProject: (title) => mutate((p) => void (p.title = title), 'rename-project'),
      setHardwareProfile: (id) => mutate((p) => void (p.hardwareProfile = id)),
      addIcons: (icons) => mutate((p) => void p.icons.push(...icons)),
      removeIcons: (ids) => mutate((p) => void (p.icons = p.icons.filter((i) => !ids.includes(i.id)))),

      reorderIcons: (from, to) =>
        mutate((p) => {
          if (from === to || from < 0 || to < 0 || from >= p.icons.length || to >= p.icons.length) return;
          const [moved] = p.icons.splice(from, 1);
          p.icons.splice(to, 0, moved);
        }),

      renameIcon: (id, name) =>
        mutate((p) => {
          const i = p.icons.find((x) => x.id === id);
          if (i) i.name = name;
        }, `rename-${id}`),

      updateMasterStyle: (patch, key) =>
        mutate((p) => {
          p.masterStyle = mergeStyle(current(p).masterStyle, patch);
        }, key),

      replaceMasterStyle: (style) => mutate((p) => void (p.masterStyle = structuredClone(style))),

      updateIconOverride: (ids, patch, key) =>
        mutate((p) => {
          for (const icon of p.icons) {
            if (!ids.includes(icon.id)) continue;
            const snap = current(icon);
            if (snap.isLocked && snap.lockedStyle) {
              icon.lockedStyle = mergeStyle(snap.lockedStyle, patch);
            } else {
              icon.customStyle = {
                background: { ...snap.customStyle?.background, ...patch.background },
                glyph: { ...snap.customStyle?.glyph, ...patch.glyph },
                badge: { ...snap.customStyle?.badge, ...patch.badge },
              };
            }
          }
        }, key),

      toggleLockIcon: (id) =>
        mutate((p) => {
          const icon = p.icons.find((i) => i.id === id);
          if (!icon) return;
          if (icon.isLocked) {
            icon.isLocked = false;
            icon.lockedStyle = undefined;
          } else {
            icon.lockedStyle = resolveStyle(current(p).masterStyle, current(icon));
            icon.isLocked = true;
          }
        }),

      createToggleStatePair: (iconId) =>
        mutate((p) => {
          const idx = p.icons.findIndex((i) => i.id === iconId);
          if (idx < 0) return;
          const src = current(p.icons[idx]);
          const pairId = src.statePairId ?? crypto.randomUUID();
          const base = resolveStyle(current(p).masterStyle, src);
          const secondary: IconItem = {
            ...structuredClone(src),
            id: crypto.randomUUID(),
            name: `${src.name} (active)`,
            statePairId: pairId,
            toggleState: 'secondary',
            cachedRenderUri: undefined,
            customStyle: {
              background: { ...src.customStyle?.background, primaryColor: '#7f1d1d', secondaryColor: '#450a0a', borderWidth: 4, borderColor: '#ef4444' },
              glyph: { ...src.customStyle?.glyph, tintColor: '#fecaca', slash: true },
              badge: { ...src.customStyle?.badge, pipColor: '#ef4444', enabled: true },
            },
          };
          if (src.isLocked) secondary.lockedStyle = mergeStyle(base, secondary.customStyle);
          p.icons[idx].statePairId = pairId;
          p.icons[idx].toggleState = 'primary';
          p.icons.splice(idx + 1, 0, secondary);
        }),

      undo: () =>
        set((s) => {
          const prev = s.past.pop();
          if (!prev) return;
          s.future.push(current(s.currentProject));
          s.currentProject = prev;
          s.lastEdit = null;
        }),

      redo: () =>
        set((s) => {
          const next = s.future.pop();
          if (!next) return;
          s.past.push(current(s.currentProject));
          s.currentProject = next;
          s.lastEdit = null;
        }),
    };
  }),
);
