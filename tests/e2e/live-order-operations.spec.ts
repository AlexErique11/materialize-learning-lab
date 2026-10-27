import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const challengeUrl = '/challenge';
async function choose(page: Page, name: string, value: string) {
  await page.getByRole('combobox', { name, exact: true }).selectOption(value);
}
async function panel(page: Page, name: 'Task' | 'Evidence & dashboard') {
  const selector = page.getByRole('group', { name: 'Challenge workspace panels' });
  if (await selector.isVisible()) await selector.getByRole('button', { name, exact: true }).click();
}
async function apply(page: Page, last = false) {
  await panel(page, 'Task');
  await page.getByRole('button', { name: 'Test repair', exact: true }).click();
  await expect(page.getByText('Repair verified', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: last ? 'Continue to handover' : 'Apply and continue', exact: true }).click();
}
async function feed(page: Page) {
  await page.getByRole('radio', { name: 'UPSERT — latest value for a key', exact: true }).check();
  await choose(page, 'Replacement identity', 'order_id');
  await choose(page, 'What supports your choice?', 'replacement');
}
async function independentRun(page: Page, incidentResponse: 'fallback' | 'unavailable' = 'fallback') {
  await page.goto(challengeUrl);
  await page.getByRole('button', { name: 'Start incident', exact: true }).click();
  await feed(page); await apply(page);
  await choose(page, 'Recent-orders helper', 'view');
  await choose(page, 'Regional totals on transform', 'materialized');
  await page.getByRole('radio', { name: 'Operations and support · 4 units', exact: true }).check();
  await apply(page);
  await choose(page, 'Status filter', 'paid'); await choose(page, 'Entry bound', 'event'); await choose(page, 'Expiration bound', 'exclusive');
  await choose(page, 'At 601 s, amount 40 becomes 70. Which EU change?', 'replace');
  await choose(page, 'Order 104 arrives at 603 s, event time 320 s. Its remaining lifetime?', '17');
  await choose(page, 'Order 105 arrives at 604 s, event time 290 s', 'absent');
  await choose(page, 'Order 106 arrives at 605 s, event time 620 s', 'wait');
  await page.getByRole('radio', { name: 'EU: 1 / 70 · US: 1 / 35', exact: true }).check();
  await apply(page);
  await page.getByRole('radio', { name: 'Customers input', exact: true }).check();
  await choose(page, 'Evidence', 'stalled'); await choose(page, 'Intervention', 'resume');
  await page.getByRole('radio', { name: 'Not necessarily — computation still has to process', exact: true }).check();
  await apply(page);
  await panel(page, 'Evidence & dashboard');
  await page.getByRole('button', { name: 'Test normal policy', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Query outcome' })).toContainText('Staleness bound exceeded');
  await page.getByRole('button', { name: 'Finish catch-up', exact: true }).click();
  await page.getByRole('button', { name: 'Issue new normal read', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Query outcome' })).toContainText('Available');
  await panel(page, 'Task');
  await page.getByRole('radio', { name: 'Bounded staleness · 3 seconds', exact: true }).check();
  await page.getByRole('radio', { name: incidentResponse === 'fallback' ? 'Show a labeled ten-second fallback' : 'Show unavailable until the normal bound can be met', exact: true }).check();
  await page.getByRole('textbox', { name: 'Newest complete fallback timestamp (seconds)', exact: true }).fill('622.999');
  await page.getByRole('radio', { name: 'No — it must be ingested first', exact: true }).check();
  await apply(page);
  await panel(page, 'Evidence & dashboard');
  const next = page.getByRole('button', { name: 'Next delivery', exact: true });
  for (let i = 0; i < 4; i++) await next.click();
  const app = page.getByTestId('subscribe-application');
  await expect(app).toContainText('70');
  for (let i = 0; i < 3; i++) await next.click();
  await expect(app).toContainText('70');
  await expect(app).not.toContainText('90');
  await next.click(); await expect(app).toContainText('90');
  await panel(page, 'Task');
  await page.getByRole('radio', { name: 'Initial snapshot enabled', exact: true }).check();
  await choose(page, 'Interpret changes', 'signed');
  await page.getByRole('radio', { name: 'P(632.001) — progress strictly beyond the timestamp', exact: true }).check();
  await choose(page, 'Final published application', 'correct');
  await apply(page, true);
  await page.getByRole('button', { name: 'Run acceptance checks', exact: true }).click();
}

test('main page → Challenge directly; full independent incident', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('main').getByRole('link', { name: 'Challenge', exact: true }).click();
  await expect(page).toHaveURL(challengeUrl);
  await expect(page.locator('.chapter-sidebar')).toHaveCount(0);
  await independentRun(page);
  await expect(page.getByText('Completed independently', { exact: true })).toBeVisible();
  const result = page.getByRole('table', { name: 'Regional order totals', exact: true });
  await expect(result.getByRole('row').filter({ hasText: 'EU' })).toContainText('90');
  await expect(result.getByRole('row').filter({ hasText: 'US' })).toContainText('35');
  await page.reload();
  await expect(page.getByText('Completed independently', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Back to main page', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Review challenge', exact: true })).toBeVisible();
  await expect(page.getByRole('main').getByText('0/8 completed', { exact: true })).toBeVisible();
});

test('an unavailable incident response is accepted and prior edits reopen downstream work', async ({ page }) => {
  await independentRun(page, 'unavailable');
  await expect(page.getByText('Completed independently', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Review checkpoint', exact: true }).nth(0).click();
  await page.getByRole('radio', { name: 'Append only — independent events', exact: true }).check();
  await page.getByRole('button', { name: 'Test repair', exact: true }).click();
  await expect(page.getByText('This repair needs another look', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Apply and continue', exact: true })).toBeDisabled();
  await expect(page.getByText('Incident log · 0 of 6 repairs applied', { exact: true })).toBeVisible();
});

test('wrong repairs, drafts, pause, help and lecture review survive a resumed run', async ({ page, context }) => {
  await page.goto(challengeUrl);
  await page.getByRole('button', { name: 'Start incident', exact: true }).click();
  await page.getByRole('radio', { name: 'Append only — independent events', exact: true }).check();
  await choose(page, 'Replacement identity', 'customer_id');
  await choose(page, 'What supports your choice?', 'event');
  await page.getByRole('button', { name: 'Test repair', exact: true }).click();
  await expect(page.getByText('This repair needs another look', { exact: true })).toBeVisible();
  await expect(page.getByText('Customer IDs and status are shared by different orders. Use the producer’s stable order ID.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Replacement identity', exact: true })).toHaveValue('customer_id');
  await page.getByRole('button', { name: 'Hint', exact: true }).click();
  await page.reload();
  await expect(page.getByText('Hint 1 of 2', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.getByText('Incident paused', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Resume incident', exact: true }).click();
  await page.getByRole('button', { name: 'SQL & Objectives', exact: true }).first().click();
  await expect(page.getByRole('dialog', { name: 'SQL & Objectives', exact: true })).toContainText('CREATE MATERIALIZED VIEW');
  await page.keyboard.press('Escape');
  const [lecture] = await Promise.all([context.waitForEvent('page'), page.getByRole('link', { name: /Chapter 4 · Events and current values/ }).click()]);
  await expect(lecture).toHaveURL(/getting-data-in\/tutorial\/lecture-2/);
  await lecture.close();
  await feed(page); await apply(page);
  await expect(page.getByRole('heading', { name: 'Place maintained state', exact: true }).first()).toBeVisible();
});

test('worked repairs are recorded honestly and replay preserves achievements', async ({ page }) => {
  await page.goto(challengeUrl); await page.getByRole('button', { name: 'Start incident', exact: true }).click();
  for (let stage = 0; stage < 6; stage++) {
    await panel(page, 'Task');
    await page.getByRole('button', { name: 'Show worked repair', exact: true }).click();
    if (stage === 4) {
      await panel(page, 'Evidence & dashboard');
      for (const name of ['Test normal policy', 'Finish catch-up', 'Issue new normal read']) await page.getByRole('button', { name, exact: true }).click();
    }
    if (stage === 5) {
      await panel(page, 'Evidence & dashboard');
      for (let i = 0; i < 8; i++) await page.getByRole('button', { name: 'Next delivery', exact: true }).click();
    }
    await panel(page, 'Task');
    await page.getByRole('button', { name: stage === 5 ? 'Continue to handover' : 'Apply and continue', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Run acceptance checks', exact: true }).click();
  await expect(page.getByText('Completed with walkthrough', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Replay challenge', exact: true }).click();
  await page.getByRole('button', { name: 'Restart incident', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start incident', exact: true })).toBeVisible();
  await expect(page.getByText(/Previous completion saved/)).toBeVisible();
});

test('open tabs automatically share saved decisions, progression, and resets', async ({ page, context }) => {
  await page.goto(challengeUrl); await page.getByRole('button', { name: 'Start incident', exact: true }).click();
  const other = await context.newPage(); await other.goto(challengeUrl);
  await page.getByRole('radio', { name: 'UPSERT — latest value for a key', exact: true }).check();
  await expect(other.getByRole('radio', { name: 'UPSERT — latest value for a key', exact: true })).toBeChecked();
  await expect(other.getByRole('button', { name: 'Load saved run', exact: true })).toHaveCount(0);
  await choose(other, 'Replacement identity', 'order_id');
  await expect(page.getByRole('combobox', { name: 'Replacement identity', exact: true })).toHaveValue('order_id');
  await choose(page, 'What supports your choice?', 'replacement');
  await expect(other.getByRole('combobox', { name: 'What supports your choice?', exact: true })).toHaveValue('replacement');
  await apply(page);
  await expect(other.getByRole('heading', { name: 'Place maintained state', exact: true })).toBeVisible();
  await other.getByRole('button', { name: 'Restart challenge', exact: true }).click();
  await other.getByRole('button', { name: 'Restart incident', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start incident', exact: true })).toBeVisible();
  await expect(other.getByRole('button', { name: 'Start incident', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Start incident', exact: true }).click();
  await expect(other.getByRole('heading', { name: 'Repair the feed', exact: true })).toBeVisible();
  await expect(other.getByRole('combobox', { name: 'Replacement identity', exact: true })).toHaveValue('');
  await other.close();
});

test('returning resumes the saved checkpoint directly and restart is optional', async ({ page }) => {
  await page.goto(challengeUrl);
  await page.getByRole('button', { name: 'Start incident', exact: true }).click();
  await feed(page); await apply(page);
  await choose(page, 'Recent-orders helper', 'view');
  await page.getByRole('link', { name: 'Back to main page', exact: true }).click();
  await page.getByRole('main').getByRole('link', { name: 'Resume challenge', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Place maintained state', exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Recent-orders helper', exact: true })).toHaveValue('view');
  await expect(page.getByRole('button', { name: 'Load saved run', exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Recent-orders helper', exact: true })).toHaveValue('view');
  await page.getByRole('button', { name: 'Restart challenge', exact: true }).click();
  await page.getByRole('button', { name: 'Keep this run', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Recent-orders helper', exact: true })).toHaveValue('view');
  await page.getByRole('button', { name: 'Restart challenge', exact: true }).click();
  await page.getByRole('button', { name: 'Restart incident', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start incident', exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Start incident', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Repair the feed', exact: true })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'UPSERT — latest value for a key', exact: true })).not.toBeChecked();
  await expect(page.getByRole('progressbar', { name: 'Incident repairs applied' })).toHaveAttribute('value', '0');
});

test('corrupt saved data is recoverable', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('materialize-learning-lab-challenges-v1', '{broken'); });
  await page.goto(challengeUrl);
  await expect(page.getByText(/saved run is incompatible or incomplete/)).toBeVisible();
  await page.getByRole('button', { name: 'Start incident', exact: true }).click();
  await expect(page.getByText(/saved run is incompatible or incomplete/)).toHaveCount(0);
});

test('blocked browser storage keeps the challenge usable with an honest save status', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'materialize-learning-lab-challenges-v1') throw new DOMException('Storage blocked', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.goto(challengeUrl); await page.getByRole('button', { name: 'Start incident', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Storage is unavailable. You can continue' })).toBeVisible();
  await feed(page); await apply(page);
  await expect(page.getByRole('heading', { name: 'Place maintained state', exact: true }).first()).toBeVisible();
});

test('responsive evidence, keyboard controls, theme, and zoom retain usable content', async ({ page }) => {
  await page.goto(challengeUrl); await page.getByRole('button', { name: 'Start incident', exact: true }).click();
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 1280, height: 640 }, { width: 768, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 640 }]) {
    await page.setViewportSize(viewport);
    await panel(page, 'Evidence & dashboard');
    await expect(page.getByRole('table', { name: 'Retained Kafka message log', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await panel(page, 'Task');
    await expect(page.getByRole('button', { name: 'Test repair', exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('radio', { name: 'UPSERT — latest value for a key', exact: true }).focus();
  await page.keyboard.press('Space');
  await expect(page.getByRole('radio', { name: 'UPSERT — latest value for a key', exact: true })).toBeChecked();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.evaluate(() => { document.body.style.zoom = '2'; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
