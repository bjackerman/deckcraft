import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { exportZip, importIcons, svg } from './helpers';

test('import icons, export ZIP containing project.deckcraft', async ({ page }) => {
  await page.goto('/');
  await importIcons(page, [svg('#ff00ff', 1), svg('#00ffff', 2)]);
  const files = await exportZip(page, /Elgato/);
  const names = Object.keys(files);
  expect(names.filter((n) => n.endsWith('.png')).length).toBeGreaterThanOrEqual(4);
  const proj = names.find((n) => n.endsWith('.deckcraft'));
  expect(proj).toBeTruthy();
  expect(new TextDecoder().decode(files[proj!]).length).toBeGreaterThan(10);
});

test('project .deckcraft save/load round trip', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Project title').fill('Round Trip Deck');
  await importIcons(page, [svg('#ff0000', 1), svg('#00ff00', 2), svg('#0000ff', 3)]);

  // Let autosave persist so the project is listed
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'Projects' }).click();
  const dialog = page.getByRole('dialog', { name: 'Projects' });
  const [download] = await Promise.all([page.waitForEvent('download'), dialog.getByRole('button', { name: 'Download Round Trip Deck' }).click()]);
  expect(download.suggestedFilename()).toMatch(/\.deckcraft$/);
  const saved = await download.path();
  const json = JSON.parse(readFileSync(saved, 'utf8'));
  expect(JSON.stringify(json)).toContain('Round Trip Deck');

  // Wipe current state by starting a new project, then load the file
  await dialog.getByRole('button', { name: 'New' }).click();
  await expect(page.locator('[data-icon-id]')).toHaveCount(0);

  await page.getByRole('button', { name: 'Projects' }).click();
  await page.getByTestId('project-file-input').setInputFiles(saved);
  await expect(page.locator('[data-icon-id]')).toHaveCount(3, { timeout: 15_000 });
  await expect(page.getByLabel('Project title')).toHaveValue('Round Trip Deck');
});
