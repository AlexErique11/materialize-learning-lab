import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { completeInvestigation, handover, predicate, repairClient, repairQuery, repairSource, restoreServing, selectSnapshot, start, workspace, openTools } from './investigation-flow';

async function expectRepairHighlight(page: Page, target: string) {
  await expect.poll(() => page.locator(`[data-repair-target="${target}"]`).evaluate(element => {
    const dialog = document.querySelector<HTMLDialogElement>('dialog.relation-guide[open]');
    const hole = dialog?.querySelector('.relation-guide-hole')?.getBoundingClientRect();
    const card = dialog?.querySelector('.relation-guide-card')?.getBoundingClientRect();
    if (!dialog || !hole || !card) return ['Missing spotlight'];
    const rect = element.getBoundingClientRect();
    const header = document.querySelector('.app-header')?.getBoundingClientRect().bottom ?? 0;
    const issues = [];
    if (rect.top < header || rect.bottom > dialog.clientHeight - 8) issues.push('Target touches or crosses the viewport edge');
    if (rect.left < hole.left || rect.right > hole.right || rect.top < hole.top || rect.bottom > hole.bottom) issues.push('Highlight clips the target');
    if (card.top < 8 || card.bottom > dialog.clientHeight - 8 || card.left < 8 || card.right > dialog.clientWidth - 8) issues.push('Guide card is offscreen');
    if (hole.top < card.bottom && hole.bottom > card.top && hole.left < card.right && hole.right > card.left) issues.push('Guide card overlaps the highlight');
    const table = element.closest('.table-scroll')?.getBoundingClientRect();
    if (table && (rect.left < table.left || rect.right > table.right)) issues.push('Table clips the highlighted row');
    return issues;
  }), { message: `${target} is fully highlighted with room for the guide card` }).toEqual([]);
}

test('main entry opens one complaint and an independently completed investigation resumes', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('main').getByRole('link', { name: 'Challenge', exact: true }).click();
  await expect(page).toHaveURL('/challenge');
  await expect(page.getByRole('heading', { name: 'An incident from operations', exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Incident checkpoints' })).toHaveCount(0);
  await completeInvestigation(page);
  await expect(page.getByText('Completed independently', { exact: true })).toBeVisible();
  await page.reload(); await expect(page.getByText('Completed independently', { exact: true })).toBeVisible();
  await openTools(page);
  await expect(page.locator('.guided-lab-controls').getByRole('button', { name: 'Return to investigation', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Challenge overview', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Back to main page', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Review challenge', exact: true })).toBeVisible();
  await expect(page.getByRole('main').getByText('0/8 completed', { exact: true })).toBeVisible();
});

test('repair order is free and equivalent SQL passes the same behavior checks', async ({ page }) => {
  await page.goto('/challenge');
  await start(page);
  await repairClient(page); await restoreServing(page); await repairSource(page);
  await repairQuery(page, "(mz_now() < (event_at + INTERVAL '300 seconds')) AND (status = 'paid' AND mz_now() >= event_at)");
  await restoreServing(page); await handover(page);
  await expect(page.getByText('Completed independently', { exact: true })).toBeVisible();
  await openTools(page);
  await page.getByRole('button', { name: 'Return to investigation', exact: true }).click();
  await openTools(page);
  await page.getByRole('button', { name: 'Undo last change', exact: true }).click();
  await page.getByRole('button', { name: 'Review handover', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Complete handover', exact: true })).toBeDisabled();
});

test('all five passing checks enable handover without notes', async ({ page }, testInfo) => {
  await page.goto('/challenge'); await start(page);
  await repairSource(page); await repairQuery(page); await repairClient(page); await restoreServing(page);
  await page.getByRole('button', { name: 'Review handover', exact: true }).click();
  const complete = page.getByRole('button', { name: 'Complete handover', exact: true });
  const status = page.locator('#incident-completion-requirements');
  await expect(complete).toBeDisabled();
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await page.getByRole('button', { name: 'Run acceptance checks', exact: true }).click();
  await expect(page.getByText(/^Passed ·/)).toHaveCount(5, { timeout: 45000 });
  await expect(complete).toBeEnabled();
  await expect(status).toHaveText('All five checks passed. You can complete the handover.');
  await expect(page.getByRole('dialog', { name: 'Congratulations!', exact: true })).toBeHidden();
  await page.screenshot({ path: testInfo.outputPath('handover-ready-without-notes.png'), fullPage: true });
  if (testInfo.project.name === 'mobile') await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click();
  await complete.click();
  const celebration = page.getByRole('dialog', { name: 'Congratulations!', exact: true });
  await expect(celebration).toBeVisible();
  await expect(celebration).toContainText('Congratulations on finishing the challenge!');
  await expect(celebration.locator('.incident-firework')).toHaveCount(3);
  await expect.poll(() => celebration.locator('.incident-firework i').first().evaluate(el => el.getAnimations()[0]?.currentTime ?? 0)).toBeGreaterThan(500);
  await page.screenshot({ path: testInfo.outputPath('completion-fireworks.png') });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await celebration.locator('.incident-firework i').first().evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  await page.screenshot({ path: testInfo.outputPath('completion-reduced-motion.png') });
  await page.keyboard.press('Escape');
  await expect(celebration).toBeHidden();
  await expect(page.getByText('Completed independently', { exact: true })).toBeVisible();
  await page.reload();
  await expect(celebration).toBeHidden();
  await expect(page.getByText('Completed independently', { exact: true })).toBeVisible();
});

test('SQL runs real read-only diagnostics and a wrong valid deployment has observable consequences', async ({ page }) => {
  await page.goto('/challenge'); await start(page); await repairSource(page); await workspace(page, 'SQL'); await selectSnapshot(page);
  const editor = page.getByRole('textbox', { name: 'Temporal WHERE predicate', exact: true });
  await editor.fill('TRUE'); await page.getByRole('button', { name: 'Run query preview', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Apply query', exact: true })).toBeEnabled({ timeout: 45000 });
  await editor.fill("status = 'paid' AND mz_now() >= event_at");
  await expect(page.getByRole('button', { name: 'Apply query', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Run query preview', exact: true }).click();
  await page.getByRole('button', { name: 'Apply query', exact: true }).click();
  await workspace(page, 'Dashboard');
  await expect(page.getByRole('table', { name: 'Regional order totals', exact: true })).toContainText('90');
  await workspace(page, 'SQL'); await selectSnapshot(page);
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
  await page.getByRole('button', { name: 'Receive and process delivery', exact: true }).click();
  await page.getByRole('button', { name: 'Receive and process delivery', exact: true }).click();
  await expect(page.getByTestId('subscribe-application')).toContainText('Publishing each received record');
  await expect(page.getByRole('region', { name: 'Pending timestamp tray', exact: true })).toContainText('Published · still open');
  await page.getByRole('button', { name: 'Diagram key', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('This client publishes each signed change as soon as it arrives');
});

test('drafts, workspace and optional restart survive refresh and return', async ({ page }) => {
  await page.goto('/challenge'); await start(page);
  await workspace(page, 'SQL'); await selectSnapshot(page);
  await page.getByRole('textbox', { name: 'Temporal WHERE predicate', exact: true }).fill('unfinished predicate');
  await page.getByRole('link', { name: 'Back to main page', exact: true }).click();
  await page.getByRole('link', { name: 'Resume challenge', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Temporal WHERE predicate', exact: true })).toHaveValue('unfinished predicate');
  await page.reload(); await expect(page.getByRole('textbox', { name: 'Temporal WHERE predicate', exact: true })).toHaveValue('unfinished predicate');
  await page.getByRole('button', { name: 'Restart challenge', exact: true }).click();
  await page.getByRole('button', { name: 'Keep this run', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Temporal WHERE predicate', exact: true })).toHaveValue('unfinished predicate');
  await openTools(page);
  await page.getByRole('button', { name: 'Challenge overview', exact: true }).click();
  await expect(page.locator('.incident-environment-art svg')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Full walkthrough', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Restart challenge', exact: true }).click();
  await page.getByRole('button', { name: 'Restart investigation', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start investigation', exact: true })).toBeVisible();
  await expect(page.getByText('Saved in this browser', { exact: true })).toHaveCount(0);
});

test('open tabs synchronize automatically without loading prompts', async ({ page, context }) => {
  await page.goto('/challenge'); await start(page);
  const other = await context.newPage(); await other.goto('/challenge');
  await workspace(page, 'SQL'); await selectSnapshot(page);
  await expect(other.getByRole('textbox', { name: 'Temporal WHERE predicate', exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Temporal WHERE predicate', exact: true }).fill(predicate);
  await expect(other.getByRole('textbox', { name: 'Temporal WHERE predicate', exact: true })).toHaveValue(predicate);
  await expect(other.getByRole('button', { name: 'Load saved run', exact: true })).toHaveCount(0);
  await other.getByRole('button', { name: 'Restart challenge', exact: true }).click();
  await other.getByRole('button', { name: 'Restart investigation', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start investigation', exact: true })).toBeVisible();
  await other.close();
});

test('worked repairs pass handover without manual follow-up and record assistance', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/challenge'); await start(page);
  const applyWorked = async () => {
    await openTools(page);
    await page.getByRole('button', { name: 'Investigation help', exact: true }).click();
    await page.getByRole('button', { name: 'Apply worked repair', exact: true }).click();
  };
  const completeGuide = async (steps: number) => {
    const guide = page.locator('dialog.relation-guide[open]');
    for (let step = 1; step < steps; step++) await guide.getByRole('button', { name: 'Next', exact: true }).click();
    await guide.getByRole('button', { name: 'Finish', exact: true }).click();
  };

  await workspace(page, 'System');
  await applyWorked();
  await completeGuide(4);
  await expect(page.getByText('Normal read available', { exact: true })).toBeVisible();

  await workspace(page, 'SQL'); await selectSnapshot(page);
  await page.getByRole('textbox', { name: 'Temporal WHERE predicate', exact: true }).fill('DROP TABLE orders');
  await page.getByRole('button', { name: 'Run query preview', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Apply query', exact: true })).toBeDisabled();
  await openTools(page);
  await page.getByRole('button', { name: 'Investigation help', exact: true }).click();
  await page.getByRole('button', { name: 'Get next hint', exact: true }).click();
  await page.getByRole('button', { name: 'Apply worked repair', exact: true }).click();
  const guide = page.getByRole('dialog', { name: 'Apply the event-time query', exact: true });
  await expect(guide).toContainText(/Deployed query version\s*1.*2/);
  await expect(page.locator('[data-repair-target="sql-draft"]')).toHaveValue(/mz_now\(\) < o\.event_at/);
  await expectRepairHighlight(page, 'sql-draft');
  await expect(page.getByRole('button', { name: 'Apply query', exact: true, includeHidden: true })).toBeDisabled();
  await completeGuide(2);
  await workspace(page, 'Data');
  await applyWorked();
  await completeGuide(3);
  await workspace(page, 'Client');
  await applyWorked();
  await completeGuide(1);
  await handover(page);
  await expect(page.getByText('Completed with worked repair', { exact: true })).toBeVisible();
  const achievements = await page.evaluate(() => JSON.parse(localStorage.getItem('materialize-learning-lab-challenge-v2')!).achievements);
  expect(achievements).toEqual([expect.objectContaining({ scenarioVersion: 2, assisted: true })]);
  await page.getByRole('button', { name: 'Restart challenge', exact: true }).click(); await page.getByRole('button', { name: 'Restart investigation', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start investigation', exact: true })).toBeVisible();
  const savedAchievements = await page.evaluate(() => JSON.parse(localStorage.getItem('materialize-learning-lab-challenge-v2')!).achievements);
  expect(savedAchievements).toEqual(achievements);
});

test('worked repair guides point to the live source, serving, and client changes', async ({ page, isMobile }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  test.setTimeout(60_000);
  await page.setViewportSize(isMobile ? { width: 320, height: 568 } : { width: 1280, height: 640 });
  await page.goto('/challenge');
  await start(page);
  const openHelp = async () => {
    await openTools(page);
    await page.getByRole('button', { name: 'Investigation help', exact: true }).click();
  };
  const help = page.getByRole('dialog', { name: 'Investigation help', exact: true });
  const guide = page.locator('dialog.relation-guide[open]');
  const next = guide.getByRole('button', { name: 'Next', exact: true });
  const finish = guide.getByRole('button', { name: 'Finish', exact: true });
  const apply = async () => {
    await openHelp();
    await help.getByRole('button', { name: 'Apply worked repair', exact: true }).click();
    await expect(guide).toBeVisible();
  };

  await openHelp();
  await expect(help.getByRole('button', { name: 'Apply worked repair', exact: true })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await workspace(page, 'Data');
  const relation = page.getByRole('combobox', { name: 'Relation or history', exact: true });
  await relation.selectOption('customers');
  await apply();
  await expect(guide).toContainText(/NONE.*UPSERT/);
  await expectRepairHighlight(page, 'source-settings');
  await page.keyboard.press('ArrowRight');
  await expect(guide.getByRole('heading', { name: 'Inspect the rebuilt orders' })).toBeVisible();
  await expectRepairHighlight(page, 'source-rows');
  await expect(page.locator('[data-repair-target="source-rows"] th')).toHaveText('101');
  await expect(page.locator('table:has([data-repair-target="source-rows"]) tbody tr')).toHaveCount(6);
  await page.keyboard.press('ArrowLeft');
  await expect(guide.getByRole('heading', { name: 'Apply keyed replacements' })).toBeVisible();
  await expectRepairHighlight(page, 'source-settings');
  await page.keyboard.press('Escape');
  await expect(guide).toHaveCount(0);
  await expect(relation).toHaveValue('customers');
  await expect(page.getByRole('combobox', { name: 'Order envelope', exact: true })).toHaveValue('UPSERT');

  await workspace(page, 'System');
  await page.getByRole('button', { name: 'Request normal read', exact: true }).click();
  await apply();
  await expect(guide).toContainText(/Paused.*Running/);
  await expectRepairHighlight(page, 'connection');
  await page.screenshot({ path: testInfo.outputPath('worked-repair-connection.png'), animations: 'disabled' });
  if (isMobile) {
    await page.setViewportSize({ width: 844, height: 390 });
    await expectRepairHighlight(page, 'connection');
  }
  await next.click();
  await expect(guide).toContainText('Operations and support');
  await expect(guide).toContainText(/State units\s*10.*8/);
  await expectRepairHighlight(page, 'serving-design');
  if (isMobile) {
    await page.setViewportSize({ width: 320, height: 568 });
    await expectRepairHighlight(page, 'serving-design');
  }
  await next.click();
  await expect(guide.getByRole('heading', { name: 'Process pending updates' })).toBeVisible();
  await expectRepairHighlight(page, 'processing');
  await next.click();
  await expect(guide.getByRole('heading', { name: 'Verify the normal read' })).toBeVisible();
  await expectRepairHighlight(page, 'snapshot-request');
  await finish.click();
  await expect(page.getByText('Normal read available', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Process pending updates', exact: true })).toBeDisabled();

  await workspace(page, 'Client');
  await page.getByRole('button', { name: 'Receive and process delivery', exact: true }).click();
  await apply();
  await expect(guide).toContainText('Progress strictly beyond timestamp');
  await expectRepairHighlight(page, 'publication');
  await next.click();
  await expect(guide).toContainText(/Deliveries received\s*1.*0/);
  await expectRepairHighlight(page, 'received-deliveries');
  await finish.click();
  await expect(page.getByRole('button', { name: 'Replay deliveries', exact: true })).toBeDisabled();

  await apply();
  await expect(guide).toContainText('The worked settings are already applied');
  await expectRepairHighlight(page, 'feedback');
  await finish.click();
  await expect(page.locator('[data-repair-target="feedback"]')).not.toHaveAttribute('open');

  await workspace(page, 'Data');
  await relation.selectOption('orders');
  await page.getByRole('combobox', { name: 'Order envelope', exact: true }).selectOption('NONE');
  await page.getByRole('button', { name: 'Apply changes', exact: true }).click();
  await workspace(page, 'Client');
  await page.getByRole('button', { name: 'Receive and process delivery', exact: true }).click();
  await workspace(page, 'System');
  await page.getByRole('button', { name: 'Request normal read', exact: true }).click();
  await workspace(page, 'Data');
  await apply();
  await next.click();
  await expectRepairHighlight(page, 'source-rows');
  await next.click();
  await expect(guide).toContainText('Start a fresh delivery replay');
  await expectRepairHighlight(page, 'feedback');
  await expect(page.locator('[data-repair-target="feedback"]')).toHaveAttribute('open', '');
  await next.click();
  await expect(guide).toContainText('Verify the normal read');
  await expectRepairHighlight(page, 'feedback');
  await finish.click();
  await expect(page.locator('[data-repair-target="feedback"]')).not.toHaveAttribute('open');

  await workspace(page, 'SQL');
  await openHelp();
  await help.getByRole('button', { name: 'Apply worked repair', exact: true }).click();
  await expectRepairHighlight(page, 'sql-draft');
  await next.click();
  await expect(guide).toContainText('Verify the normal read');
  await expectRepairHighlight(page, 'feedback');
  await finish.click();
});

test('Client hints guide manual application and worked repair spotlights the coordinated snapshot', async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  test.setTimeout(60_000);
  await page.setViewportSize(isMobile ? { width: 320, height: 568 } : { width: 1280, height: 640 });
  await page.goto('/challenge');
  await start(page);
  await restoreServing(page);
  await workspace(page, 'Client');

  const snapshot = page.getByRole('checkbox', { name: 'Initialize with a coordinated snapshot' });
  const publication = page.getByRole('combobox', { name: 'Publish application updates' });
  const apply = page.getByRole('button', { name: 'Apply changes', exact: true });
  const appliedSnapshot = page.locator('[data-repair-target="coordinated-snapshot"]');
  const appliedPublication = page.locator('[data-repair-target="publication"]');
  const receive = page.getByRole('button', { name: 'Receive and process delivery', exact: true });
  const help = page.getByRole('dialog', { name: 'Investigation help', exact: true });
  const guide = page.locator('dialog.relation-guide[open]');
  const next = guide.getByRole('button', { name: 'Next', exact: true });
  const finish = guide.getByRole('button', { name: 'Finish', exact: true });
  const openHelp = async () => {
    await openTools(page);
    await page.getByRole('button', { name: 'Investigation help', exact: true }).click();
  };
  const undo = async () => {
    await openTools(page);
    await page.getByRole('button', { name: 'Undo last change', exact: true }).click();
  };
  const expectSnapshotSpotlight = async () => {
    await expect(guide.getByRole('heading', { name: 'Initialize with a coordinated snapshot' })).toBeVisible();
    await expect(guide).toContainText(/Coordinated snapshot\s*Off.*On/);
    await expect(appliedSnapshot).toHaveText('Coordinated snapshot: On');
    await expectRepairHighlight(page, 'coordinated-snapshot');
  };

  await expect(snapshot).toBeChecked();
  await snapshot.uncheck();
  await expect(appliedSnapshot).toHaveText('Coordinated snapshot: On');
  await apply.click();
  await openHelp();
  const hint = help.getByRole('button', { name: 'Get next hint', exact: true });
  await hint.click();
  await expect(help).toContainText('Where do the rows already in the result come from?');
  await hint.click();
  await expect(help).toContainText('The coordinated snapshot supplies the starting rows.');
  await hint.click();
  await expect(help).toContainText('Enable Initialize with a coordinated snapshot');
  await expect(hint).toBeDisabled();
  await expect(appliedSnapshot).toHaveText('Coordinated snapshot: Off');
  await expect(appliedPublication).toHaveText('Applied publication: Every received record');

  await help.getByRole('button', { name: 'Apply worked repair', exact: true }).click();
  await expectSnapshotSpotlight();
  await next.click();
  await expect(guide).toContainText('Progress strictly beyond timestamp');
  await expectRepairHighlight(page, 'publication');
  await finish.click();
  await undo();
  await expect(appliedSnapshot).toHaveText('Coordinated snapshot: Off');
  await expect(appliedPublication).toHaveText('Applied publication: Every received record');

  await publication.selectOption('complete');
  await apply.click();
  await receive.click();
  await openHelp();
  await help.getByRole('button', { name: 'Apply worked repair', exact: true }).click();
  await expectSnapshotSpotlight();
  await next.click();
  await expect(guide).toContainText(/Deliveries received\s*1.*0/);
  await expectRepairHighlight(page, 'received-deliveries');
  await finish.click();
  await expect(page.getByRole('button', { name: 'Replay deliveries', exact: true })).toBeDisabled();
  await undo();
  await expect(appliedSnapshot).toHaveText('Coordinated snapshot: Off');
  await expect(appliedPublication).toHaveText('Applied publication: Progress strictly beyond timestamp');

  await snapshot.check();
  await expect(appliedSnapshot).toHaveText('Coordinated snapshot: Off');
  await apply.click();
  await expect(appliedSnapshot).toHaveText('Coordinated snapshot: On');
  const application = page.getByTestId('subscribe-application');
  for (let delivery = 0; delivery < 3; delivery++) await receive.click();
  await expect(application).toContainText('Waiting for full snapshot');
  await receive.click();
  await expect(application).toContainText('Published before 631.001 s');
  await expect(application.getByRole('cell', { name: 'US', exact: true })).toBeVisible();
});

test('the worked repair replays the control changes between before and after spotlights', async ({ page, isMobile }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install();
  await page.goto('/challenge');
  await start(page);
  await workspace(page, 'Data');
  await openTools(page);
  await page.getByRole('button', { name: 'Investigation help', exact: true }).click();
  await page.clock.pauseAt(new Date(Date.now() + 60_000));
  await page.getByRole('button', { name: 'Apply worked repair', exact: true }).click();

  const source = page.locator('[data-repair-target="source-settings"]');
  const envelope = page.locator('[data-repair-action="source-envelope"]');
  const before = page.getByRole('dialog', { name: 'Before · Apply keyed replacements', exact: true });
  await expect(before).toBeVisible();
  await expect(source).toContainText('Applied source: NONE');
  await expect(envelope).toHaveValue('NONE');
  await page.clock.runFor(10_000);
  await expect(before).toBeVisible();
  await expect(envelope).toHaveValue('NONE');
  await before.getByRole('button', { name: 'Show fix', exact: true }).click();

  const moving = page.locator('dialog.walkthrough-page-preview[open][data-transition-phase="navigate"]');
  const click = page.locator('dialog.walkthrough-page-preview[open][data-transition-phase="page"]');
  const advanceUntil = async (locator: ReturnType<Page['locator']>) => {
    for (let tick = 0; tick < 30 && !(await locator.count()); tick++) await page.clock.runFor(50);
    await expect(locator).toBeVisible();
  };
  await advanceUntil(moving);
  await page.clock.runFor(50);
  await expect(moving).toContainText('Set order envelope to UPSERT');
  await expect(moving.locator('.walkthrough-navigation-cursor')).toHaveCSS('opacity', '1');
  await expect(moving.locator('.relation-guide-shade')).toHaveCount(0);
  await advanceUntil(click.locator('.walkthrough-navigation-click'));
  await expect(envelope).toHaveValue('UPSERT');
  await expect(source).toContainText('Applied source: NONE');
  if (!isMobile) await page.screenshot({ path: testInfo.outputPath('worked-repair-pointer.png') });
  await advanceUntil(moving);
  await expect(moving).toContainText('Apply the source settings');
  await advanceUntil(click);
  await expect(click).toContainText('Apply the source settings');
  const result = page.getByRole('dialog', { name: 'Apply keyed replacements', exact: true });
  await advanceUntil(result);
  await expect(result).toContainText(/Order envelope\s*NONE.*UPSERT/);
  await expect(source).toContainText('Applied source: UPSERT');
  await expectRepairHighlight(page, 'source-settings');
  await result.getByRole('button', { name: 'Next', exact: true }).click();
  const rebuilt = page.getByRole('dialog', { name: 'Inspect the rebuilt orders', exact: true });
  await expect(rebuilt).toContainText(/Versions of order 101\s*3.*1/);
  await rebuilt.getByRole('button', { name: 'Finish', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Order envelope', exact: true })).toHaveValue('UPSERT');
  await expect(page.locator('.incident-change-log').getByText(/Worked intervention: latest full keyed order values/)).toHaveCount(1);
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
  await page.goto('/challenge'); await start(page); await workspace(page, 'SQL'); await selectSnapshot(page);
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
