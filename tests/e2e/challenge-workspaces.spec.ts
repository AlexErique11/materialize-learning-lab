import { expect, test } from './fixtures';
import { predicate, restoreServing, start, workspace } from './investigation-flow';
const saved = (page: import('@playwright/test').Page) => page.evaluate(() => JSON.parse(localStorage.getItem('materialize-learning-lab-challenge-v2')!).run);

test('settings stay as drafts across workspaces and reload until explicitly applied', async ({ page }) => {
  await page.goto('/challenge'); await start(page); await workspace(page, 'Data');
  await page.getByRole('combobox', { name: 'Order envelope', exact: true }).selectOption('NONE');
  await expect(page.getByText('Applied source: UPSERT · order_id', { exact: true })).toBeVisible();
  await expect(page.getByText('Not applied · your edits are saved as a draft.', { exact: true })).toBeVisible();
  await workspace(page, 'Client');
  await page.getByRole('combobox', { name: 'Publish application updates', exact: true }).selectOption('complete');
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Publish application updates', exact: true })).toHaveValue('complete');
  expect((await saved(page)).config.publication).toBe('each');
  await page.getByRole('button', { name: 'Apply changes', exact: true }).press('Enter');
  expect((await saved(page)).config.publication).toBe('complete');
  await workspace(page, 'Data');
  await expect(page.getByRole('combobox', { name: 'Order envelope', exact: true })).toHaveValue('NONE');
  await page.getByRole('button', { name: 'Discard edits', exact: true }).press('Enter');
  await expect(page.getByRole('combobox', { name: 'Order envelope', exact: true })).toHaveValue('UPSERT');
  await page.getByRole('combobox', { name: 'Order identity', exact: true }).selectOption('customer_id');
  await page.getByRole('button', { name: 'Apply changes', exact: true }).click();
  await expect(page.getByText('Applied source: UPSERT · customer_id', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Undo last change', exact: true }).click();
  await expect(page.getByText('Applied source: UPSERT · order_id', { exact: true })).toBeVisible();
});

test('client and request choices preserve previews and reads; source changes invalidate them', async ({ page }) => {
  await page.goto('/challenge'); await start(page); await workspace(page, 'SQL');
  await page.getByRole('textbox', { name: 'Temporal WHERE predicate', exact: true }).fill(predicate);
  await page.getByRole('button', { name: 'Run query preview', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Apply query', exact: true })).toBeEnabled({ timeout: 45000 });
  await restoreServing(page);
  const original = await saved(page);
  await workspace(page, 'Client');
  await page.getByRole('combobox', { name: 'Publish application updates', exact: true }).selectOption('complete');
  await page.getByRole('button', { name: 'Apply changes', exact: true }).click();
  expect((await saved(page)).read).toEqual(original.read);
  await page.getByRole('button', { name: 'Receive next delivery', exact: true }).click();
  await workspace(page, 'System');
  await page.getByRole('checkbox', { name: 'Authorize labeled ten-second fallback', exact: true }).check();
  expect((await saved(page)).read).toEqual(original.read);
  expect((await saved(page)).deliveries).toBe(1);
  await page.getByRole('combobox', { name: 'Serving indexes', exact: true }).selectOption('none');
  expect((await saved(page)).read).toEqual(original.read);
  await page.getByRole('button', { name: 'Apply changes', exact: true }).click();
  expect((await saved(page)).read).toBeNull();
  expect((await saved(page)).deliveries).toBe(1);
  await workspace(page, 'SQL');
  await expect(page.getByRole('button', { name: 'Apply query', exact: true })).toBeEnabled();
  await workspace(page, 'Data');
  await page.getByRole('combobox', { name: 'Order envelope', exact: true }).selectOption('NONE');
  await page.getByRole('button', { name: 'Apply changes', exact: true }).click();
  expect((await saved(page)).deliveries).toBe(0);
  await workspace(page, 'SQL');
  await expect(page.getByRole('button', { name: 'Apply query', exact: true })).toBeDisabled();
  await page.getByRole('combobox', { name: 'Historical replay snapshot', exact: true }).selectOption('0');
  expect((await saved(page)).time).toBe(631000);
});

test('named events change shared time separately from processing and view selection', async ({ page }) => {
  await page.goto('/challenge'); await start(page); await restoreServing(page);
  await workspace(page, 'Data');
  await page.getByRole('textbox', { name: 'Filter by order ID', exact: true }).fill('101');
  const orders = page.getByRole('table', { name: 'Current source rows', exact: true });
  await expect(orders.getByRole('cell', { name: '70', exact: true })).toBeVisible();
  const shared = page.getByRole('region', { name: 'Shared incident state', exact: true });
  await expect(shared).toContainText('631 s · subscription baseline');
  await page.getByRole('button', { name: 'Advance incident', exact: true }).click();
  await expect(shared).toContainText('Updates pending');
  await expect(orders.getByRole('cell', { name: '70', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Advance incident', exact: true }).click();
  await expect(orders.getByRole('cell', { name: '90', exact: true })).toBeVisible();
  await workspace(page, 'Dashboard');
  await expect(page.getByText('New input is available, but processing is pending.', { exact: false })).toBeVisible();
  const before = await page.getByRole('table', { name: 'Regional order totals', exact: true }).innerText();
  await workspace(page, 'System');
  await page.getByRole('button', { name: 'Process pending updates', exact: true }).click();
  await expect(shared).toContainText('Caught up'); expect((await saved(page)).time).toBe(632000);
  await workspace(page, 'Dashboard');
  await expect(page.getByRole('table', { name: 'Regional order totals', exact: true })).not.toHaveText(before);
  await expect(page.getByRole('button', { name: 'Advance incident', exact: true })).toBeDisabled();
});

test('controls and results retain their layout in both themes and narrow screens', async ({ page }, testInfo) => {
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/challenge'); await start(page); await workspace(page, 'SQL');
  await page.getByRole('button', { name: 'Run query preview', exact: true }).click();
  await expect(page.getByRole('table', { name: 'Executed SQL result', exact: true })).toBeVisible({ timeout: 45000 });
  for (const theme of ['light', 'dark']) {
    if (theme === 'dark') await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click();
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 640 }, { width: 390, height: 844 }, { width: 320, height: 640 }]) {
      await page.setViewportSize(viewport);
      for (const name of ['Dashboard', 'Data', 'SQL', 'System', 'Client']) {
        await workspace(page, name);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        const pair = page.locator('.incident-workspace-pair').first();
        const controls = (await pair.locator('.incident-controls').boundingBox())!;
        const results = (await pair.locator('.incident-results').boundingBox())!;
        if (viewport.width >= 1280) expect(controls.x + controls.width).toBeLessThan(results.x);
        else expect(controls.y + controls.height).toBeLessThan(results.y);
        if (viewport.width === 1440 || viewport.width === 390) await page.screenshot({ path: testInfo.outputPath(`${name}-${theme}-${viewport.width}.png`), fullPage: true });
      }
    }
  }
});
