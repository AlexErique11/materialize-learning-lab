import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const exercisePath = '/labs/changing-relations/exercises/exercise-1';
const check = (page: Page) => page.getByRole('button', { name: 'Check Answer', exact: true });
const nextQuestion = (page: Page) => page.getByRole('button', { name: 'Next question', exact: true });
const progress = (page: Page) => page.getByRole('progressbar', { name: 'Exercise questions completed' });

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
  await expect(page.getByRole('button', { name: 'Finish chapter', exact: true })).toHaveCount(0);
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
  await expect(page.locator('.exercise-question h2')).toContainText('Question 2 of 3');
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
  await expect(page.getByRole('button', { name: 'Finish chapter', exact: true })).toHaveCount(0);
  await answerPhase(page, 2);
  await check(page).click();
  await expect(progress(page)).toHaveAttribute('value', '3');
  await expect(actualRows()).toHaveText(['Kettle$305', 'Mug$123']);
  await expect(page.getByTestId('total-copies').locator('strong')).toHaveText('8');
  await expect(page.getByTestId('distinct-rows').locator('strong')).toHaveText('2');
  await expect(page.locator('.exercise-question')).toContainText('Exercise complete');
  await expect(nextQuestion(page)).toHaveCount(0);
  const finish = page.getByRole('button', { name: 'Finish chapter', exact: true });
  const completion = page.getByRole('dialog', { name: 'You finished Chapter 1', exact: true });
  await finish.click();
  await expect(completion).toBeVisible();
  await completion.getByRole('button', { name: 'Close You finished Chapter 1', exact: true }).click();
  await expect(completion).not.toBeVisible();
  await expect(finish).toBeFocused();
  await expect(progress(page)).toHaveAttribute('value', '3');
  await page.screenshot({ path: testInfo.outputPath('inventory-complete.png'), fullPage: true });
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(finish).toHaveCount(0);
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
    await expect(page.locator('.guided-lab-controls .button')).toHaveText(['SQL & Objectives', 'Reset', 'Hint', 'Show Answer', 'Check Answer']);
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
  await expect(page.getByRole('button', { name: 'Finish chapter', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Finish chapter', exact: true })).toHaveCount(0);
  await expect(progress(page)).toHaveAttribute('value', '0');
  await expect(page.getByTestId('logical-time').locator('strong')).toHaveText('t = 0');
});

test('chapter completion preserves the finished inventory, fits both themes, and opens Chapter 2', async ({ page, isMobile }, testInfo) => {
  test.setTimeout(60_000);
  await page.goto(exercisePath);
  const finish = page.getByRole('button', { name: 'Finish chapter', exact: true });
  const completion = page.getByRole('dialog', { name: 'You finished Chapter 1', exact: true });
  const completeExercise = async () => {
    for (let stage = 0; stage < 3; stage++) {
      await expect(finish).toHaveCount(0);
      await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
      if (stage < 2) await nextQuestion(page).click();
    }
  };
  await completeExercise();
  const viewports = isMobile
    ? [{ width: 390, height: 664 }, { width: 390, height: 560 }]
    : [{ width: 1440, height: 1000 }, { width: 1366, height: 768 }, { width: 1280, height: 650 }, { width: 1024, height: 768 }];
  for (const theme of ['light', 'dark']) {
    await page.getByRole('button', { name: `Switch to ${theme} mode`, exact: true }).click();
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await finish.focus();
      await page.keyboard.press('Enter');
      await expect(completion).toBeVisible();
      await expect(completion.getByRole('button', { name: 'Close You finished Chapter 1', exact: true })).toBeFocused();
      await expect(completion).toContainText('complete logical timestamps');
      await expect(completion).toContainText('Up next · Chapter 2');
      await expect(completion.locator('img')).toHaveAttribute('src', '/changing-relations-overview.png');
      const box = (await completion.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
      expect(await completion.evaluate(element => element.scrollHeight <= element.clientHeight), 'The recap fits without clipping its content').toBe(true);
      const next = (await completion.getByRole('button', { name: 'Go to next chapter', exact: true }).boundingBox())!;
      expect(next.y + next.height).toBeLessThanOrEqual(box.y + box.height);
      await page.screenshot({ path: testInfo.outputPath(`chapter-completion-${theme}-${viewport.width}-${viewport.height}.png`) });
      await page.keyboard.press('Escape');
      await expect(completion).not.toBeVisible();
      await expect(finish).toBeFocused();
      await expect(progress(page)).toHaveAttribute('value', '3');
      await expect(page.getByTestId('logical-time').locator('strong')).toHaveText('t = 3');
    }
  }
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(finish).toHaveCount(0);
  await expect(progress(page)).toHaveAttribute('value', '0');
  await completeExercise();
  await finish.click();
  await completion.getByRole('button', { name: 'Go to next chapter', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/labs/incremental-maintenance');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Incremental Maintenance');
});

test('the chapter lists one exercise, preserves old links, and keeps the requested actions and help', async ({ page }, testInfo) => {
  await page.goto('/labs/changing-relations');
  await expect(page.getByRole('link', { name: 'Start exercise: Exercise 1: Inventory changes', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /Exercise 2/ })).toHaveCount(0);
  await page.goto('/labs/changing-relations/exercises/exercise-2');
  await expect(page).toHaveURL(exercisePath);
  await expect(page.locator('.guided-lab-controls .button')).toHaveText(['SQL & Objectives', 'Reset', 'Hint', 'Show Answer', 'Check Answer']);
  await expect(page.getByRole('complementary', { name: 'Lab tip' })).toHaveCount(0);
  await page.getByRole('textbox').first().fill('2');
  const referenceButton = page.getByRole('button', { name: 'SQL & Objectives', exact: true });
  const reference = page.getByRole('dialog', { name: 'SQL & Objectives', exact: true });
  for (const theme of ['light', 'dark']) {
    await page.getByRole('button', { name: `Switch to ${theme} mode`, exact: true }).click();
    await referenceButton.focus();
    await page.keyboard.press('Enter');
    await expect(reference).toBeVisible();
    await expect(reference.getByRole('button', { name: 'Close SQL & Objectives', exact: true })).toBeFocused();
    await expect(reference).toContainText('complete logical timestamp');
    await expect(reference).toContainText('SELECT DISTINCT product, price FROM products;');
    await expect(reference).toContainText('SUBSCRIBE products;');
    await expect(reference.getByRole('link', { name: 'Tutorial', exact: true })).toHaveAttribute('href', '/labs/changing-relations/tutorial');
    await expect(reference.getByRole('link', { name: 'Exercises', exact: true })).toHaveAttribute('href', '/labs/changing-relations/exercises');
    await expect(reference.getByRole('link', { name: 'SUBSCRIBE: logical timestamps and signed diffs', exact: true })).toHaveAttribute('href', 'https://materialize.com/docs/sql/subscribe/#output');
    await page.screenshot({ path: testInfo.outputPath(`inventory-reference-${theme}.png`) });
    await page.keyboard.press('Escape');
    await expect(reference).not.toBeVisible();
    await expect(referenceButton).toBeFocused();
    await expect(page.getByRole('textbox').first()).toHaveValue('2');
    await expect(progress(page)).toHaveAttribute('value', '0');
    await expect(page.getByTestId('logical-time').locator('strong')).toHaveText('t = 0');
  }
  if (await page.getByRole('navigation', { name: 'Workspace panels' }).isVisible())
    await page.getByRole('navigation', { name: 'Workspace panels' }).getByRole('button', { name: 'Change ledger', exact: true }).click();
  await page.getByRole('button', { name: 'About Signed diff', exact: true }).focus();
  await expect(page.getByRole('tooltip')).toContainText('not the resulting count');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('navigation', { name: 'Page navigation' })).toHaveCount(0);
});

test('all phases fit desktop screens with stable grids, nonbreaking labels, and usable mobile controls', async ({ page, isMobile }, testInfo) => {
  test.setTimeout(120_000);
  const viewports = isMobile ? [{ width: 390, height: 664 }] : [
    { width: 1440, height: 1000 }, { width: 1366, height: 768 }, { width: 1280, height: 650 }, { width: 1024, height: 768 },
  ];
  const dataGaps = () => page.evaluate(() => {
    const heading = document.querySelector('.guided-lab-heading')!.getBoundingClientRect();
    const metrics = document.querySelector('.relation-metrics')!.getBoundingClientRect();
    const panels = document.querySelector('.relation-panels')!.getBoundingClientRect();
    const question = document.querySelector('.exercise-question')?.getBoundingClientRect();
    return { above: metrics.top - heading.bottom, between: panels.top - metrics.bottom, question: question ? question.top - panels.bottom : null };
  });
  const rowSizing = (selector: string) => page.locator(selector).evaluate(panel => {
    const cell = panel.querySelector('tbody td')!;
    const css = getComputedStyle(cell);
    return { padding: css.padding, fontSize: css.fontSize,
      panelPadding: getComputedStyle(panel).padding, titleGap: getComputedStyle(panel.querySelector('h2')!).marginBottom,
      rowHeight: Math.max(...Array.from(panel.querySelectorAll('tbody tr'), row => row.getBoundingClientRect().height)) };
  });
  for (const viewport of viewports) {
    for (const theme of ['light', 'dark']) {
      await page.setViewportSize(viewport);
      await page.goto('/labs/changing-relations/tutorial/lecture-1');
      const toggle = page.getByRole('button', { name: `Switch to ${theme} mode`, exact: true });
      if (await toggle.isVisible()) await toggle.click();
      const referenceGaps = await dataGaps();
      for (let time = 0; time < 3; time++) await page.getByRole('button', { name: 'Next change', exact: true }).click();
      const ledgerSizing = await rowSizing('.relation-ledger');
      if (isMobile) await page.getByRole('navigation', { name: 'Workspace panels' }).getByRole('button', { name: 'Current relation', exact: true }).click();
      const relationSizing = await rowSizing('.relation-current');
      await page.goto(exercisePath);
      const panelTabs = page.getByRole('navigation', { name: 'Workspace panels' });
      const usesPanelTabs = await panelTabs.isVisible();
      expect(usesPanelTabs, 'Desktop keeps both tables and the question visible together').toBe(isMobile);
      if (!isMobile) await expect(page.locator('.guided-lab-title > p')).toBeVisible();
      let gridHeight: number | undefined;
      for (let stage = 0; stage < 3; stage++) {
        for (const state of ['ready', 'hint', 'invalid', 'correct']) {
          if (state === 'hint') await page.getByRole('button', { name: 'Hint', exact: true }).click();
          if (state === 'invalid') await check(page).click();
          if (state === 'correct') { await answerPhase(page, stage); await check(page).click(); }
          for (const [selector, panelName, referenceSizing] of [
            ['.exercise-ledger', 'Change ledger', ledgerSizing], ['.relation-current', 'Current relation', relationSizing],
          ] as const) {
            if (usesPanelTabs) await panelTabs.getByRole('button', { name: panelName, exact: true }).click();
            await expect(page.locator(selector).locator('tbody tr')).toHaveCount(5);
            const exerciseSizing = await rowSizing(selector);
            expect(exerciseSizing.padding, 'Cell padding matches the tutorial').toBe(referenceSizing.padding);
            expect(exerciseSizing.fontSize, 'Cell typography matches the tutorial').toBe(referenceSizing.fontSize);
            expect(exerciseSizing.panelPadding, 'Panel padding matches the tutorial').toBe(referenceSizing.panelPadding);
            expect(exerciseSizing.titleGap, 'Title-to-table spacing matches the tutorial').toBe(referenceSizing.titleGap);
            expect(exerciseSizing.rowHeight, 'Row height matches the tutorial').toBeCloseTo(referenceSizing.rowHeight, 0);
            if (usesPanelTabs) {
              await expect(page.locator(selector)).toBeVisible();
              expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight), 'The selected table fits without scrolling').toBe(true);
            }
          }
          if (usesPanelTabs) {
            await panelTabs.getByRole('button', { name: 'Question', exact: true }).focus();
            await page.keyboard.press('Enter');
          }
          await expect(page.locator('.exercise-ledger .relation-ledger-preview')).toHaveCount(stage === 1 && state !== 'correct' ? 2 : 0);
          await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight <= innerHeight
            && document.documentElement.scrollWidth <= innerWidth), { message: 'Exercise fits after its layout settles' }).toBe(true);
          const dimensions = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, viewportWidth: innerWidth, viewportHeight: innerHeight,
            gridHeight: document.querySelector('.relation-panels')!.getBoundingClientRect().height,
            questionHeight: document.querySelector('.exercise-question')!.getBoundingClientRect().height,
            questionTitleBottom: document.querySelector('.exercise-question-copy h2')!.getBoundingClientRect().bottom,
            questionDescriptionTop: document.querySelector('.exercise-question-copy p')!.getBoundingClientRect().top,
            contentBottom: Math.max(...Array.from(document.querySelectorAll('.relation-panel, .exercise-question, .exercise-question-navigation'),
              element => element.getBoundingClientRect().bottom)),
            labelHeights: Array.from(document.querySelectorAll('.exercise-answer-field > span:first-child:not(.sr-only)'), (label) => label.getBoundingClientRect().height),
            timestampsStayTogether: Array.from(document.querySelectorAll('.exercise-question .relation-inline-time')).every((chip) => getComputedStyle(chip).whiteSpace === 'nowrap') }));
          expect(dimensions.width, `${stage}:${state} at ${viewport.width}`).toBeLessThanOrEqual(dimensions.viewportWidth);
          expect(dimensions.height, `${stage}:${state} at ${viewport.width}×${viewport.height}`).toBeLessThanOrEqual(dimensions.viewportHeight);
          expect(dimensions.contentBottom, 'Tables, feedback, and question navigation stay visible').toBeLessThanOrEqual(dimensions.viewportHeight);
          expect(dimensions.questionDescriptionTop, 'The description stays below the question title').toBeGreaterThan(dimensions.questionTitleBottom);
          if (isMobile || viewport.height > 800) {
            expect(dimensions.questionHeight, 'The question retains its full-size layout').toBeGreaterThanOrEqual(118);
          }
          const exerciseGaps = await dataGaps();
          expect(exerciseGaps.between, 'Metric rows match the lecture spacing').toBe(referenceGaps.between);
          expect(exerciseGaps.question, 'The question uses the same gap as the data rows').toBe(exerciseGaps.between);
          if (!isMobile) expect(exerciseGaps.above, 'Description-to-metrics gap matches the lecture').toBe(referenceGaps.above);
          gridHeight ??= dimensions.gridHeight;
          if (!isMobile) expect(Math.abs(dimensions.gridHeight - gridHeight), 'Stable workbench height').toBeLessThanOrEqual(1);
          expect(dimensions.timestampsStayTogether).toBe(true);
          for (const height of dimensions.labelHeights) expect(height, 'Answer labels fit one line').toBeLessThan(22);
        }
        if (stage < 2) await nextQuestion(page).click();
      }
      await page.screenshot({ path: testInfo.outputPath(`exercise-${theme}-${viewport.width}-${viewport.height}.png`), fullPage: true });
    }
  }
});
