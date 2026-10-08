import { expect, test } from './fixtures';
import { lessons } from '../../src/chapters/incremental-maintenance/scenario';

const path = '/labs/incremental-maintenance/tutorial/lecture-1';
const output = (page: import('@playwright/test').Page) => page.getByRole('table', { name: 'Maintained output', exact: true, includeHidden: true });

test('Chapter 2 keeps Chapter 1 typography, metric cards, panels and controls without scaling', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Compare the desktop format directly; narrow panel journeys have separate coverage.');
  await page.setViewportSize({ width: 1366, height: 768 });
  const format = () => page.locator('.guided-lab-page').evaluate((root) => {
    const style = (selector: string) => {
      const element = root.querySelector(selector)!;
      const css = getComputedStyle(element);
      return { font: css.fontSize, padding: css.padding, border: css.borderRadius };
    };
    return { title: style('h1'), metric: style('.relation-metric'), panel: style('.relation-panel'),
      heading: style('.relation-panel h2'), cellFont: getComputedStyle(root.querySelector('.data-table td')!).fontSize, button: style('.guided-lab-controls .button'),
      zoom: getComputedStyle(root).zoom, transform: getComputedStyle(root).transform };
  });
  await page.goto('/labs/changing-relations/tutorial/lecture-1');
  const original = await format();
  await page.goto(path);
  expect(await format()).toEqual(original);
  expect(original.zoom).toBe('1');
  expect(original.transform).toBe('none');
  await expect(page.locator('.relation-metrics > .relation-metric')).toHaveCount(3);
  await expect(page.locator('.maintenance-panels > .relation-panel')).toHaveCount(3);
  await expect(page.getByRole('table', { name: 'Input orders', exact: true })).toContainText('product_id');
});

test('lecture traces changes through the Orders, Filter and Projection tables', async ({ page, isMobile }) => {
  await page.goto('/labs/incremental-maintenance');
  await page.getByRole('link', { name: 'Start tutorial: Lecture 1: Filters and projections', exact: true }).click();
  await expect(page).toHaveURL(path);
  const selectStage = async (name: string) => {
    if (isMobile) await page.getByRole('navigation', { name: 'Query stages' }).getByRole('button', { name, exact: false }).click();
  };
  await selectStage('3. Projection');
  const actualRows = () => output(page).locator('tbody tr:not([aria-hidden="true"])');
  await expect(actualRows()).toHaveCount(2);
  await page.getByRole('button', { name: 'Next change', exact: true }).click();
  await expect(output(page)).toContainText('$60');
  const before = await output(page).textContent();
  await page.getByRole('button', { name: 'Next change', exact: true }).click();
  expect(await output(page).textContent()).toBe(before);
  await selectStage('1. Orders');
  await expect(page.getByRole('table', { name: 'Input orders', exact: true })).toContainText('Express');
  if (isMobile) await page.getByRole('button', { name: 'Show changes', exact: true }).click();
  const inputDiffs = page.getByRole('region', { name: 'Input diffs', exact: true });
  await expect(inputDiffs.locator('[data-field="note"]')).toHaveText(['Standard', 'Express']);
  await expect(inputDiffs.locator('[data-field="productId"]')).toHaveText(['7', '7']);
  await expect(inputDiffs.locator('[data-changed="true"]')).toHaveCount(2);
  if (isMobile) await page.getByRole('button', { name: 'Show rows', exact: true }).click();
  await selectStage('3. Projection');
  if (isMobile) await page.getByRole('button', { name: 'Show changes', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Net output diffs', exact: true })).toContainText('No net changes');
  await expect(page.getByRole('region', { name: 'Net output diffs', exact: true })).toContainText('note excluded');
  await expect(page.getByRole('region', { name: 'Before consolidation', exact: true })).not.toContainText('delivery');
  await expect(page.getByRole('region', { name: 'Before consolidation', exact: true })).toContainText('\u22121');
  await expect(page.getByRole('region', { name: 'Before consolidation', exact: true })).toContainText('+1');
  await page.getByRole('button', { name: 'Next change', exact: true }).click();
  await expect(output(page)).not.toContainText('101');
  await page.getByRole('button', { name: 'Next change', exact: true }).click();
  await expect(output(page)).toContainText('$90');
  const amountEdit = page.getByRole('region', { name: 'Input diffs', exact: true, includeHidden: true });
  await expect(amountEdit.locator('[data-field="amount"][data-changed="true"]')).toHaveText(['$80', '$90']);
  await expect(amountEdit.locator('[data-field="note"][data-changed="false"]')).toHaveCount(2);
  await page.getByRole('button', { name: 'Next change', exact: true }).click();
  await expect(actualRows()).toHaveCount(1);
  await page.getByRole('button', { name: 'Previous change', exact: true }).click();
  await expect(output(page)).toContainText('103');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByTestId('maintenance-time')).toHaveText('t = 0');
  await expect(page.locator('.maintenance-change')).toHaveCount(0);
});

test('guided lecture predicts effects, completes, restores focus and keeps SQL and help usable', async ({ page }) => {
  await page.goto(path);
  await page.getByRole('button', { name: 'SQL & Objectives', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'SQL & Objectives' })).toContainText('WHERE amount >= 50');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Start guided run', exact: true }).click();
  for (let index = 0; index < lessons.length; index++) {
    const lesson = lessons[index]!;
    const dialog = page.locator('dialog[open]');
    await expect(dialog.getByRole('heading', { level: 2 })).toHaveText(lesson.title);
    await expect(page.locator('.maintenance-panels')).toHaveAttribute('data-selected-stage', lesson.stage);
    if (lesson.before) {
      await expect(page.getByTestId('maintenance-time')).toHaveText(`t = ${lesson.time - 1}`);
      await dialog.getByRole('button', { name: 'Show effect', exact: true }).click();
    }
    await expect(page.getByTestId('maintenance-time')).toHaveText(`t = ${lesson.time}`);
    const card = await dialog.locator('.relation-guide-card').boundingBox();
    expect(card!.x).toBeGreaterThanOrEqual(0);
    expect(card!.x + card!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    expect(card!.y + card!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    await dialog.getByRole('button', { name: index === lessons.length - 1 ? 'Finish tutorial' : 'Next', exact: true }).click();
  }
  await expect(page.locator('.maintenance-complete')).toHaveText('Tutorial completed');
  await expect(page.getByRole('button', { name: 'Start guided run', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Lecture controls walkthrough', exact: true }).click();
  await expect(page.locator('dialog[open]')).toContainText('Run and Pause');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await page.getByRole('button', { name: 'Start guided run', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('chapter-two-dark.png'), fullPage: true });
});

test('autoplay pauses for lecture help and never completes the guided lesson', async ({ page }) => {
  await page.goto(path);
  await page.clock.install();
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await page.clock.fastForward(2200);
  await expect(page.getByTestId('maintenance-time')).toHaveText('t = 1');
  await page.getByRole('button', { name: 'Lecture controls walkthrough', exact: true }).click();
  await page.clock.fastForward(6600);
  await expect(page.getByTestId('maintenance-time')).toHaveText('t = 1');
  await page.keyboard.press('Escape');
  await page.clock.fastForward(4400);
  await expect(page.getByTestId('maintenance-time')).toHaveText('t = 1');
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  for (let time = 2; time <= 5; time++) {
    await page.clock.fastForward(2200);
    await expect(page.getByTestId('maintenance-time')).toHaveText(`t = ${time}`);
  }
  await expect(page.getByTestId('maintenance-time')).toHaveText('t = 5');
  await expect(page.locator('.maintenance-complete')).toHaveCount(0);
});
