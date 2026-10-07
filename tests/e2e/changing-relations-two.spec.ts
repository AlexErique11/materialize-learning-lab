import type { Page } from '@playwright/test';
import { expectChapterOneGuideLayout } from './chapter-one-guide';
import { expect, test } from './fixtures';

const lecturePath = '/labs/changing-relations/tutorial/lecture-2';
const guideTitles = [
  'Start with an existing relation', 'One update, two signed changes',
  'An update can replace several identical copies', 'Combine matching diffs, cancel opposite ones',
  'Read the completed relation',
];

async function finishGuide(page: Page) {
  await page.getByRole('button', { name: 'Start guided run' }).click();
  for (let step = 0; step < guideTitles.length; step++) {
    const guide = page.getByRole('dialog');
    await expectChapterOneGuideLayout(page);
    if (await guide.getByRole('button', { name: 'Show effect', exact: true }).isVisible()) {
      await guide.getByRole('button', { name: 'Show effect', exact: true }).click();
      await expectChapterOneGuideLayout(page);
    }
    await guide.getByRole('button', { name: step === guideTitles.length - 1 ? 'Finish tutorial' : 'Next', exact: true }).click();
  }
}

test('timestamp playback replaces values as complete batches and revisits the seed and history', async ({ page, isMobile }, testInfo) => {
  await page.goto(lecturePath);
  const progress = page.getByRole('progressbar', { name: 'Changes progress' });
  const previous = page.getByRole('button', { name: 'Previous timestamp', exact: true });
  const next = page.getByRole('button', { name: 'Next timestamp', exact: true });
  const relation = page.getByRole('table', { name: 'Current relation', exact: true, includeHidden: true });
  const ledgerRows = page.locator('.relation-ledger tbody tr');
  await expect(progress).toHaveAttribute('max', '3');
  await expect(progress).toHaveAttribute('value', '0');
  await expect(previous).toBeDisabled();
  await expect(page.locator('.relation-ledger .relation-panel-time')).toHaveText('Applied · t = 0');
  await expect(page.getByRole('navigation', { name: 'Inspect change history' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Inspect t =/ })).toHaveCount(0);
  await expect(page.getByTestId('total-copies').locator('strong')).toHaveText('4');
  await expect(relation.locator('tbody tr')).toHaveText(['A$101', 'B$141', 'C$202']);
  await expect(ledgerRows).toHaveText(['+1A$10', '+1B$14', '+2C$20', '']);
  if (!isMobile) await expect(page.getByRole('complementary', { name: 'Lab tip' })).toBeVisible();
  for (const time of [1, 2, 3]) {
    await next.click();
    await expect(page.locator('.relation-ledger .relation-panel-time')).toHaveText(`Applied · t = ${time}`);
    await expect(page.getByTestId('logical-time').locator('strong')).toHaveText(`t = ${time}`);
    await expect(page.getByTestId('total-copies').locator('strong')).toHaveText(time === 3 ? '5' : '4');
    await expect(page.getByTestId('distinct-rows').locator('strong')).toHaveText('3');
    await expect(ledgerRows).toHaveText(time === 1 ? ['−1B$14', '+1B$18', '', '']
      : time === 2 ? ['−2C$20', '+2C$25', '', '']
      : ['+2A$10', '−1A$10', '+1B$18', '−1B$18']);
    await expect(page.locator('.relation-ledger-selected')).toHaveCount(0);
    await expect(relation.locator('tbody tr')).toHaveText([time === 3 ? 'A$102' : 'A$101', 'B$181', time >= 2 ? 'C$252' : 'C$202']);
  }
  await expect(next).toBeDisabled();
  await expect(page.locator('.relation-diagram, .relation-tutorial-complete')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('lecture-two-playback.png'), fullPage: true });
  await previous.click();
  await expect(page.getByTestId('total-copies').locator('strong')).toHaveText('4');
  await expect(progress).toHaveAttribute('value', '2');
  await previous.click(); await previous.click();
  await expect(relation.locator('tbody tr')).toHaveText(['A$101', 'B$141', 'C$202']);
  await expect(ledgerRows).toHaveText(['+1A$10', '+1B$14', '+2C$20', '']);
  await next.click();
  await expect(page.getByTestId('logical-time').locator('strong')).toHaveText('t = 1');
  await page.getByRole('button', { name: 'Return to latest', exact: true }).click();
  await expect(page.getByTestId('logical-time').locator('strong')).toHaveText('t = 3');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(progress).toHaveAttribute('value', '0');
  await expect(relation.locator('tbody tr')).toHaveText(['A$101', 'B$141', 'C$202']);
  const alignments = await page.locator('.relation-ledger .data-table').evaluate((table) => Array.from(table.querySelectorAll('th, tbody tr:first-child td')).map((cell) => getComputedStyle(cell).textAlign));
  expect(alignments).toEqual(['center', 'left', 'center', 'start']);
});

test('five guided steps explain complete updates and cancellation in the live tables', async ({ page, isMobile }, testInfo) => {
  if (isMobile) await page.setViewportSize({ width: 390, height: 664 });
  for (const theme of ['light', 'dark']) {
    await page.goto(lecturePath);
    const toggle = page.getByRole('button', { name: 'Switch to ' + theme + ' mode', exact: true });
    if (await toggle.isVisible()) await toggle.click();
    await page.getByRole('button', { name: 'Start guided run' }).click();
    const times = [0, 1, 2, 3, 3];
    for (const [step, title] of guideTitles.entries()) {
      const guide = page.getByRole('dialog');
      await expect(guide).toHaveAccessibleName(title);
      await expect(guide).toContainText((step + 1) + ' of 5');
      await expect(guide.locator('.relation-diagram')).toHaveCount(0);
      const progress = page.getByRole('progressbar', { name: 'Changes progress' });
      await expect(progress).toHaveAttribute('max', '3');
      await expect(progress).toHaveAttribute('value', String(step >= 1 && step <= 3 ? times[step]! - 1 : times[step]));
      await expectChapterOneGuideLayout(page);
      if (step >= 1 && step <= 3) {
        await expect(page.locator('.relation-ledger .relation-panel-time')).toHaveText('Upcoming · t = ' + times[step]);
        await expect(page.getByTestId('logical-time').locator('strong')).toHaveText('t = ' + (times[step]! - 1));
        await expect(page.locator('.relation-ledger-preview')).toHaveCount(step === 3 ? 4 : 2);
        await expect(guide.locator('.relation-guide-phase')).toHaveText('Predict the effect');
        await guide.getByRole('button', { name: 'Show effect', exact: true }).click();
        await expect(guide.locator('.relation-guide-phase')).toHaveText('Explanation');
        await expectChapterOneGuideLayout(page);
      }
      await expect(page.getByTestId('logical-time').locator('strong')).toHaveText('t = ' + times[step]);
      await expect(page.locator('.relation-ledger .relation-panel-time')).toHaveText('Applied · t = ' + times[step]);
      await expect(progress).toHaveAttribute('value', String(times[step]));
      if (step === 1) {
        await expect(guide.locator('p')).toContainText('Adding only the new row would leave the old row present too.');
        await expect(page.locator('.relation-current tbody tr')).toHaveText(['A$101', 'B$181', 'C$202']);
      }
      if (step === 3) {
        await expect(guide.locator('p')).toContainText('cancel, so B keeps 1 copy');
        await expect(page.locator('.relation-current tbody tr')).toHaveText(['A$102', 'B$181', 'C$252']);
        await page.screenshot({ path: testInfo.outputPath('lecture-two-consolidation-guide.png') });
      }
      await guide.getByRole('button', { name: step === guideTitles.length - 1 ? 'Finish tutorial' : 'Next', exact: true }).click();
    }
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.locator('.relation-tutorial-complete')).toHaveText('Tutorial completed');
    await expect(page.getByTestId('total-copies').locator('strong')).toHaveText('5');
  }
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
  for (const label of ['Total row copies', 'Distinct full rows', 'Current logical timestamp', 'Change ledger', 'Signed diff', 'Row', 'Current relation', 'Product', 'Price', 'Copies per row']) {
    const panels = page.getByRole('navigation', { name: 'Workspace panels' });
    if (await panels.isVisible() && ['Current relation', 'Product', 'Price', 'Copies per row'].includes(label))
      await panels.getByRole('button', { name: 'Current relation', exact: true }).click();
    await page.getByRole('button', { name: `About ${label}`, exact: true }).click();
    await expect(page.getByRole('tooltip')).toBeVisible();
    if (label === 'Change ledger') await expect(page.getByRole('tooltip')).toContainText('Cancelling teaching records');
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
