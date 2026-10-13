import { expect, test } from '@playwright/test';
import { complexSvg, exportZip, gradientPng, hasPngSignature, importIcons, svg } from './helpers';

test('logitech MX export: every file <= 150KB and PNGs are valid', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  await importIcons(page, [svg('#38bdf8', 1), complexSvg(), gradientPng(512)]);

  const files = await exportZip(page, /Logitech MX/);
  const names = Object.keys(files).filter((n) => !n.endsWith('/'));
  const pngs = names.filter((n) => /\.png$/i.test(n));
  const svgs = names.filter((n) => /\.svg$/i.test(n));
  expect(pngs.length).toBeGreaterThanOrEqual(3);
  expect(svgs.length).toBeGreaterThanOrEqual(3);
  expect(names.some((n) => n.endsWith('.deckcraft'))).toBe(true);

  for (const n of names.filter((x) => /logitech/i.test(x) || pngs.includes(x) || svgs.includes(x))) {
    expect(files[n].length, `${n} size`).toBeLessThanOrEqual(150 * 1024);
  }
  for (const n of pngs) {
    expect(hasPngSignature(files[n]), `${n} PNG signature`).toBe(true);
    const dv = new DataView(files[n].buffer, files[n].byteOffset);
    expect([dv.getUint32(16), dv.getUint32(20)], `${n} dimensions`).toEqual([288, 288]);
  }
  for (const n of svgs) expect(new TextDecoder().decode(files[n])).toContain('<svg');

  const rows = page.getByTestId('export-audit').locator('[data-bytes]');
  expect(await rows.count()).toBeGreaterThan(0);
  for (const bytes of await rows.evaluateAll((els) => els.map((e) => Number(e.getAttribute('data-bytes'))))) {
    expect(bytes).toBeLessThanOrEqual(150 * 1024);
  }
});
