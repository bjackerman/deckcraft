import type { IconItem, IconStyle, IconStyleOverride } from '@/types';

export function mergeStyle(base: IconStyle, override?: IconStyleOverride): IconStyle {
  if (!override) return base;
  return {
    background: { ...base.background, ...override.background },
    glyph: { ...base.glyph, ...override.glyph },
    badge: { ...base.badge, ...override.badge },
  };
}

/** Effective style for an icon: locked icons use their frozen snapshot, others layer overrides over the master. */
export function resolveStyle(master: IconStyle, icon: IconItem): IconStyle {
  if (icon.isLocked && icon.lockedStyle) return icon.lockedStyle;
  return mergeStyle(master, icon.customStyle);
}

export function sanitizeFileName(name: string): string {
  const cleaned = name
    .normalize('NFKD')
    .replace(/[^\w\- ]+/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
  return cleaned || 'icon';
}

export function applyNamePattern(pattern: string, vars: { index: number; keyName: string; state: string }): string {
  const idx = String(vars.index + 1).padStart(2, '0');
  const out = pattern
    .replace(/\{index\}/g, idx)
    .replace(/\{keyName\}/g, sanitizeFileName(vars.keyName))
    .replace(/\{state\}/g, vars.state);
  return out.replace(/[\\/:*?"<>|]+/g, '_');
}
