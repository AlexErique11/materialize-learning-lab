import { expect, test } from './fixtures';
import { start, workspace, restoreServing } from './investigation-flow';

test('table arrow keys preserve the clock and handover shortcuts match available actions', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/challenge'); await start(page); await workspace(page, 'Data');
  const table = page.getByRole('region', { name: 'Current source rows', exact: true });
  await table.focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(() => table.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('materialize-learning-lab-challenge-v2')!).run.time)).toBe(630000);
  await page.getByRole('button', { name: 'Review handover', exact: true }).click();
  await page.keyboard.press('s');
  await expect(page.getByRole('dialog', { name: 'Incident reference', exact: true })).toBeVisible();
  await page.keyboard.press('s');
  await expect(page.getByRole('dialog', { name: 'Incident reference', exact: true })).not.toBeVisible();
  await page.getByRole('button', { name: 'Keyboard shortcuts', exact: true }).click();
  const shortcuts = page.getByRole('dialog', { name: 'Keyboard shortcuts', exact: true });
  await expect(shortcuts).toContainText('Restart challenge');
  await expect(shortcuts).not.toContainText('Advance the incident clock');
  await page.keyboard.press('Escape'); await expect(shortcuts).not.toBeVisible();
  await page.keyboard.press('r');
  await expect(page.getByRole('dialog', { name: 'Restart this investigation?', exact: true })).toBeVisible();
});

test('diagnostics retain duplicate columns and temporal repairs enforce Materialize operators', async ({ page }) => {
  await page.goto('/challenge'); await start(page); await workspace(page, 'SQL');
  await page.getByRole('combobox', { name: 'Scenario replay snapshot', exact: true }).selectOption('10');
  const editor = page.getByRole('textbox', { name: 'Temporal WHERE predicate', exact: true });
  await editor.fill("(mz_now()) != (o.event_at)");
  await page.getByRole('button', { name: 'Run query preview', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('not supported');
  await expect(page.getByRole('button', { name: 'Apply query', exact: true })).toBeDisabled();
  await editor.fill("(mz_now()) >= (o.event_at)");
  await page.getByRole('button', { name: 'Run query preview', exact: true }).click();
  await expect(page.getByRole('table', { name: 'Executed SQL result', exact: true })).toBeVisible({ timeout: 45000 });
  await page.getByRole('button', { name: 'Diagnostic SELECT', exact: true }).click();
  await page.getByRole('textbox', { name: 'Diagnostic SQL', exact: true }).fill('SELECT 1 AS x, 2 AS x');
  await page.getByRole('button', { name: 'Run query preview', exact: true }).click();
  await expect(page.getByRole('table', { name: 'Executed SQL result', exact: true }).locator('tbody td')).toHaveText(['1', '2']);
  await expect(page.getByText('1 row · columns:', { exact: false })).toBeVisible();
});

test('serving observations match missing objects and compact layouts keep controls close to results', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/challenge'); await start(page); await restoreServing(page);
  await page.getByRole('combobox', { name: 'Serving indexes', exact: true }).selectOption('none');
  await page.getByRole('button', { name: 'Apply changes', exact: true }).click();
  await page.getByRole('button', { name: 'Request normal read', exact: true }).click();
  await expect(page.getByRole('table', { name: 'System write frontiers', exact: true })).toContainText('Not configured');
  await expect(page.getByRole('region', { name: 'Query outcome', exact: true })).toContainText('serving path is missing');
  await expect(page.getByRole('region', { name: 'Query outcome', exact: true })).not.toContainText('not complete across all inputs');
  await workspace(page, 'Dashboard'); await expect(page.getByText('Serving unavailable', { exact: true })).toBeVisible();
  await expect(page.getByText('40 ms · illustrative', { exact: true })).toHaveCount(0);
  await page.getByText('Preparing the local SQL workspace…', { exact: false }).waitFor({ state: 'hidden' });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await workspace(page, 'Data');
    const firstCard = (await page.locator('.incident-controls > .incident-card').boundingBox())!;
    expect(firstCard.y).toBeLessThan(650);
    const result = (await page.locator('.incident-results').boundingBox())!;
    const settings = (await page.locator('.incident-secondary-controls').boundingBox())!;
    expect(result.y).toBeLessThan(settings.y);
    await page.getByRole('combobox', { name: 'Relation or history', exact: true }).selectOption('customers');
    await expect(page.locator('.incident-results')).not.toContainText('Applied source:');
    await workspace(page, 'System');
    const ticks = await page.locator('.read-axis > div > span').evaluateAll(elements => elements.map(element => element.getBoundingClientRect()).filter(rect => rect.width).map(rect => ({ left: rect.left, right: rect.right })));
    for (let i = 1; i < ticks.length; i++) expect(ticks[i]!.left - ticks[i - 1]!.right).toBeGreaterThan(8);
  }
});
