import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const exercisePath = '/labs/changing-relations/exercises/exercise-1';
const check = (page: Page) => page.getByRole('button', { name: 'Check Answer', exact: true });
const nextQuestion = (page: Page) => page.getByRole('button', { name: 'Next question', exact: true });
const progress = (page: Page) => page.getByRole('progressbar', { name: 'Exercise phases completed' });

async function answerPhase(page: Page, stage: number) {
  const panel = page.getByRole('navigation', { name: 'Workspace panels' });
  if (await panel.isVisible()) await panel.getByRole('button', { name: stage === 1 ? 'Change ledger' : 'Question', exact: true }).click();
  const values = stage === 0 ? ['3', '1', '3'] : stage === 1 ? ['-3', '+4'] : ['8', '2', '12'];
  for (const [index, value] of values.entries()) await page.getByRole('textbox').nth(index).fill(value);
}

async function expectNextBelowQuestion(page: Page) {
  await expect(page.locator('.exercise-question').getByRole('button', { name: 'Next question', exact: true })).toHaveCount(0);
  const question = await page.locator('.exercise-question').boundingBox();
  const button = await nextQuestion(page).boundingBox();
  expect(question).not.toBeNull(); expect(button).not.toBeNull();
  expect(button!.y).toBeGreaterThanOrEqual(question!.y + question!.height);
}

test('one inventory exercise reconstructs mixed changes, builds a conditional batch, and checks the final relation', async ({ page }, testInfo) => {
  await page.goto(exercisePath);
  const current = page.getByRole('table', { name: 'Current relation', exact: true, includeHidden: true });
  const actualRows = () => current.locator('tbody tr:not([aria-hidden="true"])');
  await expect(progress(page)).toHaveAttribute('max', '3');
  await expect(progress(page)).toHaveAttribute('value', '0');
  await expect(actualRows()).toHaveText(['Kettle$254', 'Mug$82', 'Mug$101']);
  await expect(page.getByRole('table', { name: 'Change ledger', exact: true, includeHidden: true }).locator('tbody tr')).toHaveCount(5);
  await expect(nextQuestion(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Hint', exact: true }).click();
  await expect(page.locator('.exercise-question')).toContainText('calculated separately');
  await expect(progress(page)).toHaveAttribute('value', '0');
  await check(page).click();
  await expect(page.locator('input[aria-invalid="true"]')).toHaveCount(3);
  await answerPhase(page, 0);
  await page.getByRole('textbox').nth(1).fill('4');
  await check(page).click();
  await expect(page.getByTestId('logical-time').locator('strong')).toHaveText('t = 0');
  await expect(page.getByRole('textbox').nth(1)).toHaveAttribute('aria-invalid', 'true');
  await answerPhase(page, 0);
  await page.getByRole('textbox').last().press('Enter');
  await expect(actualRows()).toHaveText(['Kettle$253', 'Mug$81', 'Mug$103']);
  await expect(page.locator('.exercise-question')).toContainText('4 −3 +2 = 3');
  await expect(progress(page)).toHaveAttribute('value', '1');
  await expect(check(page)).toBeDisabled();
  await expectNextBelowQuestion(page);
  await nextQuestion(page).click();
  await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'ready');
  await expect(page.locator('.exercise-question h2')).toContainText('Phase 2 of 3');
  if (await page.getByRole('navigation', { name: 'Workspace panels' }).isVisible())
    await page.getByRole('navigation', { name: 'Workspace panels' }).getByRole('button', { name: 'Change ledger', exact: true }).click();
  await expect(page.getByRole('textbox')).toHaveCount(2);
  await expect(page.getByRole('textbox').first()).toHaveValue('');
  await page.getByRole('textbox', { name: 'Signed diff for (Kettle, $25)', exact: true }).fill('-3');
  await page.getByRole('textbox', { name: 'Signed diff for (Kettle, $30)', exact: true }).fill('+3');
  await check(page).click();
  await expect(page.locator('.exercise-question')).toContainText('plus one extra');
  await expect(page.getByTestId('logical-time').locator('strong')).toHaveText('t = 1');
  await answerPhase(page, 1);
  await check(page).click();
  await expect(actualRows()).toHaveText(['Kettle$304', 'Mug$81', 'Mug$103']);
  await expect(page.getByRole('table', { name: 'Build the change', includeHidden: true }).locator('.relation-count')).toHaveText(['−3', '+4']);
  await expectNextBelowQuestion(page);
  await nextQuestion(page).click();
  await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'ready');
  await answerPhase(page, 2);
  await page.getByRole('textbox', { name: 'Distinct full rows after t = 3', exact: true }).fill('3');
  await page.getByRole('textbox', { name: 'Remaining Mug price after t = 3', exact: true }).fill('10');
  await check(page).click();
  await expect(page.locator('input[aria-invalid="true"]')).toHaveCount(2);
  await expect(page.getByTestId('logical-time').locator('strong')).toHaveText('t = 2');
  await answerPhase(page, 2);
  await check(page).click();
  await expect(progress(page)).toHaveAttribute('value', '3');
  await expect(actualRows()).toHaveText(['Kettle$305', 'Mug$123']);
  await expect(page.getByTestId('total-copies').locator('strong')).toHaveText('8');
  await expect(page.getByTestId('distinct-rows').locator('strong')).toHaveText('2');
  await expect(page.locator('.exercise-question')).toContainText('Exercise complete');
  await expect(nextQuestion(page)).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('inventory-complete.png'), fullPage: true });
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(progress(page)).toHaveAttribute('value', '0');
  await expect(actualRows()).toHaveText(['Kettle$254', 'Mug$82', 'Mug$101']);
  await expect(page.getByRole('textbox').first()).toHaveValue('');
});

test('Show Answer accepts and applies each solution like a correct manual answer', async ({ page }) => {
  await page.goto(exercisePath);
  for (let stage = 0; stage < 3; stage++) {
    await check(page).click();
    await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
    await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'correct');
    await expect(page.getByTestId('logical-time').locator('strong')).toHaveText(`t = ${stage + 1}`);
    await expect(progress(page)).toHaveAttribute('value', String(stage + 1));
    await expect(page.locator('input[aria-invalid="true"]')).toHaveCount(0);
    await expect(page.locator('.guided-lab-controls .button')).toHaveText(['Reset', 'Hint', 'Show Answer', 'Check Answer']);
    await expect(check(page)).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Show Answer', exact: true })).toBeDisabled();
    if (stage === 1) await expect(page.getByRole('table', { name: 'Build the change', includeHidden: true }).locator('.relation-count')).toHaveText(['−3', '+4']);
    else {
      const values = stage === 0 ? ['3', '1', '3'] : ['8', '2', '12'];
      for (const [index, value] of values.entries()) {
        await expect(page.getByRole('textbox').nth(index)).toHaveValue(value);
        await expect(page.getByRole('textbox').nth(index)).toBeDisabled();
      }
    }
    if (stage < 2) {
      await expectNextBelowQuestion(page);
      await nextQuestion(page).click();
      await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'ready');
      await expect(page.getByRole('textbox', { includeHidden: true }).first()).toHaveValue('');
    }
  }
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(progress(page)).toHaveAttribute('value', '0');
  await expect(page.getByTestId('logical-time').locator('strong')).toHaveText('t = 0');
});

test('the chapter lists one exercise, preserves old links, and keeps the requested actions and help', async ({ page }) => {
  await page.goto('/labs/changing-relations');
  await expect(page.getByRole('link', { name: 'Start exercise: Exercise 1', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /Exercise 2/ })).toHaveCount(0);
  await page.goto('/labs/changing-relations/exercises/exercise-2');
  await expect(page).toHaveURL(exercisePath);
  await expect(page.locator('.guided-lab-controls .button')).toHaveText(['Reset', 'Hint', 'Show Answer', 'Check Answer']);
  await expect(page.getByRole('complementary', { name: 'Lab tip' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'SQL & Objectives', exact: true })).toHaveCount(0);
  if (await page.getByRole('navigation', { name: 'Workspace panels' }).isVisible())
    await page.getByRole('navigation', { name: 'Workspace panels' }).getByRole('button', { name: 'Change ledger', exact: true }).click();
  await page.getByRole('button', { name: 'About Signed diff', exact: true }).focus();
  await expect(page.getByRole('tooltip')).toContainText('not the resulting count');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('navigation', { name: 'Page navigation' }).getByRole('link', { name: /Back to chapter/ })).toHaveAttribute('href', '/labs/changing-relations');
});

test('all phases fit desktop screens with stable grids, nonbreaking labels, and usable mobile controls', async ({ page, isMobile }, testInfo) => {
  test.setTimeout(60_000);
  const viewports = isMobile ? [{ width: 390, height: 664 }] : [
    { width: 1440, height: 1000 }, { width: 1366, height: 768 }, { width: 1280, height: 650 }, { width: 1024, height: 768 },
  ];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto(exercisePath);
    let gridHeight: number | undefined;
    for (let stage = 0; stage < 3; stage++) {
      for (const state of ['ready', 'hint', 'invalid', 'correct']) {
        if (state === 'hint') await page.getByRole('button', { name: 'Hint', exact: true }).click();
        if (state === 'invalid') await check(page).click();
        if (state === 'correct') { await answerPhase(page, stage); await check(page).click(); }
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight <= innerHeight
          && document.documentElement.scrollWidth <= innerWidth), { message: 'Exercise fits after its layout settles' }).toBe(true);
        const dimensions = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, viewportWidth: innerWidth, viewportHeight: innerHeight,
          gridHeight: document.querySelector('.relation-panels')!.getBoundingClientRect().height,
          labelHeights: Array.from(document.querySelectorAll('.exercise-answer-field > span:first-child:not(.sr-only)'), (label) => label.getBoundingClientRect().height),
          timestampsStayTogether: Array.from(document.querySelectorAll('.exercise-question .relation-inline-time')).every((chip) => getComputedStyle(chip).whiteSpace === 'nowrap') }));
        expect(dimensions.width, `${stage}:${state} at ${viewport.width}`).toBeLessThanOrEqual(dimensions.viewportWidth);
        expect(dimensions.height, `${stage}:${state} at ${viewport.width}×${viewport.height}`).toBeLessThanOrEqual(dimensions.viewportHeight);
        gridHeight ??= dimensions.gridHeight;
        if (!isMobile) expect(Math.abs(dimensions.gridHeight - gridHeight), 'Stable workbench height').toBeLessThanOrEqual(1);
        expect(dimensions.timestampsStayTogether).toBe(true);
        for (const height of dimensions.labelHeights) expect(height, 'Answer labels fit one line').toBeLessThan(22);
      }
      if (stage < 2) await nextQuestion(page).click();
    }
    await page.screenshot({ path: testInfo.outputPath(`exercise-${viewport.width}.png`), fullPage: true });
  }
});
