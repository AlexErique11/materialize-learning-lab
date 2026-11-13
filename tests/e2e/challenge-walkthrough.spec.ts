import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { challengeTourSteps } from '../../src/challenges/live-order-operations/challengeWalkthroughContent';
import { CHALLENGE_TOUR_KEY } from '../../src/challenges/live-order-operations/challengeWalkthroughStorage';
import { createRun, updateRun, type ChallengeRun } from '../../src/challenges/live-order-operations/run';
import { CHALLENGE_PROGRESS_KEY } from '../../src/progress/challengeProgress';
import { completeInvestigation, openTools, start, workspace } from './investigation-flow';

test.use({ reducedMotion: 'reduce' });

const tour = (page: Page) => page.locator('.walkthrough-dialog[open]');
const saved = (page: Page) => page.evaluate(key => localStorage.getItem(key), CHALLENGE_PROGRESS_KEY);
async function open(page: Page, pageOnly = false) {
  if (pageOnly) {
    await openTools(page);
    await page.getByRole('button', { name: 'Explain this page', exact: true }).click();
  } else {
    await page.getByRole('button', { name: 'Full walkthrough', exact: true }).click();
    await expect(tour(page).getByRole('heading', { level: 2 })).toHaveText('How the challenge works');
  }
}

async function seed(page: Page, run: ChallengeRun) {
  await page.addInitScript(({ key, run }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 2, run, achievements: [] }));
  }, { key: CHALLENGE_PROGRESS_KEY, run });
}

test('question-mark help explains only the current workspace and preserves the full-tour resume point', async ({ page }) => {
  const preference = { dismissed: true, resumeId: 'sql-editor' };
  await page.addInitScript(({ key, preference }) => localStorage.setItem(key, JSON.stringify(preference)), { key: CHALLENGE_TOUR_KEY, preference });
  await page.goto('/challenge'); await start(page);
  for (const name of ['Dashboard', 'Data', 'SQL', 'System', 'Client']) {
    await workspace(page, name);
    const steps = challengeTourSteps.filter(step => step.page === name);
    await open(page, true);
    const before = JSON.parse((await saved(page))!);
    await expect(tour(page).getByRole('heading', { level: 2 })).toHaveText(name);
    await expect(tour(page).getByLabel('Walkthrough section')).toHaveCount(0);
    await expect(tour(page).getByRole('button', { name: 'Resume walkthrough' })).toHaveCount(0);
    for (let index = 0; index < steps.length; index++) {
      await expect(tour(page).getByRole('heading', { level: 2 })).toHaveText(steps[index]!.title);
      await expect(tour(page).locator('.relation-guide-step')).toHaveText(`${index + 1} of ${steps.length}`);
      await expect(page.locator('[data-challenge-tour] .incident-workspace-bar')).toContainText(`${name} workspace`);
      await tour(page).getByRole('button', { name: index === steps.length - 1 ? 'Finish walkthrough' : 'Next', exact: true }).click();
    }
    await expect(tour(page)).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: 'Investigation workspaces' }).getByRole('button', { name, exact: true })).toHaveAttribute('aria-current', 'page');
    const after = JSON.parse((await saved(page))!);
    expect({ ...after.run, revision: 0, activeDurationMs: 0 }).toEqual({ ...before.run, revision: 0, activeDurationMs: 0 });
    expect(JSON.parse((await page.evaluate(key => localStorage.getItem(key), CHALLENGE_TOUR_KEY))!)).toEqual(preference);
  }
});

test('overview question-mark help stays on the overview while the full walkthrough remains separate', async ({ page }) => {
  await page.goto('/challenge'); await open(page, true);
  const steps = challengeTourSteps.filter(step => step.page === 'overview');
  for (let index = 0; index < steps.length; index++) {
    await expect(tour(page).getByRole('heading', { level: 2 })).toHaveText(steps[index]!.title);
    await expect(page.locator('[data-challenge-tour] .incident-tabs')).toHaveCount(0);
    await tour(page).getByRole('button', { name: index === steps.length - 1 ? 'Finish walkthrough' : 'Next', exact: true }).click();
  }
  await expect(tour(page)).toHaveCount(0);
  expect(await saved(page)).toBeNull();
  await expect(page.getByRole('button', { name: 'Full walkthrough', exact: true })).toBeVisible();
});

test('page changes unblur, navigate, click, and explain the page title at 700 ms intervals', async ({ page }) => {
  await page.clock.install();
  await page.goto('/challenge'); await open(page);
  await page.clock.pauseAt(new Date(Date.now() + 60_000));
  await tour(page).getByRole('button', { name: 'Start walkthrough', exact: true }).click();
  const preview = page.locator('.walkthrough-page-preview[open]');
  await expect(preview).toHaveAttribute('data-transition-phase', 'page');
  await page.clock.runFor(699);
  await expect(page.locator('.relation-guide-shade')).toHaveCount(0);
  await page.clock.runFor(1);
  await tour(page).getByLabel('Walkthrough section').selectOption('Data');
  await page.clock.runFor(700);
  await expect(preview).toHaveAttribute('data-transition-phase', 'navigate');
  await page.clock.runFor(700);
  await expect(preview).toHaveAttribute('data-transition-phase', 'page');
  await page.clock.runFor(700);
  await expect(tour(page).getByRole('heading', { level: 2 })).toHaveText('Data');
  for (const title of ['Choose which input evidence to inspect', 'Read the input rows and their two times', 'Distinguish source drafts from applied settings']) {
    await tour(page).getByRole('button', { name: 'Next', exact: true }).click();
    await expect(tour(page).getByRole('heading', { level: 2 })).toHaveText(title);
  }
  await tour(page).getByRole('button', { name: 'Next', exact: true }).click();
  await expect(preview).toHaveAttribute('data-transition-phase', 'unblur');
  await expect(page.locator('[data-challenge-tour] .incident-workspace-bar')).toContainText('Data workspace');
  await expect(page.locator('.relation-guide-shade')).toHaveCount(0);
  await page.clock.runFor(700);
  await expect(preview).toHaveAttribute('data-transition-phase', 'navigate');
  await expect(preview.locator('.walkthrough-navigation-cursor')).toBeVisible();
  await expect(page.locator('[data-challenge-tour] .incident-workspace-bar')).toContainText('Data workspace');
  await page.clock.runFor(700);
  await expect(preview).toHaveAttribute('data-transition-phase', 'page');
  await expect(page.locator('[data-challenge-tour] .incident-workspace-bar')).toContainText('SQL workspace');
  await expect(preview.locator('.walkthrough-navigation-click')).toBeVisible();
  await page.clock.runFor(700);
  await expect(tour(page).getByRole('heading', { level: 2 })).toHaveText('SQL');
  await expect(tour(page)).toContainText('Use SQL to inspect data');
  await expect(page.locator('[data-challenge-tour] [data-walkthrough="challenge-sql-page"]')).toBeVisible();
  await tour(page).getByRole('button', { name: 'Next', exact: true }).click();
  await expect(tour(page).getByRole('heading', { level: 2 })).toHaveText('Choose repair or read-only diagnosis');
  await tour(page).getByLabel('Walkthrough section').selectOption('System');
  await page.keyboard.press('Escape');
  await page.clock.runFor(3000);
  await expect(tour(page)).toHaveCount(0);
  expect(await saved(page)).toBeNull();
});

for (const theme of ['light', 'dark']) test(`full challenge walkthrough covers every workspace without starting an attempt in ${theme}`, async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.goto('/challenge');
  if (theme === 'dark') await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await open(page);
  await tour(page).getByRole('button', { name: 'Start walkthrough', exact: true }).click();
  for (let index = 0; index < challengeTourSteps.length; index++) {
    const step = challengeTourSteps[index]!;
    await expect(tour(page).getByRole('heading', { level: 2 })).toHaveText(step.title);
    await expect(tour(page).locator('.relation-guide-step')).toHaveText(`${index + 1} of ${challengeTourSteps.length}`);
    await expect(tour(page).locator('.relation-guide-hole')).toBeVisible();
    const target = page.locator(`[data-challenge-tour] [data-walkthrough="${step.target}"]`);
    await expect(target).toBeVisible();
    await expect.poll(async () => {
      const card = await tour(page).locator('.relation-guide-card').boundingBox();
      const hole = await tour(page).locator('.relation-guide-hole').boundingBox();
      return Boolean(card && hole && card.x >= 0 && card.y >= 0
        && card.x + card.width <= page.viewportSize()!.width + 1 && card.y + card.height <= page.viewportSize()!.height + 1
        && (card.x + card.width <= hole.x || hole.x + hole.width <= card.x || card.y + card.height <= hole.y || hole.y + hole.height <= card.y));
    }, { message: `Step ${step.id} should leave its target visible and explanation within the viewport` }).toBe(true);
    if (['contract', 'sql-page', 'subscription', 'acceptance'].includes(step.id)) await page.screenshot({ path: testInfo.outputPath(`${theme}-${step.id}.png`) });
    if (index === 0) {
      await tour(page).getByText('More detail', { exact: true }).click();
      await expect(tour(page)).toContainText('paid-order counts and totals by region');
    }
    await tour(page).getByRole('button', { name: index === challengeTourSteps.length - 1 ? 'Finish walkthrough' : 'Next', exact: true }).click();
  }
  await expect(tour(page).getByRole('heading', { level: 2 })).toHaveText("You're ready to investigate");
  await tour(page).getByRole('button', { name: 'Return to challenge', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start investigation', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Full walkthrough', exact: true })).toBeFocused();
  expect(await saved(page)).toBeNull();
  await expect(page.locator('html')).not.toHaveAttribute('data-walkthrough-active');
});

test('tour preserves saved drafts, local SQL mode, selections, timer, and scroll while blocking challenge actions', async ({ page }) => {
  let run = updateRun(createRun('tour-preserve'), { type: 'start' });
  run = updateRun(run, { type: 'workspace', workspace: 'SQL' });
  run = updateRun(run, { type: 'draft', value: 'TRUE' });
  run = updateRun(run, { type: 'stage', key: 'source', value: { envelope: 'UPSERT', key: 'customer_id' } });
  run = updateRun(run, { type: 'frame', frame: 1 });
  await seed(page, run);
  await page.clock.install();
  await page.goto('/challenge');
  await page.getByRole('button', { name: 'Diagnostic SELECT', exact: true }).click();
  const diagnostic = page.getByRole('textbox', { name: 'Diagnostic SQL', exact: true });
  await diagnostic.fill('SELECT amount FROM orders');
  await openTools(page);
  const button = page.getByRole('button', { name: 'Explain this page', exact: true });
  await button.scrollIntoViewIfNeeded();
  const scroll = await page.evaluate(() => scrollY);
  await button.click();
  const before = await saved(page);
  await page.clock.fastForward(60_000);
  for (const key of ['h', 'r', 's', 'Control+Enter']) await page.keyboard.press(key);
  await page.evaluate(() => document.querySelector<HTMLButtonElement>('[data-challenge-tour] [data-incident-action="advance"]')?.click());
  expect(await saved(page)).toBe(before);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest('.walkthrough-dialog')))).toBe(true);
  await expect(tour(page).getByLabel('Walkthrough section')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(tour(page)).toHaveCount(0);
  await expect(diagnostic).toHaveValue('SELECT amount FROM orders');
  await expect(page.getByRole('combobox', { name: 'Scenario replay snapshot', exact: true })).toHaveValue('1');
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(scroll);
  const after = JSON.parse((await saved(page))!);
  const original = JSON.parse(before!);
  expect({ ...after.run, revision: 0, activeDurationMs: 0 }).toEqual({ ...original.run, revision: 0, activeDurationMs: 0 });
  expect(after.achievements).toEqual(original.achievements);
});

test('sections, explicit resume, invitation dismissal, and reload stay separate from challenge progress', async ({ page }) => {
  await page.goto('/challenge');
  await page.getByRole('button', { name: 'Dismiss invitation', exact: true }).click();
  await open(page);
  await expect(tour(page)).not.toContainText('Full walkthrough');
  await expect(tour(page).getByRole('button', { name: 'This workspace', exact: true })).toHaveCount(0);
  await tour(page).getByRole('button', { name: 'Start walkthrough', exact: true }).click();
  await tour(page).getByLabel('Walkthrough section').selectOption('Data');
  await expect(tour(page).locator('.relation-guide-step')).toHaveText(String(challengeTourSteps.findIndex(step => step.id === 'data-page') + 1) + ' of ' + challengeTourSteps.length);
  await tour(page).getByRole('button', { name: 'Next', exact: true }).click();
  await expect(tour(page).getByRole('heading', { level: 2 })).toHaveText(challengeTourSteps.find(step => step.id === 'inspect-data')!.title);
  await tour(page).getByRole('button', { name: 'Exit tour', exact: true }).click();
  await page.reload();
  await expect(tour(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Dismiss invitation', exact: true })).toHaveCount(0);
  await open(page);
  await tour(page).getByRole('button', { name: 'Resume walkthrough', exact: true }).click();
  await expect(tour(page).getByRole('heading', { level: 2 })).toHaveText(challengeTourSteps.find(step => step.id === 'inspect-data')!.title);
  await tour(page).getByRole('button', { name: 'Back', exact: true }).click();
  await expect(tour(page).getByRole('heading', { level: 2 })).toHaveText(challengeTourSteps.find(step => step.id === 'data-page')!.title);
  await page.keyboard.press('Escape');
  expect(await saved(page)).toBeNull();
  expect(JSON.parse((await page.evaluate(key => localStorage.getItem(key), CHALLENGE_TOUR_KEY))!).resumeId).toBe('data-page');
});

test('missing targets remain readable and safe to exit', async ({ page }) => {
  await page.goto('/challenge'); await open(page);
  await tour(page).getByRole('button', { name: 'Start walkthrough', exact: true }).click();
  await page.locator('[data-challenge-tour] [data-walkthrough="challenge-contract"]').evaluate(element => element.remove());
  await expect(tour(page).getByRole('heading', { level: 2 })).toHaveText(challengeTourSteps[0]!.title);
  await expect(tour(page).locator('.relation-guide-hole')).toHaveCount(0);
  await tour(page).getByRole('button', { name: 'Next', exact: true }).click();
  await expect(tour(page).getByRole('heading', { level: 2 })).toHaveText(challengeTourSteps[1]!.title);
  await page.keyboard.press('Escape');
  await expect(page.locator('html')).not.toHaveAttribute('data-walkthrough-active');
  expect(await saved(page)).toBeNull();
});

test('another tab ends the tour without overwriting its investigation changes', async ({ page, context }) => {
  await page.goto('/'); await page.goto('/challenge'); await start(page);
  const other = await context.newPage(); await other.goto('/challenge');
  await open(page, true);
  await workspace(other, 'Data');
  await expect(tour(page)).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: 'changed in another tab' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Investigation workspaces' }).getByRole('button', { name: 'Data', exact: true })).toHaveAttribute('aria-current', 'page');
  expect(JSON.parse((await saved(page))!).run.workspace).toBe('Data');
  await other.close();
  await open(page, true);
  await page.goBack();
  await expect(tour(page)).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveAttribute('data-walkthrough-active');
});

test('completed attempts keep validation and independent completion after touring', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/challenge'); await completeInvestigation(page);
  const before = await saved(page);
  await open(page, true);
  for (let index = 0; index < 2; index++) {
    await tour(page).getByRole('button', { name: index === 1 ? 'Finish walkthrough' : 'Next', exact: true }).click();
  }
  expect(await saved(page)).toBe(before);
  await expect(page.getByText('Completed independently', { exact: true })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Congratulations!', exact: true })).toBeHidden();
});

test('browser Back from the reopened overview exits the tour and restores the current workspace', async ({ page }) => {
  await page.goto('/challenge'); await start(page); await workspace(page, 'Data');
  await page.getByRole('combobox', { name: 'Relation or history', exact: true }).selectOption('messages');
  await page.getByRole('textbox', { name: 'Filter by order ID', exact: true }).fill('101');
  await openTools(page);
  await page.getByRole('button', { name: 'Challenge overview', exact: true }).click();
  await expect(page).toHaveURL('/challenge?view=overview');
  await open(page);
  await tour(page).getByRole('button', { name: 'Start walkthrough', exact: true }).click();
  await page.goBack();
  await expect(page).toHaveURL('/challenge');
  await expect(tour(page)).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Relation or history', exact: true })).toHaveValue('messages');
  await expect(page.getByRole('textbox', { name: 'Filter by order ID', exact: true })).toHaveValue('101');
  await expect(page.locator('html')).not.toHaveAttribute('data-walkthrough-active');
});

test('an unfinished handover stays unfinished with unapplied settings preserved', async ({ page }) => {
  let run = updateRun(createRun('tour-handover'), { type: 'start' });
  run = updateRun(run, { type: 'stage', key: 'publication', value: 'equal' });
  run = updateRun(run, { type: 'handover' });
  await seed(page, run);
  await page.goto('/challenge');
  const before = await saved(page);
  await open(page, true);
  await expect(tour(page).getByLabel('Walkthrough section')).toHaveCount(0);
  await page.keyboard.press('Escape');
  expect(await saved(page)).toBe(before);
  await expect(page.getByRole('button', { name: 'Complete handover', exact: true })).toBeDisabled();
  await expect(page.getByText(/You have unapplied edits:/)).toContainText('client settings');
});

test('tour works without storage and keeps navigation reachable in a short viewport', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('Storage unavailable'); };
    Storage.prototype.setItem = () => { throw new Error('Storage unavailable'); };
  });
  await page.setViewportSize({ width: 320, height: 400 });
  await page.goto('/challenge'); await open(page);
  await tour(page).getByRole('button', { name: 'Start walkthrough', exact: true }).click();
  await tour(page).getByText('More detail', { exact: true }).click();
  await tour(page).getByRole('button', { name: 'Next', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('short-viewport.png') });
  await page.keyboard.press('Escape');
  await expect(tour(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Start investigation', exact: true })).toBeVisible();
});
