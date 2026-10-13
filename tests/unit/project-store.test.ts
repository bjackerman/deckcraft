import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IconItem } from '@/types';
import { createProject, DEFAULT_STYLE } from '@/utils/constants';
import { resolveStyle } from '@/utils/style';
import { HISTORY_LIMIT, useProjectStore } from '@/store/projectStore';

const mk = (name: string): IconItem => ({
  id: crypto.randomUUID(),
  name,
  sourceType: 'svg',
  rawPayload: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"/>',
  isLocked: false,
});
const st = () => useProjectStore.getState();
const names = () => st().currentProject.icons.map((i) => i.name);

beforeEach(() => {
  vi.useRealTimers();
  st().setProject(createProject());
});

describe('master style', () => {
  it('updates affect unlocked icons, locked icons keep their frozen style', () => {
    const [a, b, c] = [mk('a'), mk('b'), mk('c')];
    st().addIcons([a, b, c]);
    st().toggleLockIcon(b.id);
    st().updateMasterStyle({ background: { primaryColor: '#ff0000' }, glyph: { tintColor: '#00ff00' } });

    const { masterStyle, icons } = st().currentProject;
    expect(masterStyle.background.primaryColor).toBe('#ff0000');
    expect(masterStyle.background.secondaryColor).toBe(DEFAULT_STYLE.background.secondaryColor);
    const r = (id: string) => resolveStyle(masterStyle, icons.find((i) => i.id === id)!);
    expect(r(a.id).background.primaryColor).toBe('#ff0000');
    expect(r(c.id).glyph.tintColor).toBe('#00ff00');
    expect(r(b.id).background.primaryColor).toBe(DEFAULT_STYLE.background.primaryColor);
    expect(r(b.id).glyph.tintColor).toBe(DEFAULT_STYLE.glyph.tintColor);
  });

  it('per-icon overrides survive master updates and win over master', () => {
    const a = mk('a');
    st().addIcons([a]);
    st().updateIconOverride([a.id], { glyph: { tintColor: '#123456' } });
    st().updateMasterStyle({ glyph: { tintColor: '#ffffff', scale: 0.9 } });
    const s = resolveStyle(st().currentProject.masterStyle, st().currentProject.icons[0]);
    expect(s.glyph.tintColor).toBe('#123456');
    expect(s.glyph.scale).toBe(0.9);
  });

  it('replaceMasterStyle replaces fully', () => {
    const next = structuredClone(DEFAULT_STYLE);
    next.background.shape = 'hexagon';
    st().replaceMasterStyle(next);
    expect(st().currentProject.masterStyle.background.shape).toBe('hexagon');
  });
});

describe('locking', () => {
  it('lock freezes current resolved style (including overrides); unlock clears it', () => {
    const a = mk('a');
    st().addIcons([a]);
    st().updateIconOverride([a.id], { badge: { text: 'hi' } });
    st().toggleLockIcon(a.id);
    let icon = st().currentProject.icons[0];
    expect(icon.isLocked).toBe(true);
    expect(icon.lockedStyle?.badge.text).toBe('hi');
    st().toggleLockIcon(a.id);
    icon = st().currentProject.icons[0];
    expect(icon.isLocked).toBe(false);
    expect(icon.lockedStyle).toBeUndefined();
  });
});

describe('updateIconOverride', () => {
  it('only touches the targeted icons and merges patches', () => {
    const [a, b] = [mk('a'), mk('b')];
    st().addIcons([a, b]);
    st().updateIconOverride([a.id], { glyph: { scale: 0.3 } });
    st().updateIconOverride([a.id], { glyph: { rotation: 20 }, badge: { enabled: true, text: '3' } });
    const [ia, ib] = st().currentProject.icons;
    expect(ia.customStyle?.glyph).toEqual({ scale: 0.3, rotation: 20 });
    expect(ia.customStyle?.badge).toEqual({ enabled: true, text: '3' });
    expect(ib.customStyle).toBeUndefined();
  });
  it('applies to multiple ids at once', () => {
    const [a, b] = [mk('a'), mk('b')];
    st().addIcons([a, b]);
    st().updateIconOverride([a.id, b.id], { background: { primaryColor: '#010101' } });
    for (const i of st().currentProject.icons) expect(i.customStyle?.background?.primaryColor).toBe('#010101');
  });
  it('edits a locked icon’s frozen style rather than customStyle', () => {
    const a = mk('a');
    st().addIcons([a]);
    st().toggleLockIcon(a.id);
    st().updateIconOverride([a.id], { glyph: { tintColor: '#abcdef' } });
    const i = st().currentProject.icons[0];
    expect(i.lockedStyle?.glyph.tintColor).toBe('#abcdef');
    expect(i.customStyle).toBeUndefined();
    st().updateMasterStyle({ glyph: { tintColor: '#000000' } });
    expect(resolveStyle(st().currentProject.masterStyle, st().currentProject.icons[0]).glyph.tintColor).toBe('#abcdef');
  });
});

describe('undo / redo', () => {
  it('undoes and redoes changes', () => {
    st().addIcons([mk('a')]);
    st().addIcons([mk('b')]);
    expect(names()).toEqual(['a', 'b']);
    st().undo();
    expect(names()).toEqual(['a']);
    st().undo();
    expect(names()).toEqual([]);
    st().undo();
    expect(names()).toEqual([]);
    st().redo();
    st().redo();
    expect(names()).toEqual(['a', 'b']);
    st().redo();
    expect(names()).toEqual(['a', 'b']);
  });
  it('a new edit clears the redo stack', () => {
    st().addIcons([mk('a')]);
    st().undo();
    expect(st().future).toHaveLength(1);
    st().addIcons([mk('b')]);
    expect(st().future).toHaveLength(0);
    expect(names()).toEqual(['b']);
  });
  it('caps history at 30', () => {
    expect(HISTORY_LIMIT).toBe(30);
    for (let i = 0; i < 45; i++) st().addIcons([mk(`i${i}`)]);
    expect(st().past).toHaveLength(30);
    for (let i = 0; i < 40; i++) st().undo();
    expect(st().currentProject.icons).toHaveLength(45 - 30);
  });
  it('setProject resets history', () => {
    st().addIcons([mk('a')]);
    st().setProject(createProject());
    expect(st().past).toHaveLength(0);
    expect(st().future).toHaveLength(0);
  });
});

describe('coalescing', () => {
  it('merges rapid edits with the same key into one undo step', () => {
    st().updateMasterStyle({ glyph: { scale: 0.1 } }, 'k');
    st().updateMasterStyle({ glyph: { scale: 0.2 } }, 'k');
    st().updateMasterStyle({ glyph: { scale: 0.3 } }, 'k');
    expect(st().past).toHaveLength(1);
    expect(st().currentProject.masterStyle.glyph.scale).toBe(0.3);
    st().undo();
    expect(st().currentProject.masterStyle.glyph.scale).toBe(DEFAULT_STYLE.glyph.scale);
  });
  it('does not merge different keys, missing keys, or edits after the window', () => {
    st().updateMasterStyle({ glyph: { scale: 0.1 } }, 'a');
    st().updateMasterStyle({ glyph: { scale: 0.2 } }, 'b');
    expect(st().past).toHaveLength(2);
    st().updateMasterStyle({ glyph: { scale: 0.3 } });
    st().updateMasterStyle({ glyph: { scale: 0.4 } });
    expect(st().past).toHaveLength(4);

    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    st().setProject(createProject());
    st().updateMasterStyle({ glyph: { scale: 0.1 } }, 'z');
    vi.setSystemTime(1_000_000 + 1000);
    st().updateMasterStyle({ glyph: { scale: 0.2 } }, 'z');
    expect(st().past).toHaveLength(2);
    vi.setSystemTime(1_000_000 + 1200);
    st().updateMasterStyle({ glyph: { scale: 0.3 } }, 'z');
    expect(st().past).toHaveLength(2);
  });
  it('an intervening non-keyed edit breaks coalescing', () => {
    st().updateMasterStyle({ glyph: { scale: 0.1 } }, 'k');
    st().addIcons([mk('a')]);
    st().updateMasterStyle({ glyph: { scale: 0.2 } }, 'k');
    expect(st().past).toHaveLength(3);
  });
});

describe('icon list operations', () => {
  it('reorders icons and ignores invalid indices', () => {
    st().addIcons(['a', 'b', 'c', 'd'].map(mk));
    st().reorderIcons(0, 2);
    expect(names()).toEqual(['b', 'c', 'a', 'd']);
    st().reorderIcons(3, 0);
    expect(names()).toEqual(['d', 'b', 'c', 'a']);
    const before = st().past.length;
    st().reorderIcons(1, 1);
    st().reorderIcons(-1, 2);
    st().reorderIcons(0, 9);
    expect(names()).toEqual(['d', 'b', 'c', 'a']);
    expect(st().past.length).toBe(before + 3); // no-ops still record history entries
  });
  it('removes icons by id', () => {
    const icons = ['a', 'b', 'c'].map(mk);
    st().addIcons(icons);
    st().removeIcons([icons[0].id, icons[2].id, 'missing']);
    expect(names()).toEqual(['b']);
    st().undo();
    expect(names()).toEqual(['a', 'b', 'c']);
  });
  it('renames icons, project and hardware profile', () => {
    const a = mk('a');
    st().addIcons([a]);
    st().renameIcon(a.id, 'new');
    st().renameProject('Deck');
    st().setHardwareProfile('stream-deck-xl');
    expect(names()).toEqual(['new']);
    expect(st().currentProject.title).toBe('Deck');
    expect(st().currentProject.hardwareProfile).toBe('stream-deck-xl');
  });
});

describe('createToggleStatePair', () => {
  it('inserts a secondary after the source with slash and shared statePairId', () => {
    const [a, b] = [mk('a'), mk('b')];
    st().addIcons([a, b]);
    st().createToggleStatePair(a.id);
    const icons = st().currentProject.icons;
    expect(icons).toHaveLength(3);
    const [p, s, other] = icons;
    expect(p.id).toBe(a.id);
    expect(other.id).toBe(b.id);
    expect(p.toggleState).toBe('primary');
    expect(s.toggleState).toBe('secondary');
    expect(p.statePairId).toBeTruthy();
    expect(s.statePairId).toBe(p.statePairId);
    expect(s.id).not.toBe(p.id);
    expect(s.name).toBe('a (active)');
    const style = resolveStyle(st().currentProject.masterStyle, s);
    expect(style.glyph.slash).toBe(true);
    expect(style.badge.enabled).toBe(true);
    expect(style.badge.pipColor).toBeTruthy();
    expect(resolveStyle(st().currentProject.masterStyle, p).glyph.slash).toBeUndefined();
    expect(other.statePairId).toBeUndefined();
  });
  it('locked source yields a locked-style secondary with slash; unknown id is a no-op', () => {
    const a = mk('a');
    st().addIcons([a]);
    st().toggleLockIcon(a.id);
    st().createToggleStatePair(a.id);
    const s = st().currentProject.icons[1];
    expect(s.lockedStyle?.glyph.slash).toBe(true);
    st().createToggleStatePair('nope');
    expect(st().currentProject.icons).toHaveLength(2);
  });
  it('is undoable', () => {
    const a = mk('a');
    st().addIcons([a]);
    st().createToggleStatePair(a.id);
    st().undo();
    expect(st().currentProject.icons).toHaveLength(1);
    expect(st().currentProject.icons[0].statePairId).toBeUndefined();
  });
});
