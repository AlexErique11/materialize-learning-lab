import type { Page } from '@playwright/test';
import { expect, seedChapterPrerequisites, test } from './fixtures';

const path = (exercise: number) => `/labs/getting-data-in/exercises/exercise-${exercise}`;
const lengths = [4, 5, 5];

async function expectExerciseToFit(page: Page) {
  await expect(page.locator('.exercise-question')).toBeVisible();
  await expect(page.locator('.ingestion-exercise-visualization')).toBeVisible();
  await expect(page.locator('.ingestion-panel:visible').first()).toBeVisible();
  const context = await page.locator('.exercise-question-copy h2').innerText();
  const geometry = await page.evaluate(() => {
    const visible = (element: Element) => element.getClientRects().length > 0;
    const selectors = ['.guided-lab-heading', '.ingestion-status-bar',
      '.ingestion-panel-tabs', '.ingestion-panel', '.exercise-question', '.exercise-question-navigation'];
    return {
      pageHeight: document.documentElement.scrollHeight, height: innerHeight,
      pageWidth: document.documentElement.scrollWidth, width: innerWidth,
      regions: selectors.flatMap((selector) => Array.from(document.querySelectorAll<HTMLElement>(selector))
        .filter(visible).map((element) => ({ selector, bottom: element.getBoundingClientRect().bottom,
          left: element.getBoundingClientRect().left, right: element.getBoundingClientRect().right }))),
      tables: Array.from(document.querySelectorAll<HTMLElement>('.ingestion-panel .table-scroll')).filter(visible)
        .map((element) => ({ label: element.getAttribute('aria-label'), height: element.clientHeight, contentHeight: element.scrollHeight,
          width: element.clientWidth, contentWidth: element.scrollWidth })),
      panels: Array.from(document.querySelectorAll<HTMLElement>('.ingestion-panel')).filter(visible)
        .map((element) => ({ label: element.querySelector('h2')?.textContent,
          bottom: element.getBoundingClientRect().bottom,
          contentBottom: Math.max(...Array.from(element.children).filter(visible).map((child) => child.getBoundingClientRect().bottom)) })),
    };
  });
  // Phones retain both sections in the document; wider layouts fit in one viewport.
  const availableHeight = geometry.width < 640 ? geometry.pageHeight : geometry.height;
  if (geometry.width >= 640) expect(geometry.pageHeight, context).toBeLessThanOrEqual(geometry.height);
  expect(geometry.pageWidth).toBeLessThanOrEqual(geometry.width);
  for (const region of geometry.regions) {
    expect(region.bottom, region.selector).toBeLessThanOrEqual(availableHeight + 1);
    expect(region.left, region.selector).toBeGreaterThanOrEqual(-1);
    expect(region.right, region.selector).toBeLessThanOrEqual(geometry.width + 1);
  }
  for (const table of geometry.tables) {
    expect(table.contentHeight, table.label!).toBeLessThanOrEqual(table.height + 1);
    expect(table.contentWidth, table.label!).toBeLessThanOrEqual(table.width + 1);
  }
  for (const panel of geometry.panels) expect(panel.contentBottom, panel.label!).toBeLessThanOrEqual(panel.bottom + 1);
}
async function selectAnswerGroup(page: Page, name: string) {
  const button = page.getByRole('navigation', { name: 'Answer groups' }).getByRole('button', { name, exact: true });
  if (await button.isVisible()) await button.click();
}

test('snapshot predictions gate reveal, retain answers, and lead to the next exercise', async ({ page }) => {
  await page.goto(path(1));
  await expect(page.getByRole('heading', { name: 'Exercise 1', exact: true })).toBeVisible();
  await expect(page.locator('.guided-lab-title > p')).toBeVisible();
  await page.getByRole('button', { name: 'Check Answer', exact: true }).click();
  await expect(page.getByRole('progressbar', { name: 'Exercise questions completed' })).toHaveAttribute('value', '0');
  await expect(page.getByRole('button', { name: 'Next question', exact: true })).toHaveCount(0);
  await page.getByRole('radio', { name: 'The query still waits for snapshot commitment.', exact: true }).check();
  if (await page.getByRole('button', { name: '3. Table', exact: true }).isVisible()) await page.getByRole('button', { name: '3. Table', exact: true }).click();
  await expect(page.getByText('Predict query availability', { exact: true })).toBeVisible();
  await expect(page.getByText('Queries waiting', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('radio', { name: 'The query still waits for snapshot commitment.', exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Check Answer', exact: true }).click();
  await expect(page.getByTestId('exercise-snapshot-read')).toHaveText('3 / 3');
  await page.getByRole('button', { name: 'Next question', exact: true }).click();
  await page.locator('input[value="notebook-old"]').check();
  await page.locator('input[value="pen"]').check();
  await page.locator('input[value="lamp"]').check();
  await selectAnswerGroup(page, 'Ingestion phase');
  await page.getByRole('radio', { name: 'Catch-up', exact: true }).check();
  await page.getByRole('button', { name: 'Check Answer', exact: true }).click();
  await expect(page.getByTestId('exercise-phase')).toHaveText('Catch-up');
  for (let index = 2; index < 4; index++) {
    await page.getByRole('button', { name: 'Next question', exact: true }).click();
    await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
  }
  await expect(page.getByTestId('exercise-pending-cdc')).toHaveText('0');
  await page.getByRole('button', { name: 'Exercise 2', exact: true }).click();
  await expect(page).toHaveURL(/exercise-2$/);
  await expect(page.getByRole('progressbar', { name: 'Exercise questions completed' })).toHaveAttribute('value', '0');
});

test('producer choices are not disclosed and wrong input cannot apply the next record', async ({ page }) => {
  await page.goto(path(2));
  await expect(page.getByTestId('exercise-envelope')).toHaveText('Choose');
  await page.getByRole('radio', { name: 'UPSERT', exact: true }).check();
  await selectAnswerGroup(page, 'Row copies after this message');
  await page.getByRole('textbox', { name: 'Row copies after this message', exact: true }).fill('2');
  await page.getByRole('button', { name: 'Check Answer', exact: true }).click();
  await expect(page.getByTestId('exercise-row-copies')).toHaveText('1');
  await expect(page.getByTestId('exercise-envelope')).toHaveText('Choose');
  if (await page.getByRole('button', { name: '2. Changes', exact: true }).isVisible()) await page.getByRole('button', { name: '2. Changes', exact: true }).click();
  await expect(page.getByText('ENVELOPE NONE', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Choose an envelope', { exact: true })).toHaveCount(1);
  await selectAnswerGroup(page, 'Producer envelope');
  await page.getByRole('radio', { name: 'NONE', exact: true }).check();
  await page.getByRole('button', { name: 'Check Answer', exact: true }).click();
  await expect(page.getByTestId('exercise-row-copies')).toHaveText('2');
  await expect(page.getByTestId('exercise-envelope')).toHaveText('NONE');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await selectAnswerGroup(page, 'Row copies after this message');
  await expect(page.getByRole('textbox', { name: 'Row copies after this message', exact: true })).toHaveValue('');
  await selectAnswerGroup(page, 'Producer envelope');
  await expect(page.getByRole('radio', { name: 'NONE', exact: true })).not.toBeChecked();
  await expect(page.getByTestId('exercise-envelope')).toHaveText('Choose');
});

test('a diagnosed error completes Chapter 4 and navigates to Chapter 5', async ({ page }) => {
  await seedChapterPrerequisites(page, path(3));
  await page.goto(path(3));
  for (let index = 0; index < 5; index++) {
    await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
    if (index < 4) await page.getByRole('button', { name: 'Next question', exact: true }).click();
  }
  await expect(page.getByRole('dialog', { name: 'You finished Chapter 4', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('exercise-row-copies')).toHaveText('—');
  if (await page.getByRole('button', { name: '3. Table', exact: true }).isVisible()) await page.getByRole('button', { name: '3. Table', exact: true }).click();
  await expect(page.getByText('Relation unavailable', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Finish chapter', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'You finished Chapter 4', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Go to next chapter', exact: true }).click();
  await expect(page).toHaveURL(/\/labs\/time-in-materialize$/);
});

for (const viewport of [{ width: 1440, height: 1000 }, { width: 1366, height: 768 }, { width: 1280, height: 650 },
  { width: 1024, height: 768 }, { width: 900, height: 650 }, { width: 768, height: 768 }, { width: 390, height: 664 }]) {
  test(`all questions and reference panels fit at ${viewport.width}×${viewport.height}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'The explicit viewport matrix is covered once.');
    test.setTimeout(180_000);
    await page.setViewportSize(viewport);
    for (let exercise = 1; exercise <= 3; exercise++) {
      await page.goto(path(exercise));
      for (let question = 0; question < lengths[exercise - 1]!; question++) {
        await expectExerciseToFit(page);
        const panels = exercise === 1 ? ['1. Upstream', '2. Ingestion', '3. Table'] : ['1. Record', '2. Changes', '3. Table'];
        for (const panel of panels) {
          const button = page.getByRole('button', { name: panel, exact: true });
          if (await button.isVisible()) await button.click();
          await expectExerciseToFit(page);
        }
        const questionHeight = await page.locator('.exercise-question').evaluate(element => element.getBoundingClientRect().height);
        await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
        await expect(page.locator('.ingestion-exercise-feedback')).toHaveCount(0);
        expect(await page.locator('.exercise-question').evaluate(element => element.getBoundingClientRect().height)).toBeCloseTo(questionHeight, 1);
        await expectExerciseToFit(page);
        if (question < lengths[exercise - 1]! - 1) await page.getByRole('button', { name: 'Next question', exact: true }).click();
      }
    }
  });
}

test('reference, dark theme, and keyboard answers remain usable', async ({ page }) => {
  await page.goto(path(2));
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await page.getByRole('button', { name: 'SQL & Objectives', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('CREATE TABLE');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'SQL & Objectives', exact: true })).toBeFocused();
  await page.getByRole('radio', { name: 'NONE', exact: true }).focus();
  await page.keyboard.press('Space');
  await selectAnswerGroup(page, 'Row copies after this message');
  await page.getByRole('textbox', { name: 'Row copies after this message', exact: true }).fill('2');
  await page.getByRole('textbox', { name: 'Row copies after this message', exact: true }).press('Enter');
  await expect(page.getByRole('button', { name: 'Next question', exact: true })).toBeVisible();
  await expectExerciseToFit(page);
  const metrics = page.getByRole('button', { name: 'Metrics', exact: true });
  if (await metrics.isVisible()) {
    await metrics.click();
    await expect(page.getByRole('dialog', { name: 'Current state', exact: true })).toContainText('Current row copies');
    await page.keyboard.press('Escape');
  }
});
