import { expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { unzipSync } from 'fflate';

export const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export function svg(color: string, i: number): { name: string; mimeType: string; buffer: Buffer } {
  const body = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><circle cx="32" cy="32" r="${12 + i * 3}" fill="${color}"/><rect x="8" y="8" width="16" height="16" fill="#ffffff"/></svg>`;
  return { name: `icon-${i}.svg`, mimeType: 'image/svg+xml', buffer: Buffer.from(body) };
}

/** Complex SVG: many gradient-filled shapes plus a blur filter. */
export function complexSvg(): { name: string; mimeType: string; buffer: Buffer } {
  let shapes = '';
  for (let i = 0; i < 120; i++) {
    const x = (i * 37) % 256;
    const y = (i * 91) % 256;
    shapes += `<circle cx="${x}" cy="${y}" r="${10 + (i % 25)}" fill="url(#g${i % 3})" opacity="0.6" filter="url(#b)"/>`;
  }
  const body = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256"><defs>
<linearGradient id="g0" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff0080"/><stop offset="1" stop-color="#00e5ff"/></linearGradient>
<radialGradient id="g1"><stop offset="0" stop-color="#ffee00"/><stop offset="1" stop-color="#6a00ff"/></radialGradient>
<linearGradient id="g2" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#00ff6a"/><stop offset="1" stop-color="#ff5500"/></linearGradient>
<filter id="b"><feGaussianBlur stdDeviation="2"/></filter></defs>${shapes}</svg>`;
  return { name: 'complex.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(body) };
}

function crc32(buf: Buffer): number {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/** Noisy full-colour gradient PNG: worst case for palette/size compression. */
export function gradientPng(size = 512): { name: string; mimeType: string; buffer: Buffer } {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  let seed = 12345;
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const n = (seed >>> 24) % 48;
      const o = row + 1 + x * 4;
      raw[o] = Math.min(255, Math.round((x / size) * 207) + n);
      raw[o + 1] = Math.min(255, Math.round((y / size) * 207) + n);
      raw[o + 2] = Math.min(255, Math.round(((x + y) / (2 * size)) * 207) + n);
      raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const buffer = Buffer.concat([Buffer.from(PNG_SIG), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
  return { name: 'gradient.png', mimeType: 'image/png', buffer };
}

export async function importIcons(page: Page, files: { name: string; mimeType: string; buffer: Buffer }[]) {
  await page.getByTestId('icon-file-input').setInputFiles(files);
  await expect(page.locator('[data-icon-id]')).toHaveCount(files.length, { timeout: 20_000 });
}

/** Opens Export dialog, picks target, runs export, returns unzipped entries. */
export async function exportZip(page: Page, targetLabel: RegExp): Promise<Record<string, Uint8Array>> {
  await page.getByRole('button', { name: /Export Package/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Export package' });
  await dialog.getByLabel(targetLabel).check();
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 60_000 }), dialog.getByRole('button', { name: 'Export ZIP' }).click()]);
  const path = await download.path();
  await expect(page.getByTestId('export-audit')).toBeVisible();
  return unzipSync(new Uint8Array(readFileSync(path)));
}

export function hasPngSignature(b: Uint8Array): boolean {
  return PNG_SIG.every((v, i) => b[i] === v);
}

/** Dominant colour sample of a tile canvas (pixel near left edge, vertical middle). */
export async function tileSample(page: Page, index: number): Promise<number[]> {
  return page.locator('[data-icon-id] canvas').nth(index).evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(30, 96, 1, 1).data));
}
