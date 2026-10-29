import { expect, test } from './fixtures';
import { start, workspace } from './investigation-flow';

test('workspaces and handover have no notebook or pin controls', async ({ page }) => {
  await page.goto('/challenge');
  await start(page);
  for (const name of ['Dashboard', 'Data', 'SQL', 'System', 'Client']) {
    await workspace(page, name);
    await expect(page.getByRole('button', { name: /^Pin / })).toHaveCount(0);
    await expect(page.getByText(/incident notebook/i)).toHaveCount(0);
    await expect(page.getByRole('textbox', { name: 'Working hypothesis and handover notes', exact: true })).toHaveCount(0);
  }
  await page.getByRole('button', { name: 'Submit handover', exact: true }).click();
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await expect(page.getByText(/attach observations|before.and.after evidence/i)).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('materialize-learning-lab-challenge-v2')!).run)).not.toHaveProperty('observations');
});

test('context help works across challenge workspaces without changing the investigation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const showHelp = async (label: string, text: string, click = false) => {
    const trigger = page.getByRole('button', { name: `About ${label}`, exact: true }).first();
    if (click) await trigger.click();
    else await trigger.hover();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const tooltip = page.getByRole('tooltip').filter({ hasText: text });
    await expect(tooltip).toBeVisible();
    const box = (await tooltip.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    await page.keyboard.press('Escape');
    await expect(tooltip).not.toBeVisible();
  };
  await page.goto('/challenge');
  await showHelp('An incident from operations', 'explore the workspaces in any order');
  await page.getByRole('button', { name: 'About Your working environment', exact: true }).focus();
  await expect(page.getByRole('tooltip').filter({ hasText: 'SQL runs locally in your browser' })).toBeVisible();
  await page.keyboard.press('Escape');
  await start(page);
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await showHelp('Last complete snapshot age', 'Normal reads allow at most three seconds');
  await showHelp('Operations dashboard', 'Check the snapshot time and age');
  await showHelp('Shared system', 'applied values across all five workspaces', true);
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toHaveCount(0);
  await workspace(page, 'Data');
  await showHelp('Current orders relation', 'This is input data');
  await showHelp('Event time', 'When the business event happened');
  await page.getByRole('combobox', { name: 'Relation or history', exact: true }).selectOption('messages');
  await showHelp('Retained producer messages', 'including earlier versions of orders', true);
  await workspace(page, 'SQL');
  await showHelp('Regional query draft', 'Apply query makes a successfully tested draft live');
  await showHelp('Historical replay snapshot', 'does not advance the live incident', true);
  await expect(page.getByRole('combobox', { name: 'Historical replay snapshot', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Diagnostic SELECT', exact: true }).click();
  await showHelp('Read-only diagnostic console', 'Diagnostic queries cannot be deployed');
  await workspace(page, 'System');
  await showHelp('Complete strictly below', 'The boundary timestamp itself is still open');
  await showHelp('Source and serving configuration', 'Edit settings as drafts', true);
  await workspace(page, 'Data');
  await showHelp('Order envelope', 'latest full value for each key', true);
  await expect(page.getByRole('combobox', { name: 'Order envelope', exact: true })).toHaveValue('NONE');
  await workspace(page, 'Client');
  await showHelp('Application subscription', 'Receive next delivery receives one batch');
  await showHelp('Publish application updates', 'Chooses when received changes become visible', true);
  await expect(page.getByRole('combobox', { name: 'Publish application updates', exact: true })).toHaveValue('each');
  await expect(page.getByRole('checkbox', { name: 'Initialize with a coordinated snapshot', exact: true })).toBeChecked();
  await showHelp('Coordinated starting snapshot', 'consistent complete result', true);
  await page.getByRole('button', { name: 'Submit handover', exact: true }).click();
  await showHelp('End-to-end acceptance', 'Run acceptance checks tests the deployed system');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('materialize-learning-lab-challenge-v2')!));
  expect(saved.run.hints).toEqual({});
  expect(saved.run.worked).toEqual([]);
  await page.getByRole('button', { name: 'Return to investigation', exact: true }).click();
  await page.setViewportSize({ width: 320, height: 740 });
  await showHelp('Publish application updates', 'Chooses when received changes become visible', true);
});

test('the complete briefing fits laptop windows and stays readable on phones', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/challenge');
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1536, height: 728 },
    { width: 1440, height: 720 },
    { width: 1366, height: 768 },
    { width: 1280, height: 720 },
    { width: 1280, height: 640 },
    { width: 1024, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    const geometry = await page.evaluate(() => ({
      width: innerWidth,
      height: innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
    }));
    expect(geometry.scrollWidth, `Horizontal overflow at ${viewport.width}×${viewport.height}`).toBeLessThanOrEqual(geometry.width);
    expect(geometry.scrollHeight, `Vertical overflow at ${viewport.width}×${viewport.height}`).toBeLessThanOrEqual(geometry.height);
    await expect(page.getByRole('button', { name: 'Start investigation', exact: true })).toBeInViewport();
    await expect(page.getByText('Leave and return at any time.', { exact: false })).toBeInViewport();
    await expect(page.locator('.incident-brief-grid .incident-requirements > li')).toHaveCount(5);
    if (viewport.width === 1536) {
      const bodySize = await page.locator('.incident-brief-grid .incident-card-body > p').first().evaluate(el => parseFloat(getComputedStyle(el).fontSize));
      expect(bodySize).toBeGreaterThanOrEqual(15);
      await page.screenshot({ path: testInfo.outputPath('briefing-laptop.png') });
    }
  }
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 740 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('heading', { name: 'Your working environment', exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByText('Leave and return at any time.', { exact: false })).toBeVisible();
  }
});

test('investigation shares lecture chrome while exposing free workspaces and no fault checklist', async ({ page }) => {
  const appearance = () => page.evaluate(() => {
    const title = getComputedStyle(document.querySelector('.guided-lab-title h1')!);
    const control = getComputedStyle(document.querySelector('.guided-lab-controls .button')!);
    return { font: title.fontFamily, size: title.fontSize, weight: title.fontWeight, height: control.height, border: control.borderColor };
  });
  await page.goto('/labs/changing-relations/tutorial/lecture-1'); const reference = await appearance();
  await page.goto('/challenge'); await start(page); expect(await appearance()).toEqual(reference);
  await expect(page.locator('.chapter-sidebar')).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Investigation workspaces' }).getByRole('button')).toHaveCount(5);
  for (const name of ['Undo last change', 'Investigation help']) {
    await expect(page.locator('.guided-lab-controls').getByRole('button', { name, exact: true })).toHaveCount(1);
    await expect(page.locator('.incident-footer').getByRole('button', { name, exact: true })).toHaveCount(0);
  }
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await page.getByRole('button', { name: 'Reference', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Incident reference', exact: true });
  await expect(dialog).not.toContainText('o.event_at + INTERVAL');
  await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible();
  await page.getByRole('button', { name: 'Keyboard shortcuts', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts', exact: true })).toContainText('Run SQL in the editor');
  await page.keyboard.press('Escape');
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 1280, height: 640 }, { width: 768, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 640 }]) {
    await page.setViewportSize(viewport);
    for (const name of ['Dashboard', 'SQL', 'System', 'Client']) {
      await workspace(page, name);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
  }
  await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.getByRole('region', { name: 'Shared incident state', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toHaveCount(0);
});

for (const reduced of [false, true]) {
  test(`main Challenge entry reuses loading and restores work${reduced ? ' with reduced motion' : ''}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
    await page.goto('/'); await page.getByRole('main').getByRole('link', { name: 'Challenge', exact: true }).click();
    if (!reduced) await expect(page.getByRole('status', { name: 'Preparing challenge', exact: true })).toBeVisible();
    await expect(page.locator('.lab-intro-screen')).toHaveCount(0);
    await start(page); await workspace(page, 'Data'); await page.reload();
    await expect(page.getByRole('heading', { name: 'Current orders relation', exact: true })).toBeVisible();
    await expect(page.locator('.lab-intro-screen')).toHaveCount(0);
  });
}

test('challenge overview can be reopened without losing drafts, workspace, or handover', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/challenge'); await start(page); await workspace(page, 'SQL');
  await page.getByRole('textbox', { name: 'Temporal WHERE predicate', exact: true }).fill('unfinished query to preserve');
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('materialize-learning-lab-challenge-v2')!).run);
  await page.getByRole('button', { name: 'Challenge overview', exact: true }).click();
  await expect(page).toHaveURL('/challenge?view=overview');
  await expect(page.getByRole('heading', { name: 'Your working environment', exact: true })).toBeVisible();
  await expect(page.locator('.incident-brief-grid .incident-requirements > li')).toHaveCount(5);
  await expect(page.getByRole('button', { name: 'Start investigation', exact: true })).toHaveCount(0);
  await page.reload();
  await page.getByRole('button', { name: 'Continue investigation', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Temporal WHERE predicate', exact: true })).toHaveValue('unfinished query to preserve');
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('materialize-learning-lab-challenge-v2')!).run);
  expect(after).toMatchObject({ id: before.id, phase: before.phase, workspace: before.workspace, time: before.time, config: before.config, settings: before.settings, deliveries: before.deliveries });
  await page.goBack();
  await expect(page.getByRole('button', { name: 'Continue investigation', exact: true })).toBeVisible();
  await page.goForward();
  await expect(page.getByRole('textbox', { name: 'Temporal WHERE predicate', exact: true })).toBeVisible();
  for (const action of [page.getByRole('link', { name: 'Back to main page', exact: true }), page.getByRole('button', { name: 'Investigation help', exact: true }), page.getByRole('button', { name: 'Undo last change', exact: true }), page.getByRole('button', { name: 'Restart challenge', exact: true })]) {
    await expect(action).toHaveClass(/button-secondary/);
    await expect(action).not.toHaveClass(/button-ghost|text-link/);
  }
  await page.getByRole('button', { name: 'Submit handover', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Challenge overview', exact: true })).toHaveCount(0);
  await expect(page.locator('.incident-report').getByRole('button', { name: 'Return to investigation', exact: true })).toHaveCount(0);
  await expect(page.locator('.incident-report > .incident-actions').locator('a, button')).toHaveText(['Back to main page', 'Complete handover']);
  await page.screenshot({ path: testInfo.outputPath('handover-navigation.png'), fullPage: true });
  await page.locator('.guided-lab-controls').getByRole('button', { name: 'Return to investigation', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Temporal WHERE predicate', exact: true })).toHaveValue('unfinished query to preserve');
  await page.getByRole('button', { name: 'Submit handover', exact: true }).click();
  await page.getByRole('button', { name: 'Return to investigation', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('challenge-standard-buttons.png'), fullPage: true });
  await page.getByRole('button', { name: 'Challenge overview', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('challenge-overview-return.png'), fullPage: true });
});
