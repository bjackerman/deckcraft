import { useProjectStore } from '@/store/projectStore';
import { useUIStore } from '@/store/uiStore';
import type { IconStyle, IconStyleOverride } from '@/types';
import { resolveStyle } from '@/utils/style';

/** Edits the selected icons as overrides, or the master style when nothing is selected. */
export function useStyleEditor(): {
  style: IconStyle;
  scope: 'master' | 'selection';
  count: number;
  update: (patch: IconStyleOverride, key: string) => void;
} {
  const project = useProjectStore((s) => s.currentProject);
  const selected = useUIStore((s) => s.selectedIconIds);
  const updateMaster = useProjectStore((s) => s.updateMasterStyle);
  const updateOverride = useProjectStore((s) => s.updateIconOverride);
  const ids = selected.filter((id) => project.icons.some((i) => i.id === id));
  const first = project.icons.find((i) => i.id === ids[0]);
  return {
    style: first ? resolveStyle(project.masterStyle, first) : project.masterStyle,
    scope: ids.length ? 'selection' : 'master',
    count: ids.length,
    update: (patch, key) => (ids.length ? updateOverride(ids, patch, key) : updateMaster(patch, key)),
  };
}
