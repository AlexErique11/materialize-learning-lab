import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { temporalExercises, temporalQuestionState, type TemporalQuestion } from '../../src/chapters/time-in-materialize/exercise-scenarios';

const path = (exercise: number) => `/labs/time-in-materialize/exercises/exercise-${exercise}`;
async function answer(page: Page, question: TemporalQuestion) {
  for (const group of question.groups) {
    const tab = page.getByRole('navigation', { name: 'Answer groups' }).getByRole('button', { name: group.label, exact: true });
    if (await tab.isVisible()) await tab.click();
    const fieldset = page.locator(`fieldset[data-group="${group.id}"]`);
    if (group.kind === 'count') await fieldset.getByRole('textbox').fill(String(group.expected));
    else for (const id of group.kind === 'radio' ? [group.expected] : group.expected) await fieldset.locator(`input[data-option="${id}"]`).check();
  }
}
async function expectState(page: Page, question: TemporalQuestion, accepted: boolean) {
  const state = temporalQuestionState(question, accepted);
  await expect(page.getByTestId('exercise-source-count')).toHaveText(String(state.sourceRows.length));
  await expect(page.getByTestId('exercise-result-count')).toHaveText(String(state.resultRows.length));
  await expect(page.getByTestId('exercise-logical-time')).toHaveText((state.logicalTimeMs / 1000).toFixed(3) + ' s');
}
async function expectFit(page: Page) {
  const summaryRow = page.locator('.temporal-status-bar');
  await expect(summaryRow.locator(':scope > .relation-metric')).toHaveCount(3);
  await expect(summaryRow).not.toContainText(/Current state|Prediction accepted/);
  await expect(summaryRow.locator('.temporal-clocks')).toHaveCount(0);
  const clocks = page.getByTestId('temporal-clocks');
  if (await clocks.count()) await expect(page.locator('.temporal-panel-timeline .temporal-clocks')).toHaveCount(1);
  const layout = await page.evaluate(() => {
    const visible = (element: Element) => element.getClientRects().length > 0;
    return { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight,
      panelCount: Array.from(document.querySelectorAll('.temporal-panel')).filter(visible).length,
      statusVisible: visible(document.querySelector('.temporal-status-bar')!),
      questionTop: document.querySelector('.exercise-question')!.getBoundingClientRect().top,
      panelsBottom: Math.max(...Array.from(document.querySelectorAll('.temporal-panel')).filter(visible).map((element) => element.getBoundingClientRect().bottom)),
      regions: Array.from(document.querySelectorAll<HTMLElement>('.temporal-panel, .exercise-question, .exercise-question-navigation')).filter(visible).map((element) => ({
        label: element.getAttribute('aria-label') ?? element.className,
        bottom: element.getBoundingClientRect().bottom, right: element.getBoundingClientRect().right,
        contentBottom: Math.max(...Array.from(element.children).filter(visible).map((child) => child.getBoundingClientRect().bottom)),
      })),
      cells: Array.from(document.querySelectorAll<HTMLElement>('.temporal-panel th, .temporal-panel td')).filter(visible).map((element) => ({ label: element.textContent, width: element.clientWidth, contentWidth: element.scrollWidth })),
      tables: Array.from(document.querySelectorAll<HTMLElement>('.temporal-panel .table-scroll')).filter(visible).map((element) => ({ height: element.clientHeight, contentHeight: element.scrollHeight })),
    };
  });
  expect(layout.scrollWidth, 'No horizontal page scrolling').toBeLessThanOrEqual(layout.width + 1);
  expect(layout.scrollHeight, 'No vertical page scrolling').toBeLessThanOrEqual(layout.height + 1);
  if (layout.width >= 640) {
    expect(layout.panelCount, 'Source, lifetimes, and result visible together').toBe(3);
    expect(layout.statusVisible, 'Summary metrics remain visible').toBe(true);
    expect(layout.questionTop, 'Question sits below every reference panel').toBeGreaterThan(layout.panelsBottom);
    await expect(page.getByRole('navigation', { name: 'Workspace panels' })).toBeHidden();
  }
  for (const region of layout.regions) {
    expect(region.bottom, region.label).toBeLessThanOrEqual(layout.height + 1);
    expect(region.right, region.label).toBeLessThanOrEqual(layout.width + 1);
    expect(region.contentBottom, region.label + ' contents').toBeLessThanOrEqual(region.bottom + 1);
  }
  for (const cell of layout.cells) expect(cell.contentWidth, cell.label!).toBeLessThanOrEqual(cell.width + 1);
  for (const table of layout.tables) expect(table.contentHeight, 'All table rows fit').toBeLessThanOrEqual(table.height + 1);
}
async function checkViews(page: Page) {
  await expectFit(page);
  const toggle = page.getByRole('button', { name: 'View tables', exact: true });
  const phone = await toggle.isVisible();
  if (phone) await toggle.click();
  for (const stage of ['Source', 'Timeline', 'Result']) {
    const button = page.locator('.temporal-panel-tabs').getByRole('button', { name: stage, exact: true });
    if (await button.isVisible()) await button.click();
    await expectFit(page);
  }
  if (phone) await page.getByRole('button', { name: 'Question', exact: true }).click();
}

test('overview and old bookmarks lead to the three implemented exercises', async ({ page }) => {
  await page.goto('/labs/time-in-materialize');
  for (let index = 0; index < 3; index++) await expect(page.locator(`.chapter-overview a[href="${path(index + 1)}"]`)).toHaveCount(1);
  await page.goto('/labs/time-in-materialize/exercises/build-a-real-time-dashboard');
  await expect(page).toHaveURL(/exercises\/exercise-3$/);
});

for (const [exerciseIndex, exercise] of temporalExercises.entries()) {
  test(`Exercise ${exerciseIndex + 1} checks all authored answers, gates predictions, and resets`, async ({ page }) => {
    await page.goto(path(exerciseIndex + 1));
    await expect(page.getByRole('heading', { name: `Exercise ${exerciseIndex + 1}`, exact: true })).toBeVisible();
    for (const [index, question] of exercise.questions.entries()) {
      await expect(page.locator('.exercise-question-copy h2')).toContainText(`Question ${index + 1} of ${exercise.questions.length}`);
      await expectState(page, question, false);
      await expect(page.locator('.temporal-answer-options [data-answer="correct"]')).toHaveCount(0);
      await page.getByRole('button', { name: 'Check Answer', exact: true }).click();
      await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'incorrect');
      await expectState(page, question, false);
      await expect(page.locator('.exercise-question-navigation button')).toHaveCount(0);
      await page.getByRole('button', { name: 'Hint', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Hint', exact: true })).toHaveAttribute('aria-expanded', 'true');
      await answer(page, question);
      await page.getByRole('button', { name: 'Check Answer', exact: true }).click();
      await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'correct');
      await expectState(page, question, true);
      await expect(page.getByRole('progressbar', { name: 'Exercise questions completed' })).toHaveAttribute('value', String(index + 1));
      await expect(page.locator('.exercise-question > *')).toHaveCount(2);
      if (index < exercise.questions.length - 1) await page.getByRole('button', { name: 'Next question', exact: true }).click();
    }
    if (exerciseIndex === 2) {
      await page.getByRole('button', { name: 'Finish chapter', exact: true }).click();
      await expect(page.getByRole('dialog', { name: 'Exercise completed', exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Close Exercise completed', exact: true }).click();
    } else {
      const button = page.getByRole('button', { name: `Exercise ${exerciseIndex + 2}`, exact: true });
      await expect(button).toBeVisible();
    }
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(page.getByRole('progressbar', { name: 'Exercise questions completed' })).toHaveAttribute('value', '0');
    await expectState(page, exercise.questions[0]!, false);
    await expect(page.locator('.temporal-answer-group input:checked')).toHaveCount(0);
  });

  test(`Exercise ${exerciseIndex + 1} keeps references and answers within the viewport`, async ({ page, isMobile }) => {
    test.setTimeout(180_000);
    const sizes = isMobile ? [[390, 664], [610, 668], [375, 667]] : [[1440, 1000], [1366, 768], [1280, 650]];
    for (const [width, height] of sizes) {
      await page.setViewportSize({ width: width!, height: height! });
      await page.goto(path(exerciseIndex + 1));
      for (const [index, question] of exercise.questions.entries()) {
        await checkViews(page);
        await page.getByRole('button', { name: 'Check Answer', exact: true }).click();
        await checkViews(page);
        await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
        await expectState(page, question, true);
        await checkViews(page);
        if (index === 0) await page.screenshot({ path: test.info().outputPath(`temporal-exercise-${exerciseIndex + 1}-${width}.png`) });
        if (index < exercise.questions.length - 1) await page.getByRole('button', { name: 'Next question', exact: true }).click();
      }
      await page.getByRole('button', { name: 'Switch to dark mode' }).click();
      await checkViews(page);
      await page.getByRole('button', { name: 'Switch to light mode' }).click();
    }
  });
}

test('the filter answer is concealed until accepted and SQL uses an exercise template', async ({ page }) => {
  await page.goto(path(3));
  await expect(page.locator('.temporal-predicate')).toHaveText('Choose a temporal filter to evaluate these events.');
  await page.getByRole('button', { name: 'SQL & Objectives', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'SQL & Objectives' });
  await expect(dialog).toContainText('<your temporal predicate>');
  await expect(dialog.getByRole('link').first()).toHaveAttribute('href', /^https:\/\/materialize.com\//);
  await page.getByRole('button', { name: 'Close SQL & Objectives', exact: true }).click();
  await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
  await expect(page.locator('.temporal-predicate')).toContainText('WHERE mz_now() >= event_ts AND');
});

test('Chapter 5 preserves the shared exercise header and next-button corner', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Desktop frame comparison.');
  for (const size of [{ width: 1440, height: 1000 }, { width: 1366, height: 768 }, { width: 1280, height: 650 }]) {
    await page.setViewportSize(size);
    await page.goto('/labs/getting-data-in/exercises/exercise-1');
    await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
    const selectors = ['h1', '.guided-lab-title > p', '.guided-lab-controls', '.exercise-next-question'];
    const reference = await Promise.all(selectors.map((selector) => page.locator(selector).boundingBox()));
    for (let exercise = 1; exercise <= 3; exercise++) {
      await page.goto(path(exercise));
      await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
      for (const [index, selector] of selectors.entries()) {
        const box = (await page.locator(selector).boundingBox())!;
        if (selector === '.exercise-next-question') {
          expect(box.y + box.height).toBeCloseTo(reference[index]!.y + reference[index]!.height, 0);
          expect(box.x + box.width).toBeCloseTo(reference[index]!.x + reference[index]!.width, 0);
        } else expect(box.y).toBeCloseTo(reference[index]!.y, 0);
      }
    }
  }
});

test('summary metrics show the known state and update only after acceptance', async ({ page, isMobile }) => {
  await page.setViewportSize(isMobile ? { width: 375, height: 667 } : { width: 1280, height: 650 });
  await page.goto(path(2));
  for (const expected of ['12.000 s', '15.000 s']) {
    if (!isMobile) {
      await expect(page.getByTestId('exercise-logical-time')).toBeVisible();
      await expect(page.getByTestId('exercise-logical-time')).toHaveText(expected);
      await expect(page.getByRole('button', { name: 'Metrics', exact: true })).toBeHidden();
      if (expected === '12.000 s') await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
      continue;
    }
    const toggle = page.getByRole('button', { name: 'View tables', exact: true });
    if (await toggle.isVisible()) await toggle.click();
    await page.getByRole('button', { name: 'Metrics', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Current state' });
    await expect(dialog.locator('dd')).toHaveText(['3', '3', expected]);
    await page.getByRole('button', { name: 'Close Current state', exact: true }).click();
    if (expected === '12.000 s') await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
  }
});
