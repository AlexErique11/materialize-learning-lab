import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const lecturePath = '/labs/changing-relations/tutorial/lecture-2';
const guideTitles = [
  'From individual changes to timestamp batches', 'One update, two signed changes',
  'Inserting a new value does not replace the old one', 'An update can replace several identical copies',
  'Combine diffs separately for each full row', 'Cancellation requires the same full row',
  'Record order does not change the completed result', 'Read values, counts, and time together',
];

async function expectGuideLayout(page: Page) {
  // Layout settles after the spotlight measures the new content and target.
  await expect.poll(async () => page.locator('.relation-guide').evaluate((dialog) => {
    const card = dialog.querySelector('.relation-guide-card')!;
    const bounds = card.getBoundingClientRect();
    const hole = dialog.querySelector('.relation-guide-hole')!.getBoundingClientRect();
    return bounds.left >= 0 && bounds.right <= innerWidth && bounds.top >= 0 && bounds.bottom <= innerHeight
      && card.scrollHeight <= card.clientHeight
      && !(bounds.left < hole.right && bounds.right > hole.left && bounds.top < hole.bottom && bounds.bottom > hole.top);
  }), { message: 'The whole teaching card should fit and leave its highlighted panel visible' }).toBe(true);
}

async function finishGuide(page: Page) {
  await page.getByRole('button', { name: 'Start guided run' }).click();
  for (let step = 0; step < guideTitles.length; step++) {
    const guide = page.getByRole('dialog');
    await expectGuideLayout(page);
    if (await guide.getByRole('button', { name: 'Show effect', exact: true }).isVisible()) {
      await guide.getByRole('button', { name: 'Show effect', exact: true }).click();
      await expectGuideLayout(page);
    }
    await guide.getByRole('button', { name: step === 7 ? 'Finish tutorial' : 'Next', exact: true }).click();
  }
}

test('timestamp playback replaces values as complete batches and revisits the seed and history', async ({ page }, testInfo) => {
  await page.goto(lecturePath);
  const progress = page.getByRole('progressbar', { name: 'Timestamps progress' });
  const previous = page.getByRole('button', { name: 'Previous timestamp', exact: true });
  const next = page.getByRole('button', { name: 'Next timestamp', exact: true });
  const relation = page.getByRole('table', { name: 'Current relation', exact: true });
  await expect(progress).toHaveAttribute('max', '3');
  await expect(progress).toHaveAttribute('value', '0');
  await expect(previous).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Inspect t = 1', exact: true })).toBeDisabled();
  await expect(page.getByTestId('total-copies').locator('strong')).toHaveText('4');
  await expect(relation.locator('tbody tr')).toHaveText(['A$101', 'B$141', 'C$202']);
  await expect(page.getByRole('complementary', { name: 'Lab tip' })).toBeVisible();
  for (const time of [1, 2, 3]) {
    await next.click();
    await expect(page.getByTestId('logical-time').locator('strong')).toHaveText(`t = ${time}`);
    await expect(page.getByTestId('total-copies').locator('strong')).toHaveText(time === 3 ? '5' : '4');
    await expect(page.getByTestId('distinct-rows').locator('strong')).toHaveText('3');
    await expect(page.locator('.batch-ledger tbody tr:not([aria-hidden="true"])')).toHaveCount(time === 3 ? 4 : 2);
    await expect(relation.locator('tbody tr')).toHaveText([time === 3 ? 'A$102' : 'A$101', 'B$181', time >= 2 ? 'C$252' : 'C$202']);
  }
  await expect(next).toBeDisabled();
  await expect(page.locator('.relation-diagram, .relation-tutorial-complete')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('lecture-two-playback.png'), fullPage: true });
  await previous.click();
  await expect(page.getByTestId('total-copies').locator('strong')).toHaveText('4');
  await expect(progress).toHaveAttribute('value', '3');
  await page.getByRole('button', { name: 'Inspect t = 0', exact: true }).click();
  await expect(relation.locator('tbody tr')).toHaveText(['A$101', 'B$141', 'C$202']);
  await next.click();
  await expect(page.getByTestId('logical-time').locator('strong')).toHaveText('t = 1');
  await page.getByRole('button', { name: 'Return to latest', exact: true }).click();
  await expect(page.getByTestId('logical-time').locator('strong')).toHaveText('t = 3');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(progress).toHaveAttribute('value', '0');
  await expect(relation.locator('tbody tr')).toHaveText(['A$101', 'B$141', 'C$202']);
  const alignments = await page.locator('.batch-ledger .data-table').evaluate((table) => Array.from(table.querySelectorAll('th, tbody tr:first-child td')).map((cell) => getComputedStyle(cell).textAlign));
  expect(alignments).toEqual(['center', 'left', 'center', 'left']);
});

test('eight guided steps teach paired updates, cancellation, and order without mutating comparison state', async ({ page }, testInfo) => {
  await page.goto(lecturePath);
  await page.getByRole('button', { name: 'Start guided run' }).click();
  const times = [0, 1, 1, 2, 3, 3, 3, 3];
  for (const [step, title] of guideTitles.entries()) {
    const guide = page.getByRole('dialog');
    await expect(guide).toHaveAccessibleName(title);
    await expect(guide).toContainText(`${step + 1} of 8`);
    await expect(page.getByRole('progressbar', { name: 'Tutorial progress' })).toHaveAttribute('value', String(step));
    await expectGuideLayout(page);
    if ([1, 3, 4].includes(step)) {
      await expect(page.getByTestId('logical-time').locator('strong')).toHaveText(`t = ${times[step]! - 1}`);
      await expect(page.locator('.batch-summary')).toContainText(`diffs at t = ${times[step]}`);
      await expect(guide.locator('.relation-guide-phase')).toHaveText('Before the change');
      await guide.getByRole('button', { name: 'Show effect', exact: true }).click();
      await expect(guide.locator('.relation-guide-phase')).toHaveText('Effect shown');
      await expectGuideLayout(page);
    }
    await expect(page.getByTestId('logical-time').locator('strong')).toHaveText(`t = ${times[step]}`);
    if (step === 2) {
      await expect(guide.getByRole('group', { name: 'Correct update versus hypothetical insertion' })).toContainText('5 copies / 4 full rows');
      await expect(page.getByTestId('total-copies').locator('strong')).toHaveText('4');
      await expect(page.locator('.relation-current tbody tr')).toHaveText(['A$101', 'B$181', 'C$202']);
    }
    if (step === 4) {
      await expect(guide.getByRole('group', { name: 'Combined diffs by full row' })).toContainText('Copies: 1 → 2');
      await expect(guide.getByLabel('No net change')).toHaveText('0');
      await page.screenshot({ path: testInfo.outputPath('lecture-two-consolidation-guide.png') });
    }
    if (step === 6) await expect(guide.getByRole('group', { name: 'Reversed records give the same complete result' })).toContainText('Same completed relation');
    await guide.getByRole('button', { name: step === 7 ? 'Finish tutorial' : 'Next', exact: true }).click();
  }
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('.relation-tutorial-complete')).toHaveText('Tutorial completed');
  await expect(page.getByTestId('total-copies').locator('strong')).toHaveText('5');
  await expect(page.locator('.relation-diagram')).toHaveCount(0);
});

test('Run and Pause operate on three whole timestamps and do not finish the tutorial', async ({ page }) => {
  await page.goto(lecturePath);
  await page.clock.install();
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Previous timestamp', exact: true })).toBeDisabled();
  await page.clock.fastForward(2200);
  await expect(page.locator('.relation-current tbody tr')).toHaveText(['A$101', 'B$181', 'C$202']);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.clock.fastForward(4400);
  await expect(page.getByTestId('logical-time').locator('strong')).toHaveText('t = 1');
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  for (const time of [2, 3]) {
    await page.clock.fastForward(2200);
    await expect(page.getByTestId('logical-time').locator('strong')).toHaveText(`t = ${time}`);
  }
  await expect(page.getByRole('button', { name: 'Run', exact: true })).toBeVisible();
  await expect(page.locator('.relation-diagram, .relation-tutorial-complete')).toHaveCount(0);
  await page.getByRole('button', { name: 'Start guided run' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Next', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Start guided run' })).toBeFocused();
  await expect(page.getByTestId('logical-time').locator('strong')).toHaveText('t = 0');
  await expect(page.getByTestId('total-copies').locator('strong')).toHaveText('4');
});

test('Lecture 2 help and documentation remain accessible with the established styles', async ({ page }) => {
  await page.goto(lecturePath);
  for (const label of ['Total row copies', 'Distinct full rows', 'Current logical timestamp', 'Change ledger', 't', 'Signed diff', 'Row', 'Current relation', 'Product', 'Price', 'Copies per row']) {
    await page.getByRole('button', { name: `About ${label}`, exact: true }).click();
    await expect(page.getByRole('tooltip')).toBeVisible();
    if (label === 'Change ledger') await expect(page.getByRole('tooltip')).toContainText('Cancelling teaching records');
    if (label === 't') await expect(page.getByRole('tooltip')).toContainText('All its diffs apply together');
    await page.keyboard.press('Escape');
    await page.getByRole('heading', { name: 'Lecture 2', exact: true }).click();
  }
  await page.getByRole('button', { name: 'SQL & Objectives', exact: true }).click();
  const reference = page.getByRole('dialog', { name: 'SQL & Objectives' });
  await expect(reference).toContainText('UPDATE products SET price = 25');
  for (const link of await reference.getByRole('link').all()) {
    if ((await link.getAttribute('href'))?.startsWith('https:')) {
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  }
});

test('all playback and guide states fit desktop screens in light and dark themes', async ({ page, isMobile }, testInfo) => {
  test.skip(isMobile, 'The complete phone guide is checked in the guided journey.');
  for (const viewport of [{ width: 1366, height: 768 }, { width: 1280, height: 650 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(viewport);
    await page.goto(lecturePath);
    for (const time of [0, 1, 2, 3]) {
      if (time > 0) await page.getByRole('button', { name: 'Next timestamp', exact: true }).click();
      const size = await page.evaluate(() => ({ height: document.documentElement.scrollHeight, width: document.documentElement.scrollWidth, viewportHeight: innerHeight, viewportWidth: innerWidth }));
      expect(size.height).toBeLessThanOrEqual(size.viewportHeight);
      expect(size.width).toBeLessThanOrEqual(size.viewportWidth);
    }
    await finishGuide(page);
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await page.screenshot({ path: testInfo.outputPath('lecture-two-dark.png'), fullPage: true });
  await finishGuide(page);
});
