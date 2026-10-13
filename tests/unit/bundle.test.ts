import { describe, it, expect } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import type { IconItem } from '@/types';
import { createProject } from '@/utils/constants';
import { serializeBundle, parseBundle, importProjectFile } from '@/utils/bundle';

// jsdom's File/Blob lack text()/arrayBuffer(); polyfill via FileReader.
for (const [name, method] of [['text', 'readAsText'], ['arrayBuffer', 'readAsArrayBuffer']] as const) {
  if (typeof Blob.prototype[name] !== 'function') {
    Object.defineProperty(Blob.prototype, name, { configurable: true, writable: true, value: function (this: Blob) {
      return new Promise<string | ArrayBuffer | null>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = () => reject(r.error);
        if (method === 'readAsText') r.readAsText(this);
        else r.readAsArrayBuffer(this);
      });
    } });
  }
}
const icon = (name: string): IconItem => ({
  id: crypto.randomUUID(),
  name,
  sourceType: 'svg',
  rawPayload: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M0 0h10v10z"/></svg>',
  isLocked: false,
  cachedRenderUri: 'blob:should-be-dropped',
});

describe('bundle', () => {
  it('roundtrips a project and drops cachedRenderUri', () => {
    const p = createProject('stream-deck-mk2');
    p.title = 'My deck';
    p.icons = [icon('a'), icon('b')];
    p.icons[1].customStyle = { glyph: { tintColor: '#ff0000' } };
    const text = serializeBundle(p);
    expect(text).not.toContain('should-be-dropped');
    const back = parseBundle(text);
    expect(back.id).toBe(p.id);
    expect(back.title).toBe('My deck');
    expect(back.hardwareProfile).toBe('stream-deck-mk2');
    expect(back.masterStyle).toEqual(p.masterStyle);
    expect(back.icons.map((i) => i.name)).toEqual(['a', 'b']);
    expect(back.icons[1].customStyle).toEqual({ glyph: { tintColor: '#ff0000' } });
    expect(back.icons[0].cachedRenderUri).toBeUndefined();
  });

  it('does not mutate the source project when serializing', () => {
    const p = createProject();
    p.icons = [icon('a')];
    serializeBundle(p);
    expect(p.icons[0].cachedRenderUri).toBe('blob:should-be-dropped');
  });

  it('generates an id when missing', () => {
    const p = createProject();
    const obj = JSON.parse(serializeBundle(p));
    obj.project.id = '';
    expect(parseBundle(JSON.stringify(obj)).id).toBeTruthy();
  });

  it('rejects invalid input', () => {
    expect(() => parseBundle('not json')).toThrow();
    expect(() => parseBundle('{}')).toThrow(/valid/);
    expect(() => parseBundle(JSON.stringify({ format: 'other', project: createProject() }))).toThrow(/valid/);
    expect(() => parseBundle(JSON.stringify({ format: 'deckcraft-project', project: { icons: 'x', masterStyle: {} } }))).toThrow(/valid/);
    expect(() => parseBundle(JSON.stringify({ format: 'deckcraft-project', project: { icons: [] } }))).toThrow(/valid/);
    expect(() => parseBundle('null')).toThrow();
  });

  it('imports from a .deckcraft file and from a ZIP', async () => {
    const p = createProject();
    p.icons = [icon('z')];
    const text = serializeBundle(p);
    const plain = new File([text], 'x.deckcraft');
    expect((await importProjectFile(plain)).icons[0].name).toBe('z');

    const zip = zipSync({ 'project.deckcraft': strToU8(text) });
    const zf = new File([zip], 'export.zip');
    expect((await importProjectFile(zf)).id).toBe(p.id);

    const empty = new File([zipSync({ 'other.txt': strToU8('hi') })], 'bad.zip');
    await expect(importProjectFile(empty)).rejects.toThrow(/project\.deckcraft/);
  });
});
