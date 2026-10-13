import { describe, it, expect } from 'vitest';
import { sanitizeSvg } from '@/utils/dompurify';
import { normalizeSvg, tintSvg, handleFileUpload, svgTextToIcon, handlePaste } from '@/utils/ingestion';

// jsdom's File/Blob lack text()/arrayBuffer(); polyfill via FileReader.
for (const [name, method] of [['text', 'readAsText'], ['arrayBuffer', 'readAsArrayBuffer']] as const) {
  if (typeof (Blob.prototype as any)[name] !== 'function') {
    (Blob.prototype as any)[name] = function (this: Blob) {
      return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = () => reject(r.error);
        (r as any)[method](this);
      });
    };
  }
}
const MALICIOUS = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="50" height="50" onload="alert(1)">
  <script>alert('x')</script>
  <foreignObject><div>hi</div></foreignObject>
  <rect width="10" height="10" onclick="alert(2)" fill="url(http://evil.test/a.svg#x)"/>
  <image href="http://evil.test/p.png" width="10" height="10"/>
  <use xlink:href="https://evil.test/sprite.svg#a"/>
  <a href="javascript:alert(3)"><circle r="5"/></a>
  <path d="M0 0h10v10z" style="fill:url(https://evil.test/x)"/>
  <path id="ok" d="M1 1h5v5z" fill="#123456"/>
</svg>`;

describe('sanitizeSvg', () => {
  const out = sanitizeSvg(MALICIOUS);
  it('removes scripts, foreignObject and event handlers', () => {
    expect(out).not.toMatch(/<script/i);
    expect(out).not.toMatch(/foreignObject/i);
    expect(out).not.toMatch(/onload|onclick|alert/i);
  });
  it('removes external hrefs and url() references', () => {
    expect(out).not.toContain('evil.test');
    expect(out).not.toMatch(/javascript:/i);
  });
  it('keeps safe content', () => {
    expect(out).toContain('#123456');
    expect(out).toContain('M1 1h5v5z');
  });
  it('allows local fragment refs and base64 data images', () => {
    const s = sanitizeSvg(
      '<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g"/></defs><rect fill="url(#g)" width="1" height="1"/><image href="data:image/png;base64,iVBORw0KGgo="/></svg>',
    );
    expect(s).toContain('url(#g)');
    expect(s).toContain('data:image/png;base64');
  });
  it('rejects non-image data URIs', () => {
    const s = sanitizeSvg('<svg xmlns="http://www.w3.org/2000/svg"><image href="data:text/html;base64,PHA+"/></svg>');
    expect(s).not.toContain('data:text/html');
  });
});

describe('normalizeSvg', () => {
  it('sets viewBox 0 0 100 100 and removes width/height on root', () => {
    const out = normalizeSvg('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M0 0h24v24z"/></svg>');
    const root = new DOMParser().parseFromString(out, 'image/svg+xml').documentElement;
    expect(root.getAttribute('viewBox')).toBe('0 0 100 100');
    expect(root.hasAttribute('width')).toBe(false);
    expect(root.hasAttribute('height')).toBe(false);
    expect(root.getAttribute('fill')).toBe('currentColor');
    expect(out).toContain('scale(4.166667)');
  });
  it('falls back to width/height when no viewBox and centers non-square art', () => {
    const out = normalizeSvg('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100"/></svg>');
    expect(out).toContain('viewBox="0 0 100 100"');
    expect(out).toContain('translate(0 25)');
    expect(out).toContain('scale(0.5)');
  });
  it('keeps an existing root fill', () => {
    const out = normalizeSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" fill="red"><path d="M0 0h1v1z"/></svg>');
    expect(out).toContain('fill="red"');
  });
  it('sanitizes malicious input during normalization', () => {
    const out = normalizeSvg(MALICIOUS);
    expect(out).not.toMatch(/script|onload|evil\.test/i);
  });
  it('throws on non-SVG input', () => {
    expect(() => normalizeSvg('hello')).toThrow();
    expect(() => normalizeSvg('<div>x</div>')).toThrow();
  });
});

describe('tintSvg', () => {
  const src = normalizeSvg(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0h5v5z" fill="#ff0000" stroke="blue"/><circle r="2" fill="none" stroke="#00f"/><rect style="fill:#abc;stroke:green"/></svg>',
  );
  const out = tintSvg(src, '#ffcc00');
  it('maps fills and strokes to currentColor', () => {
    expect(out).not.toContain('#ff0000');
    expect(out).not.toContain('blue');
    expect(out).not.toContain('#00f');
    expect(out).not.toContain('#abc');
    expect(out).not.toContain('green');
    expect(out).toMatch(/fill="currentColor"[^>]*stroke="currentColor"|stroke="currentColor"[^>]*fill="currentColor"/);
  });
  it('keeps fill="none" and url() paints', () => {
    expect(out).toMatch(/<circle[^>]*fill="none"/);
    const withGrad = tintSvg('<svg xmlns="http://www.w3.org/2000/svg"><path fill="url(#g)" d="M0 0"/></svg>', '#fff');
    expect(withGrad).toContain('url(#g)');
  });
  it('sets root color', () => {
    expect(out).toMatch(/<svg[^>]*color="#ffcc00"/);
  });
  it('returns input unchanged when unparsable', () => {
    expect(tintSvg('nope', '#fff')).toBe('nope');
  });
});

describe('handleFileUpload', () => {
  it('creates a raster icon with a PNG data URI', async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const res = await handleFileUpload([new File([png], 'My Icon.png', { type: 'image/png' })]);
    expect(res.errors).toEqual([]);
    expect(res.icons).toHaveLength(1);
    const i = res.icons[0];
    expect(i.sourceType).toBe('raster');
    expect(i.name).toBe('My Icon');
    expect(i.rawPayload.startsWith('data:image/png;base64,')).toBe(true);
    expect(i.isLocked).toBe(false);
    expect(i.id).toBeTruthy();
  });
  it('creates an svg icon from an SVG file (by type or extension)', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24z"/></svg>';
    const a = await handleFileUpload([new File([svg], 'a.svg', { type: 'image/svg+xml' })]);
    const b = await handleFileUpload([new File([svg], 'b.SVG')]);
    for (const r of [a, b]) {
      expect(r.errors).toEqual([]);
      expect(r.icons[0].sourceType).toBe('svg');
      expect(r.icons[0].rawPayload).toContain('viewBox="0 0 100 100"');
    }
    expect(b.icons[0].name).toBe('b');
  });
  it('reports unsupported types and invalid SVGs but keeps good files', async () => {
    const res = await handleFileUpload([
      new File(['x'], 'notes.txt', { type: 'text/plain' }),
      new File(['not svg'], 'bad.svg', { type: 'image/svg+xml' }),
      new File([new Uint8Array([1])], 'ok.png', { type: 'image/png' }),
    ]);
    expect(res.icons).toHaveLength(1);
    expect(res.errors.map((e) => e.file)).toEqual(['notes.txt', 'bad.svg']);
    expect(res.errors[0].message).toMatch(/unsupported/i);
  });
  it('caps a batch at 100 files', async () => {
    const files = Array.from({ length: 101 }, (_, i) => new File([new Uint8Array([1])], `f${i}.png`, { type: 'image/png' }));
    const res = await handleFileUpload(files);
    expect(res.icons).toHaveLength(100);
    expect(res.errors[0].file).toBe('*');
  });
});

describe('svgTextToIcon / handlePaste', () => {
  it('builds an svg icon', () => {
    const i = svgTextToIcon('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><path d="M0 0h8v8z"/></svg>', 'x');
    expect(i).toMatchObject({ name: 'x', sourceType: 'svg', isLocked: false });
  });
  it('handles null and pasted SVG text', async () => {
    expect(await handlePaste(null)).toEqual({ icons: [], errors: [] });
    const dt = {
      files: [],
      getData: () => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><path d="M0 0h8v8z"/></svg>',
    } as unknown as DataTransfer;
    const r = await handlePaste(dt);
    expect(r.icons[0].name).toBe('pasted-svg');
  });
});
