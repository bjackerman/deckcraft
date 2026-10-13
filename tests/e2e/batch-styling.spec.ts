import { expect, test } from '@playwright/test';
import { importIcons, svg, tileSample } from './helpers';

test('select all and change style updates every tile', async ({ page }) => {
  await page.goto('/');
  const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00'];
  await importIcons(page, colors.map((c, i) => svg(c, i)));

  await page.locator('[data-icon-id]').first().click();
  await page.keyboard.press('Control+a');
  await expect(page.getByTestId('style-scope')).toContainText('4');

  await page.getByRole('group', { name: 'Fill' }).getByRole('button', { name: 'Solid' }).click();
  await page.getByRole('button', { name: 'Use #ef4444' }).first().click();

  // Expected primary colour #ef4444 = (239, 68, 68) on every tile
  await expect
    .poll(async () => {
      const px = await Promise.all([0, 1, 2, 3].map((i) => tileSample(page, i)));
      return px.every(([r, g, b, a]) => a > 200 && Math.abs(r - 239) < 12 && Math.abs(g - 68) < 12 && Math.abs(b - 68) < 12);
    }, { timeout: 15_000 })
    .toBe(true);

  await page.getByRole('button', { name: 'Use #22c55e' }).first().click();
  await expect
    .poll(async () => {
      const px = await Promise.all([0, 1, 2, 3].map((i) => tileSample(page, i)));
      return px.every(([r, g, b]) => Math.abs(r - 34) < 12 && Math.abs(g - 197) < 12 && Math.abs(b - 94) < 12);
    }, { timeout: 15_000 })
    .toBe(true);
});
