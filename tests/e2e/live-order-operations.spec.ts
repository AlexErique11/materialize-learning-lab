import { expect, test } from './fixtures';
import { completeInvestigation, handover, predicate, repairClient, repairQuery, restoreServing, start, workspace } from './investigation-flow';

test('main entry opens one complaint and an independently completed investigation resumes', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('main').getByRole('link', { name: 'Challenge', exact: true }).click();
  await expect(page).toHaveURL('/challenge');
  await expect(page.getByRole('heading', { name: 'An incident from operations', exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Incident checkpoints' })).toHaveCount(0);
  await completeInvestigation(page);
  await expect(page.getByText('Completed independently', { exact: true })).toBeVisible();
  await page.reload(); await expect(page.getByText('Completed independently', { exact: true })).toBeVisible();
  await expect(page.locator('.guided-lab-controls').getByRole('button', { name: 'Return to investigation', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Challenge overview', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Back to main page', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Review challenge', exact: true })).toBeVisible();
  await expect(page.getByRole('main').getByText('0/8 completed', { exact: true })).toBeVisible();
});

test('repair order is free and equivalent SQL passes the same behavior checks', async ({ page }) => {
  await page.goto('/challenge');
  await start(page);
  await repairClient(page); await restoreServing(page);
  await repairQuery(page, "(mz_now() < (event_at + INTERVAL '300 seconds')) AND (status = 'paid' AND mz_now() >= event_at)");
  await restoreServing(page); await handover(page);
  await expect(page.getByText('Completed independently', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Return to investigation', exact: true }).click();
  await page.getByRole('button', { name: 'Undo last change', exact: true }).click();
  await page.getByRole('button', { name: 'Submit handover', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Complete handover', exact: true })).toBeDisabled();
});

test('all passed checks explain the remaining handover requirement and enable completion at the minimum', async ({ page }, testInfo) => {
  await page.goto('/challenge'); await start(page);
  await repairQuery(page); await repairClient(page); await restoreServing(page);
  await page.getByRole('button', { name: 'Submit handover', exact: true }).click();
  await page.getByRole('button', { name: 'Run acceptance checks', exact: true }).click();
  await expect(page.getByText(/^Passed ·/)).toHaveCount(5, { timeout: 45000 });
  const complete = page.getByRole('button', { name: 'Complete handover', exact: true });
  const explanation = page.getByRole('textbox', { name: 'Explain what caused the discrepancy and how you repaired it', exact: true });
  const status = page.locator('#incident-completion-requirements');
  await expect(complete).toBeDisabled();
  await expect(status).toHaveText('All five checks passed. Write a repair explanation of at least 20 characters above to finish.');
  await expect(explanation).toHaveAccessibleDescription(/Required: at least 20 characters. Written: 0 characters/);
  await explanation.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('handover-explanation-required.png') });
  await explanation.fill('   ');
  await expect(complete).toBeDisabled();
  await expect(page.locator('#incident-explanation-requirement')).toContainText('Written: 0 characters');
  await explanation.fill('Fixed SQL and reads');
  await expect(complete).toBeDisabled();
  await expect(page.locator('#incident-explanation-requirement')).toContainText('Written: 19 characters');
  await explanation.fill('Fixed SQL and reads.');
  await expect(complete).toBeEnabled();
  await expect(status).toHaveText('All requirements met. You can complete the handover.');
  await complete.click();
  await expect(page.getByText('Completed independently', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Completed independently', { exact: true })).toBeVisible();
});

test('SQL runs real read-only diagnostics and a wrong valid deployment has observable consequences', async ({ page }) => {
  await page.goto('/challenge'); await start(page); await workspace(page, 'SQL');
  const editor = page.getByRole('textbox', { name: 'Temporal WHERE predicate', exact: true });
  await editor.fill('TRUE'); await page.getByRole('button', { name: 'Run query preview', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Apply query', exact: true })).toBeEnabled({ timeout: 45000 });
  await editor.fill("status = 'paid' AND mz_now() >= event_at");
  await expect(page.getByRole('button', { name: 'Apply query', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Run query preview', exact: true }).click();
  await page.getByRole('button', { name: 'Apply query', exact: true }).click();
  await workspace(page, 'Dashboard');
  await expect(page.getByRole('table', { name: 'Regional order totals', exact: true })).toContainText('90');
  await workspace(page, 'SQL');
  await page.getByRole('button', { name: 'Diagnostic SELECT', exact: true }).click();
  const diagnostic = page.getByRole('textbox', { name: 'Diagnostic SQL', exact: true });
  await diagnostic.fill('SELECT order_id, amount FROM orders WHERE order_id = 104');
  await diagnostic.press('Control+Enter');
  await expect(page.getByRole('table', { name: 'Executed SQL result', exact: true })).toContainText('104');
  await diagnostic.fill('DELETE FROM orders'); await page.getByRole('button', { name: 'Run query preview', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(/read-only|permission denied/);
  await diagnostic.fill('SELECT missing_column FROM orders'); await page.getByRole('button', { name: 'Run query preview', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('missing_column');
  await restoreServing(page); await workspace(page, 'Client');
  await page.getByRole('button', { name: 'Receive next delivery', exact: true }).click();
  await page.getByRole('button', { name: 'Receive next delivery', exact: true }).click();
  await expect(page.getByTestId('subscribe-application')).toContainText('Publishing each received record');
  await expect(page.getByRole('region', { name: 'Pending timestamp tray', exact: true })).toContainText('Published · still open');
  await page.getByRole('button', { name: 'Diagram key', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('This client publishes each signed change as soon as it arrives');
});

test('drafts, workspace and optional restart survive refresh and return', async ({ page }) => {
  await page.goto('/challenge'); await start(page);
  await workspace(page, 'SQL');
  await page.getByRole('textbox', { name: 'Temporal WHERE predicate', exact: true }).fill('unfinished predicate');
  await page.getByRole('link', { name: 'Back to main page', exact: true }).click();
  await page.getByRole('link', { name: 'Resume challenge', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Temporal WHERE predicate', exact: true })).toHaveValue('unfinished predicate');
  await page.reload(); await expect(page.getByRole('textbox', { name: 'Temporal WHERE predicate', exact: true })).toHaveValue('unfinished predicate');
  await page.getByRole('button', { name: 'Restart challenge', exact: true }).click();
  await page.getByRole('button', { name: 'Keep this run', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Temporal WHERE predicate', exact: true })).toHaveValue('unfinished predicate');
  await page.getByRole('button', { name: 'Restart challenge', exact: true }).click();
  await page.getByRole('button', { name: 'Restart investigation', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start investigation', exact: true })).toBeVisible();
  await expect(page.getByText('Saved in this browser', { exact: true })).toHaveCount(0);
});

test('open tabs synchronize automatically without loading prompts', async ({ page, context }) => {
  await page.goto('/challenge'); await start(page);
  const other = await context.newPage(); await other.goto('/challenge');
  await workspace(page, 'SQL');
  await expect(other.getByRole('textbox', { name: 'Temporal WHERE predicate', exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Temporal WHERE predicate', exact: true }).fill(predicate);
  await expect(other.getByRole('textbox', { name: 'Temporal WHERE predicate', exact: true })).toHaveValue(predicate);
  await expect(other.getByRole('button', { name: 'Load saved run', exact: true })).toHaveCount(0);
  await other.getByRole('button', { name: 'Restart challenge', exact: true }).click();
  await other.getByRole('button', { name: 'Restart investigation', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start investigation', exact: true })).toBeVisible();
  await other.close();
});

test('assistance is optional and recorded; syntax errors and stale previews cannot deploy', async ({ page }) => {
  await page.goto('/challenge'); await start(page);
  await workspace(page, 'SQL');
  await page.getByRole('textbox', { name: 'Temporal WHERE predicate', exact: true }).fill('DROP TABLE orders');
  await page.getByRole('button', { name: 'Run query preview', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Apply query', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Investigation help', exact: true }).click();
  await page.getByRole('button', { name: 'Get next hint', exact: true }).click();
  await page.getByRole('button', { name: 'Show worked repair', exact: true }).click();
  await page.getByRole('button', { name: 'Run query preview', exact: true }).click();
  await page.getByRole('button', { name: 'Apply query', exact: true }).click();
  await repairClient(page); await restoreServing(page); await handover(page);
  await expect(page.getByText('Completed with walkthrough', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Restart challenge', exact: true }).click(); await page.getByRole('button', { name: 'Restart investigation', exact: true }).click();
  await expect(page.getByText(/Previous investigation completion saved/)).toBeVisible();
});

test('first-version history is preserved without migrating its active checkpoint', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('materialize-learning-lab-challenges-v1', JSON.stringify({ version: 1, run: { stage: 4 }, achievements: [{ runId: 'old', scenarioVersion: 1, assisted: false, hints: 0, durationMs: 2000, completedAt: 1 }] })));
  await page.goto('/challenge');
  await expect(page.getByText(/First version · historical completion preserved/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start investigation', exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('materialize-learning-lab-challenges-v1')!).run.stage)).toBe(4);
});

test('corrupt and unavailable storage keep the investigation usable', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('materialize-learning-lab-challenge-v2', '{broken'));
  await page.goto('/challenge'); await expect(page.getByText(/saved investigation is incompatible or incomplete/)).toBeVisible();
  await start(page); await expect(page.getByText(/saved investigation is incompatible or incomplete/)).toHaveCount(0);
  await page.evaluate(() => { const original = Storage.prototype.setItem; Storage.prototype.setItem = function (key, value) { if (key === 'materialize-learning-lab-challenge-v2') throw new DOMException('Blocked', 'QuotaExceededError'); return original.call(this, key, value); }; });
  await workspace(page, 'Data'); await expect(page.getByRole('status').filter({ hasText: 'Storage is unavailable.' })).toBeVisible();
  await workspace(page, 'Client'); await expect(page.getByRole('combobox', { name: 'Publish application updates' })).toBeVisible();
});

test('cancel and changed drafts cannot leave a deployable stale SQL preview', async ({ page }) => {
  await page.goto('/challenge'); await start(page); await workspace(page, 'SQL');
  const editor = page.getByRole('textbox', { name: 'Temporal WHERE predicate', exact: true });
  await editor.fill(predicate); await page.getByRole('button', { name: 'Run query preview', exact: true }).click();
  await editor.fill('TRUE'); await expect(page.getByRole('button', { name: 'Apply query', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Run query preview', exact: true })).toBeEnabled({ timeout: 45000 });
  await page.getByRole('button', { name: 'Diagnostic SELECT', exact: true }).click();
  await page.getByRole('textbox', { name: 'Diagnostic SQL', exact: true }).fill('SELECT pg_sleep(20)');
  await page.getByRole('button', { name: 'Run query preview', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel execution', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('cancelled');
  await page.getByRole('textbox', { name: 'Diagnostic SQL', exact: true }).fill('SELECT 42 AS answer');
  await page.getByRole('button', { name: 'Run query preview', exact: true }).click();
  await expect(page.getByRole('table', { name: 'Executed SQL result', exact: true })).toContainText('42', { timeout: 45000 });
  await page.getByRole('button', { name: 'Repair deployed query', exact: true }).click();
  await expect(editor).toHaveValue('TRUE');
  await expect(page.getByRole('button', { name: 'Apply query', exact: true })).toBeDisabled();
});
