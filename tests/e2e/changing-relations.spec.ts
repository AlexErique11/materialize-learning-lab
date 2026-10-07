import { expectChapterOneGuideLayout } from './chapter-one-guide';
import { expect, test } from './fixtures';

const lecturePath = '/labs/changing-relations/tutorial/lecture-1';
const playbackInterval = 2200;
const guideTitles = [
  'Read one change record',
  'One change can add several copies',
  'A different row adds a distinct value',
  'Total copies and distinct rows differ',
  'Zero-copy rows are removed',
  'The rule: add each diff to the row’s count',
];

test('simple mode steps only data changes, stays minimal, and replays historical state', async ({ page, isMobile }, testInfo) => {
  await page.goto(lecturePath);
  const progress = page.getByRole('progressbar', { name: 'Changes progress' });
  await expect(progress).toHaveAttribute('max', '4');
  await expect(progress).toHaveAttribute('value', '0');
  if (!isMobile) await expect(page.getByRole('complementary', { name: 'Lab tip' })).toBeVisible();
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
  const relation = page.getByRole('table', { name: 'Current relation', exact: true, includeHidden: true });
  await expect(relation.getByRole('row', { includeHidden: true })).toHaveCount(3);
  await expect(relation.getByRole('cell', { name: 'B', exact: true, includeHidden: true })).toHaveCount(0);
  await expect(page.locator('.relation-removed')).toContainText('Removed at t = 4: B, $14');
  await page.screenshot({ path: testInfo.outputPath('simple-run.png'), fullPage: true });
  await previousChange.click();
  await expect(page.getByTestId('logical-time').locator('strong')).toHaveText('t = 3');
  await expect(page.getByTestId('total-copies').locator('strong')).toHaveText('6');
  const panelSelector = page.getByRole('navigation', { name: 'Workspace panels' });
  if (await panelSelector.isVisible()) await panelSelector.getByRole('button', { name: 'Current relation', exact: true }).click();
  await expect(relation.getByRole('cell', { name: 'B', exact: true, includeHidden: true })).toBeVisible();
  if (await panelSelector.isVisible()) await panelSelector.getByRole('button', { name: 'Change ledger', exact: true }).click();
  await expect(page.locator('.relation-removed')).toHaveCount(0);
  await expect(progress).toHaveAttribute('value', '3');
  await page.getByRole('button', { name: 'Next change', exact: true }).click();
  await expect(page.getByTestId('logical-time').locator('strong')).toHaveText('t = 4');
  await expect(relation.getByRole('cell', { name: 'B', exact: true, includeHidden: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Inspect t = 2' }).click();
  await expect(page.getByTestId('total-copies').locator('strong')).toHaveText('4');
  await expect(progress).toHaveAttribute('value', '2');
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
    if (isMobile && ['Current relation', 'Product', 'Price', 'Copies per row'].includes(label))
      await page.getByRole('navigation', { name: 'Workspace panels' }).getByRole('button', { name: 'Current relation', exact: true }).click();
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

test('six guided steps explain the live tables and predict each effect', async ({ page, isMobile }, testInfo) => {
  if (isMobile) await page.setViewportSize({ width: 390, height: 664 });
  for (const theme of ['light', 'dark']) {
    await page.goto(lecturePath);
    const toggle = page.getByRole('button', { name: 'Switch to ' + theme + ' mode', exact: true });
    if (await toggle.isVisible()) await toggle.click();
    await page.getByRole('button', { name: 'Start guided run' }).click();
    const totals = ['0', '3', '4', '6', '5', '5'];
    const distinct = ['0', '1', '2', '3', '2', '2'];
    for (const [index, title] of guideTitles.entries()) {
      const guide = page.getByRole('dialog');
      await expect(guide).toHaveAccessibleName(title);
      await expect(guide).toContainText((index + 1) + ' of 6');
      await expect(guide.locator('.relation-diagram')).toHaveCount(0);
      await expect(page.locator('.guided-lab-progress span')).toHaveText('Changes');
      const progress = page.getByRole('progressbar', { name: 'Changes progress' });
      await expect(progress).toHaveAttribute('max', '4');
      const beforeTime = index >= 1 && index <= 4 ? index - 1 : index === 5 ? 4 : 0;
      await expect(progress).toHaveAttribute('value', String(beforeTime));
      await expectChapterOneGuideLayout(page);
      if (index >= 1 && index <= 4) {
        await expect(guide.locator('.relation-guide-phase')).toHaveText('Predict the effect');
        await expect(page.getByTestId('logical-time').locator('strong')).toHaveText('t = ' + (index - 1));
        if (index === 1) await page.screenshot({ path: testInfo.outputPath('guided-before.png') });
        await guide.getByRole('button', { name: 'Show effect', exact: true }).click();
        await expect(guide.locator('.relation-guide-phase')).toHaveText('Explanation');
        await expect(page.locator('.relation-causal-arrow')).toHaveCount(0);
        await expect(page.getByTestId('logical-time').locator('strong')).toHaveText('t = ' + index);
        await expect(progress).toHaveAttribute('value', String(index));
        await expectChapterOneGuideLayout(page);
        if (index === 3) {
          await expect(guide.locator('p')).toContainText('4 → 6');
          await expect(guide.locator('p')).toContainText('2 → 3');
          const targets = await page.locator('.relation-guide-hole').evaluate(hole => {
            const bounds = hole.getBoundingClientRect();
            const time = document.querySelector('[data-testid="logical-time"]')!.getBoundingClientRect();
            return { timeLeft: time.left, right: bounds.right };
          });
          expect(targets.right).toBeLessThan(targets.timeLeft);
          await page.screenshot({ path: testInfo.outputPath('guided-metrics.png') });
        }
        if (index === 4) {
          await expect(page.locator('.relation-current tbody tr')).toHaveText(['A$103', 'C$202']);
          await page.screenshot({ path: testInfo.outputPath('guided-removal.png') });
        }
      }
      await expect(page.getByTestId('total-copies').locator('strong')).toHaveText(totals[index]!);
      await expect(page.getByTestId('distinct-rows').locator('strong')).toHaveText(distinct[index]!);
      await guide.getByRole('button', { name: index === 5 ? 'Finish tutorial' : 'Next', exact: true }).click();
    }
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.locator('.relation-tutorial-complete')).toHaveText('Tutorial completed');
    await expect(page.getByRole('progressbar', { name: 'Changes progress' })).toHaveAttribute('value', '4');
  }
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
  await guide.getByRole('button', { name: 'Show effect', exact: true }).click();
  await guide.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(guide).toHaveAccessibleName('One change can add several copies');
  await expect(guide.getByRole('button', { name: 'Show effect', exact: true })).toBeVisible();
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
    for (let step = 0; step < guideTitles.length; step++) {
      await expectChapterOneGuideLayout(page);
      const guide = page.getByRole('dialog');
      if (await guide.getByRole('button', { name: 'Show effect', exact: true }).isVisible()) {
        await guide.getByRole('button', { name: 'Show effect', exact: true }).click();
        await expectChapterOneGuideLayout(page);
      }
      await guide.getByRole('button', { name: step === guideTitles.length - 1 ? 'Finish tutorial' : 'Next', exact: true }).click();
    }
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await expect(page.getByTestId('total-copies').locator('strong')).toHaveText('5');
  await page.screenshot({ path: testInfo.outputPath('lecture-dark.png'), fullPage: true });
  await page.getByRole('button', { name: 'Start guided run' }).click();
  const guide = page.getByRole('dialog');
  await guide.getByRole('button', { name: 'Next', exact: true }).click();
  await guide.getByRole('button', { name: 'Show effect', exact: true }).click();
  await expectChapterOneGuideLayout(page);
  await page.screenshot({ path: testInfo.outputPath('guided-dark.png') });
});
