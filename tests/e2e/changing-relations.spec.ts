import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const lecturePath = '/labs/changing-relations/tutorial/lecture-1';
const playbackInterval = 2200;
const guideTitles = [
  'Read changes, see the current state',
  'Read one change record',
  'One change can add several copies',
  'A different row adds a distinct value',
  'Total copies and distinct rows differ',
  'Zero-copy rows are removed',
  'The rule: add each diff to the row’s count',
];

async function expectGuideLayout(page: Page) {
  const geometry = await page.locator('.relation-guide').evaluate((dialog) => {
    const card = dialog.querySelector('.relation-guide-card')!;
    const bounds = card.getBoundingClientRect();
    const hole = dialog.querySelector('.relation-guide-hole')!.getBoundingClientRect();
    return { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom,
      scrollHeight: card.scrollHeight, clientHeight: card.clientHeight, width: innerWidth, height: innerHeight,
      overlaps: bounds.left < hole.right && bounds.right > hole.left && bounds.top < hole.bottom && bounds.bottom > hole.top };
  });
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(geometry.width);
  expect(geometry.top).toBeGreaterThanOrEqual(0);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.height);
  expect(geometry.scrollHeight).toBeLessThanOrEqual(geometry.clientHeight);
  expect(geometry.overlaps, 'The teaching card should leave its highlighted panel visible').toBe(false);
}

test('simple mode steps only data changes, stays minimal, and replays historical state', async ({ page }, testInfo) => {
  await page.goto(lecturePath);
  const progress = page.getByRole('progressbar', { name: 'Changes progress' });
  await expect(progress).toHaveAttribute('max', '4');
  await expect(progress).toHaveAttribute('value', '0');
  await expect(page.getByRole('complementary', { name: 'Lab tip' })).toBeVisible();
  const previousChange = page.getByRole('button', { name: 'Previous change', exact: true });
  await expect(previousChange).toBeDisabled();
  await expect(page.locator('.relation-explanation, .relation-diagram')).toHaveCount(0);
  await expect(page.getByRole('radio')).toHaveCount(0);
  const totals = ['3', '4', '6', '5'];
  const distinct = ['1', '2', '3', '2'];
  for (let index = 0; index < 4; index++) {
    await page.getByRole('button', { name: 'Next change', exact: true }).click();
    await expect(page.getByTestId('total-copies').locator('strong')).toHaveText(totals[index]!);
    await expect(page.getByTestId('distinct-rows').locator('strong')).toHaveText(distinct[index]!);
    await expect(page.getByTestId('logical-time').locator('strong')).toHaveText(`t = ${index + 1}`);
  }
  await expect(page.getByRole('button', { name: 'Next change', exact: true })).toBeDisabled();
  await expect(page.locator('.relation-tutorial-complete, .relation-causal-arrow')).toHaveCount(0);
  const relation = page.getByRole('table', { name: 'Current relation', exact: true });
  await expect(relation.getByRole('row')).toHaveCount(3);
  await expect(relation.getByRole('cell', { name: 'B', exact: true })).toHaveCount(0);
  await expect(page.locator('.relation-removed')).toContainText('Removed at t = 4: B, $14');
  await page.screenshot({ path: testInfo.outputPath('simple-run.png'), fullPage: true });
  await previousChange.click();
  await expect(page.getByTestId('logical-time').locator('strong')).toHaveText('t = 3');
  await expect(page.getByTestId('total-copies').locator('strong')).toHaveText('6');
  await expect(relation.getByRole('cell', { name: 'B', exact: true })).toBeVisible();
  await expect(page.locator('.relation-removed')).toHaveCount(0);
  await expect(progress).toHaveAttribute('value', '4');
  await page.getByRole('button', { name: 'Next change', exact: true }).click();
  await expect(page.getByTestId('logical-time').locator('strong')).toHaveText('t = 4');
  await expect(relation.getByRole('cell', { name: 'B', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Inspect t = 2' }).click();
  await expect(page.getByTestId('total-copies').locator('strong')).toHaveText('4');
  await expect(progress).toHaveAttribute('value', '4');
  await page.getByRole('button', { name: 'Next change', exact: true }).click();
  await expect(page.getByTestId('total-copies').locator('strong')).toHaveText('6');
  await previousChange.click();
  await expect(page.getByTestId('logical-time').locator('strong')).toHaveText('t = 2');
  await page.getByRole('button', { name: 'Return to latest' }).click();
  await expect(page.getByTestId('logical-time').locator('strong')).toHaveText('t = 4');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(progress).toHaveAttribute('value', '0');
  await expect(previousChange).toBeDisabled();
  await expect(relation).toContainText('The relation is empty.');
});

test('every metric, panel, and column has readable help on hover, focus, and click or tap', async ({ page, isMobile }, testInfo) => {
  await page.goto(lecturePath);
  const labels = ['Total row copies', 'Distinct full rows', 'Current logical timestamp', 'Change ledger', 't', 'Signed diff', 'Row', 'Current relation', 'Product', 'Price', 'Copies per row'];
  for (const label of labels) {
    const help = page.getByRole('button', { name: `About ${label}`, exact: true });
    await help.click();
    const tooltip = page.getByRole('tooltip');
    await expect(tooltip).toBeVisible();
    await expect(tooltip.locator('b')).toHaveText(label);
    const geometry = await tooltip.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, bottom: rect.bottom, width: innerWidth, height: innerHeight };
    });
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(geometry.width);
    expect(geometry.bottom).toBeLessThanOrEqual(geometry.height);
    if (label === 'Signed diff') {
      await expect(tooltip).toContainText('not the resulting count or a price adjustment');
      await page.screenshot({ path: testInfo.outputPath('signed-diff-help.png') });
    }
    await page.keyboard.press('Escape');
    await expect(page.getByRole('tooltip')).not.toBeVisible();
    await page.getByRole('heading', { name: 'Lecture 1', exact: true }).click();
  }
  const copiesHelp = page.getByRole('button', { name: 'About Copies per row', exact: true });
  await copiesHelp.focus();
  await expect(page.getByRole('tooltip')).toContainText('COUNT(*) grouped by product and price');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('tooltip')).not.toBeVisible();
  if (!isMobile) {
    await page.getByRole('button', { name: 'About Signed diff', exact: true }).hover();
    await expect(page.getByRole('tooltip')).toContainText('+3 adds three copies');
    await page.getByRole('heading', { name: 'Lecture 1', exact: true }).hover();
    await expect(page.getByRole('tooltip')).not.toBeVisible();
  }
});

test('guided mode teaches before revealing each effect and distinguishes partial retractions', async ({ page }, testInfo) => {
  await page.goto(lecturePath);
  await page.getByRole('button', { name: 'Start guided run' }).click();
  for (const [index, title] of guideTitles.entries()) {
    const guide = page.getByRole('dialog');
    await expect(guide).toHaveAccessibleName(title);
    await expect(guide).toContainText(`${index + 1} of 7`);
    await expect(page.locator('.guided-lab-progress progress')).toHaveAttribute('max', '7');
    await expect(page.locator('.guided-lab-progress progress')).toHaveAttribute('value', String(index));
    await expect(guide.getByRole('radio')).toHaveCount(0);
    await expect(page.locator('.relation-guide-shade')).toHaveCount(4);
    await expectGuideLayout(page);
    if (index >= 2 && index <= 5) {
      await expect(guide.locator('.relation-guide-phase')).toHaveText('Before the change');
      await expect(page.getByTestId('logical-time').locator('strong')).toHaveText(`t = ${index - 2}`);
      if (index === 2) await page.screenshot({ path: testInfo.outputPath('guided-before.png') });
      await guide.getByRole('button', { name: 'Show effect', exact: true }).click();
      await expect(guide.locator('.relation-guide-phase')).toHaveText('Effect shown');
      await expect(page.getByTestId('logical-time').locator('strong')).toHaveText(`t = ${index - 1}`);
      await expectGuideLayout(page);
      if (index === 4) {
        await expect(guide.getByRole('group', { name: 'Total row copies', exact: true })).toContainText('4 → 6');
        await expect(guide.getByRole('group', { name: 'Distinct full rows', exact: true })).toContainText('2 → 3');
        await page.screenshot({ path: testInfo.outputPath('guided-metrics.png') });
      } else {
        const rowCopies = index === 2 ? '3' : index === 3 ? '1' : '0';
        await expect(guide.getByRole('group', { name: 'Copy-count transition' }).locator('strong').last()).toHaveText(rowCopies);
      }
      if (index === 5) {
        await expect(guide.getByRole('group', { name: 'Hypothetical partial retraction' })).toContainText('3 − 1 = 2');
        await expect(page.locator('.relation-current tbody tr').first().locator('td').last()).toHaveText('3');
        await expect(page.getByTestId('total-copies').locator('strong')).toHaveText('5');
        await page.screenshot({ path: testInfo.outputPath('guided-removal.png') });
      }
    }
    await guide.getByRole('button', { name: index === 6 ? 'Finish tutorial' : 'Next', exact: true }).click();
  }
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByTestId('total-copies').locator('strong')).toHaveText('5');
  await expect(page.locator('.relation-tutorial-complete')).toHaveText('Tutorial completed');
  await expect(page.getByRole('progressbar', { name: 'Changes progress' })).toHaveAttribute('value', '4');
  await expect(page.locator('.relation-diagram')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('lecture-completed.png'), fullPage: true });
});

test('guided Back rewinds state and Escape returns to minimal playback with focus restored', async ({ page }) => {
  await page.goto(lecturePath);
  const start = page.getByRole('button', { name: 'Start guided run' });
  await start.click();
  const guide = page.getByRole('dialog');
  await expect(guide.getByRole('button', { name: 'Close guided run' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(guide.getByRole('button', { name: 'Next', exact: true })).toBeFocused();
  await guide.getByRole('button', { name: 'Next', exact: true }).click();
  await guide.getByRole('button', { name: 'Next', exact: true }).click();
  await guide.getByRole('button', { name: 'Show effect', exact: true }).click();
  await guide.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(guide).toHaveAccessibleName('Read one change record');
  await expect(page.getByTestId('logical-time').locator('strong')).toHaveText('t = 0');
  await guide.getByRole('button', { name: 'Next', exact: true }).click();
  await guide.getByRole('button', { name: 'Show effect', exact: true }).click();
  await guide.getByRole('button', { name: 'Next', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(guide).not.toBeVisible();
  await expect(start).toBeFocused();
  await expect(page.getByTestId('logical-time').locator('strong')).toHaveText('t = 1');
  await expect(page.locator('.relation-diagram, .relation-tutorial-complete')).toHaveCount(0);
  await page.getByRole('button', { name: 'Next change', exact: true }).click();
  await expect(page.getByTestId('logical-time').locator('strong')).toHaveText('t = 2');
  await start.click();
  await expect(page.getByTestId('total-copies').locator('strong')).toHaveText('0');
  await guide.getByRole('button', { name: 'Close guided run' }).click();
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByRole('progressbar', { name: 'Changes progress' })).toHaveAttribute('value', '0');
});

test('automatic Run applies only four changes and never completes the tutorial', async ({ page }) => {
  await page.goto(lecturePath);
  await page.clock.install();
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Previous change', exact: true })).toBeDisabled();
  await page.clock.fastForward(playbackInterval);
  await expect(page.getByTestId('logical-time').locator('strong')).toHaveText('t = 1');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.clock.fastForward(playbackInterval * 2);
  await expect(page.getByTestId('logical-time').locator('strong')).toHaveText('t = 1');
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  for (const time of [2, 3, 4]) {
    await page.clock.fastForward(playbackInterval);
    await expect(page.getByTestId('logical-time').locator('strong')).toHaveText(`t = ${time}`);
  }
  await expect(page.getByTestId('total-copies').locator('strong')).toHaveText('5');
  await expect(page.getByRole('button', { name: 'Run', exact: true })).toBeVisible();
  await expect(page.locator('.relation-diagram, .relation-tutorial-complete')).toHaveCount(0);
});

test('playback and all guide phases fit laptop screens and work in dark mode', async ({ page, isMobile }, testInfo) => {
  test.skip(isMobile, 'Laptop layouts are checked here; the full guided phone journey is tested separately.');
  for (const viewport of [{ width: 1366, height: 768 }, { width: 1280, height: 650 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(viewport);
    await page.goto(lecturePath);
    for (let change = 0; change <= 4; change++) {
      if (change > 0) await page.getByRole('button', { name: 'Next change', exact: true }).click();
      const size = await page.evaluate(() => ({ height: document.documentElement.scrollHeight, width: document.documentElement.scrollWidth, viewportHeight: innerHeight, viewportWidth: innerWidth }));
      expect(size.height).toBeLessThanOrEqual(size.viewportHeight);
      expect(size.width).toBeLessThanOrEqual(size.viewportWidth);
    }
    await page.getByRole('button', { name: 'Start guided run' }).click();
    for (let step = 0; step < 7; step++) {
      await expectGuideLayout(page);
      const guide = page.getByRole('dialog');
      if (await guide.getByRole('button', { name: 'Show effect', exact: true }).isVisible()) {
        await guide.getByRole('button', { name: 'Show effect', exact: true }).click();
        await expectGuideLayout(page);
      }
      await guide.getByRole('button', { name: step === 6 ? 'Finish tutorial' : 'Next', exact: true }).click();
    }
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await expect(page.getByTestId('total-copies').locator('strong')).toHaveText('5');
  await page.screenshot({ path: testInfo.outputPath('lecture-dark.png'), fullPage: true });
  await page.getByRole('button', { name: 'Start guided run' }).click();
  const guide = page.getByRole('dialog');
  await guide.getByRole('button', { name: 'Next', exact: true }).click();
  await guide.getByRole('button', { name: 'Next', exact: true }).click();
  await guide.getByRole('button', { name: 'Show effect', exact: true }).click();
  await expectGuideLayout(page);
  await page.screenshot({ path: testInfo.outputPath('guided-dark.png') });
});
